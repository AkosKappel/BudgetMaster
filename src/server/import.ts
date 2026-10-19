import { createServerFn } from '@tanstack/react-start'
import { and, between, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import {
  categorizationRule,
  category,
  importBatch,
  importMapping,
  transaction,
  wallet,
} from '@/db/schema'
import { headerKey, importMappingSchema } from '@/lib/import'
import { addDays } from '@/lib/recurrence'
import { ruleFor } from '@/lib/rules'
import { authMiddleware } from '@/server/auth'
import { requireMembership } from '@/server/membership'
import { spaceInput } from '@/server/spaces'

const MAX_ROWS = 1000

const headerInput = z.array(z.string().max(200)).min(1).max(100)

// The columns this space used last time for a file with the same header row.
export const getImportMapping = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(spaceInput.extend({ header: headerInput }))
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    const [saved] = await db
      .select({
        mapping: importMapping.mapping,
        walletId: importMapping.walletId,
      })
      .from(importMapping)
      .where(
        and(
          eq(importMapping.spaceId, space.id),
          eq(importMapping.header, headerKey(data.header)),
        ),
      )
    return saved ?? null
  })

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

    const [existing, history, rules] = await Promise.all([
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
      db
        .select({
          type: categorizationRule.type,
          match: categorizationRule.match,
          categoryId: categorizationRule.categoryId,
        })
        .from(categorizationRule)
        .where(eq(categorizationRule.spaceId, space.id)),
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
        // A rule beats history: it is what the user asked for explicitly.
        categoryId:
          ruleFor(row.payee, type, rules)?.categoryId ??
          history.find(
            (h) => h.payee === row.payee.toLowerCase() && h.type === type,
          )?.categoryId ??
          null,
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
      fileName: z.string().max(200).optional(),
      // Remembered for the next file with the same header row.
      layout: z
        .object({ header: headerInput, mapping: importMappingSchema })
        .optional(),
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
      const [batch] = await tx
        .insert(importBatch)
        .values({
          spaceId: space.id,
          walletId: data.walletId,
          fileName: data.fileName || null,
          count: rows.length,
          createdBy: context.user.id,
        })
        .returning({ id: importBatch.id })
      const linked = rows.map((row) => ({ ...row, importId: batch.id }))
      for (let i = 0; i < linked.length; i += 500) {
        await tx.insert(transaction).values(linked.slice(i, i + 500))
      }
      if (data.layout) {
        const saved = {
          mapping: data.layout.mapping,
          walletId: data.walletId,
        }
        await tx
          .insert(importMapping)
          .values({
            ...saved,
            spaceId: space.id,
            header: headerKey(data.layout.header),
          })
          .onConflictDoUpdate({
            target: [importMapping.spaceId, importMapping.header],
            set: { ...saved, updatedAt: new Date() },
          })
      }
    })
    return { count: rows.length }
  })

// The last imports of the space, newest first, with how many of their rows still exist.
export const listImports = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(spaceInput)
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    const imports = await db
      .select({
        id: importBatch.id,
        fileName: importBatch.fileName,
        count: importBatch.count,
        createdAt: importBatch.createdAt,
        walletName: wallet.name,
        remaining:
          sql<number>`(select count(*) from ${transaction} where ${transaction.importId} = ${importBatch.id})`.mapWith(
            Number,
          ),
      })
      .from(importBatch)
      .innerJoin(wallet, eq(wallet.id, importBatch.walletId))
      .where(eq(importBatch.spaceId, space.id))
      .orderBy(desc(importBatch.createdAt))
      .limit(10)
    return {
      imports: imports.map((i) => ({
        ...i,
        createdAt: i.createdAt.toISOString(),
      })),
      canWrite: space.role !== 'viewer',
    }
  })

export type ImportRecord = Awaited<
  ReturnType<typeof listImports>
>['imports'][number]

// Deletes every transaction the import created, edited ones included, and the record.
export const undoImport = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(spaceInput.extend({ id: z.uuid() }))
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    if (space.role === 'viewer')
      throw new Error('Viewers cannot change this space.')
    return db.transaction(async (tx) => {
      const [batch] = await tx
        .select({ id: importBatch.id })
        .from(importBatch)
        .where(
          and(eq(importBatch.spaceId, space.id), eq(importBatch.id, data.id)),
        )
        .for('update')
      if (!batch) throw new Error('That import was already undone.')
      // Rows first: deleting the record would only unlink them (set null).
      const deleted = await tx
        .delete(transaction)
        .where(
          and(
            eq(transaction.spaceId, space.id),
            eq(transaction.importId, batch.id),
          ),
        )
        .returning({ id: transaction.id })
      await tx.delete(importBatch).where(eq(importBatch.id, batch.id))
      return { count: deleted.length }
    })
  })
