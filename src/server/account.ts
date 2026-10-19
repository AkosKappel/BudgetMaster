import { createServerFn } from '@tanstack/react-start'
import { asc, eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import { recurringRule, spaceMember, transaction } from '@/db/schema'
import { toCsv } from '@/lib/csv'
import { currencyDigits } from '@/lib/money'
import { authMiddleware } from '@/server/auth'
import { requireMembership } from '@/server/membership'
import { spaceInput } from '@/server/spaces'

// Everything the user can see, as JSON: every space they belong to with its wallets,
// categories, tags, budgets, goals, recurring rules and transactions. Amounts in minor units.
export const exportAllData = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const memberships = await db
      .select({ spaceId: spaceMember.spaceId, role: spaceMember.role })
      .from(spaceMember)
      .where(eq(spaceMember.userId, context.user.id))
    const spaceIds = memberships.map((m) => m.spaceId)

    const [spaces, rules, transactions] = await Promise.all([
      db.query.space.findMany({
        where: (s, { inArray }) => inArray(s.id, spaceIds),
        with: {
          wallets: true,
          categories: true,
          tags: true,
          budgets: true,
          savingsGoals: true,
        },
      }),
      db
        .select()
        .from(recurringRule)
        .where(inArray(recurringRule.spaceId, spaceIds)),
      db.query.transaction.findMany({
        where: (t, { inArray }) => inArray(t.spaceId, spaceIds),
        with: { tags: { columns: { tagId: true } } },
        orderBy: (t, { asc }) => [asc(t.date), asc(t.id)],
      }),
    ])

    return {
      exportedAt: new Date().toISOString(),
      user: { name: context.user.name, email: context.user.email },
      spaces: spaces.map((s) => ({
        ...s,
        role: memberships.find((m) => m.spaceId === s.id)?.role,
        recurringRules: rules.filter((r) => r.spaceId === s.id),
        transactions: transactions
          .filter((t) => t.spaceId === s.id)
          .map(({ tags, ...t }) => ({
            ...t,
            tagIds: tags.map((x) => x.tagId),
          })),
      })),
    }
  })

// The space's transactions as a spreadsheet, oldest first, amounts as decimal numbers.
export const exportTransactionsCsv = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(spaceInput)
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    const rows = await db.query.transaction.findMany({
      where: eq(transaction.spaceId, space.id),
      with: {
        wallet: { columns: { name: true, currency: true } },
        toWallet: { columns: { name: true, currency: true } },
        category: {
          columns: { name: true },
          with: { parent: { columns: { name: true } } },
        },
        tags: { with: { tag: { columns: { name: true } } } },
      },
      orderBy: [asc(transaction.date), asc(transaction.id)],
    })
    const decimal = (minor: number, currency: string) =>
      (minor / 10 ** currencyDigits(currency)).toFixed(currencyDigits(currency))

    return toCsv([
      [
        'Date',
        'Type',
        'Amount',
        'Currency',
        'Wallet',
        'To wallet',
        'To amount',
        'Category',
        'Subcategory',
        'Payee',
        'Note',
        'Tags',
      ],
      ...rows.map((t) => {
        const parent = t.category?.parent?.name
        const toCurrency = t.toWallet?.currency ?? t.wallet.currency
        return [
          t.date,
          t.type,
          decimal(t.amount, t.wallet.currency),
          t.wallet.currency,
          t.wallet.name,
          t.toWallet?.name ?? null,
          t.toAmount === null ? null : decimal(t.toAmount, toCurrency),
          parent ?? t.category?.name ?? null,
          parent ? (t.category?.name ?? null) : null,
          t.payee,
          t.note,
          t.tags.map((x) => x.tag.name).join(', '),
        ]
      }),
    ])
  })
