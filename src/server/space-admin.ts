import { createHash, randomBytes } from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import { setCookie } from '@tanstack/react-start/server'
import { and, asc, count, eq, isNull, ne, sql } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { space, spaceInvite, spaceMember, user } from '@/db/schema'
import { createSpace as insertSpace } from '@/db/spaces'
import { env } from '@/env'
import { CURRENCIES } from '@/lib/currencies'
import { linkEmail } from '@/lib/email'
import { authMiddleware } from '@/server/auth'
import { requireMembership } from '@/server/membership'
import { ACTIVE_SPACE_COOKIE, spaceInput } from '@/server/spaces'

const INVITE_DAYS = 7

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex')

async function requireOwner(userId: string, spaceId: string) {
  const membership = await requireMembership(userId, spaceId)
  if (membership.role !== 'owner') {
    throw new Error('Only owners can change this space.')
  }
  const [row] = await db
    .select({ personal: sql<boolean>`${space.personalOwnerId} is not null` })
    .from(space)
    .where(eq(space.id, spaceId))
  return { ...membership, personal: row.personal }
}

const ownerCount = async (spaceId: string) =>
  (
    await db
      .select({ total: count() })
      .from(spaceMember)
      .where(
        and(eq(spaceMember.spaceId, spaceId), eq(spaceMember.role, 'owner')),
      )
  )[0].total

const rememberSpace = (spaceId: string) =>
  setCookie(ACTIVE_SPACE_COOKIE, spaceId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })

const settingsInput = z.object({
  name: z.string().trim().min(1, 'Give the space a name.').max(60),
  baseCurrency: z.enum(CURRENCIES),
  budgetMonthStartDay: z.int().min(1).max(28),
})

export const createSharedSpace = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(settingsInput)
  .handler(async ({ context, data }) => {
    const created = await insertSpace({ ...data, ownerId: context.user.id })
    rememberSpace(created.id)
    return { id: created.id }
  })

export const updateSpaceSettings = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(spaceInput.extend(settingsInput.shape))
  .handler(async ({ context, data }) => {
    await requireOwner(context.user.id, data.spaceId)
    const { spaceId, ...values } = data
    await db.update(space).set(values).where(eq(space.id, spaceId))
  })

// Members for everyone in the space; pending invites only for owners.
export const getSpaceDetails = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(spaceInput)
  .handler(async ({ context, data }) => {
    const membership = await requireMembership(context.user.id, data.spaceId)
    const [[details], members] = await Promise.all([
      db
        .select({
          id: space.id,
          name: space.name,
          personal: sql<boolean>`${space.personalOwnerId} is not null`,
          baseCurrency: space.baseCurrency,
          budgetMonthStartDay: space.budgetMonthStartDay,
        })
        .from(space)
        .where(eq(space.id, data.spaceId)),
      db
        .select({
          userId: user.id,
          name: user.name,
          email: user.email,
          role: spaceMember.role,
          joinedAt: spaceMember.createdAt,
        })
        .from(spaceMember)
        .innerJoin(user, eq(user.id, spaceMember.userId))
        .where(eq(spaceMember.spaceId, data.spaceId))
        .orderBy(asc(spaceMember.createdAt)),
    ])
    const invites =
      membership.role === 'owner'
        ? await db
            .select({
              id: spaceInvite.id,
              email: spaceInvite.email,
              role: spaceInvite.role,
              expiresAt: spaceInvite.expiresAt,
            })
            .from(spaceInvite)
            .where(
              and(
                eq(spaceInvite.spaceId, data.spaceId),
                isNull(spaceInvite.acceptedAt),
              ),
            )
            .orderBy(asc(spaceInvite.createdAt))
        : []
    return {
      ...details,
      role: membership.role,
      currentUserId: context.user.id,
      members,
      invites,
    }
  })

// Returns the token once; only its hash is stored. A new invite for the same email
// replaces the pending one, which also works as "send a new link".
export const createInvite = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(
    spaceInput.extend({
      email: z.email('Enter an email address.').trim().toLowerCase(),
      role: z.enum(['editor', 'viewer']),
      // Also send the link by email; the owner always gets it to share another way.
      sendEmail: z.boolean().default(false),
    }),
  )
  .handler(async ({ context, data }) => {
    const owner = await requireOwner(context.user.id, data.spaceId)
    if (owner.personal) {
      throw new Error(
        'Personal spaces cannot be shared. Create a shared space.',
      )
    }
    const [existing] = await db
      .select({ id: user.id })
      .from(spaceMember)
      .innerJoin(user, eq(user.id, spaceMember.userId))
      .where(
        and(
          eq(spaceMember.spaceId, data.spaceId),
          sql`lower(${user.email}) = ${data.email}`,
        ),
      )
    if (existing) throw new Error('This person is already a member.')

    const token = randomBytes(32).toString('base64url')
    await db.transaction(async (tx) => {
      await tx
        .delete(spaceInvite)
        .where(
          and(
            eq(spaceInvite.spaceId, data.spaceId),
            eq(spaceInvite.email, data.email),
            isNull(spaceInvite.acceptedAt),
          ),
        )
      await tx.insert(spaceInvite).values({
        spaceId: data.spaceId,
        email: data.email,
        role: data.role,
        tokenHash: hashToken(token),
        invitedBy: context.user.id,
        expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000),
      })
    })
    if (data.sendEmail) {
      await linkEmail({
        to: data.email,
        subject: `${context.user.name} invited you to ${owner.name} on BudgetMaster`,
        intro: `${context.user.name} invited you to the shared space "${owner.name}" on BudgetMaster, as ${data.role === 'editor' ? 'an editor' : 'a viewer'}. Sign in or create an account with this email address to join.`,
        action: 'Join the space',
        url: `${new URL(env.BETTER_AUTH_URL).origin}/invite/${token}`,
        outro: `The link works once and for ${INVITE_DAYS} days. If you do not know ${context.user.name}, ignore this email.`,
      })
    }
    return { token, emailed: data.sendEmail }
  })

export const revokeInvite = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(spaceInput.extend({ inviteId: z.uuid() }))
  .handler(async ({ context, data }) => {
    await requireOwner(context.user.id, data.spaceId)
    await db
      .delete(spaceInvite)
      .where(
        and(
          eq(spaceInvite.id, data.inviteId),
          eq(spaceInvite.spaceId, data.spaceId),
        ),
      )
  })

const tokenInput = z.object({ token: z.string().min(20).max(100) })

async function findInvite(token: string) {
  const [invite] = await db
    .select({
      id: spaceInvite.id,
      spaceId: spaceInvite.spaceId,
      spaceName: space.name,
      email: spaceInvite.email,
      role: spaceInvite.role,
      expiresAt: spaceInvite.expiresAt,
      acceptedAt: spaceInvite.acceptedAt,
      invitedBy: user.name,
    })
    .from(spaceInvite)
    .innerJoin(space, eq(space.id, spaceInvite.spaceId))
    .leftJoin(user, eq(user.id, spaceInvite.invitedBy))
    .where(eq(spaceInvite.tokenHash, hashToken(token)))
  return invite
}

// What the invite page shows. The status explains why an invite cannot be used.
export const getInvite = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .validator(tokenInput)
  .handler(async ({ context, data }) => {
    const invite = await findInvite(data.token)
    if (!invite) return { status: 'invalid' as const }
    const details = {
      spaceName: invite.spaceName,
      role: invite.role,
      invitedBy: invite.invitedBy,
      email: invite.email,
    }
    if (invite.acceptedAt) return { status: 'used' as const, ...details }
    if (invite.expiresAt < new Date())
      return { status: 'expired' as const, ...details }
    if (invite.email !== context.user.email.toLowerCase()) {
      return { status: 'wrong-account' as const, ...details }
    }
    return { status: 'ok' as const, ...details }
  })

export const acceptInvite = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(tokenInput)
  .handler(async ({ context, data }) => {
    const invite = await findInvite(data.token)
    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw new Error('This invite can no longer be used. Ask for a new link.')
    }
    if (invite.email !== context.user.email.toLowerCase()) {
      throw new Error(`This invite is for ${invite.email}.`)
    }
    await db.transaction(async (tx) => {
      // Marking it accepted first makes a double click harmless.
      const claimed = await tx
        .update(spaceInvite)
        .set({ acceptedAt: new Date() })
        .where(
          and(eq(spaceInvite.id, invite.id), isNull(spaceInvite.acceptedAt)),
        )
        .returning({ id: spaceInvite.id })
      if (!claimed.length) return
      await tx
        .insert(spaceMember)
        .values({
          spaceId: invite.spaceId,
          userId: context.user.id,
          role: invite.role,
        })
        .onConflictDoNothing()
    })
    rememberSpace(invite.spaceId)
    return { spaceId: invite.spaceId }
  })

export const updateMemberRole = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(
    spaceInput.extend({
      userId: z.string().min(1),
      role: z.enum(['owner', 'editor', 'viewer']),
    }),
  )
  .handler(async ({ context, data }) => {
    await requireOwner(context.user.id, data.spaceId)
    const target = await requireMembership(data.userId, data.spaceId).catch(
      () => {
        throw new Error('This person is not a member.')
      },
    )
    if (target.role === 'owner' && data.role !== 'owner') {
      if ((await ownerCount(data.spaceId)) <= 1) {
        throw new Error(
          'A space needs at least one owner. Make someone else owner first.',
        )
      }
    }
    await db
      .update(spaceMember)
      .set({ role: data.role })
      .where(
        and(
          eq(spaceMember.spaceId, data.spaceId),
          eq(spaceMember.userId, data.userId),
        ),
      )
  })

// Owners remove others; anyone can remove themselves (leave). The last owner can only leave
// when nobody else is left, and then the space is deleted.
export const removeMember = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(spaceInput.extend({ userId: z.string().min(1) }))
  .handler(async ({ context, data }) => {
    const self = data.userId === context.user.id
    const membership = self
      ? await requireMembership(context.user.id, data.spaceId)
      : await requireOwner(context.user.id, data.spaceId)
    const [row] = await db
      .select({ personal: sql<boolean>`${space.personalOwnerId} is not null` })
      .from(space)
      .where(eq(space.id, data.spaceId))
    if (row.personal) throw new Error('You cannot leave your personal space.')

    const target = self
      ? membership
      : await requireMembership(data.userId, data.spaceId).catch(() => {
          throw new Error('This person is not a member.')
        })
    const [{ others }] = await db
      .select({ others: count() })
      .from(spaceMember)
      .where(
        and(
          eq(spaceMember.spaceId, data.spaceId),
          ne(spaceMember.userId, data.userId),
        ),
      )
    if (target.role === 'owner' && (await ownerCount(data.spaceId)) <= 1) {
      if (others > 0) {
        throw new Error('Make someone else owner before leaving.')
      }
      await db.delete(space).where(eq(space.id, data.spaceId))
      return { deleted: true }
    }
    await db
      .delete(spaceMember)
      .where(
        and(
          eq(spaceMember.spaceId, data.spaceId),
          eq(spaceMember.userId, data.userId),
        ),
      )
    return { deleted: false }
  })

export const deleteSpace = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .validator(spaceInput)
  .handler(async ({ context, data }) => {
    const owner = await requireOwner(context.user.id, data.spaceId)
    if (owner.personal)
      throw new Error('Your personal space cannot be deleted.')
    await db.delete(space).where(eq(space.id, data.spaceId))
  })
