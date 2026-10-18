import { and, eq, lte } from 'drizzle-orm'

import { db } from '@/db'
import { recurringRule, transaction } from '@/db/schema'
import { nextOccurrence, occurrencesUntil } from '@/lib/recurrence'

// Server-only: imported from server function handlers, never from modules the client
// bundles (an export next to server functions pulls the database driver into the browser).

const isDue = (spaceId: string, today: string) =>
  and(
    eq(recurringRule.spaceId, spaceId),
    eq(recurringRule.paused, false),
    lte(recurringRule.nextDate, today),
  )

// Creates the transactions recurring rules owe up to today. Runs when a space's data is
// read, so there is no scheduler: whoever opens the app first after the due date sees them.
// The rules are locked and re-read, so two requests at once cannot create a payment twice.
export async function createDueTransactions(spaceId: string, today: string) {
  const due = await db
    .select({ id: recurringRule.id })
    .from(recurringRule)
    .where(isDue(spaceId, today))
    .limit(1)
  if (due.length === 0) return

  await db.transaction(async (tx) => {
    const rules = await tx
      .select()
      .from(recurringRule)
      .where(isDue(spaceId, today))
      .for('update')
    for (const rule of rules) {
      const dates = occurrencesUntil(rule, today).filter(
        (date) => rule.nextDate !== null && date >= rule.nextDate,
      )
      if (dates.length) {
        await tx.insert(transaction).values(
          dates.map((date) => ({
            spaceId,
            date,
            type: rule.type,
            walletId: rule.walletId,
            amount: rule.amount,
            categoryId: rule.categoryId,
            toWalletId: rule.toWalletId,
            toAmount: rule.toAmount,
            payee: rule.payee,
            note: rule.note,
            recurringRuleId: rule.id,
          })),
        )
      }
      await tx
        .update(recurringRule)
        .set({ nextDate: nextOccurrence(rule, today) })
        .where(eq(recurringRule.id, rule.id))
    }
  })
}
