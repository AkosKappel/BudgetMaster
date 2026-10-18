// Seeds the demo logins with data from `src/db/demo-data.ts`.
//
// - Alex: personal space (budget month starts on the 25th, payday) with about 14 months of
//   history and most edge cases, owner of the shared "Household" space.
// - Jordan: small personal space, editor in "Household".
// - Sam: personal space with default categories only, for empty states.
// - Household: joint account both pay into, shared groceries and bills, pending and
//   expired invites.
//
// Run with `pnpm db:seed`. Deletes and recreates these users and their spaces.

import { createHash, randomBytes } from 'node:crypto'
import { hashPassword } from 'better-auth/crypto'
import { eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import {
  addPersonalBudgets,
  decemberStart,
  Ledger,
  money,
  seedAlex,
  seedHousehold,
  seedJordan,
  start,
  today,
} from '@/db/demo-data'
import {
  account,
  budget,
  space,
  spaceInvite,
  spaceMember,
  user,
} from '@/db/schema'
import { createSpace } from '@/db/spaces'
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/lib/demo'
import { addDays, addMonths, budgetPeriod } from '@/lib/recurrence'

const [ALEX, JORDAN, SAM] = DEMO_ACCOUNTS.map((a) => a.email)

async function createUser(email: string, name: string) {
  const id = crypto.randomUUID()
  await db.insert(user).values({ id, name, email, emailVerified: true })
  await db.insert(account).values({
    id: crypto.randomUUID(),
    userId: id,
    accountId: id,
    providerId: 'credential',
    password: await hashPassword(DEMO_PASSWORD),
  })
  return id
}
async function invite(
  spaceId: string,
  email: string,
  invitedBy: string,
  expiresInDays: number,
) {
  const token = randomBytes(32).toString('base64url')
  await db.insert(spaceInvite).values({
    spaceId,
    email,
    role: 'viewer',
    invitedBy,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    expiresAt: new Date(Date.now() + expiresInDays * 86_400_000),
  })
}

async function main() {
  const emails = [ALEX, JORDAN, SAM]
  // Shared spaces outlive their members, so remove the demo ones explicitly.
  const demoSpaces = db
    .select({ id: spaceMember.spaceId })
    .from(spaceMember)
    .innerJoin(user, eq(user.id, spaceMember.userId))
    .where(inArray(user.email, emails))
  await db.delete(space).where(inArray(space.id, demoSpaces))
  await db.delete(user).where(inArray(user.email, emails))

  const alexId = await createUser(ALEX, 'Alex Demo')
  const jordanId = await createUser(JORDAN, 'Jordan Demo')
  const samId = await createUser(SAM, 'Sam New')
  await createSpace({ name: 'Personal', ownerId: samId, personal: true })

  const alexSpace = await createSpace({
    name: 'Personal',
    ownerId: alexId,
    personal: true,
    budgetMonthStartDay: 25,
  })
  const jordanSpace = await createSpace({
    name: 'Personal',
    ownerId: jordanId,
    personal: true,
  })
  const householdSpace = await createSpace({
    name: 'Household',
    ownerId: alexId,
  })
  await db
    .insert(spaceMember)
    .values({ spaceId: householdSpace.id, userId: jordanId, role: 'editor' })
  await invite(householdSpace.id, 'grandma@example.com', alexId, 5)
  // Expired and never accepted.
  await invite(householdSpace.id, 'old-friend@example.com', jordanId, -10)

  const alex = new Ledger(alexSpace.id)
  const jordan = new Ledger(jordanSpace.id)
  const household = new Ledger(householdSpace.id)

  await seedAlex(alex, alexId)
  await seedJordan(jordan, jordanId)
  await seedHousehold(household, alexId, jordanId)

  for (const ledger of [alex, jordan, household]) await ledger.insert()

  await addPersonalBudgets(alex)
  await db.insert(budget).values([
    { spaceId: jordan.spaceId, categoryId: null, amount: money(900) },
    { spaceId: household.spaceId, categoryId: null, amount: money(1900) },
    // Parent category: includes Groceries and Restaurants & cafés.
    {
      spaceId: household.spaceId,
      categoryId: household.categories.Food,
      amount: money(500),
    },
    {
      spaceId: household.spaceId,
      categoryId: household.categories.Utilities,
      amount: money(150),
    },
  ])

  report({ alex, jordan, household })
}

function report({
  alex,
  jordan,
  household,
}: Record<'alex' | 'jordan' | 'household', Ledger>) {
  const format = (value: number) => (value / 100).toFixed(2)
  const count = [alex, jordan, household].reduce((n, l) => n + l.rows.length, 0)
  console.log(
    `Seeded ${ALEX}, ${JORDAN} and ${SAM} (password ${DEMO_PASSWORD})`,
  )
  console.log(`${count} transactions, ${start} to ${addDays(today, 5)}`)
  for (const [name, ledger] of Object.entries({ alex, jordan, household })) {
    for (const w of ledger.walletRows) {
      console.log(
        `  ${name.padEnd(10)} ${w.name.padEnd(16)} ${format(ledger.balance(w.name)).padStart(10)} ${w.currency}`,
      )
    }
  }

  const period = budgetPeriod(today, 25)
  const restaurants = alex.spent(
    'Restaurants & cafés',
    period.start,
    period.end,
  )
  const transport = alex.spent('Transport', period.start, period.end)
  const december = decemberStart()
  const decemberEnd = addDays(addMonths(december, 1), -1)
  const eurWallets = ['Main account', 'Cash', 'Savings', 'Credit card']

  const checks: [string, boolean][] = [
    ...['Main account', 'Cash', 'Savings'].map((name): [string, boolean] => [
      `Alex ${name} never negative`,
      alex.neverNegative(name),
    ]),
    ['Jordan Bank never negative', jordan.neverNegative('Bank')],
    ['Jordan Cash never negative', jordan.neverNegative('Cash')],
    ['Jordan Savings never negative', jordan.neverNegative('Savings')],
    ['Joint account never negative', household.neverNegative('Joint account')],
    ['Credit card owes this month', alex.balance('Credit card') < 0],
    ['Student account is empty', alex.balance('Student account') === 0],
    [
      'December is overspent',
      alex.total('expense', december, decemberEnd, eurWallets) >
        alex.total('income', december, decemberEnd, eurWallets),
    ],
    [
      `Restaurants over budget (${format(restaurants)} of 120.00)`,
      restaurants > money(120),
    ],
    [
      `Transport 80 to 100 % of budget (${format(transport)} of 80.00)`,
      transport >= money(64) && transport <= money(80),
    ],
  ]
  for (const [name, ok] of checks)
    console.log(`  ${ok ? 'ok' : 'FAILED'}: ${name}`)
  if (checks.some(([, ok]) => !ok)) process.exitCode = 1
}

try {
  await main()
} finally {
  await db.$client.end()
}
