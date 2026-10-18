import { and, eq, inArray, lt } from 'drizzle-orm'

import { db } from '@/db'
import { seedPersonalDemo } from '@/db/demo-data'
import {
  space,
  spaceInvite,
  spaceMember,
  transaction,
  user,
  wallet,
} from '@/db/schema'
import { createSpace, soleMemberSpaces } from '@/db/spaces'

// Server-only. "Try the demo" signs a visitor in as an anonymous user (Better Auth plugin)
// with a private copy of the demo data, so visitors never see each other's changes.

export const DEMO_LIFETIME_HOURS = 48

// The generator keeps its state in the module, so demos are seeded one at a time.
let queue: Promise<unknown> = Promise.resolve()

export function createDemoSpace(userId: string) {
  const run = queue.then(async () => {
    await deleteExpiredDemos()
    // Alex's budget month starts on payday, the 25th.
    const created = await createSpace({
      name: 'Personal',
      ownerId: userId,
      personal: true,
      budgetMonthStartDay: 25,
    })
    await seedPersonalDemo(created.id, userId)
  })
  queue = run.catch(() => {})
  return run
}

// Runs whenever a new demo starts, which keeps the table small without a scheduler. A demo
// may outlive its 48 hours while nobody starts a new one; it is fake data either way.
async function deleteExpiredDemos() {
  const cutoff = new Date(Date.now() - DEMO_LIFETIME_HOURS * 3_600_000)
  const expired = db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.isAnonymous, true), lt(user.createdAt, cutoff)))
  await db.delete(space).where(soleMemberSpaces(expired))
  await db.delete(user).where(inArray(user.id, expired))
}

// Better Auth calls this when a demo user signs up or signs in, then deletes the demo user.
// Signing up keeps the demo: its spaces move to the new account, replacing the empty
// personal space created for it a moment ago. Signing in to an existing account with data
// discards the demo instead of mixing fake data into real data.
export async function keepDemoData(demoUserId: string, newUserId: string) {
  await db.transaction(async (tx) => {
    const [personal] = await tx
      .select({ id: space.id })
      .from(space)
      .where(eq(space.personalOwnerId, newUserId))
    const used =
      personal &&
      ((await tx.$count(wallet, eq(wallet.spaceId, personal.id))) > 0 ||
        (await tx.$count(transaction, eq(transaction.spaceId, personal.id))) >
          0)
    if (used) {
      await tx.delete(space).where(soleMemberSpaces(demoUserId))
      return
    }
    if (personal) await tx.delete(space).where(eq(space.id, personal.id))
    await tx
      .update(space)
      .set({ personalOwnerId: newUserId })
      .where(eq(space.personalOwnerId, demoUserId))
    await tx
      .update(spaceMember)
      .set({ userId: newUserId })
      .where(eq(spaceMember.userId, demoUserId))
    await tx
      .update(transaction)
      .set({ createdBy: newUserId })
      .where(eq(transaction.createdBy, demoUserId))
    await tx
      .update(spaceInvite)
      .set({ invitedBy: newUserId })
      .where(eq(spaceInvite.invitedBy, demoUserId))
  })
}
