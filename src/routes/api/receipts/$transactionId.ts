import { createFileRoute } from '@tanstack/react-router'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { receipt, spaceMember } from '@/db/schema'
import { auth } from '@/lib/auth'

// The receipt photo of a transaction, for members of its space only. A plain route rather
// than a server function, so an <img> can load it.
export const Route = createFileRoute('/api/receipts/$transactionId')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!z.uuid().safeParse(params.transactionId).success)
          return new Response('Not found', { status: 404 })
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) return new Response('Not signed in', { status: 401 })
        const [row] = await db
          .select({
            contentType: receipt.contentType,
            data: receipt.data,
            createdAt: receipt.createdAt,
          })
          .from(receipt)
          .innerJoin(
            spaceMember,
            and(
              eq(spaceMember.spaceId, receipt.spaceId),
              eq(spaceMember.userId, session.user.id),
            ),
          )
          .where(eq(receipt.transactionId, params.transactionId))
        // Unknown and foreign ids look the same.
        if (!row) return new Response('Not found', { status: 404 })
        return new Response(new Uint8Array(row.data), {
          headers: {
            'Content-Type': row.contentType,
            'Cache-Control': 'private, max-age=3600',
            'X-Content-Type-Options': 'nosniff',
            ETag: `"${row.createdAt.getTime()}"`,
          },
        })
      },
    },
  },
})
