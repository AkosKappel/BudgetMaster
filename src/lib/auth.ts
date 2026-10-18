import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

import { db } from '@/db'
import * as schema from '@/db/schema'
import { createSpace } from '@/db/spaces'

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: { enabled: true },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await createSpace({
            name: 'Personal',
            ownerId: user.id,
            personal: true,
          })
        },
      },
    },
  },
  plugins: [tanstackStartCookies()],
})
