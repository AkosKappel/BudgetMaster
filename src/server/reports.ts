import { createServerFn } from '@tanstack/react-start'
import { and, between, eq, gt, inArray, isNotNull, lte, sql } from 'drizzle-orm'

import { z } from 'zod'

import { db } from '@/db'
import { category, recurringRule, transaction, wallet } from '@/db/schema'
import {
  changeFor,
  type ForecastEvent,
  type Movement,
  projectBalance,
  ruleDates,
} from '@/lib/forecast'
import {
  findCategoryRise,
  findDuplicates,
  findPriceRises,
} from '@/lib/insights'
import { priceChanges } from '@/lib/price-changes'
import { addDays, addMonths, budgetPeriod } from '@/lib/recurrence'
import { currentDay } from '@/lib/today'
import { yearReview } from '@/lib/year-review'
import { m } from '@/paraglide/messages.js'
import { authMiddleware } from '@/server/auth'
import { categoryLines } from '@/server/category-lines'
import { converted, rateConverter, sumConverted } from '@/server/convert'
import { ensureExchangeRates } from '@/server/exchange-rates'
import { requireMembership } from '@/server/membership'
import { createDueTransactions } from '@/server/recurring-due'
import { spaceInput } from '@/server/spaces'
import { walletBalances } from '@/server/wallet-balances'

const MONTHS = 12

// Income and expenses per budget month for the last year, oldest first. Like budgets, other
// currencies count at the day's exchange rate (I-05); transfers are left out.
export const getCashFlow = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(spaceInput)
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    const today = currentDay()
    await Promise.all([
      createDueTransactions(space.id, today),
      ensureExchangeRates(),
    ])

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
        total: sumConverted(
          transaction.amount,
          wallet.currency,
          space.baseCurrency,
          transaction.date,
        ),
      })
      .from(transaction)
      .innerJoin(wallet, eq(wallet.id, transaction.walletId))
      .where(
        and(
          eq(transaction.spaceId, space.id),
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

// Total balance of all wallets (archived ones too: money does not vanish when a wallet is
// hidden) at the end of each of the last 12 budget months, and today. Each wallet's balance
// on a day is valued at that day's exchange rate (I-05); a currency without a rate is left
// out.
export const getNetWorth = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(spaceInput)
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    const today = currentDay()
    await Promise.all([
      createDueTransactions(space.id, today),
      ensureExchangeRates(),
    ])
    const inSpace = eq(wallet.spaceId, space.id)

    const [wallets, outgoing, incoming] = await Promise.all([
      db
        .select({
          id: wallet.id,
          currency: wallet.currency,
          initial: wallet.initialBalance,
        })
        .from(wallet)
        .where(inSpace),
      // Income adds, expenses and outgoing transfers subtract.
      db
        .select({
          walletId: transaction.walletId,
          date: transaction.date,
          change:
            sql<number>`sum(case when ${transaction.type} = 'income' then ${transaction.amount} else -${transaction.amount} end)`.mapWith(
              Number,
            ),
        })
        .from(transaction)
        .innerJoin(wallet, eq(wallet.id, transaction.walletId))
        .where(and(inSpace, lte(transaction.date, today)))
        .groupBy(transaction.walletId, transaction.date),
      // Incoming transfers add their target amount.
      db
        .select({
          walletId: sql<string>`${transaction.toWalletId}`,
          date: transaction.date,
          change:
            sql<number>`sum(coalesce(${transaction.toAmount}, ${transaction.amount}))`.mapWith(
              Number,
            ),
        })
        .from(transaction)
        .innerJoin(wallet, eq(wallet.id, transaction.toWalletId))
        .where(and(inSpace, lte(transaction.date, today)))
        .groupBy(transaction.toWalletId, transaction.date),
    ])

    const ends = [today]
    let period = budgetPeriod(today, space.budgetMonthStartDay)
    while (ends.length <= MONTHS) {
      const previousEnd = addDays(period.start, -1)
      ends.unshift(previousEnd)
      period = budgetPeriod(previousEnd, space.budgetMonthStartDay)
    }

    const convert = await rateConverter(
      space.baseCurrency,
      wallets.map((w) => w.currency),
      ends,
    )
    const changes = [...outgoing, ...incoming]
    const balanceOn = (date: string) =>
      wallets.reduce((total, w) => {
        const own = changes
          .filter((c) => c.walletId === w.id && c.date <= date)
          .reduce((sum, c) => sum + c.change, w.initial)
        return total + (convert(own, w.currency, date) ?? 0)
      }, 0)

    return {
      points: ends.map((date) => ({ date, balance: balanceOn(date) })),
      currency: space.baseCurrency,
    }
  })

export type NetWorth = Awaited<ReturnType<typeof getNetWorth>>

// Spending per day for the last 26 full weeks plus this one, starting on the user's first
// day of the week, for the calendar.
export const getSpendingCalendar = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(spaceInput)
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    const today = currentDay()
    await Promise.all([
      createDueTransactions(space.id, today),
      ensureExchangeRates(),
    ])
    const weekday =
      (new Date(`${today}T00:00:00Z`).getUTCDay() -
        context.user.weekStartsOn +
        7) %
      7
    const from = addDays(today, -weekday - 26 * 7)

    const rows = await db
      .select({
        date: transaction.date,
        total: sumConverted(
          transaction.amount,
          wallet.currency,
          space.baseCurrency,
          transaction.date,
        ),
      })
      .from(transaction)
      .innerJoin(wallet, eq(wallet.id, transaction.walletId))
      .where(
        and(
          eq(transaction.spaceId, space.id),
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
    await Promise.all([
      createDueTransactions(space.id, today),
      ensureExchangeRates(),
    ])
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
      // Category lines: a split receipt counts in each of its categories.
      db
        .select({
          categoryId: categoryLines.categoryId,
          date: categoryLines.date,
          total: sumConverted(
            categoryLines.amount,
            wallet.currency,
            space.baseCurrency,
            categoryLines.date,
          ),
        })
        .from(categoryLines)
        .innerJoin(wallet, eq(wallet.id, categoryLines.walletId))
        .where(
          and(
            eq(categoryLines.spaceId, space.id),
            inArray(categoryLines.type, ['income', 'expense']),
            between(categoryLines.date, periods[0].start, today),
          ),
        )
        .groupBy(categoryLines.categoryId, categoryLines.date),
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

const FORECAST_DAYS = 90

// Balance of all wallets in the space currency (today's rates) for the next 90 days: today's
// balance plus the payments recurring rules will make and transactions already entered for
// later dates. Everyday spending is not guessed, so the line is what is certain, not a
// prediction.
export const getForecast = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(spaceInput)
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    const today = currentDay()
    await Promise.all([
      createDueTransactions(space.id, today),
      ensureExchangeRates(),
    ])
    const until = addDays(today, FORECAST_DAYS)

    const [wallets, rules, planned] = await Promise.all([
      walletBalances(space.id, today),
      db.query.recurringRule.findMany({
        where: and(
          eq(recurringRule.spaceId, space.id),
          eq(recurringRule.paused, false),
        ),
        with: { category: { columns: { name: true } } },
      }),
      db.query.transaction.findMany({
        where: and(
          eq(transaction.spaceId, space.id),
          gt(transaction.date, today),
          lte(transaction.date, until),
        ),
        with: { category: { columns: { name: true } } },
      }),
    ])
    // Today's rates: a wallet in another currency counts at its value today, and so do its
    // future payments. A currency without a rate stays out.
    const convert = await rateConverter(
      space.baseCurrency,
      wallets.map((w) => w.currency),
      [today],
    )
    const currencyOf = new Map(wallets.map((w) => [w.id, w.currency]))
    const counted = wallets.filter(
      (w) => convert(0, w.currency, today) !== null,
    )
    const ids = new Set(counted.map((w) => w.id))
    const inBase = (amount: number, walletId: string | null) =>
      walletId && ids.has(walletId)
        ? (convert(amount, currencyOf.get(walletId) ?? '', today) ?? 0)
        : 0
    const valued = <T extends Movement>(item: T): T => ({
      ...item,
      amount: inBase(item.amount, item.walletId),
      toAmount: item.toWalletId
        ? inBase(item.toAmount ?? item.amount, item.toWalletId)
        : null,
    })
    const label = (item: {
      payee: string | null
      category: { name: string } | null
    }) => item.payee ?? item.category?.name ?? m.ov_forecast_transfer()

    const events: ForecastEvent[] = [
      ...rules.flatMap((rule) =>
        ruleDates(rule, today, until).map((date) => ({
          id: `${rule.id}-${date}`,
          date,
          label: label(rule),
          change: changeFor(valued(rule), ids),
        })),
      ),
      ...planned.map((t) => ({
        id: t.id,
        date: t.date,
        label: label(t),
        change: changeFor(valued(t), ids),
      })),
    ]
      .filter((e) => e.change !== 0)
      .sort((a, b) => a.date.localeCompare(b.date))

    const balance = counted.reduce((sum, w) => sum + inBase(w.balance, w.id), 0)
    return {
      ...projectBalance(balance, today, FORECAST_DAYS, events),
      events,
      currency: space.baseCurrency,
    }
  })

export type Forecast = Awaited<ReturnType<typeof getForecast>>

// Typical amounts per payee now against a year ago (I-16), space-currency wallets only.
export const getPriceChanges = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(spaceInput)
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    const today = currentDay()
    await Promise.all([
      createDueTransactions(space.id, today),
      ensureExchangeRates(),
    ])
    const purchases = await db
      .select({
        date: transaction.date,
        payee: sql<string>`${transaction.payee}`,
        amount: transaction.amount,
      })
      .from(transaction)
      .innerJoin(wallet, eq(wallet.id, transaction.walletId))
      .where(
        and(
          eq(transaction.spaceId, space.id),
          eq(wallet.currency, space.baseCurrency),
          eq(transaction.type, 'expense'),
          isNotNull(transaction.payee),
          between(transaction.date, addMonths(today, -15), today),
        ),
      )
    return { ...priceChanges(purchases, today), currency: space.baseCurrency }
  })

export type PriceChanges = Awaited<ReturnType<typeof getPriceChanges>>

// One calendar year in a few numbers (I-14), other currencies converted, plus the years
// that have transactions so the page can offer them.
export const getYearReview = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(spaceInput.extend({ year: z.int().min(2000).max(2100) }))
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    const today = currentDay()
    await Promise.all([
      createDueTransactions(space.id, today),
      ensureExchangeRates(),
    ])
    const [rows, [range], [topCategory]] = await Promise.all([
      db
        .select({
          date: transaction.date,
          type: sql<'income' | 'expense'>`${transaction.type}`,
          amount: converted(
            transaction.amount,
            wallet.currency,
            space.baseCurrency,
            transaction.date,
          ).mapWith(Number),
          payee: transaction.payee,
          category: category.name,
        })
        .from(transaction)
        .innerJoin(wallet, eq(wallet.id, transaction.walletId))
        .leftJoin(category, eq(category.id, transaction.categoryId))
        .where(
          and(
            eq(transaction.spaceId, space.id),
            inArray(transaction.type, ['income', 'expense']),
            sql`${converted(transaction.amount, wallet.currency, space.baseCurrency, transaction.date)} is not null`,
            between(
              transaction.date,
              `${data.year}-01-01`,
              `${data.year}-12-31`,
            ),
            lte(transaction.date, today),
          ),
        ),
      db
        .select({
          first: sql<string | null>`min(${transaction.date})`,
        })
        .from(transaction)
        .where(eq(transaction.spaceId, space.id)),
      // From category lines, so split receipts count in each of their categories.
      db
        .select({
          name: category.name,
          total: sumConverted(
            categoryLines.amount,
            wallet.currency,
            space.baseCurrency,
            categoryLines.date,
          ),
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(categoryLines)
        .innerJoin(wallet, eq(wallet.id, categoryLines.walletId))
        .innerJoin(category, eq(category.id, categoryLines.categoryId))
        .where(
          and(
            eq(categoryLines.spaceId, space.id),
            eq(categoryLines.type, 'expense'),
            between(
              categoryLines.date,
              `${data.year}-01-01`,
              `${data.year}-12-31`,
            ),
            lte(categoryLines.date, today),
          ),
        )
        .groupBy(category.name)
        .orderBy(sql`2 desc`)
        .limit(1),
    ])
    const thisYear = Number(today.slice(0, 4))
    const firstYear = range?.first ? Number(range.first.slice(0, 4)) : thisYear
    return {
      ...yearReview(rows, data.year, today),
      topCategory: topCategory ?? null,
      years: Array.from(
        { length: thisYear - firstYear + 1 },
        (_, i) => thisYear - i,
      ),
      currency: space.baseCurrency,
    }
  })

export type YearReviewData = Awaited<ReturnType<typeof getYearReview>>

// Things worth a look (AI-04 without a model): possible double charges, recurring payments
// that got more expensive, and the category most up on the same days of last month.
export const getInsights = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(spaceInput)
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    const today = currentDay()
    await Promise.all([
      createDueTransactions(space.id, today),
      ensureExchangeRates(),
    ])
    const period = budgetPeriod(today, space.budgetMonthStartDay)
    const previous = budgetPeriod(
      addMonths(period.start, -1),
      space.budgetMonthStartDay,
    )
    const elapsed = Math.round(
      (Date.parse(today) - Date.parse(period.start)) / 86_400_000,
    )
    const previousTo = addDays(previous.start, elapsed)

    const [expenses, lines, categories] = await Promise.all([
      db
        .select({
          id: transaction.id,
          date: transaction.date,
          payee: transaction.payee,
          amount: transaction.amount,
          walletId: transaction.walletId,
          recurringRuleId: transaction.recurringRuleId,
        })
        .from(transaction)
        .innerJoin(wallet, eq(wallet.id, transaction.walletId))
        .where(
          and(
            eq(transaction.spaceId, space.id),
            eq(transaction.type, 'expense'),
            eq(wallet.currency, space.baseCurrency),
            between(transaction.date, addMonths(today, -13), today),
          ),
        ),
      db
        .select({
          categoryId: categoryLines.categoryId,
          date: categoryLines.date,
          amount: converted(
            categoryLines.amount,
            wallet.currency,
            space.baseCurrency,
            categoryLines.date,
          ).mapWith(Number),
        })
        .from(categoryLines)
        .innerJoin(wallet, eq(wallet.id, categoryLines.walletId))
        .where(
          and(
            eq(categoryLines.spaceId, space.id),
            eq(categoryLines.type, 'expense'),
            sql`${converted(categoryLines.amount, wallet.currency, space.baseCurrency, categoryLines.date)} is not null`,
            between(categoryLines.date, previous.start, today),
          ),
        ),
      db
        .select({
          id: category.id,
          name: category.name,
          parentId: category.parentId,
        })
        .from(category)
        .where(eq(category.spaceId, space.id)),
    ])

    const byId = new Map(categories.map((c) => [c.id, c]))
    const topName = (id: string) => {
      const c = byId.get(id)
      return (c?.parentId ? byId.get(c.parentId)?.name : c?.name) ?? ''
    }
    const named = lines.map((l) => ({ ...l, category: topName(l.categoryId) }))
    const rise = findCategoryRise(
      named.filter((l) => l.date >= period.start),
      named.filter((l) => l.date >= previous.start && l.date <= previousTo),
    )
    return {
      currency: space.baseCurrency,
      insights: [
        ...findDuplicates(expenses, today),
        ...findPriceRises(expenses, today),
        ...(rise ? [rise] : []),
      ],
    }
  })

export type Insights = Awaited<ReturnType<typeof getInsights>>
