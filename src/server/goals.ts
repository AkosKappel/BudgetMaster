import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq, ne, sql } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { savingsGoal, wallet } from '@/db/schema'
import { goalProgress } from '@/lib/goals'
import { currentDay } from '@/lib/today'
import { authMiddleware } from '@/server/auth'
import { requireMembership } from '@/server/membership'
import { createDueTransactions } from '@/server/recurring-due'
import { spaceInput } from '@/server/spaces'
import { walletBalances } from '@/server/wallet-balances'

async function requireWriter(userId: string, spaceId: string) {
  const space = await requireMembership(userId, spaceId)
  if (space.role === 'viewer')
    throw new Error('Viewers cannot change this space.')
  return space
}

// Goals with their wallet's balance today as the amount saved, soonest date first.
export const listGoals = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(spaceInput)
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    const today = currentDay()
    await createDueTransactions(space.id, today)
    const [goals, wallets] = await Promise.all([
      db
        .select()
        .from(savingsGoal)
        .where(eq(savingsGoal.spaceId, space.id))
        .orderBy(
          sql`${savingsGoal.targetDate} is null`,
          asc(savingsGoal.targetDate),
          asc(savingsGoal.name),
        ),
      walletBalances(space.id, today, { includeArchived: true }),
    ])
    return {
      goals: goals.flatMap((g) => {
        const w = wallets.find((x) => x.id === g.walletId)
        if (!w) return []
        return [
          {
            id: g.id,
            name: g.name,
            walletId: g.walletId,
            walletName: w.name,
            currency: w.currency,
            color: w.color,
            targetAmount: g.targetAmount,
            targetDate: g.targetDate,
            saved: w.balance,
            ...goalProgress(w.balance, g.targetAmount, today, g.targetDate),
          },
        ]
      }),
      canWrite: space.role !== 'viewer',
    }
  })

export type Goal = Awaited<ReturnType<typeof listGoals>>['goals'][number]

const goalInput = spaceInput.extend({
  // Missing for a new goal.
  id: z.uuid().optional(),
  name: z.string().trim().min(1, 'Enter a name.').max(60),
  walletId: z.uuid(),
  targetAmount: z.int().positive().max(Number.MAX_SAFE_INTEGER),
  targetDate: z.iso.date().nullable(),
})
export type GoalInput = z.input<typeof goalInput>

export const saveGoal = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(goalInput)
  .handler(async ({ context, data }) => {
    const space = await requireWriter(context.user.id, data.spaceId)
    const [owned] = await db
      .select({ id: wallet.id })
      .from(wallet)
      .where(and(eq(wallet.spaceId, space.id), eq(wallet.id, data.walletId)))
    if (!owned) throw new Error('Choose a wallet of this space.')
    const [duplicate] = await db
      .select({ id: savingsGoal.id })
      .from(savingsGoal)
      .where(
        and(
          eq(savingsGoal.spaceId, space.id),
          sql`lower(${savingsGoal.name}) = lower(${data.name})`,
          data.id ? ne(savingsGoal.id, data.id) : undefined,
        ),
      )
    if (duplicate) throw new Error(`There is already a goal "${data.name}".`)

    const values = {
      name: data.name,
      walletId: data.walletId,
      targetAmount: data.targetAmount,
      targetDate: data.targetDate,
    }
    if (data.id) {
      await db
        .update(savingsGoal)
        .set(values)
        .where(
          and(eq(savingsGoal.spaceId, space.id), eq(savingsGoal.id, data.id)),
        )
    } else {
      await db.insert(savingsGoal).values({ ...values, spaceId: space.id })
    }
  })

// The money stays in the wallet; only the goal goes.
export const deleteGoal = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(spaceInput.extend({ id: z.uuid() }))
  .handler(async ({ context, data }) => {
    const space = await requireWriter(context.user.id, data.spaceId)
    await db
      .delete(savingsGoal)
      .where(
        and(eq(savingsGoal.spaceId, space.id), eq(savingsGoal.id, data.id)),
      )
  })
