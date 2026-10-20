import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { createServerFn } from '@tanstack/react-start'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { category, wallet } from '@/db/schema'
import { env } from '@/env'
import { decodeReceipt } from '@/lib/receipt-image'
import { m } from '@/paraglide/messages.js'
import { anthropic, countRead } from '@/server/anthropic'
import { authMiddleware } from '@/server/auth'
import { requireMembership } from '@/server/membership'
import { spaceInput } from '@/server/spaces'

// Reads a receipt photo with Claude (AI-01): total, date, shop and one of the space's
// expense categories, for the quick add form to fill in. Only for users who switched AI
// features on in Settings; the photo is not stored by this call.
export const readReceipt = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(spaceInput.extend({ image: z.string().max(1_400_000) }))
  .handler(async ({ context, data }) => {
    if (!env.ANTHROPIC_API_KEY) throw new Error(m.txn_ai_not_set_up())
    if (!context.user.aiEnabled) throw new Error(m.txn_ai_switch_on())
    if (context.user.isAnonymous) throw new Error(m.txn_ai_needs_account())
    const space = await requireMembership(context.user.id, data.spaceId)
    const image = decodeReceipt(data.image)
    if (!image) throw new Error(m.txn_receipt_invalid())
    countRead(context.user.id)

    const categories = await db
      .select({ id: category.id, name: category.name })
      .from(category)
      .where(
        and(
          eq(category.spaceId, space.id),
          eq(category.type, 'expense'),
          isNull(category.archivedAt),
        ),
      )
    const names = categories.map((c) => c.name)
    const schema = z.object({
      isReceipt: z
        .boolean()
        .describe('False when the photo is not a receipt or bill.'),
      total: z
        .string()
        .nullable()
        .describe('Amount paid in total, digits with a dot, e.g. "42.10".'),
      currency: z
        .string()
        .nullable()
        .describe('ISO 4217 code of the total, e.g. "EUR".'),
      date: z.string().nullable().describe('Purchase date as YYYY-MM-DD.'),
      shop: z
        .string()
        .nullable()
        .describe('Shop or company name as people would call it, e.g. "Lidl".'),
      category: (names.length > 0
        ? z.enum(names as [string, ...string[]])
        : z.string()
      )
        .nullable()
        .describe('The best fitting category from the list, or null.'),
    })

    const response = await anthropic().beta.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 2000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: betaZodOutputFormat(schema) },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: image.type,
                data: image.bytes.toString('base64'),
              },
            },
            {
              type: 'text',
              text: `Read this receipt for a personal budgeting app. Today is ${new Date().toISOString().slice(0, 10)}. Categories to choose from: ${names.join(', ') || 'none'}.`,
            },
          ],
        },
      ],
    })
    const result = response.parsed_output
    if (response.stop_reason === 'refusal' || !result)
      throw new Error(m.txn_photo_unreadable())
    if (!result.isReceipt) throw new Error(m.txn_ai_not_receipt())
    return {
      amount:
        result.total && /^\d+(\.\d{1,3})?$/.test(result.total)
          ? result.total
          : null,
      currency: result.currency,
      date:
        result.date && z.iso.date().safeParse(result.date).success
          ? result.date
          : null,
      payee: result.shop?.trim() || null,
      categoryId:
        categories.find((c) => c.name === result.category)?.id ?? null,
    }
  })

// Reads a free-text line into quick add fields (AI-02), e.g. "split dinner 84 with Sam, I
// paid" or a bare payee whose category nobody has picked yet (AI-04). The line and the
// space's wallet and category names go to Claude; the user confirms the form as usual.
export const readEntry = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(spaceInput.extend({ text: z.string().trim().min(1).max(300) }))
  .handler(async ({ context, data }) => {
    if (!env.ANTHROPIC_API_KEY) throw new Error(m.txn_ai_not_set_up())
    if (!context.user.aiEnabled) throw new Error(m.txn_ai_switch_on())
    if (context.user.isAnonymous) throw new Error(m.txn_ai_needs_account())
    const space = await requireMembership(context.user.id, data.spaceId)
    countRead(context.user.id)

    const [categories, wallets] = await Promise.all([
      db
        .select({ id: category.id, name: category.name, type: category.type })
        .from(category)
        .where(
          and(eq(category.spaceId, space.id), isNull(category.archivedAt)),
        ),
      db
        .select({ id: wallet.id, name: wallet.name })
        .from(wallet)
        .where(and(eq(wallet.spaceId, space.id), isNull(wallet.archivedAt))),
    ])
    const oneOf = (names: string[]) =>
      names.length > 0 ? z.enum(names as [string, ...string[]]) : z.string()
    const schema = z.object({
      type: z
        .enum(['expense', 'income'])
        .nullable()
        .describe('Money going out is an expense, money coming in is income.'),
      amount: z
        .string()
        .nullable()
        .describe(
          'The amount the user paid or received, digits with a dot, e.g. "84.00". For a split bill the user paid, the full amount.',
        ),
      date: z
        .string()
        .nullable()
        .describe('YYYY-MM-DD, only when the line names a day.'),
      payee: z
        .string()
        .nullable()
        .describe('Shop, company or person, as people would call it.'),
      wallet: oneOf(wallets.map((w) => w.name))
        .nullable()
        .describe('Only when the line names one of these wallets.'),
      category: oneOf(categories.map((c) => c.name))
        .nullable()
        .describe('The best fitting category from the list, or null.'),
    })

    const today = new Date().toISOString().slice(0, 10)
    const response = await anthropic().beta.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 2000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: betaZodOutputFormat(schema) },
      messages: [
        {
          role: 'user',
          content: `A user of a personal budgeting app typed this line to record one transaction. It may be in English, Hungarian or Slovak. Today is ${today}.\n\nWallets: ${wallets.map((w) => w.name).join(', ') || 'none'}\nExpense categories: ${
            categories
              .filter((c) => c.type === 'expense')
              .map((c) => c.name)
              .join(', ') || 'none'
          }\nIncome categories: ${
            categories
              .filter((c) => c.type === 'income')
              .map((c) => c.name)
              .join(', ') || 'none'
          }\n\n<line>${data.text}</line>`,
        },
      ],
    })
    const result = response.parsed_output
    if (response.stop_reason === 'refusal' || !result)
      throw new Error(m.txn_ai_read_failed())
    const type = result.type ?? undefined
    return {
      type,
      amount:
        result.amount && /^\d+(\.\d{1,3})?$/.test(result.amount)
          ? result.amount
          : undefined,
      date:
        result.date && z.iso.date().safeParse(result.date).success
          ? result.date
          : undefined,
      payee: result.payee?.trim() || undefined,
      walletId: wallets.find((w) => w.name === result.wallet)?.id,
      // A category of the other type would be refused on save.
      categoryId: categories.find(
        (c) => c.name === result.category && (!type || c.type === type),
      )?.id,
    }
  })

// A PDF bank statement read by Claude for the import page (AI-01, M-16): the transactions
// come back as a Date, Amount, Payee table, so they go through the same column mapping,
// duplicate check and review as a CSV file. Nothing is saved before the user confirms.
export const readStatement = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  // Base64 of up to about 1.4 MB, under the proxy's 2 MB request limit.
  .validator(spaceInput.extend({ pdf: z.string().max(1_950_000) }))
  .handler(async ({ context, data }) => {
    if (!env.ANTHROPIC_API_KEY) throw new Error(m.txn_ai_not_set_up())
    if (!context.user.aiEnabled) throw new Error(m.txn_ai_switch_on())
    if (context.user.isAnonymous) throw new Error(m.txn_ai_needs_account())
    await requireMembership(context.user.id, data.spaceId)
    const bytes = Buffer.from(data.pdf, 'base64')
    if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-')
      throw new Error(m.setup_import_pdf_invalid())
    countRead(context.user.id)

    const schema = z.object({
      isStatement: z
        .boolean()
        .describe('False when the document is not a bank or card statement.'),
      transactions: z
        .array(
          z.object({
            date: z.string().describe('Booking date as YYYY-MM-DD.'),
            amount: z
              .string()
              .describe(
                'Signed amount with a dot, money out negative: "-42.10", "1250.00".',
              ),
            payee: z
              .string()
              .describe(
                'Who was paid or who paid, as people would call them. Never an account number or IBAN.',
              ),
          }),
        )
        .describe('Every transaction, in the order of the statement.'),
    })
    const response = await anthropic().beta.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: betaZodOutputFormat(schema) },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: bytes.toString('base64'),
              },
            },
            {
              type: 'text',
              text: 'List the transactions on this bank statement for a personal budgeting app. Leave out opening and closing balances, subtotals and fees summaries that are not transactions of their own. Do not copy account numbers, IBANs or card numbers into any field.',
            },
          ],
        },
      ],
    })
    const result = response.parsed_output
    if (response.stop_reason === 'refusal' || !result)
      throw new Error(m.setup_import_pdf_unreadable())
    if (!result.isStatement) throw new Error(m.setup_import_pdf_not_statement())
    const rows = result.transactions
      .filter(
        (t) =>
          z.iso.date().safeParse(t.date).success &&
          /^-?\d+(\.\d{1,3})?$/.test(t.amount),
      )
      .slice(0, 1000)
      .map((t) => [t.date, t.amount, t.payee.trim().slice(0, 120)])
    if (rows.length === 0) throw new Error(m.setup_import_no_rows())
    return { header: ['Date', 'Amount', 'Payee'], rows }
  })
