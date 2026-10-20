// Seeds big@example.com with about 10,000 transactions for performance checks (X-06): Alex's
// demo history, repeated 25 more times a quarter apart, so it spans about seven years.
//
// Run with `pnpm db:seed-big`. Deletes and recreates this user and their space. Never run it
// against production.

import { hashPassword } from 'better-auth/crypto'
import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { Ledger, seedAlex } from '@/db/demo-data'
import { account, space, spaceMember, user } from '@/db/schema'
import { createSpace } from '@/db/spaces'
import { DEMO_PASSWORD } from '@/lib/demo'
import { addDays } from '@/lib/recurrence'

const EMAIL = 'big@example.com'
const COPIES = 25

async function main() {
  const old = db
    .select({ id: spaceMember.spaceId })
    .from(spaceMember)
    .innerJoin(user, eq(user.id, spaceMember.userId))
    .where(eq(user.email, EMAIL))
  for (const { id } of await old) await db.delete(space).where(eq(space.id, id))
  await db.delete(user).where(eq(user.email, EMAIL))

  const userId = crypto.randomUUID()
  await db.insert(user).values({
    id: userId,
    name: 'Big Ledger',
    email: EMAIL,
    emailVerified: true,
  })
  await db.insert(account).values({
    id: crypto.randomUUID(),
    userId,
    accountId: userId,
    providerId: 'credential',
    password: await hashPassword(DEMO_PASSWORD),
  })
  const personal = await createSpace({
    name: 'Personal',
    ownerId: userId,
    personal: true,
    budgetMonthStartDay: 25,
  })

  const ledger = new Ledger(personal.id)
  await seedAlex(ledger, userId)
  // Copies without the recurring rule link, so the rules' own history stays as it was.
  const hand = ledger.rows.filter((row) => !row.recurringRuleId)
  for (let copy = 1; copy <= COPIES; copy++) {
    for (const row of hand) {
      ledger.add({ ...row, id: undefined, date: addDays(row.date, -91 * copy) })
    }
  }
  await ledger.insert()
  console.log(
    `Seeded ${EMAIL} (password ${DEMO_PASSWORD}) with ${ledger.rows.length} transactions`,
  )
}

try {
  await main()
} finally {
  await db.$client.end()
}
