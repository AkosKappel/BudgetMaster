import { and, asc, eq, isNull, lte, or, sql } from 'drizzle-orm'

import { db } from '@/db'
import { recurringRule, transaction, wallet } from '@/db/schema'

// Server-only: imported from server function handlers, never from modules the client
// bundles (an export next to server functions pulls the database driver into the browser).

// Balance up to and including `today`: income adds, expenses and outgoing transfers
// subtract, incoming transfers add their target amount. Archived wallets only on request
// (the wallets page lists them to restore).
export async function walletBalances(
  spaceId: string,
  today: string,
  { includeArchived = false } = {},
) {
  const change = sql`case
    when ${transaction.toWalletId} = ${wallet.id} then coalesce(${transaction.toAmount}, ${transaction.amount})
    when ${transaction.type} = 'income' then ${transaction.amount}
    else -${transaction.amount}
  end`
  return db
    .select({
      id: wallet.id,
      name: wallet.name,
      type: wallet.type,
      currency: wallet.currency,
      color: wallet.color,
      icon: wallet.icon,
      initialBalance: wallet.initialBalance,
      archived: sql<boolean>`${wallet.archivedAt} is not null`,
      // Its amounts are stored in its currency, so the currency is fixed once it has any.
      used: sql<boolean>`count(${transaction.id}) > 0 or exists (select 1 from ${recurringRule} where ${recurringRule.walletId} = ${wallet.id} or ${recurringRule.toWalletId} = ${wallet.id})`,
      balance:
        sql`${wallet.initialBalance} + coalesce(sum(${change}), 0)`.mapWith(
          Number,
        ),
    })
    .from(wallet)
    .leftJoin(
      transaction,
      and(
        or(
          eq(transaction.walletId, wallet.id),
          eq(transaction.toWalletId, wallet.id),
        ),
        lte(transaction.date, today),
      ),
    )
    .where(
      and(
        eq(wallet.spaceId, spaceId),
        includeArchived ? undefined : isNull(wallet.archivedAt),
      ),
    )
    .groupBy(wallet.id)
    .orderBy(asc(wallet.sortOrder), asc(wallet.name))
}
