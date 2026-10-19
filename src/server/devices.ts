import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { z } from 'zod'

import { auth } from '@/lib/auth'
import { describeDevice } from '@/lib/devices'
import { authMiddleware } from '@/server/auth'

// The user's open sessions, newest activity first. Session tokens stay on the server: the
// browser only gets ids and asks the server to sign one out.
export const listDevices = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async () => {
    const headers = getRequestHeaders()
    const [current, sessions] = await Promise.all([
      auth.api.getSession({ headers }),
      auth.api.listSessions({ headers }),
    ])
    return sessions
      .map((s) => ({
        id: s.id,
        device: describeDevice(s.userAgent),
        signedInAt: s.createdAt.toISOString(),
        lastActiveAt: s.updatedAt.toISOString(),
        current: s.id === current?.session.id,
      }))
      .sort(
        (a, b) =>
          Number(b.current) - Number(a.current) ||
          b.lastActiveAt.localeCompare(a.lastActiveAt),
      )
  })

export type Device = Awaited<ReturnType<typeof listDevices>>[number]

export const signOutDevice = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders()
    // listSessions only returns the signed-in user's sessions, so another user's id
    // finds nothing.
    const sessions = await auth.api.listSessions({ headers })
    const target = sessions.find((s) => s.id === data.id)
    if (!target) throw new Error('That device is already signed out.')
    await auth.api.revokeSession({ headers, body: { token: target.token } })
  })
