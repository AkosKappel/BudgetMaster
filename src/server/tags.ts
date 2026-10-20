import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, eq, ne, sql } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { tag, transactionTag } from '@/db/schema'
import { m } from '@/paraglide/messages.js'
import { authMiddleware } from '@/server/auth'
import { requireMembership } from '@/server/membership'
import { spaceInput } from '@/server/spaces'

async function requireWriter(userId: string, spaceId: string) {
  const space = await requireMembership(userId, spaceId)
  if (space.role === 'viewer') throw new Error(m.setup_viewers_cannot_change())
  return space
}

// Tags with how many transactions use them.
export const listTags = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(spaceInput)
  .handler(async ({ context, data }) => {
    const space = await requireMembership(context.user.id, data.spaceId)
    const [tags, usage] = await Promise.all([
      db
        .select({ id: tag.id, name: tag.name, color: tag.color })
        .from(tag)
        .where(eq(tag.spaceId, space.id))
        .orderBy(asc(tag.name)),
      db
        .select({ tagId: transactionTag.tagId, uses: count() })
        .from(transactionTag)
        .where(eq(transactionTag.spaceId, space.id))
        .groupBy(transactionTag.tagId),
    ])
    return {
      tags: tags.map((t) => ({
        ...t,
        uses: usage.find((u) => u.tagId === t.id)?.uses ?? 0,
      })),
      canWrite: space.role !== 'viewer',
    }
  })

export type ManagedTag = Awaited<ReturnType<typeof listTags>>['tags'][number]

const tagInput = spaceInput.extend({
  // Missing for a new tag.
  id: z.uuid().optional(),
  name: z
    .string()
    .trim()
    .min(1, { error: () => m.setup_enter_name() })
    .max(30),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, {
    error: () => m.setup_choose_colour(),
  }),
})

export const saveTag = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(tagInput)
  .handler(async ({ context, data }) => {
    const space = await requireWriter(context.user.id, data.spaceId)
    const [duplicate] = await db
      .select({ id: tag.id })
      .from(tag)
      .where(
        and(
          eq(tag.spaceId, space.id),
          sql`lower(${tag.name}) = lower(${data.name})`,
          data.id ? ne(tag.id, data.id) : undefined,
        ),
      )
    if (duplicate) throw new Error(m.setup_tags_duplicate())

    const values = { name: data.name, color: data.color.toLowerCase() }
    if (data.id) {
      const updated = await db
        .update(tag)
        .set(values)
        .where(and(eq(tag.spaceId, space.id), eq(tag.id, data.id)))
        .returning({ id: tag.id })
      if (!updated.length) throw new Error(m.setup_tags_not_found())
      return { id: data.id }
    }
    const [created] = await db
      .insert(tag)
      .values({ ...values, spaceId: space.id })
      .returning({ id: tag.id })
    return created
  })

// Removes the tag from its transactions too; the transactions themselves stay.
export const deleteTag = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(spaceInput.extend({ id: z.uuid() }))
  .handler(async ({ context, data }) => {
    const space = await requireWriter(context.user.id, data.spaceId)
    await db
      .delete(tag)
      .where(and(eq(tag.spaceId, space.id), eq(tag.id, data.id)))
  })
