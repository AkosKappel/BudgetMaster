import { and, eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import { category, wallet } from '@/db/schema'

// Server-only: imported from server function handlers, never from modules the client
// bundles (an export next to server functions pulls the database driver into the browser).

export interface Movement {
  type: 'income' | 'expense' | 'transfer'
  walletId: string
  amount: number
  categoryId: string | null
  toWalletId: string | null
  toAmount: number | null
}

// What a transaction or recurring rule needs beyond the database constraints: wallets of
// the space, a category of the matching type (not for transfers), a different target wallet
// for transfers, and `toAmount` only when a transfer changes currency. Returns the
// normalised fields to store.
export async function checkMovement(spaceId: string, input: Movement) {
  const isTransfer = input.type === 'transfer'
  const walletIds = [input.walletId, input.toWalletId].filter(
    (id): id is string => id !== null,
  )
  const [wallets, [cat]] = await Promise.all([
    db
      .select({ id: wallet.id, currency: wallet.currency })
      .from(wallet)
      .where(and(eq(wallet.spaceId, spaceId), inArray(wallet.id, walletIds))),
    input.categoryId && !isTransfer
      ? db
          .select({ type: category.type })
          .from(category)
          .where(
            and(
              eq(category.spaceId, spaceId),
              eq(category.id, input.categoryId),
            ),
          )
      : Promise.resolve([]),
  ])

  const from = wallets.find((w) => w.id === input.walletId)
  const to = wallets.find((w) => w.id === input.toWalletId)
  if (!from) throw new Error('Choose a wallet.')
  if (isTransfer) {
    if (!to || to.id === from.id)
      throw new Error('Choose a different target wallet.')
  } else if (!cat || cat.type !== input.type) {
    throw new Error(`Choose an ${input.type} category.`)
  }
  const sameCurrency = !isTransfer || to?.currency === from.currency

  return {
    categoryId: isTransfer ? null : input.categoryId,
    toWalletId: isTransfer ? input.toWalletId : null,
    toAmount: sameCurrency ? null : (input.toAmount ?? input.amount),
  }
}
