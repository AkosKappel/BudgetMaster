import { createMiddleware, createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { DEMO_LIFETIME_HOURS } from '@/db/demo-accounts'
import { env } from '@/env'
import { auth } from '@/lib/auth'
import { m } from '@/paraglide/messages.js'
import { announceChange } from '@/server/live'

export const getSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await auth.api.getSession({ headers: getRequestHeaders() })
    if (!session) return null
    const {
      id,
      name,
      email,
      emailVerified,
      isAnonymous,
      createdAt,
      twoFactorEnabled,
      weekStartsOn,
      aiEnabled,
    } = session.user
    // A demo user's data is deleted after DEMO_LIFETIME_HOURS (src/db/demo-accounts.ts).
    const demoExpiresAt = isAnonymous
      ? new Date(
          createdAt.getTime() + DEMO_LIFETIME_HOURS * 3_600_000,
        ).toISOString()
      : null
    return {
      user: {
        id,
        name,
        email,
        emailVerified,
        demoExpiresAt,
        twoFactorEnabled: Boolean(twoFactorEnabled),
        weekStartsOn,
        aiEnabled,
      },
    }
  },
)

export const authMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next, data, method }) => {
    const session = await auth.api.getSession({ headers: getRequestHeaders() })
    if (!session) throw new Error(m.acct_not_signed_in())
    const result = await next({ context: { user: session.user } })
    // Every write to a space goes through here, so open tabs and devices hear about it
    // (R-01). The function checked the membership; a failed call never gets this far.
    // `data` is the function's input, typed as nothing at the middleware level.
    const input: unknown = data
    if (method === 'POST' && hasSpaceId(input)) announceChange(input.spaceId)
    return result
  },
)

const hasSpaceId = (data: unknown): data is { spaceId: string } =>
  typeof data === 'object' &&
  data !== null &&
  'spaceId' in data &&
  typeof data.spaceId === 'string'

// Which ways to sign in the server is set up for; each provider needs its OAuth client in `.env`.
export const getSignInOptions = createServerFn({ method: 'GET' }).handler(
  () => ({
    google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
    apple: Boolean(env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET),
    microsoft: Boolean(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET),
    // Not a sign-in method, but the same kind of switch: Settings offers AI features only then.
    ai: Boolean(env.ANTHROPIC_API_KEY),
  }),
)
