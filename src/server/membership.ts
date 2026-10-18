import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { space, spaceMember } from '@/db/schema'

// Server-only: imported from server function handlers, never from modules the client
// bundles (a plain export would pull the database driver into the browser).
// The single place that decides whether a user may read or change a space. Every
// space-scoped server function calls it with the space id from its input.
export async function requireMembership(userId: string, spaceId: string) {
  const [row] = await db
    .select({
      id: space.id,
      name: space.name,
      baseCurrency: space.baseCurrency,
      budgetMonthStartDay: space.budgetMonthStartDay,
      role: spaceMember.role,
    })
    .from(spaceMember)
    .innerJoin(space, eq(space.id, spaceMember.spaceId))
    .where(
      and(eq(spaceMember.userId, userId), eq(spaceMember.spaceId, spaceId)),
    )
  if (!row) throw new Error('Space not found')
  return row
}
