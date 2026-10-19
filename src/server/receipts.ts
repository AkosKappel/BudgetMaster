import { createServerFn } from '@tanstack/react-start'
import { and, eq, sum } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { receipt, transaction } from '@/db/schema'
import { decodeReceipt } from '@/lib/receipt-image'
import { authMiddleware } from '@/server/auth'
import { requireMembership } from '@/server/membership'
import { spaceInput } from '@/server/spaces'

// Receipts share the home server's disk with every other app: 100 MB per space is a few
// hundred photos.
const SPACE_LIMIT_BYTES = 100_000_000

const receiptInput = spaceInput.extend({ transactionId: z.uuid() })

async function requireEditor(userId: string, spaceId: string) {
  const space = await requireMembership(userId, spaceId)
  if (space.role === 'viewer')
    throw new Error('Viewers cannot change this space.')
  return space
}

// Attaches or replaces the receipt photo of a transaction.
export const saveReceipt = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(receiptInput.extend({ image: z.string().max(1_400_000) }))
  .handler(async ({ context, data }) => {
    const space = await requireEditor(context.user.id, data.spaceId)
    const image = decodeReceipt(data.image)
    if (!image) throw new Error('Use a photo (JPEG or WebP) under 1 MB.')
    const [[owned], [usage]] = await Promise.all([
      db
        .select({ id: transaction.id })
        .from(transaction)
        .where(
          and(
            eq(transaction.id, data.transactionId),
            eq(transaction.spaceId, space.id),
          ),
        ),
      db
        .select({ total: sum(receipt.size).mapWith(Number) })
        .from(receipt)
        .where(eq(receipt.spaceId, space.id)),
    ])
    if (!owned) throw new Error('Transaction not found.')
    if ((usage?.total ?? 0) + image.bytes.length > SPACE_LIMIT_BYTES)
      throw new Error('This space is out of room for receipts.')
    const values = {
      contentType: image.type,
      size: image.bytes.length,
      data: image.bytes,
      createdBy: context.user.id,
      createdAt: new Date(),
    }
    await db
      .insert(receipt)
      .values({ transactionId: owned.id, spaceId: space.id, ...values })
      .onConflictDoUpdate({ target: receipt.transactionId, set: values })
  })

export const deleteReceipt = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(receiptInput)
  .handler(async ({ context, data }) => {
    const space = await requireEditor(context.user.id, data.spaceId)
    await db
      .delete(receipt)
      .where(
        and(
          eq(receipt.transactionId, data.transactionId),
          eq(receipt.spaceId, space.id),
        ),
      )
  })
