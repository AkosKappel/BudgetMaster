import { eq, sql } from 'drizzle-orm'

import { db } from '@/db'
import { transaction, transactionSplit } from '@/db/schema'

// Server-only: imported from server function handlers, never from modules the client
// bundles (an export next to server functions pulls the database driver into the browser).

// Income and expenses as category lines: one row per part of a split transaction (M-14),
// otherwise the transaction itself. Totals per category read from here, so a split receipt
// counts in each of its categories; totals per day or month can keep using `transaction`.
export const categoryLines = db
  .select({
    spaceId: transaction.spaceId,
    walletId: transaction.walletId,
    type: transaction.type,
    date: transaction.date,
    payee: transaction.payee,
    categoryId:
      sql<string>`coalesce(${transactionSplit.categoryId}, ${transaction.categoryId})`.as(
        'line_category_id',
      ),
    amount:
      sql<number>`coalesce(${transactionSplit.amount}, ${transaction.amount})`
        .mapWith(Number)
        .as('line_amount'),
  })
  .from(transaction)
  .leftJoin(
    transactionSplit,
    eq(transactionSplit.transactionId, transaction.id),
  )
  .as('category_lines')
