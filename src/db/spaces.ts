import {
  and,
  inArray,
  notInArray,
  type SQL,
  type SQLWrapper,
} from 'drizzle-orm'

import { db } from '@/db'
import { defaultCategories } from '@/db/default-categories'
import { category, space, spaceMember } from '@/db/schema'
import type { Locale } from '@/paraglide/runtime.js'

interface NewSpace {
  name: string
  ownerId: string
  personal?: boolean
  baseCurrency?: string
  budgetMonthStartDay?: number
  // Language of the default category names; the request's language when left out.
  locale?: Locale
}

// Creates a space with its owner and the default categories, all or nothing.
export async function createSpace({
  ownerId,
  personal,
  locale,
  ...values
}: NewSpace) {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(space)
      .values({ ...values, personalOwnerId: personal ? ownerId : null })
      .returning()
    await tx
      .insert(spaceMember)
      .values({ spaceId: created.id, userId: ownerId, role: 'owner' })

    for (const { children, ...parent } of defaultCategories(locale)) {
      const [inserted] = await tx
        .insert(category)
        .values({ ...parent, spaceId: created.id })
        .returning()
      if (children?.length) {
        await tx.insert(category).values(
          children.map((child) => ({
            ...child,
            type: parent.type,
            spaceId: created.id,
            parentId: inserted.id,
          })),
        )
      }
    }
    return created
  })
}

// Spaces outlive their members, so the spaces only these users belong to are removed with
// them. `users` is a user id or a subquery of ids.
export function soleMemberSpaces(users: string | SQLWrapper) {
  const ids = typeof users === 'string' ? [users] : users
  const spacesOf = (members: SQL) =>
    db.select({ id: spaceMember.spaceId }).from(spaceMember).where(members)
  return and(
    inArray(space.id, spacesOf(inArray(spaceMember.userId, ids))),
    notInArray(space.id, spacesOf(notInArray(spaceMember.userId, ids))),
  )
}
