import { and, eq, gte, inArray } from 'drizzle-orm'

import { db } from '@/db'
import {
  activityEvent,
  category,
  importBatch,
  recurringRule,
  type TransactionSnapshot,
  tag,
  transaction,
  transactionSplit,
  transactionTag,
  wallet,
} from '@/db/schema'
import { m } from '@/paraglide/messages.js'
import { RESTORE_DAYS } from '@/server/activity-log'

// Server-only: imported from server function handlers, never from modules the client
// bundles (helpers next to server functions keep the database driver in the browser:
// `Buffer is not defined`). Restore and undo from the activity log (I-13).

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

// The whole transaction as the activity log keeps it (I-13): its own fields, tags and
// splits, enough to put it back after a deletion or a change.
export async function snapshotOf(
  tx: Tx,
  spaceId: string,
  id: string,
): Promise<TransactionSnapshot | null> {
  const [[row], tags, splits] = await Promise.all([
    tx
      .select()
      .from(transaction)
      .where(and(eq(transaction.id, id), eq(transaction.spaceId, spaceId)))
      .for('update'),
    tx
      .select({ tagId: transactionTag.tagId })
      .from(transactionTag)
      .where(eq(transactionTag.transactionId, id)),
    tx
      .select({
        categoryId: transactionSplit.categoryId,
        amount: transactionSplit.amount,
        note: transactionSplit.note,
      })
      .from(transactionSplit)
      .where(eq(transactionSplit.transactionId, id)),
  ])
  if (!row) return null
  return {
    type: row.type,
    date: row.date,
    walletId: row.walletId,
    amount: row.amount,
    payee: row.payee,
    categoryId: row.categoryId,
    toWalletId: row.toWalletId,
    toAmount: row.toAmount,
    note: row.note,
    createdBy: row.createdBy,
    paidBy: row.paidBy,
    recurringRuleId: row.recurringRuleId,
    importId: row.importId,
    tagIds: tags.map((t) => t.tagId),
    splits,
  }
}

// Checks that a snapshot can be written back: its wallets and categories must still exist.
// Links to a recurring rule, an import or tags that are gone since are dropped.
export async function revive(spaceId: string, snapshot: TransactionSnapshot) {
  const walletIds = [snapshot.walletId, snapshot.toWalletId].filter(
    (id): id is string => id !== null,
  )
  const categoryIds = [
    snapshot.categoryId,
    ...snapshot.splits.map((p) => p.categoryId),
  ].filter((id): id is string => id !== null)
  const [wallets, categories, rules, imports, tags] = await Promise.all([
    db
      .select({ id: wallet.id })
      .from(wallet)
      .where(and(eq(wallet.spaceId, spaceId), inArray(wallet.id, walletIds))),
    categoryIds.length
      ? db
          .select({ id: category.id })
          .from(category)
          .where(
            and(
              eq(category.spaceId, spaceId),
              inArray(category.id, categoryIds),
            ),
          )
      : Promise.resolve([]),
    snapshot.recurringRuleId
      ? db
          .select({ id: recurringRule.id })
          .from(recurringRule)
          .where(eq(recurringRule.id, snapshot.recurringRuleId))
      : Promise.resolve([]),
    snapshot.importId
      ? db
          .select({ id: importBatch.id })
          .from(importBatch)
          .where(eq(importBatch.id, snapshot.importId))
      : Promise.resolve([]),
    snapshot.tagIds.length
      ? db
          .select({ id: tag.id })
          .from(tag)
          .where(
            and(eq(tag.spaceId, spaceId), inArray(tag.id, snapshot.tagIds)),
          )
      : Promise.resolve([]),
  ])
  if (
    wallets.length !== new Set(walletIds).size ||
    categories.length !== new Set(categoryIds).size
  )
    throw new Error(m.txn_restore_missing())
  return {
    fields: {
      type: snapshot.type,
      date: snapshot.date,
      walletId: snapshot.walletId,
      amount: snapshot.amount,
      categoryId: snapshot.categoryId,
      toWalletId: snapshot.toWalletId,
      toAmount: snapshot.toAmount,
      payee: snapshot.payee,
      note: snapshot.note,
      createdBy: snapshot.createdBy,
      paidBy: snapshot.paidBy ?? null,
      recurringRuleId: rules[0]?.id ?? null,
      importId: imports[0]?.id ?? null,
    },
    tagIds: tags.map((t) => t.id),
    splits: snapshot.splits,
  }
}

// Replaces the tags and splits of a transaction.
export async function writeLinks(
  tx: Tx,
  spaceId: string,
  id: string,
  tagIds: string[],
  splits: { categoryId: string; amount: number; note: string | null }[],
) {
  await tx
    .delete(transactionSplit)
    .where(eq(transactionSplit.transactionId, id))
  if (splits.length)
    await tx
      .insert(transactionSplit)
      .values(splits.map((p) => ({ ...p, spaceId, transactionId: id })))
  await tx.delete(transactionTag).where(eq(transactionTag.transactionId, id))
  if (tagIds.length)
    await tx
      .insert(transactionTag)
      .values(tagIds.map((tagId) => ({ spaceId, transactionId: id, tagId })))
}

// A recent entry of the activity log in the space, if it has the given action.
export async function recentEvent(
  spaceId: string,
  eventId: string,
  action: 'updated' | 'deleted',
) {
  const [event] = await db
    .select()
    .from(activityEvent)
    .where(
      and(
        eq(activityEvent.id, eventId),
        eq(activityEvent.spaceId, spaceId),
        eq(activityEvent.action, action),
        gte(
          activityEvent.createdAt,
          new Date(Date.now() - RESTORE_DAYS * 86_400_000),
        ),
      ),
    )
  return event
}
