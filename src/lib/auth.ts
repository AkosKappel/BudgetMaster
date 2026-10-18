import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError } from 'better-auth/api'
import { anonymous } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { and, eq, ne } from 'drizzle-orm'

import { db } from '@/db'
import { createDemoSpace, keepDemoData } from '@/db/demo-accounts'
import * as schema from '@/db/schema'
import { createSpace, soleMemberSpaces } from '@/db/spaces'

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: { enabled: true },
  user: {
    // The client confirms with the password, so a stolen open session alone cannot do it.
    deleteUser: { enabled: true, beforeDelete: removeOwnSpaces },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          if (user.isAnonymous) {
            await createDemoSpace(user.id)
            return
          }
          await createSpace({
            name: 'Personal',
            ownerId: user.id,
            personal: true,
          })
        },
      },
    },
  },
  // Only enforced in production. Each demo seeds hundreds of rows, so starting one is
  // limited per IP address.
  rateLimit: {
    customRules: { '/sign-in/anonymous': { window: 3600, max: 5 } },
  },
  plugins: [
    anonymous({
      generateName: () => 'Demo user',
      onLinkAccount: ({ anonymousUser, newUser }) =>
        keepDemoData(anonymousUser.user.id, newUser.user.id),
    }),
    // Must stay last: it sets the cookies of the responses above.
    tanstackStartCookies(),
  ],
})

// Deleting an account removes the spaces only that user belongs to. A shared space it is
// the last owner of must get another owner first, or its members would be left without one.
async function removeOwnSpaces(user: { id: string }) {
  const owned = await db
    .select({ id: schema.spaceMember.spaceId })
    .from(schema.spaceMember)
    .where(
      and(
        eq(schema.spaceMember.userId, user.id),
        eq(schema.spaceMember.role, 'owner'),
      ),
    )
  for (const { id } of owned) {
    const others = await db
      .select({ role: schema.spaceMember.role })
      .from(schema.spaceMember)
      .where(
        and(
          eq(schema.spaceMember.spaceId, id),
          ne(schema.spaceMember.userId, user.id),
        ),
      )
    if (others.length && !others.some((m) => m.role === 'owner')) {
      throw new APIError('BAD_REQUEST', {
        message:
          'You are the only owner of a shared space. Make someone else owner or delete the space first.',
      })
    }
  }
  await db.delete(schema.space).where(soleMemberSpaces(user.id))
}
