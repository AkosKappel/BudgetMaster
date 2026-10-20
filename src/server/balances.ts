import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq, isNotNull } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { settlement, spaceMember, transaction, user, wallet } from '@/db/schema'
import { memberBalances, settleUp } from '@/lib/balances'
import { currentDay } from '@/lib/today'
import { m } from '@/paraglide/messages.js'
import { authMiddleware } from '@/server/auth'
import { converted } from '@/server/convert'
import { ensureExchangeRates } from '@/server/exchange-rates'
import { requireMembership } from '@/server/membership'
import { spaceInput } from '@/server/spaces'

const membersOf = (spaceId: string) =>
  db
    .select({ id: spaceMember.userId, name: user.name })
    .from(spaceMember)
    .innerJoin(user, eq(user.id, spaceMember.userId))
    .where(eq(spaceMember.spaceId, spaceId))
    .orderBy(asc(spaceMember.createdAt))

// Balances between the members of a shared space and the payments that would clear them.
// Like budgets, other currencies count at the day's exchange rate (I-05).
export const getBalances = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(spaceInput)
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    await ensureExchangeRates()
    const [members, expenses, settlements] = await Promise.all([
      membersOf(space.id),
      db
        .select({
          paidBy: transaction.paidBy,
          // Other currencies at the day's rate (I-05); without one the expense stays out.
          amount: converted(
            transaction.amount,
            wallet.currency,
            space.baseCurrency,
            transaction.date,
          ).mapWith(Number),
        })
        .from(transaction)
        .innerJoin(wallet, eq(wallet.id, transaction.walletId))
        .where(
          and(
            eq(transaction.spaceId, space.id),
            eq(transaction.type, 'expense'),
            isNotNull(transaction.paidBy),
            isNotNull(
              converted(
                transaction.amount,
                wallet.currency,
                space.baseCurrency,
                transaction.date,
              ),
            ),
          ),
        ),
      db
        .select({
          id: settlement.id,
          fromUserId: settlement.fromUserId,
          toUserId: settlement.toUserId,
          amount: settlement.amount,
          date: settlement.date,
        })
        .from(settlement)
        .where(eq(settlement.spaceId, space.id))
        .orderBy(desc(settlement.date), desc(settlement.id)),
    ])

    const balances = memberBalances(
      members.map((m) => m.id),
      expenses.flatMap((e) => (e.paidBy ? [{ ...e, paidBy: e.paidBy }] : [])),
      settlements,
    )
    const nameOf = (id: string) =>
      members.find((m) => m.id === id)?.name ?? m.acct_former_member()
    return {
      currency: space.baseCurrency,
      canWrite: space.role !== 'viewer',
      currentUserId: context.user.id,
      members: members.map((m) => ({ ...m, balance: balances.get(m.id) ?? 0 })),
      transfers: settleUp(balances).map((t) => ({
        ...t,
        fromName: nameOf(t.from),
        toName: nameOf(t.to),
      })),
      recentSettlements: settlements.slice(0, 5).map((s) => ({
        ...s,
        fromName: nameOf(s.fromUserId),
        toName: nameOf(s.toUserId),
      })),
    }
  })

export type Balances = Awaited<ReturnType<typeof getBalances>>

// Records that one member paid another back.
export const recordSettlement = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(
    spaceInput.extend({
      fromUserId: z.string().min(1),
      toUserId: z.string().min(1),
      amount: z.int().positive().max(Number.MAX_SAFE_INTEGER),
    }),
  )
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    if (space.role === 'viewer') throw new Error(m.acct_viewers_cannot_change())
    if (data.fromUserId === data.toUserId)
      throw new Error(m.acct_settle_same_member())
    const members = await membersOf(space.id)
    const ids = new Set(members.map((m) => m.id))
    if (!ids.has(data.fromUserId) || !ids.has(data.toUserId))
      throw new Error(m.acct_settle_not_members())
    await db.insert(settlement).values({
      spaceId: space.id,
      fromUserId: data.fromUserId,
      toUserId: data.toUserId,
      amount: data.amount,
      date: currentDay(),
      createdBy: context.user.id,
    })
  })
