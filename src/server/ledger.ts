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
  sql,
} from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import {
  category,
  transaction,
  transactionSplit,
  transactionTag,
  wallet,
} from '@/db/schema'
import { CURRENCIES } from '@/lib/currencies'
import { currencyDigits } from '@/lib/money'
import { addDays } from '@/lib/recurrence'
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
  splits: {
    columns: { id: true, amount: true, note: true },
    with: {
      category: { columns: { id: true, name: true, icon: true, color: true } },
    },
  },
} as const

// The receipt photo's version (I-04), null without one; part of its URL, so a replaced
// photo is not served from the browser cache. Plain SQL names in the subquery: Drizzle
// points every column inside `extras` at the outer table's alias.
const transactionExtras = (t: typeof transaction._.columns) => ({
  receiptVersion: sql<
    number | null
  >`(select extract(epoch from r.created_at)::float8 from receipt r where r.transaction_id = ${t.id})`
    .mapWith((value) => (value === null ? null : Number(value)))
    .as('receipt_version'),
})

const transactionColumns = {
  id: true,
  type: true,
  date: true,
  amount: true,
  toAmount: true,
  payee: true,
  note: true,
  recurringRuleId: true,
  paidBy: true,
} as const

export const getOverview = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(spaceInput)
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    const today = currentDay()
    await createDueTransactions(space.id, today)
    // Budget totals for Home come from the budget report (src/server/budgets.ts).
    const [wallets, recent, upcoming] = await Promise.all([
      walletBalances(space.id, today),
      db.query.transaction.findMany({
        columns: transactionColumns,
        extras: transactionExtras,
        with: transactionWith,
        where: (t, { and, eq, lte }) =>
          and(eq(t.spaceId, space.id), lte(t.date, today)),
        orderBy: (t, { desc }) => [desc(t.date), desc(t.id)],
        limit: 5,
      }),
      // Recurring payments due in the next week; today's are already booked above.
      db.query.recurringRule.findMany({
        columns: {
          id: true,
          type: true,
          amount: true,
          payee: true,
          nextDate: true,
        },
        with: {
          wallet: { columns: { name: true, currency: true } },
          toWallet: { columns: { name: true } },
          category: { columns: { name: true, icon: true, color: true } },
        },
        where: (r, { and, eq, lte }) =>
          and(
            eq(r.spaceId, space.id),
            eq(r.paused, false),
            lte(r.nextDate, addDays(today, 7)),
          ),
        orderBy: (r, { asc }) => [asc(r.nextDate), asc(r.payee)],
      }),
    ])
    return { today, wallets, recent, upcoming }
  })

// `ilike` pattern that matches the text anywhere, with the user's % and _ taken literally.
const containsPattern = (text: string) =>
  `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`

// Minor units per major unit of the transaction's wallet currency: the amount filter is
// typed in major units, and a JPY wallet has no cents while a EUR one has two. Plain
// column names, because relational queries rename every column to the root table.
const unitsOf = (walletId: typeof transaction.walletId) =>
  sql`(select case w.currency ${sql.join(
    CURRENCIES.filter((c) => currencyDigits(c) !== 2).map(
      (c) => sql`when ${c} then ${10 ** currencyDigits(c)}`,
    ),
    sql` `,
  )} else 100 end from ${wallet} w where w.id = ${walletId})`

function filterConditions(filters: TransactionFilters) {
  const t = transaction
  const minor = (major: number) =>
    sql`round(${major}::numeric * ${unitsOf(t.walletId)})`
  const conditions: (SQL | undefined)[] = []
  if (filters.q) {
    const pattern = containsPattern(filters.q)
    conditions.push(or(ilike(t.payee, pattern), ilike(t.note, pattern)))
  }
  if (filters.type) conditions.push(eq(t.type, filters.type))
  if (filters.category) {
    // A parent category includes the spending on its subcategories, and a split
    // transaction matches when one of its parts does.
    const categories = db
      .select({ id: category.id })
      .from(category)
      .where(
        or(
          eq(category.id, filters.category),
          eq(category.parentId, filters.category),
        ),
      )
    conditions.push(
      or(
        inArray(t.categoryId, categories),
        inArray(
          t.id,
          db
            .select({ id: transactionSplit.transactionId })
            .from(transactionSplit)
            .where(inArray(transactionSplit.categoryId, categories)),
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
      extras: transactionExtras,
      with: transactionWith,
      where: and(
        eq(t.spaceId, space.id),
        cursor
          ? or(
              lt(t.date, cursor.date),
              and(eq(t.date, cursor.date), lt(t.id, cursor.id)),
            )
          : undefined,
        ...filterConditions(data.filters),
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
      extras: transactionExtras,
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
