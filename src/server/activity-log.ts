import { and, eq, lt } from 'drizzle-orm'

import type { db } from '@/db'
import { type ActivityDetails, activityEvent } from '@/db/schema'

// Server-only: imported from server function handlers, never from modules the client
// bundles (a module-level helper next to server functions kept the database driver in the
// browser bundle: `Buffer is not defined`).

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

// How long the log keeps an entry: enough to settle "who changed this?", without keeping
// a second copy of every amount forever.
const KEEP_DAYS = 180

// How long a deleted transaction can be restored from the log.
export const RESTORE_DAYS = 30

// The activity log of the space (I-13), written in the same database transaction. Old
// entries of the space are trimmed on the way.
export async function logActivity(
  tx: Tx,
  userId: string,
  action: 'created' | 'updated' | 'deleted',
  row: {
    id: string
    spaceId: string
    type: 'income' | 'expense' | 'transfer'
    walletId: string
    payee: string | null
    amount: number
    date: string
  },
  extra: Pick<ActivityDetails, 'before' | 'snapshot' | 'previous'> = {},
) {
  await tx
    .delete(activityEvent)
    .where(
      and(
        eq(activityEvent.spaceId, row.spaceId),
        lt(
          activityEvent.createdAt,
          new Date(Date.now() - KEEP_DAYS * 86_400_000),
        ),
      ),
    )
  await tx.insert(activityEvent).values({
    spaceId: row.spaceId,
    userId,
    action,
    transactionId: row.id,
    details: {
      type: row.type,
      walletId: row.walletId,
      payee: row.payee,
      amount: row.amount,
      date: row.date,
      ...extra,
    },
  })
}
