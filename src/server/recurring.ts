import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq, max, sql } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { frequency, recurringRule, transaction } from '@/db/schema'
import { addDays, nextOccurrence } from '@/lib/recurrence'
import { currentDay } from '@/lib/today'
import { authMiddleware } from '@/server/auth'
import { requireMembership } from '@/server/membership'
import { checkMovement } from '@/server/movement'
import { createDueTransactions } from '@/server/recurring-due'
import { spaceInput } from '@/server/spaces'

async function requireWriter(userId: string, spaceId: string) {
  const space = await requireMembership(userId, spaceId)
  if (space.role === 'viewer')
    throw new Error('Viewers cannot change this space.')
  return space
}

// Active rules first by their next date, ended ones last.
export const listRecurringRules = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(spaceInput)
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    await createDueTransactions(space.id, currentDay())
    const rules = await db
      .select()
      .from(recurringRule)
      .where(eq(recurringRule.spaceId, space.id))
      .orderBy(
        sql`${recurringRule.nextDate} is null`,
        asc(recurringRule.nextDate),
        asc(recurringRule.payee),
      )
    return { rules, canWrite: space.role !== 'viewer' }
  })

export type RecurringRule = Awaited<
  ReturnType<typeof listRecurringRules>
>['rules'][number]

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => value || null)

const ruleInput = spaceInput.extend({
  // Missing for a new rule.
  id: z.uuid().optional(),
  type: z.enum(['income', 'expense', 'transfer']),
  walletId: z.uuid(),
  amount: z.int().positive().max(Number.MAX_SAFE_INTEGER),
  categoryId: z.uuid().nullable(),
  toWalletId: z.uuid().nullable(),
  toAmount: z.int().positive().max(Number.MAX_SAFE_INTEGER).nullable(),
  payee: optionalText(120),
  note: optionalText(2000),
  frequency: z.enum(frequency.enumValues),
  interval: z.int().min(1).max(365),
  startDate: z.iso.date(),
  endDate: z.iso.date().nullable(),
})
export type RecurringRuleInput = z.input<typeof ruleInput>

// A new rule starts at its start date, so payments due up to today are created at once.
// An edited rule continues after the last payment it already made, so changing the
// amount or the schedule never repeats a payment.
export const saveRecurringRule = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(ruleInput)
  .handler(async ({ context, data }) => {
    const space = await requireWriter(context.user.id, data.spaceId)
    if (data.endDate && data.endDate < data.startDate)
      throw new Error('The end date must be after the start date.')
    const movement = await checkMovement(space.id, data)

    let after = addDays(data.startDate, -1)
    if (data.id) {
      const [existing] = await db
        .select({ id: recurringRule.id })
        .from(recurringRule)
        .where(
          and(
            eq(recurringRule.spaceId, space.id),
            eq(recurringRule.id, data.id),
          ),
        )
      if (!existing) throw new Error('Recurring payment not found.')
      const [{ last }] = await db
        .select({ last: max(transaction.date) })
        .from(transaction)
        .where(eq(transaction.recurringRuleId, data.id))
      if (last && last > after) after = last
    }

    const values = {
      type: data.type,
      walletId: data.walletId,
      amount: data.amount,
      ...movement,
      payee: data.payee,
      note: data.note,
      frequency: data.frequency,
      interval: data.interval,
      startDate: data.startDate,
      endDate: data.endDate,
      nextDate: nextOccurrence(data, after),
    }
    if (data.id) {
      await db
        .update(recurringRule)
        .set(values)
        .where(eq(recurringRule.id, data.id))
    } else {
      await db.insert(recurringRule).values({ ...values, spaceId: space.id })
    }
    await createDueTransactions(space.id, currentDay())
  })

// Paused rules skip their due dates: resuming continues from the next future date
// instead of catching up on everything missed.
export const setRecurringRulePaused = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(spaceInput.extend({ id: z.uuid(), paused: z.boolean() }))
  .handler(async ({ context, data }) => {
    const space = await requireWriter(context.user.id, data.spaceId)
    const [rule] = await db
      .select()
      .from(recurringRule)
      .where(
        and(eq(recurringRule.spaceId, space.id), eq(recurringRule.id, data.id)),
      )
    if (!rule) throw new Error('Recurring payment not found.')
    const today = currentDay()
    await db
      .update(recurringRule)
      .set({
        paused: data.paused,
        ...(data.paused ? {} : { nextDate: nextOccurrence(rule, today) }),
      })
      .where(eq(recurringRule.id, rule.id))
  })

// Payments it already made stay; they just lose the link to the rule.
export const deleteRecurringRule = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(spaceInput.extend({ id: z.uuid() }))
  .handler(async ({ context, data }) => {
    const space = await requireWriter(context.user.id, data.spaceId)
    await db
      .delete(recurringRule)
      .where(
        and(eq(recurringRule.spaceId, space.id), eq(recurringRule.id, data.id)),
      )
  })
