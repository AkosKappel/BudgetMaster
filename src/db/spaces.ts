import { db } from '@/db'
import { DEFAULT_CATEGORIES } from '@/db/default-categories'
import { category, space, spaceMember } from '@/db/schema'

interface NewSpace {
  name: string
  ownerId: string
  personal?: boolean
  baseCurrency?: string
  budgetMonthStartDay?: number
}

// Creates a space with its owner and the default categories, all or nothing.
export async function createSpace({ ownerId, personal, ...values }: NewSpace) {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(space)
      .values({ ...values, personalOwnerId: personal ? ownerId : null })
      .returning()
    await tx
      .insert(spaceMember)
      .values({ spaceId: created.id, userId: ownerId, role: 'owner' })

    for (const { children, ...parent } of DEFAULT_CATEGORIES) {
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
