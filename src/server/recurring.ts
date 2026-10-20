import { createServerFn } from '@tanstack/react-start'
import {
  and,
  asc,
  eq,
  gte,
  isNotNull,
  isNull,
  lte,
  max,
  sql,
} from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { frequency, recurringRule, transaction, wallet } from '@/db/schema'
import { addDays, addMonths, nextOccurrence } from '@/lib/recurrence'
import { findSubscriptions, yearlyCost } from '@/lib/subscriptions'
import { currentDay } from '@/lib/today'
import { m } from '@/paraglide/messages.js'
import { authMiddleware } from '@/server/auth'
import { rateConverter } from '@/server/convert'
import { ensureExchangeRates } from '@/server/exchange-rates'
import { requireMembership } from '@/server/membership'
import { checkMovement } from '@/server/movement'
import { createDueTransactions } from '@/server/recurring-due'
import { spaceInput } from '@/server/spaces'

async function requireWriter(userId: string, spaceId: string) {
  const space = await requireMembership(userId, spaceId)
  if (space.role === 'viewer') throw new Error(m.setup_viewers_cannot_change())
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

    // Expenses entered by hand in the last 13 months that look like a subscription, minus
    // payees that already have a rule on that wallet.
    const today = currentDay()
    const [payments, wallets] = await Promise.all([
      db
        .select({
          date: transaction.date,
          payee: sql<string>`${transaction.payee}`,
          amount: transaction.amount,
          walletId: transaction.walletId,
          categoryId: transaction.categoryId,
        })
        .from(transaction)
        .where(
          and(
            eq(transaction.spaceId, space.id),
            eq(transaction.type, 'expense'),
            isNull(transaction.recurringRuleId),
            isNotNull(transaction.payee),
            gte(transaction.date, addMonths(today, -13)),
            lte(transaction.date, today),
          ),
        ),
      db
        .select({ id: wallet.id, currency: wallet.currency })
        .from(wallet)
        .where(eq(wallet.spaceId, space.id)),
    ])
    const covered = new Set(
      rules.map((r) => `${r.walletId}|${r.payee?.trim().toLowerCase()}`),
    )
    const suggestions = findSubscriptions(payments, today).filter(
      (s) => !covered.has(`${s.walletId}|${s.payee.trim().toLowerCase()}`),
    )

    // What the running expense rules cost a year, in the space currency at today's rates
    // (I-05); a currency without a rate is left out.
    await ensureExchangeRates()
    const convert = await rateConverter(
      space.baseCurrency,
      wallets.map((w) => w.currency),
      [today],
    )
    const currencyOf = new Map(wallets.map((w) => [w.id, w.currency]))
    const yearlyExpenses = rules
      .filter((r) => r.type === 'expense' && !r.paused && r.nextDate)
      .reduce(
        (sum, r) =>
          sum +
          (convert(
            yearlyCost(r.amount, r.frequency, r.interval),
            currencyOf.get(r.walletId) ?? '',
            today,
          ) ?? 0),
        0,
      )

    return {
      rules,
      suggestions,
      yearlyExpenses,
      currency: space.baseCurrency,
      canWrite: space.role !== 'viewer',
    }
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
      throw new Error(m.setup_recurring_end_before_start())
    const movement = await checkMovement(space.id, data)

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
    }
    const start = addDays(data.startDate, -1)
    if (!data.id) {
      await db.insert(recurringRule).values({
        ...values,
        spaceId: space.id,
        nextDate: nextOccurrence(data, start),
      })
    } else {
      const id = data.id
      // Locked like in createDueTransactions, so a due run at the same moment cannot
      // book a date this edit is about to move past.
      await db.transaction(async (tx) => {
        const [existing] = await tx
          .select({ nextDate: recurringRule.nextDate })
          .from(recurringRule)
          .where(
            and(eq(recurringRule.spaceId, space.id), eq(recurringRule.id, id)),
          )
          .for('update')
        if (!existing) throw new Error(m.setup_recurring_not_found())
        const [{ last }] = await tx
          .select({ last: max(transaction.date) })
          .from(transaction)
          .where(eq(transaction.recurringRuleId, id))
        // Dates before the stored next date were booked, skipped while paused or
        // deleted on purpose; an edit must not bring them back.
        const after = [
          start,
          last,
          existing.nextDate && addDays(existing.nextDate, -1),
        ].reduce<string>((a, b) => (b && b > a ? b : a), start)
        await tx
          .update(recurringRule)
          .set({ ...values, nextDate: nextOccurrence(data, after) })
          .where(eq(recurringRule.id, id))
      })
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
    if (!rule) throw new Error(m.setup_recurring_not_found())
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
