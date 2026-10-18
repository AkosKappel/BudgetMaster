import { createServerFn } from '@tanstack/react-start'
import { and, between, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { category, transaction, wallet } from '@/db/schema'
import { addDays } from '@/lib/recurrence'
import { authMiddleware } from '@/server/auth'
import { requireMembership } from '@/server/membership'
import { spaceInput } from '@/server/spaces'

const MAX_ROWS = 1000

async function requireWallet(
  userId: string,
  spaceId: string,
  walletId: string,
) {
  const space = await requireMembership(userId, spaceId)
  if (space.role === 'viewer')
    throw new Error('Viewers cannot change this space.')
  const [found] = await db
    .select({ id: wallet.id })
    .from(wallet)
    .where(and(eq(wallet.spaceId, space.id), eq(wallet.id, walletId)))
  if (!found) throw new Error('Choose a wallet.')
  return space
}

const stagedRow = z.object({
  date: z.iso.date(),
  // Signed minor units: negative is money going out.
  amount: z
    .int()
    .min(-Number.MAX_SAFE_INTEGER)
    .max(Number.MAX_SAFE_INTEGER)
    .refine((value) => value !== 0, 'Zero is not a transaction.'),
  payee: z.string().trim().max(120),
})

// For the review screen: which rows look like transactions already in the wallet (same
// amount and direction within two days) and which category each payee had last time.
export const reviewImport = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(
    spaceInput.extend({
      walletId: z.uuid(),
      rows: z.array(stagedRow).min(1).max(MAX_ROWS),
    }),
  )
  .handler(async ({ context, data }) => {
    const space = await requireWallet(
      context.user.id,
      data.spaceId,
      data.walletId,
    )
    const dates = data.rows.map((r) => r.date).sort()
    const payees = [
      ...new Set(data.rows.map((r) => r.payee.toLowerCase()).filter(Boolean)),
    ]

    const [existing, history] = await Promise.all([
      db
        .select({
          date: transaction.date,
          type: transaction.type,
          amount: transaction.amount,
        })
        .from(transaction)
        .where(
          and(
            eq(transaction.walletId, data.walletId),
            between(
              transaction.date,
              addDays(dates[0], -2),
              addDays(dates.at(-1) ?? dates[0], 2),
            ),
          ),
        ),
      payees.length
        ? db
            .selectDistinctOn(
              [sql`lower(${transaction.payee})`, transaction.type],
              {
                payee: sql<string>`lower(${transaction.payee})`,
                type: transaction.type,
                categoryId: transaction.categoryId,
              },
            )
            .from(transaction)
            .where(
              and(
                eq(transaction.spaceId, space.id),
                isNotNull(transaction.categoryId),
                inArray(sql`lower(${transaction.payee})`, payees),
              ),
            )
            .orderBy(
              sql`lower(${transaction.payee})`,
              transaction.type,
              desc(transaction.date),
            )
        : Promise.resolve([]),
    ])

    const signed = (t: { type: string; amount: number }) =>
      t.type === 'income' ? t.amount : -t.amount
    return data.rows.map((row) => {
      const type = row.amount > 0 ? 'income' : 'expense'
      const low = addDays(row.date, -2)
      const high = addDays(row.date, 2)
      return {
        duplicate: existing.some(
          (t) => t.date >= low && t.date <= high && signed(t) === row.amount,
        ),
        categoryId:
          history.find(
            (h) => h.payee === row.payee.toLowerCase() && h.type === type,
          )?.categoryId ?? null,
      }
    })
  })

// Inserts the reviewed rows into the wallet in one go: all or nothing.
export const importTransactions = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(
    spaceInput.extend({
      walletId: z.uuid(),
      rows: z
        .array(stagedRow.extend({ categoryId: z.uuid() }))
        .min(1)
        .max(MAX_ROWS),
    }),
  )
  .handler(async ({ context, data }) => {
    const space = await requireWallet(
      context.user.id,
      data.spaceId,
      data.walletId,
    )
    const categoryIds = [...new Set(data.rows.map((r) => r.categoryId))]
    const categories = await db
      .select({ id: category.id, type: category.type })
      .from(category)
      .where(
        and(eq(category.spaceId, space.id), inArray(category.id, categoryIds)),
      )
    const typeOf = new Map(categories.map((c) => [c.id, c.type]))

    const rows = data.rows.map((row, index) => {
      const type = row.amount > 0 ? 'income' : 'expense'
      if (typeOf.get(row.categoryId) !== type)
        throw new Error(`Row ${index + 1}: choose an ${type} category.`)
      return {
        spaceId: space.id,
        walletId: data.walletId,
        type,
        date: row.date,
        amount: Math.abs(row.amount),
        categoryId: row.categoryId,
        payee: row.payee || null,
        createdBy: context.user.id,
      } as const
    })
    await db.transaction(async (tx) => {
      for (let i = 0; i < rows.length; i += 500) {
        await tx.insert(transaction).values(rows.slice(i, i + 500))
      }
    })
    return { count: rows.length }
  })
