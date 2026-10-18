import { createServerFn } from '@tanstack/react-start'
import { and, between, eq, inArray, sum } from 'drizzle-orm'

import { db } from '@/db'
import { transaction, wallet } from '@/db/schema'
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
