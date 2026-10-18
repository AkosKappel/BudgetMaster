import { createServerFn } from '@tanstack/react-start'
import {
  and,
  eq,
  gte,
  ilike,
  inArray,
  lt,
  lte,
  or,
  type SQL,
} from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { category, transaction, transactionTag } from '@/db/schema'
import { currencyDigits } from '@/lib/money'
import { currentDay } from '@/lib/today'
import {
  type TransactionFilters,
  transactionFiltersSchema,
} from '@/lib/transaction-filters'
import { authMiddleware } from '@/server/auth'
import { requireMembership } from '@/server/membership'
import { createDueTransactions } from '@/server/recurring-due'
import { spaceInput } from '@/server/spaces'
import { walletBalances } from '@/server/wallet-balances'

const PAGE_SIZE = 30

const transactionWith = {
  category: { columns: { id: true, name: true, icon: true, color: true } },
  wallet: { columns: { id: true, name: true, currency: true } },
  toWallet: { columns: { id: true, name: true, currency: true } },
  author: { columns: { id: true, name: true } },
  tags: {
    columns: {},
    with: { tag: { columns: { id: true, name: true, color: true } } },
  },
} as const

const transactionColumns = {
  id: true,
  type: true,
  date: true,
  amount: true,
  toAmount: true,
  payee: true,
  note: true,
  recurringRuleId: true,
} as const

export const getOverview = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(spaceInput)
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    const today = currentDay()
    await createDueTransactions(space.id, today)
    // Budget totals for Home come from the budget report (src/server/budgets.ts).
    const [wallets, recent] = await Promise.all([
      walletBalances(space.id, today),
      db.query.transaction.findMany({
        columns: transactionColumns,
        with: transactionWith,
        where: (t, { and, eq, lte }) =>
          and(eq(t.spaceId, space.id), lte(t.date, today)),
        orderBy: (t, { desc }) => [desc(t.date), desc(t.id)],
        limit: 5,
      }),
    ])
    return { today, wallets, recent }
  })

// `ilike` pattern that matches the text anywhere, with the user's % and _ taken literally.
const containsPattern = (text: string) =>
  `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`

function filterConditions(filters: TransactionFilters, digits: number) {
  const t = transaction
  const minor = (major: number) => Math.round(major * 10 ** digits)
  const conditions: (SQL | undefined)[] = []
  if (filters.q) {
    const pattern = containsPattern(filters.q)
    conditions.push(or(ilike(t.payee, pattern), ilike(t.note, pattern)))
  }
  if (filters.type) conditions.push(eq(t.type, filters.type))
  if (filters.category) {
    // A parent category includes the spending on its subcategories.
    conditions.push(
      inArray(
        t.categoryId,
        db
          .select({ id: category.id })
          .from(category)
          .where(
            or(
              eq(category.id, filters.category),
              eq(category.parentId, filters.category),
            ),
          ),
      ),
    )
  }
  if (filters.wallet) {
    conditions.push(
      or(eq(t.walletId, filters.wallet), eq(t.toWalletId, filters.wallet)),
    )
  }
  if (filters.tag) {
    conditions.push(
      inArray(
        t.id,
        db
          .select({ id: transactionTag.transactionId })
          .from(transactionTag)
          .where(eq(transactionTag.tagId, filters.tag)),
      ),
    )
  }
  if (filters.from) conditions.push(gte(t.date, filters.from))
  if (filters.to) conditions.push(lte(t.date, filters.to))
  if (filters.min !== undefined)
    conditions.push(gte(t.amount, minor(filters.min)))
  if (filters.max !== undefined)
    conditions.push(lte(t.amount, minor(filters.max)))
  return conditions
}

const cursorSchema = z.object({ date: z.iso.date(), id: z.uuid() })
export type TransactionCursor = z.infer<typeof cursorSchema>

// Newest first, keyset pagination on (date, id): stable while new rows are added.
export const listTransactions = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(
    spaceInput.extend({
      cursor: cursorSchema.optional(),
      filters: transactionFiltersSchema.default({}),
    }),
  )
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    const { cursor } = data
    if (!cursor) await createDueTransactions(space.id, currentDay())
    const t = transaction
    const rows = await db.query.transaction.findMany({
      columns: transactionColumns,
      with: transactionWith,
      where: and(
        eq(t.spaceId, space.id),
        cursor
          ? or(
              lt(t.date, cursor.date),
              and(eq(t.date, cursor.date), lt(t.id, cursor.id)),
            )
          : undefined,
        ...filterConditions(data.filters, currencyDigits(space.baseCurrency)),
      ),
      orderBy: (t, { desc }) => [desc(t.date), desc(t.id)],
      limit: PAGE_SIZE + 1,
    })
    const page = rows.slice(0, PAGE_SIZE)
    const last = page.at(-1)
    return {
      items: page,
      nextCursor:
        rows.length > PAGE_SIZE && last
          ? { date: last.date, id: last.id }
          : null,
    }
  })

export type LedgerTransaction = Awaited<
  ReturnType<typeof listTransactions>
>['items'][number]

// Command palette search: payee or note contains the query, newest first.
export const searchTransactions = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(spaceInput.extend({ query: z.string().trim().min(2).max(60) }))
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    const pattern = containsPattern(data.query)
    return db.query.transaction.findMany({
      columns: transactionColumns,
      with: transactionWith,
      where: (t, { and, eq, ilike, or }) =>
        and(
          eq(t.spaceId, space.id),
          or(ilike(t.payee, pattern), ilike(t.note, pattern)),
        ),
      orderBy: (t, { desc }) => [desc(t.date), desc(t.id)],
      limit: 8,
    })
  })
