import type { db } from '@/db'
import { activityEvent } from '@/db/schema'

// Server-only: imported from server function handlers, never from modules the client
// bundles (a module-level helper next to server functions kept the database driver in the
// browser bundle: `Buffer is not defined`).

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

// The activity log of the space (I-13), written in the same database transaction.
export function logActivity(
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
  before?: { payee: string | null; amount: number; date: string },
) {
  return tx.insert(activityEvent).values({
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
      before,
    },
  })
}
