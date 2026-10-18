import { createServerFn } from '@tanstack/react-start'
import { and, eq, ne, or, sql } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { transaction, wallet, walletType } from '@/db/schema'
import { CURRENCIES } from '@/lib/currencies'
import { ICONS } from '@/lib/icons'
import { todayIso } from '@/lib/recurrence'
import { authMiddleware } from '@/server/auth'
import { requireMembership } from '@/server/membership'
import { spaceInput } from '@/server/spaces'
import { walletBalances } from '@/server/wallet-balances'

async function requireWriter(userId: string, spaceId: string) {
  const space = await requireMembership(userId, spaceId)
  if (space.role === 'viewer')
    throw new Error('Viewers cannot change this space.')
  return space
}

// Every wallet with its balance today, archived ones included so they can be restored.
export const listWallets = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(spaceInput)
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    const wallets = await walletBalances(space.id, todayIso(), {
      includeArchived: true,
    })
    return {
      wallets,
      baseCurrency: space.baseCurrency,
      canWrite: space.role !== 'viewer',
    }
  })

export type ManagedWallet = Awaited<
  ReturnType<typeof listWallets>
>['wallets'][number]

const walletInput = spaceInput.extend({
  // Missing for a new wallet.
  id: z.uuid().optional(),
  name: z.string().trim().min(1, 'Enter a name.').max(40),
  type: z.enum(walletType.enumValues),
  currency: z.enum(CURRENCIES),
  // Minor units; negative for a credit card that starts with a debt.
  initialBalance: z
    .int()
    .min(-Number.MAX_SAFE_INTEGER)
    .max(Number.MAX_SAFE_INTEGER),
  icon: z.string().refine((icon) => icon in ICONS, 'Unknown icon.'),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, 'Choose a colour.'),
})
export type WalletInput = z.input<typeof walletInput>

export const saveWallet = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(walletInput)
  .handler(async ({ context, data }) => {
    const space = await requireWriter(context.user.id, data.spaceId)
    const inSpace = (id: string) =>
      and(eq(wallet.spaceId, space.id), eq(wallet.id, id))

    if (data.id) {
      const [existing] = await db
        .select({ currency: wallet.currency })
        .from(wallet)
        .where(inSpace(data.id))
      if (!existing) throw new Error('Wallet not found.')
      const used = await db.$count(
        transaction,
        or(
          eq(transaction.walletId, data.id),
          eq(transaction.toWalletId, data.id),
        ),
      )
      if (used > 0 && existing.currency !== data.currency)
        throw new Error(
          'This wallet has transactions in its currency, so the currency cannot change.',
        )
    }

    const [duplicate] = await db
      .select({ id: wallet.id })
      .from(wallet)
      .where(
        and(
          eq(wallet.spaceId, space.id),
          sql`lower(${wallet.name}) = lower(${data.name})`,
          data.id ? ne(wallet.id, data.id) : undefined,
        ),
      )
    if (duplicate) throw new Error('There is already a wallet with this name.')

    const values = {
      name: data.name,
      type: data.type,
      currency: data.currency,
      initialBalance: data.initialBalance,
      icon: data.icon,
      color: data.color.toLowerCase(),
    }
    if (data.id) {
      await db.update(wallet).set(values).where(inSpace(data.id))
      return { id: data.id }
    }
    const [created] = await db
      .insert(wallet)
      .values({ ...values, spaceId: space.id })
      .returning({ id: wallet.id })
    return created
  })

// Archived wallets leave balances, totals and pickers; their transactions stay.
export const setWalletArchived = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(spaceInput.extend({ id: z.uuid(), archived: z.boolean() }))
  .handler(async ({ context, data }) => {
    const space = await requireWriter(context.user.id, data.spaceId)
    const [updated] = await db
      .update(wallet)
      .set({ archivedAt: data.archived ? new Date() : null })
      .where(and(eq(wallet.spaceId, space.id), eq(wallet.id, data.id)))
      .returning({ id: wallet.id })
    if (!updated) throw new Error('Wallet not found.')
  })
