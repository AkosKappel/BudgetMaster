import { createServerFn } from '@tanstack/react-start'
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  ne,
  sql,
} from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import {
  activityEvent,
  categorizationRule,
  category,
  spaceMember,
  tag,
  transaction,
  transactionSplit,
  transactionTag,
  user,
  wallet,
} from '@/db/schema'
import { env } from '@/env'
import { logActivity } from '@/server/activity-log'
import { authMiddleware } from '@/server/auth'
import { requireMembership } from '@/server/membership'
import { checkMovement } from '@/server/movement'
import { spaceInput } from '@/server/spaces'
import {
  recentEvent,
  revive,
  snapshotOf,
  writeLinks,
} from '@/server/transaction-history'

// Wallets, categories and tags offered by the quick add form.
export const getFormOptions = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(spaceInput)
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    const [wallets, categories, tags, rules, members] = await Promise.all([
      db
        .select({
          id: wallet.id,
          name: wallet.name,
          currency: wallet.currency,
          icon: wallet.icon,
          color: wallet.color,
        })
        .from(wallet)
        .where(and(eq(wallet.spaceId, space.id), isNull(wallet.archivedAt)))
        .orderBy(asc(wallet.sortOrder), asc(wallet.name)),
      db
        .select({
          id: category.id,
          name: category.name,
          type: category.type,
          icon: category.icon,
          color: category.color,
          parentId: category.parentId,
        })
        .from(category)
        .where(and(eq(category.spaceId, space.id), isNull(category.archivedAt)))
        .orderBy(asc(category.sortOrder), asc(category.name)),
      db
        .select({ id: tag.id, name: tag.name, color: tag.color })
        .from(tag)
        .where(eq(tag.spaceId, space.id))
        .orderBy(asc(tag.name)),
      db
        .select({
          type: categorizationRule.type,
          match: categorizationRule.match,
          categoryId: categorizationRule.categoryId,
        })
        .from(categorizationRule)
        .where(eq(categorizationRule.spaceId, space.id)),
      db
        .select({ id: spaceMember.userId, name: user.name })
        .from(spaceMember)
        .innerJoin(user, eq(user.id, spaceMember.userId))
        .where(eq(spaceMember.spaceId, space.id))
        .orderBy(asc(spaceMember.createdAt)),
    ])
    return {
      wallets,
      categories,
      tags,
      rules,
      // "Paid by" is offered only when there is someone to share with (I-09).
      members: members.length > 1 ? members : [],
      // AI-01: the server has a key and the user opted in (demo users cannot).
      canReadReceipts:
        Boolean(env.ANTHROPIC_API_KEY) &&
        context.user.aiEnabled &&
        !context.user.isAnonymous,
      canWrite: space.role !== 'viewer',
    }
  })

// Payee memory: the payees used most, each with the category and wallet of its latest
// transaction. With a query, matches anywhere in the name, prefix matches first.
export const suggestPayees = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(spaceInput.extend({ query: z.string().trim().max(60) }))
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    const pattern = data.query.replace(/[\\%_]/g, (c) => `\\${c}`)
    const byPayee = sql`lower(${transaction.payee})`
    const ranked = db
      .select({
        payee: sql<string>`${transaction.payee}`.as('payee'),
        type: transaction.type,
        categoryId: transaction.categoryId,
        walletId: transaction.walletId,
        uses: sql<number>`count(*) over (partition by ${byPayee})`.as('uses'),
        latest:
          sql<number>`row_number() over (partition by ${byPayee} order by ${transaction.date} desc, ${transaction.id} desc)`.as(
            'latest',
          ),
        prefix: sql<boolean>`${transaction.payee} ilike ${`${pattern}%`}`.as(
          'prefix',
        ),
      })
      .from(transaction)
      .where(
        and(
          eq(transaction.spaceId, space.id),
          isNotNull(transaction.payee),
          ne(transaction.type, 'transfer'),
          pattern ? ilike(transaction.payee, `%${pattern}%`) : undefined,
        ),
      )
      .as('ranked')
    return db
      .select({
        payee: ranked.payee,
        type: ranked.type,
        categoryId: ranked.categoryId,
        walletId: ranked.walletId,
      })
      .from(ranked)
      .where(eq(ranked.latest, 1))
      .orderBy(desc(ranked.prefix), desc(ranked.uses), asc(ranked.payee))
      .limit(6)
  })

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => value || null)

const transactionInput = spaceInput.extend({
  // Generated by the client (UUIDv7), so optimistic rows keep their id.
  id: z.uuid(),
  type: z.enum(['income', 'expense', 'transfer']),
  date: z.iso.date(),
  walletId: z.uuid(),
  amount: z.int().positive().max(Number.MAX_SAFE_INTEGER),
  categoryId: z.uuid().nullable(),
  toWalletId: z.uuid().nullable(),
  toAmount: z.int().positive().max(Number.MAX_SAFE_INTEGER).nullable(),
  payee: optionalText(120),
  note: optionalText(2000),
  tagIds: z.array(z.uuid()).max(20),
  // Shared spaces: the member who paid an expense from their own money (I-09).
  paidBy: z.string().min(1).nullable().default(null),
  // Parts of a split receipt (M-14): none, or at least two that add up to the amount.
  splits: z
    .array(
      z.object({
        categoryId: z.uuid(),
        amount: z.int().positive().max(Number.MAX_SAFE_INTEGER),
        note: optionalText(200),
      }),
    )
    .max(20)
    .default([]),
})
export type TransactionInput = z.input<typeof transactionInput>
type ValidInput = z.output<typeof transactionInput>

// Checks the role and the tags; checkMovement covers wallets, category and currencies.
// Returns the row to store.
async function prepare(userId: string, input: ValidInput) {
  const space = await requireMembership(userId, input.spaceId)
  if (space.role === 'viewer')
    throw new Error('Viewers cannot change this space.')

  const split = input.splits.length > 0
  if (split) {
    if (input.splits.length < 2)
      throw new Error('A split needs at least two parts.')
    const total = input.splits.reduce((sum, p) => sum + p.amount, 0)
    if (total !== input.amount)
      throw new Error('The parts must add up to the amount.')
  }
  const splitCategoryIds = [...new Set(input.splits.map((p) => p.categoryId))]
  const paidBy = input.type === 'expense' ? input.paidBy : null
  const [movement, tags, splitCategories, payer] = await Promise.all([
    checkMovement(space.id, input, { split }),
    input.tagIds.length
      ? db
          .select({ id: tag.id })
          .from(tag)
          .where(and(eq(tag.spaceId, space.id), inArray(tag.id, input.tagIds)))
      : Promise.resolve([]),
    split
      ? db
          .select({ id: category.id, type: category.type })
          .from(category)
          .where(
            and(
              eq(category.spaceId, space.id),
              inArray(category.id, splitCategoryIds),
            ),
          )
      : Promise.resolve([]),
    paidBy
      ? db
          .select({ userId: spaceMember.userId })
          .from(spaceMember)
          .where(
            and(
              eq(spaceMember.spaceId, space.id),
              eq(spaceMember.userId, paidBy),
            ),
          )
      : Promise.resolve([]),
  ])
  if (paidBy && payer.length === 0)
    throw new Error('The payer must be a member of the space.')
  if (tags.length !== new Set(input.tagIds).size)
    throw new Error('Unknown tag.')
  if (
    splitCategories.length !== splitCategoryIds.length ||
    splitCategories.some((c) => c.type !== input.type)
  )
    throw new Error(`Choose ${input.type} categories for the parts.`)

  return {
    space,
    row: {
      id: input.id,
      spaceId: space.id,
      type: input.type,
      date: input.date,
      walletId: input.walletId,
      amount: input.amount,
      ...movement,
      payee: input.payee,
      note: input.note,
      paidBy,
    },
    tagIds: [...new Set(input.tagIds)],
    splits: input.splits.map((p) => ({
      ...p,
      spaceId: space.id,
      transactionId: input.id,
    })),
  }
}

export const createTransaction = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(transactionInput)
  .handler(async ({ context, data }) => {
    const { row, tagIds, splits } = await prepare(context.user.id, data)
    await db.transaction(async (tx) => {
      // A retried request with the same id is a no-op.
      const inserted = await tx
        .insert(transaction)
        .values({ ...row, createdBy: context.user.id })
        .onConflictDoNothing({ target: transaction.id })
        .returning({ id: transaction.id })
      if (inserted.length)
        await logActivity(tx, context.user.id, 'created', row)
      if (inserted.length && splits.length)
        await tx.insert(transactionSplit).values(splits)
      if (inserted.length && tagIds.length) {
        await tx.insert(transactionTag).values(
          tagIds.map((tagId) => ({
            spaceId: row.spaceId,
            transactionId: row.id,
            tagId,
          })),
        )
      }
    })
    return { id: row.id }
  })

export const updateTransaction = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(transactionInput)
  .handler(async ({ context, data }) => {
    const { row, tagIds, splits } = await prepare(context.user.id, data)
    const { id, spaceId, ...changes } = row
    await db.transaction(async (tx) => {
      const previous = await snapshotOf(tx, spaceId, id)
      if (!previous) throw new Error('Transaction not found.')
      await tx.update(transaction).set(changes).where(eq(transaction.id, id))
      await logActivity(tx, context.user.id, 'updated', row, {
        before: {
          payee: previous.payee,
          amount: previous.amount,
          date: previous.date,
        },
        previous,
      })
      await writeLinks(tx, spaceId, id, tagIds, splits)
    })
    return { id }
  })

export const deleteTransaction = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(spaceInput.extend({ id: z.uuid() }))
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    if (space.role === 'viewer')
      throw new Error('Viewers cannot change this space.')
    await db.transaction(async (tx) => {
      // Tags and splits go with the row (cascade), so the log keeps them for a restore.
      const snapshot = await snapshotOf(tx, space.id, data.id)
      if (!snapshot) return
      await tx.delete(transaction).where(eq(transaction.id, data.id))
      await logActivity(
        tx,
        context.user.id,
        'deleted',
        { id: data.id, spaceId: space.id, ...snapshot },
        { snapshot },
      )
    })
    return { id: data.id }
  })

// Puts a deleted transaction back from its snapshot in the activity log (I-13).
export const restoreTransaction = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(spaceInput.extend({ eventId: z.uuid() }))
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    if (space.role === 'viewer')
      throw new Error('Viewers cannot change this space.')
    const event = await recentEvent(space.id, data.eventId, 'deleted')
    const snapshot = event?.details.snapshot
    if (!event || !snapshot) throw new Error('This deletion cannot be undone.')
    // Older entries keep the core fields next to the snapshot.
    const { details } = event
    const { fields, tagIds, splits } = await revive(space.id, {
      ...snapshot,
      type: details.type,
      date: details.date,
      walletId: details.walletId,
      amount: details.amount,
      payee: details.payee,
    })
    const row = { id: event.transactionId, spaceId: space.id, ...fields }
    await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(transaction)
        .values(row)
        .onConflictDoNothing({ target: transaction.id })
        .returning({ id: transaction.id })
      if (!inserted.length) throw new Error('It has been restored already.')
      await writeLinks(tx, space.id, row.id, tagIds, splits)
      await logActivity(tx, context.user.id, 'created', row)
    })
    return { id: row.id }
  })

// Undoes the latest change to a transaction from the activity log (I-13): writes back the
// whole transaction as it was before. Only the newest entry of that transaction, so a
// later edit is never overwritten without a trace; the undo is itself logged.
export const undoChange = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(spaceInput.extend({ eventId: z.uuid() }))
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    if (space.role === 'viewer')
      throw new Error('Viewers cannot change this space.')
    const event = await recentEvent(space.id, data.eventId, 'updated')
    const previous = event?.details.previous
    if (!event || !previous) throw new Error('This change cannot be undone.')
    const { fields, tagIds, splits } = await revive(space.id, previous)
    const id = event.transactionId
    await db.transaction(async (tx) => {
      const [newest] = await tx
        .select({ id: activityEvent.id })
        .from(activityEvent)
        .where(eq(activityEvent.transactionId, id))
        .orderBy(desc(activityEvent.createdAt), desc(activityEvent.id))
        .limit(1)
      if (newest?.id !== event.id)
        throw new Error(
          'It has changed again since. Undo the newer change first.',
        )
      const current = await snapshotOf(tx, space.id, id)
      if (!current) throw new Error('Transaction not found.')
      await tx.update(transaction).set(fields).where(eq(transaction.id, id))
      await writeLinks(tx, space.id, id, tagIds, splits)
      await logActivity(
        tx,
        context.user.id,
        'updated',
        { id, spaceId: space.id, ...fields },
        {
          before: {
            payee: current.payee,
            amount: current.amount,
            date: current.date,
          },
          previous: current,
        },
      )
    })
    return { id }
  })
