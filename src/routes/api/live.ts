import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { spaceMember } from '@/db/schema'
import { auth } from '@/lib/auth'
import { onChange } from '@/server/live'

// Keeps proxies (the Tailscale Funnel) from closing an idle stream.
const HEARTBEAT_MS = 25_000

// Server-Sent Events (R-01): the id of a space whenever something in it changes, for the
// spaces the user belongs to. Only ids go over the wire; the client refetches through the
// normal, authorised queries.
export const Route = createFileRoute('/api/live')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) return new Response('Not signed in', { status: 401 })
        const memberships = await db
          .select({ spaceId: spaceMember.spaceId })
          .from(spaceMember)
          .where(eq(spaceMember.userId, session.user.id))
        const spaces = new Set(memberships.map((m) => m.spaceId))

        const encoder = new TextEncoder()
        let stop = () => {}
        const stream = new ReadableStream({
          start(controller) {
            const send = (text: string) => {
              try {
                controller.enqueue(encoder.encode(text))
              } catch {
                stop()
              }
            }
            const unsubscribe = onChange((spaceId) => {
              if (spaces.has(spaceId)) send(`data: ${spaceId}\n\n`)
            })
            const heartbeat = setInterval(
              () => send(': ping\n\n'),
              HEARTBEAT_MS,
            )
            stop = () => {
              unsubscribe()
              clearInterval(heartbeat)
            }
            request.signal.addEventListener('abort', () => {
              stop()
              try {
                controller.close()
              } catch {}
            })
            // Retry after 5 s if the connection drops.
            send('retry: 5000\n\n')
          },
          cancel() {
            stop()
          },
        })
        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
          },
        })
      },
    },
  },
})
