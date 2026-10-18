import { createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie } from '@tanstack/react-start/server'
import { asc, count, eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { space, spaceMember } from '@/db/schema'
import { authMiddleware } from '@/server/auth'
import { requireMembership } from '@/server/membership'

const ACTIVE_SPACE_COOKIE = 'bm-space'

export const spaceInput = z.object({ spaceId: z.uuid() })

export const getSpaces = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const members = db
      .select({ spaceId: spaceMember.spaceId, total: count().as('total') })
      .from(spaceMember)
      .groupBy(spaceMember.spaceId)
      .as('members')
    const spaces = await db
      .select({
        id: space.id,
        name: space.name,
        personal: sql<boolean>`${space.personalOwnerId} is not null`,
        baseCurrency: space.baseCurrency,
        budgetMonthStartDay: space.budgetMonthStartDay,
        role: spaceMember.role,
        memberCount: members.total,
      })
      .from(spaceMember)
      .innerJoin(space, eq(space.id, spaceMember.spaceId))
      .innerJoin(members, eq(members.spaceId, space.id))
      .where(eq(spaceMember.userId, context.user.id))
      // Personal space first, then by name.
      .orderBy(sql`${space.personalOwnerId} is null`, asc(space.name))

    const remembered = getCookie(ACTIVE_SPACE_COOKIE)
    const active = spaces.find((s) => s.id === remembered) ?? spaces[0]
    return { spaces, activeId: active?.id ?? null }
  })

export const setActiveSpace = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(spaceInput)
  .handler(async ({ context, data }) => {
    await requireMembership(context.user.id, data.spaceId)
    setCookie(ACTIVE_SPACE_COOKIE, data.spaceId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })
  })
