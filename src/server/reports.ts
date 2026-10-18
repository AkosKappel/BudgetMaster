import { createServerFn } from '@tanstack/react-start'
import { and, between, eq, inArray, lte, sql, sum } from 'drizzle-orm'

import { db } from '@/db'
import { category, transaction, wallet } from '@/db/schema'
import { addDays, budgetPeriod } from '@/lib/recurrence'
import { currentDay } from '@/lib/today'
import { authMiddleware } from '@/server/auth'
import { requireMembership } from '@/server/membership'
import { createDueTransactions } from '@/server/recurring-due'
import { spaceInput } from '@/server/spaces'

const MONTHS = 12

// Income and expenses per budget month for the last year, oldest first. Like budgets,
// it counts wallets in the space currency only (I-05) and leaves transfers out.
export const getCashFlow = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(spaceInput)
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    const today = currentDay()
    await createDueTransactions(space.id, today)

    const periods = [budgetPeriod(today, space.budgetMonthStartDay)]
    while (periods.length < MONTHS) {
      const first = periods[0]
      periods.unshift(
        budgetPeriod(addDays(first.start, -1), space.budgetMonthStartDay),
      )
    }

    const days = await db
      .select({
        date: transaction.date,
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
          between(transaction.date, periods[0].start, today),
        ),
      )
      .groupBy(transaction.date, transaction.type)

    const months = periods.map((period) => {
      const inPeriod = days.filter(
        (d) => d.date >= period.start && d.date <= period.end,
      )
      const total = (type: 'income' | 'expense') =>
        inPeriod
          .filter((d) => d.type === type)
          .reduce((sum, d) => sum + d.total, 0)
      const income = total('income')
      const expense = total('expense')
      return { ...period, income, expense, net: income - expense }
    })
    return { months, currency: space.baseCurrency, today }
  })

export type CashFlow = Awaited<ReturnType<typeof getCashFlow>>

// Total balance of the space-currency wallets (archived ones too: money does not vanish
// when a wallet is hidden) at the end of each of the last 12 budget months, and today.
export const getNetWorth = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(spaceInput)
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    const today = currentDay()
    await createDueTransactions(space.id, today)
    const inBase = and(
      eq(wallet.spaceId, space.id),
      eq(wallet.currency, space.baseCurrency),
    )

    const [wallets, outgoing, incoming] = await Promise.all([
      db.select({ initial: wallet.initialBalance }).from(wallet).where(inBase),
      // Income adds, expenses and outgoing transfers subtract.
      db
        .select({
          date: transaction.date,
          change:
            sql<number>`sum(case when ${transaction.type} = 'income' then ${transaction.amount} else -${transaction.amount} end)`.mapWith(
              Number,
            ),
        })
        .from(transaction)
        .innerJoin(wallet, eq(wallet.id, transaction.walletId))
        .where(and(inBase, lte(transaction.date, today)))
        .groupBy(transaction.date),
      // Incoming transfers add their target amount.
      db
        .select({
          date: transaction.date,
          change:
            sql<number>`sum(coalesce(${transaction.toAmount}, ${transaction.amount}))`.mapWith(
              Number,
            ),
        })
        .from(transaction)
        .innerJoin(wallet, eq(wallet.id, transaction.toWalletId))
        .where(and(inBase, lte(transaction.date, today)))
        .groupBy(transaction.date),
    ])

    const changes = [...outgoing, ...incoming].sort((a, b) =>
      a.date.localeCompare(b.date),
    )
    const start = wallets.reduce((sum, w) => sum + w.initial, 0)
    const balanceOn = (date: string) =>
      changes
        .filter((c) => c.date <= date)
        .reduce((sum, c) => sum + c.change, start)

    const ends = [today]
    let period = budgetPeriod(today, space.budgetMonthStartDay)
    while (ends.length <= MONTHS) {
      const previousEnd = addDays(period.start, -1)
      ends.unshift(previousEnd)
      period = budgetPeriod(previousEnd, space.budgetMonthStartDay)
    }
    return {
      points: ends.map((date) => ({ date, balance: balanceOn(date) })),
      currency: space.baseCurrency,
    }
  })

export type NetWorth = Awaited<ReturnType<typeof getNetWorth>>

// Spending per day for the last 26 full weeks plus this one, Monday first, for the calendar.
export const getSpendingCalendar = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(spaceInput)
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    const today = currentDay()
    const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7
    const from = addDays(today, -weekday - 26 * 7)

    const rows = await db
      .select({
        date: transaction.date,
        total: sum(transaction.amount).mapWith(Number),
      })
      .from(transaction)
      .innerJoin(wallet, eq(wallet.id, transaction.walletId))
      .where(
        and(
          eq(transaction.spaceId, space.id),
          eq(wallet.currency, space.baseCurrency),
          eq(transaction.type, 'expense'),
          between(transaction.date, from, today),
        ),
      )
      .groupBy(transaction.date)

    const totals = new Map(rows.map((r) => [r.date, r.total]))
    const days: { date: string; total: number }[] = []
    for (let date = from; date <= today; date = addDays(date, 1))
      days.push({ date, total: totals.get(date) ?? 0 })
    return { days, currency: space.baseCurrency }
  })

export type SpendingCalendar = Awaited<ReturnType<typeof getSpendingCalendar>>

const TREND_MONTHS = 6

// Income and spending per top-level category (subcategories rolled into their parent) for
// each of the last six budget months, oldest first; the current month is still running.
export const getCategoryTrends = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(spaceInput)
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    const today = currentDay()
    const periods = [budgetPeriod(today, space.budgetMonthStartDay)]
    while (periods.length < TREND_MONTHS) {
      periods.unshift(
        budgetPeriod(addDays(periods[0].start, -1), space.budgetMonthStartDay),
      )
    }

    const [categories, rows] = await Promise.all([
      db
        .select({
          id: category.id,
          name: category.name,
          type: category.type,
          color: category.color,
          parentId: category.parentId,
        })
        .from(category)
        .where(eq(category.spaceId, space.id)),
      db
        .select({
          categoryId: transaction.categoryId,
          date: transaction.date,
          total: sum(transaction.amount).mapWith(Number),
        })
        .from(transaction)
        .innerJoin(wallet, eq(wallet.id, transaction.walletId))
        .where(
          and(
            eq(transaction.spaceId, space.id),
            eq(wallet.currency, space.baseCurrency),
            inArray(transaction.type, ['income', 'expense']),
            between(transaction.date, periods[0].start, today),
          ),
        )
        .groupBy(transaction.categoryId, transaction.date),
    ])

    const topOf = (id: string | null) => {
      const found = categories.find((c) => c.id === id)
      return found?.parentId ?? found?.id ?? null
    }
    const series = categories
      .filter((c) => !c.parentId)
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        color: c.color,
        totals: periods.map((p) =>
          rows
            .filter(
              (r) =>
                topOf(r.categoryId) === c.id &&
                r.date >= p.start &&
                r.date <= p.end,
            )
            .reduce((s, r) => s + r.total, 0),
        ),
      }))
      .filter((c) => c.totals.some((t) => t > 0))
      .sort(
        (a, b) =>
          b.totals.reduce((s, t) => s + t, 0) -
          a.totals.reduce((s, t) => s + t, 0),
      )
    return { periods, categories: series, currency: space.baseCurrency }
  })

export type CategoryTrends = Awaited<ReturnType<typeof getCategoryTrends>>
