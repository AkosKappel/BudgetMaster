import { createServerFn } from '@tanstack/react-start'
import { and, between, eq, isNull, sql, sum } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { budget, category, transaction, wallet } from '@/db/schema'
import { addDays, addMonths, budgetPeriod } from '@/lib/recurrence'
import { currentDay } from '@/lib/today'
import { authMiddleware } from '@/server/auth'
import { requireMembership } from '@/server/membership'
import { spaceInput } from '@/server/spaces'

const daysInRange = (start: string, end: string) =>
  Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1

// Expenses per category and per day for one budget month, the budgets, and the previous
// month for comparison. Only wallets in the space currency count until exchange rates
// exist (I-05). `offset` 0 is the current budget month, -1 the one before, and so on.
export const getBudgetReport = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(spaceInput.extend({ offset: z.int().min(-36).max(0) }))
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    const today = currentDay()
    const startDay = space.budgetMonthStartDay
    const current = budgetPeriod(today, startDay)
    const period = budgetPeriod(addMonths(current.start, data.offset), startDay)
    const previous = budgetPeriod(addMonths(period.start, -1), startDay)
    const asOf = data.offset === 0 ? today : period.end

    const expensesIn = (from: string, to: string) =>
      and(
        eq(transaction.spaceId, space.id),
        eq(transaction.type, 'expense'),
        eq(wallet.currency, space.baseCurrency),
        between(transaction.date, from, to),
      )

    const [byCategory, byDay, categories, budgets] = await Promise.all([
      db
        .select({
          categoryId: transaction.categoryId,
          total: sum(transaction.amount).mapWith(Number),
        })
        .from(transaction)
        .innerJoin(wallet, eq(wallet.id, transaction.walletId))
        .where(expensesIn(period.start, asOf))
        .groupBy(transaction.categoryId),
      db
        .select({
          date: transaction.date,
          total: sum(transaction.amount).mapWith(Number),
        })
        .from(transaction)
        .innerJoin(wallet, eq(wallet.id, transaction.walletId))
        .where(expensesIn(previous.start, asOf))
        .groupBy(transaction.date),
      db
        .select({
          id: category.id,
          name: category.name,
          icon: category.icon,
          color: category.color,
          parentId: category.parentId,
          archived: sql<boolean>`${category.archivedAt} is not null`,
        })
        .from(category)
        .where(
          and(eq(category.spaceId, space.id), eq(category.type, 'expense')),
        ),
      db
        .select({
          id: budget.id,
          categoryId: budget.categoryId,
          amount: budget.amount,
        })
        .from(budget)
        .where(eq(budget.spaceId, space.id)),
    ])

    const own = new Map(byCategory.map((r) => [r.categoryId, r.total]))
    const childrenOf = (id: string) =>
      categories.filter((c) => c.parentId === id)
    // A parent's total includes its children (one level, see D-07).
    const rolledUp = (id: string) =>
      (own.get(id) ?? 0) +
      childrenOf(id).reduce((sum, c) => sum + (own.get(c.id) ?? 0), 0)
    const spent = byCategory.reduce((sum, r) => sum + r.total, 0)

    const breakdown = categories
      .filter((c) => !c.parentId)
      .map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        total: rolledUp(c.id),
        children: [
          ...childrenOf(c.id).map((child) => ({
            id: child.id,
            name: child.name,
            total: own.get(child.id) ?? 0,
          })),
          // Spending booked on the parent itself.
          ...(childrenOf(c.id).length && own.get(c.id)
            ? [
                {
                  id: c.id,
                  name: `${c.name}, not split`,
                  total: own.get(c.id) ?? 0,
                },
              ]
            : []),
        ]
          .filter((child) => child.total > 0)
          .sort((a, b) => b.total - a.total),
      }))
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total)

    const overall = budgets.find((b) => b.categoryId === null) ?? null
    const categoryBudgets = budgets
      .flatMap((b) => {
        const cat = categories.find((c) => c.id === b.categoryId)
        if (!cat) return []
        return [
          {
            id: b.id,
            categoryId: cat.id,
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
            isParent: childrenOf(cat.id).length > 0,
            amount: b.amount,
            spent: rolledUp(cat.id),
          },
        ]
      })
      .sort((a, b) => b.spent / b.amount - a.spent / a.amount)

    // Cumulative spending per day of the month, last month aligned by day number.
    const daily = new Map(byDay.map((r) => [r.date, r.total]))
    const length = daysInRange(period.start, period.end)
    let runningNow = 0
    let runningPrevious = 0
    const pace = Array.from({ length }, (_, i) => {
      const date = addDays(period.start, i)
      const previousDate = addDays(previous.start, i)
      if (previousDate <= previous.end)
        runningPrevious += daily.get(previousDate) ?? 0
      runningNow += daily.get(date) ?? 0
      return {
        day: i + 1,
        date,
        current: date <= asOf ? runningNow : null,
        previous: runningPrevious,
      }
    })

    return {
      today,
      period,
      previous,
      isCurrent: data.offset === 0,
      daysLeft: data.offset === 0 ? daysInRange(today, period.end) : 0,
      currency: space.baseCurrency,
      canWrite: space.role !== 'viewer',
      spent,
      overall: overall && { id: overall.id, amount: overall.amount },
      categoryBudgets,
      breakdown,
      pace,
      // Categories that can still get a budget.
      unbudgeted: categories
        .filter(
          (c) => !c.archived && !budgets.some((b) => b.categoryId === c.id),
        )
        .map((c) => ({ id: c.id, name: c.name, parentId: c.parentId })),
    }
  })

export const setBudget = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(
    spaceInput.extend({
      categoryId: z.uuid().nullable(),
      amount: z.int().positive().max(Number.MAX_SAFE_INTEGER),
    }),
  )
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    if (space.role === 'viewer')
      throw new Error('Viewers cannot change budgets.')
    if (data.categoryId) {
      const [cat] = await db
        .select({ type: category.type })
        .from(category)
        .where(
          and(eq(category.id, data.categoryId), eq(category.spaceId, space.id)),
        )
      if (cat?.type !== 'expense')
        throw new Error('Budgets need an expense category.')
    }
    // One budget per category (or overall): update it if it exists.
    await db
      .insert(budget)
      .values({
        spaceId: space.id,
        categoryId: data.categoryId,
        amount: data.amount,
      })
      .onConflictDoUpdate({
        target: [budget.spaceId, budget.categoryId],
        set: { amount: data.amount, updatedAt: new Date() },
      })
  })

export const deleteBudget = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(spaceInput.extend({ categoryId: z.uuid().nullable() }))
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    if (space.role === 'viewer')
      throw new Error('Viewers cannot change budgets.')
    await db
      .delete(budget)
      .where(
        and(
          eq(budget.spaceId, space.id),
          data.categoryId
            ? eq(budget.categoryId, data.categoryId)
            : isNull(budget.categoryId),
        ),
      )
  })

export type BudgetReport = Awaited<ReturnType<typeof getBudgetReport>>
