import { createMiddleware, createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { DEMO_LIFETIME_HOURS } from '@/db/demo-accounts'
import { auth } from '@/lib/auth'

export const getSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await auth.api.getSession({ headers: getRequestHeaders() })
    if (!session) return null
    const { id, name, email, emailVerified, isAnonymous, createdAt } =
      session.user
    // A demo user's data is deleted after DEMO_LIFETIME_HOURS (src/db/demo-accounts.ts).
    const demoExpiresAt = isAnonymous
      ? new Date(
          createdAt.getTime() + DEMO_LIFETIME_HOURS * 3_600_000,
        ).toISOString()
      : null
    return { user: { id, name, email, emailVerified, demoExpiresAt } }
  },
)

export const authMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const session = await auth.api.getSession({ headers: getRequestHeaders() })
    if (!session) throw new Error('Not signed in')
    return next({ context: { user: session.user } })
  },
)
