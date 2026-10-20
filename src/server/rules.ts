import { createServerFn } from '@tanstack/react-start'
import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { categorizationRule, category } from '@/db/schema'
import { m } from '@/paraglide/messages.js'
import { authMiddleware } from '@/server/auth'
import { requireMembership } from '@/server/membership'
import { spaceInput } from '@/server/spaces'

async function requireWriter(userId: string, spaceId: string) {
  const space = await requireMembership(userId, spaceId)
  if (space.role === 'viewer') throw new Error(m.setup_viewers_cannot_change())
  return space
}

export const listRules = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(spaceInput)
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    const rules = await db
      .select({
        id: categorizationRule.id,
        type: categorizationRule.type,
        match: categorizationRule.match,
        categoryId: categorizationRule.categoryId,
        categoryName: category.name,
      })
      .from(categorizationRule)
      .innerJoin(category, eq(category.id, categorizationRule.categoryId))
      .where(eq(categorizationRule.spaceId, space.id))
      .orderBy(asc(categorizationRule.match))
    return { rules, canWrite: space.role !== 'viewer' }
  })

export type ManagedRule = Awaited<ReturnType<typeof listRules>>['rules'][number]

const ruleInput = z.object({
  type: z.enum(['income', 'expense']),
  match: z
    .string()
    .trim()
    .min(2, { error: () => m.setup_rules_match_too_short() })
    .max(60)
    .transform((value) => value.toLowerCase()),
  categoryId: z.uuid(),
})

// Creates rules, or points existing ones (same type and text) to the new category: the
// latest choice wins. Used by the rules page and by "remember" in the import review.
export const saveRules = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(spaceInput.extend({ rules: z.array(ruleInput).min(1).max(200) }))
  .handler(async ({ context, data }) => {
    const space = await requireWriter(context.user.id, data.spaceId)
    const ids = [...new Set(data.rules.map((r) => r.categoryId))]
    const categories = await db
      .select({ id: category.id, type: category.type })
      .from(category)
      .where(and(eq(category.spaceId, space.id), inArray(category.id, ids)))
    for (const rule of data.rules) {
      if (categories.find((c) => c.id === rule.categoryId)?.type !== rule.type)
        throw new Error(
          rule.type === 'income'
            ? m.setup_rules_choose_income_category({ match: rule.match })
            : m.setup_rules_choose_expense_category({ match: rule.match }),
        )
    }
    // One row per type and text, the last one wins.
    const unique = [
      ...new Map(data.rules.map((r) => [`${r.type}:${r.match}`, r])).values(),
    ]
    await db
      .insert(categorizationRule)
      .values(unique.map((r) => ({ ...r, spaceId: space.id })))
      .onConflictDoUpdate({
        target: [
          categorizationRule.spaceId,
          categorizationRule.type,
          categorizationRule.match,
        ],
        set: { categoryId: sql`excluded.category_id`, updatedAt: new Date() },
      })
    return { count: unique.length }
  })

export const deleteRule = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(spaceInput.extend({ id: z.uuid() }))
  .handler(async ({ context, data }) => {
    const space = await requireWriter(context.user.id, data.spaceId)
    await db
      .delete(categorizationRule)
      .where(
        and(
          eq(categorizationRule.spaceId, space.id),
          eq(categorizationRule.id, data.id),
        ),
      )
  })
