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
} from '@/db/schema'
import { ICONS } from '@/lib/icons'
import { authMiddleware } from '@/server/auth'
import { requireMembership } from '@/server/membership'
import { spaceInput } from '@/server/spaces'

async function requireWriter(userId: string, spaceId: string) {
  const space = await requireMembership(userId, spaceId)
  if (space.role === 'viewer')
    throw new Error('Viewers cannot change this space.')
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
      .orderBy(asc(category.name))
    return { categories, canWrite: space.role !== 'viewer' }
  })

export type ManagedCategory = Awaited<
  ReturnType<typeof listCategories>
>['categories'][number]

const categoryInput = spaceInput.extend({
  // Missing for a new category.
  id: z.uuid().optional(),
  name: z.string().trim().min(1, 'Enter a name.').max(40),
  // Only used on create: transactions and budgets rely on a category keeping its type.
  type: z.enum(['income', 'expense']),
  icon: z.string().refine((icon) => icon in ICONS, 'Unknown icon.'),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, 'Choose a colour.'),
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
    if (data.id && !existing) throw new Error('Category not found.')
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
        throw new Error('Choose a top-level category of the same type.')
      if (data.id) {
        const [child] = await db
          .select({ id: category.id })
          .from(category)
          .where(eq(category.parentId, data.id))
          .limit(1)
        if (child)
          throw new Error('A category with subcategories cannot be moved.')
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
      throw new Error(`There is already an ${type} category with this name.`)

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
      .values({ ...values, spaceId: space.id, type })
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
    if (!target) throw new Error('Category not found.')

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

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

async function findCategory(spaceId: string, id: string) {
  const [found] = await db
    .select({ id: category.id, type: category.type, name: category.name })
    .from(category)
    .where(and(eq(category.spaceId, spaceId), eq(category.id, id)))
  if (!found) throw new Error('Category not found.')
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
      throw new Error('Delete or move its subcategories first.')
    const [[{ used }], [{ rules }]] = await Promise.all([
      db
        .select({ used: count() })
        .from(transaction)
        .where(eq(transaction.categoryId, target.id)),
      db
        .select({ rules: count() })
        .from(recurringRule)
        .where(eq(recurringRule.categoryId, target.id)),
    ])
    if (used + rules > 0)
      throw new Error(
        `"${target.name}" is used by ${plural(used, 'transaction')}${rules ? ` and ${plural(rules, 'recurring payment')}` : ''}. Merge it into another category or archive it.`,
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
    if (data.id === data.intoId) throw new Error('Choose a different category.')
    const [source, target] = await Promise.all([
      findCategory(space.id, data.id),
      findCategory(space.id, data.intoId),
    ])
    if (source.type !== target.type)
      throw new Error(`Choose another ${source.type} category.`)
    if (source.children > 0)
      throw new Error('Merge or move its subcategories first.')

    await db.transaction(async (tx) => {
      await tx
        .update(transaction)
        .set({ categoryId: target.id })
        .where(eq(transaction.categoryId, source.id))
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
