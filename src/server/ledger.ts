import { createServerFn } from '@tanstack/react-start'
import {
  and,
  asc,
  between,
  eq,
  inArray,
  isNull,
  lte,
  or,
  sql,
  sum,
} from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { budget, transaction, wallet } from '@/db/schema'
import { budgetPeriod, todayIso } from '@/lib/recurrence'
import { authMiddleware } from '@/server/auth'
import { requireMembership } from '@/server/membership'
import { spaceInput } from '@/server/spaces'

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

// Balance up to and including `today`: income adds, expenses and outgoing transfers
// subtract, incoming transfers add their target amount.
async function walletBalances(spaceId: string, today: string) {
  const change = sql`case
    when ${transaction.toWalletId} = ${wallet.id} then coalesce(${transaction.toAmount}, ${transaction.amount})
    when ${transaction.type} = 'income' then ${transaction.amount}
    else -${transaction.amount}
  end`
  return db
    .select({
      id: wallet.id,
      name: wallet.name,
      type: wallet.type,
      currency: wallet.currency,
      color: wallet.color,
      icon: wallet.icon,
      balance:
        sql`${wallet.initialBalance} + coalesce(sum(${change}), 0)`.mapWith(
          Number,
        ),
    })
    .from(wallet)
    .leftJoin(
      transaction,
      and(
        or(
          eq(transaction.walletId, wallet.id),
          eq(transaction.toWalletId, wallet.id),
        ),
        lte(transaction.date, today),
      ),
    )
    .where(and(eq(wallet.spaceId, spaceId), isNull(wallet.archivedAt)))
    .groupBy(wallet.id)
    .orderBy(asc(wallet.sortOrder), asc(wallet.name))
}

export const getOverview = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(spaceInput)
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    const today = todayIso()
    const period = budgetPeriod(today, space.budgetMonthStartDay)

    // Totals only count wallets in the base currency until exchange rates exist (I-05).
    const [wallets, totals, [overall], recent] = await Promise.all([
      walletBalances(space.id, today),
      db
        .select({
          type: transaction.type,
          total: sum(transaction.amount).mapWith(Number),
        })
        .from(transaction)
        .innerJoin(wallet, eq(wallet.id, transaction.walletId))
        .where(
          and(
            eq(transaction.spaceId, space.id),
            eq(wallet.currency, space.baseCurrency),
            inArray(transaction.type, ['income', 'expense']),
            between(transaction.date, period.start, today),
          ),
        )
        .groupBy(transaction.type),
      db
        .select({ amount: budget.amount })
        .from(budget)
        .where(and(eq(budget.spaceId, space.id), isNull(budget.categoryId))),
      db.query.transaction.findMany({
        columns: transactionColumns,
        with: transactionWith,
        where: (t, { and, eq, lte }) =>
          and(eq(t.spaceId, space.id), lte(t.date, today)),
        orderBy: (t, { desc }) => [desc(t.date), desc(t.id)],
        limit: 5,
      }),
    ])

    const totalOf = (type: 'income' | 'expense') =>
      totals.find((t) => t.type === type)?.total ?? 0
    return {
      today,
      period,
      spent: totalOf('expense'),
      income: totalOf('income'),
      budget: overall?.amount ?? null,
      wallets,
      recent,
    }
  })

const cursorSchema = z.object({ date: z.iso.date(), id: z.uuid() })
export type TransactionCursor = z.infer<typeof cursorSchema>

// Newest first, keyset pagination on (date, id): stable while new rows are added.
export const listTransactions = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(spaceInput.extend({ cursor: cursorSchema.optional() }))
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    const { cursor } = data
    const rows = await db.query.transaction.findMany({
      columns: transactionColumns,
      with: transactionWith,
      where: (t, { and, eq, lt, or }) =>
        and(
          eq(t.spaceId, space.id),
          cursor
            ? or(
                lt(t.date, cursor.date),
                and(eq(t.date, cursor.date), lt(t.id, cursor.id)),
              )
            : undefined,
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
