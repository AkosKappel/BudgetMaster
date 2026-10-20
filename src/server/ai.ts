import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { createServerFn } from '@tanstack/react-start'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { category } from '@/db/schema'
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
