import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { anonymous } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

import { db } from '@/db'
import { createDemoSpace, keepDemoData } from '@/db/demo-accounts'
import * as schema from '@/db/schema'
import { createSpace } from '@/db/spaces'

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: { enabled: true },
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
