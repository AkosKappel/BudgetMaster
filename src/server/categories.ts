import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, eq, ne, or, sql } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import {
  budget,
  categorizationRule,
  category,
  recurringRule,
  transaction,
  transactionSplit,
} from '@/db/schema'
import { ICONS } from '@/lib/icons'
import { m } from '@/paraglide/messages.js'
import { authMiddleware } from '@/server/auth'
import { requireMembership } from '@/server/membership'
import { spaceInput } from '@/server/spaces'

async function requireWriter(userId: string, spaceId: string) {
  const space = await requireMembership(userId, spaceId)
  if (space.role === 'viewer') throw new Error(m.setup_viewers_cannot_change())
  return space
}

// Every category of the space, archived ones included, so they can be restored.
export const listCategories = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(spaceInput)
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    const categories = await db
      .select({
        id: category.id,
        name: category.name,
        type: category.type,
        icon: category.icon,
        color: category.color,
        parentId: category.parentId,
        archived: sql<boolean>`${category.archivedAt} is not null`,
      })
      .from(category)
      .where(eq(category.spaceId, space.id))
      .orderBy(asc(category.sortOrder), asc(category.name))
    return { categories, canWrite: space.role !== 'viewer' }
  })

export type ManagedCategory = Awaited<
  ReturnType<typeof listCategories>
>['categories'][number]

const categoryInput = spaceInput.extend({
  // Missing for a new category.
  id: z.uuid().optional(),
  name: z
    .string()
    .trim()
    .min(1, { error: () => m.setup_enter_name() })
    .max(40),
  // Only used on create: transactions and budgets rely on a category keeping its type.
  type: z.enum(['income', 'expense']),
  icon: z.string().refine((icon) => icon in ICONS, {
    error: () => m.setup_unknown_icon(),
  }),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, {
    error: () => m.setup_choose_colour(),
  }),
  parentId: z.uuid().nullable(),
})
export type CategoryInput = z.input<typeof categoryInput>

export const saveCategory = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(categoryInput)
  .handler(async ({ context, data }) => {
    const space = await requireWriter(context.user.id, data.spaceId)
    const inSpace = (id: string) =>
      and(eq(category.spaceId, space.id), eq(category.id, id))

    const [existing] = data.id
      ? await db
          .select({ type: category.type })
          .from(category)
          .where(inSpace(data.id))
      : []
    if (data.id && !existing) throw new Error(m.setup_categories_not_found())
    const type = existing?.type ?? data.type

    // One level only: a parent is a top-level category of the same type, and a category
    // with subcategories stays top level.
    if (data.parentId) {
      const [parent] = await db
        .select({ type: category.type, parentId: category.parentId })
        .from(category)
        .where(inSpace(data.parentId))
      if (
        !parent ||
        parent.type !== type ||
        parent.parentId ||
        data.parentId === data.id
      )
        throw new Error(m.setup_categories_parent_same_type())
      if (data.id) {
        const [child] = await db
          .select({ id: category.id })
          .from(category)
          .where(eq(category.parentId, data.id))
          .limit(1)
        if (child) throw new Error(m.setup_categories_parent_has_children())
      }
    }

    // The unique constraint is case-sensitive; "food" next to "Food" would only confuse.
    const [duplicate] = await db
      .select({ id: category.id })
      .from(category)
      .where(
        and(
          eq(category.spaceId, space.id),
          eq(category.type, type),
          sql`lower(${category.name}) = lower(${data.name})`,
          data.id ? ne(category.id, data.id) : undefined,
        ),
      )
    if (duplicate)
      throw new Error(
        type === 'income'
          ? m.setup_categories_duplicate_income()
          : m.setup_categories_duplicate_expense(),
      )

    const values = {
      name: data.name,
      icon: data.icon,
      color: data.color.toLowerCase(),
      parentId: data.parentId,
    }
    if (data.id) {
      await db.update(category).set(values).where(inSpace(data.id))
      return { id: data.id }
    }
    const [created] = await db
      .insert(category)
      .values({
        ...values,
        spaceId: space.id,
        type,
        // New categories go to the end of their list.
        sortOrder: sql`(select coalesce(max(${category.sortOrder}), -1) + 1 from ${category} where ${category.spaceId} = ${space.id})`,
      })
      .returning({ id: category.id })
    return created
  })

// Archived categories disappear from pickers but keep their transactions and history.
// Archiving takes the subcategories along; restoring brings the parent back, so a visible
// subcategory always has a visible parent.
export const setCategoryArchived = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(spaceInput.extend({ id: z.uuid(), archived: z.boolean() }))
  .handler(async ({ context, data }) => {
    const space = await requireWriter(context.user.id, data.spaceId)
    const [target] = await db
      .select({ parentId: category.parentId })
      .from(category)
      .where(and(eq(category.spaceId, space.id), eq(category.id, data.id)))
    if (!target) throw new Error(m.setup_categories_not_found())

    const affected = data.archived
      ? or(eq(category.id, data.id), eq(category.parentId, data.id))
      : or(
          eq(category.id, data.id),
          target.parentId ? eq(category.id, target.parentId) : undefined,
        )
    await db
      .update(category)
      .set({ archivedAt: data.archived ? new Date() : null })
      .where(and(eq(category.spaceId, space.id), affected))
  })

async function findCategory(spaceId: string, id: string) {
  const [found] = await db
    .select({ id: category.id, type: category.type, name: category.name })
    .from(category)
    .where(and(eq(category.spaceId, spaceId), eq(category.id, id)))
  if (!found) throw new Error(m.setup_categories_not_found())
  const [{ children }] = await db
    .select({ children: count() })
    .from(category)
    .where(eq(category.parentId, id))
  return { ...found, children }
}

// Deleting is for categories nothing uses (a typo, a duplicate made by mistake). Their
// budget and rules go with them; anything with history is archived or merged instead.
export const deleteCategory = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(spaceInput.extend({ id: z.uuid() }))
  .handler(async ({ context, data }) => {
    const space = await requireWriter(context.user.id, data.spaceId)
    const target = await findCategory(space.id, data.id)
    if (target.children > 0)
      throw new Error(m.setup_categories_delete_children_first())
    const [[{ used }], [{ parts }], [{ rules }]] = await Promise.all([
      db
        .select({ used: count() })
        .from(transaction)
        .where(eq(transaction.categoryId, target.id)),
      db
        .select({ parts: count() })
        .from(transactionSplit)
        .where(eq(transactionSplit.categoryId, target.id)),
      db
        .select({ rules: count() })
        .from(recurringRule)
        .where(eq(recurringRule.categoryId, target.id)),
    ])
    if (used + parts + rules > 0)
      throw new Error(
        m.setup_categories_in_use({
          name: target.name,
          usage: rules
            ? m.setup_categories_usage_both({
                transactions: m.setup_categories_usage_transactions({
                  count: used + parts,
                }),
                payments: m.setup_categories_usage_payments({ count: rules }),
              })
            : m.setup_categories_usage_transactions({ count: used + parts }),
        }),
      )
    await db.delete(category).where(eq(category.id, target.id))
  })

// Moves everything from one category to another of the same type, then deletes it: its
// transactions, recurring payments and payee rules, and its budget unless the other one has
// its own.
export const mergeCategory = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(spaceInput.extend({ id: z.uuid(), intoId: z.uuid() }))
  .handler(async ({ context, data }) => {
    const space = await requireWriter(context.user.id, data.spaceId)
    if (data.id === data.intoId)
      throw new Error(m.setup_categories_merge_same())
    const [source, target] = await Promise.all([
      findCategory(space.id, data.id),
      findCategory(space.id, data.intoId),
    ])
    if (source.type !== target.type)
      throw new Error(
        source.type === 'income'
          ? m.setup_categories_merge_other_income()
          : m.setup_categories_merge_other_expense(),
      )
    if (source.children > 0)
      throw new Error(m.setup_categories_merge_children_first())

    await db.transaction(async (tx) => {
      await tx
        .update(transaction)
        .set({ categoryId: target.id })
        .where(eq(transaction.categoryId, source.id))
      await tx
        .update(transactionSplit)
        .set({ categoryId: target.id })
        .where(eq(transactionSplit.categoryId, source.id))
      await tx
        .update(recurringRule)
        .set({ categoryId: target.id })
        .where(eq(recurringRule.categoryId, source.id))
      await tx
        .update(categorizationRule)
        .set({ categoryId: target.id })
        .where(eq(categorizationRule.categoryId, source.id))
      const [targetBudget] = await tx
        .select({ id: budget.id })
        .from(budget)
        .where(eq(budget.categoryId, target.id))
      if (!targetBudget)
        await tx
          .update(budget)
          .set({ categoryId: target.id })
          .where(eq(budget.categoryId, source.id))
      // The source's own budget, if any is left, goes with it (cascade).
      await tx.delete(category).where(eq(category.id, source.id))
    })
    return { into: target.name }
  })

// The order categories appear in on this page and in the pickers.
export const reorderCategories = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(spaceInput.extend({ ids: z.array(z.uuid()).min(1).max(500) }))
  .handler(async ({ context, data }) => {
    const space = await requireWriter(context.user.id, data.spaceId)
    const ids = sql`array[${sql.join(
      data.ids.map((id) => sql`${id}`),
      sql`, `,
    )}]::uuid[]`
    await db
      .update(category)
      .set({ sortOrder: sql`array_position(${ids}, ${category.id})` })
      .where(
        and(eq(category.spaceId, space.id), sql`${category.id} = any(${ids})`),
      )
  })
