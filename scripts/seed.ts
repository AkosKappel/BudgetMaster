// Seeds a demo user with about 14 months of realistic data, plus an empty user for
// testing empty states. Dates are relative to today, so the demo always looks current.
// Deterministic: the same day always produces the same data.
//
// Run with `pnpm db:seed`. Deletes and recreates both users (and everything they own).

import { hashPassword } from 'better-auth/crypto'
import { inArray } from 'drizzle-orm'

import { db } from '@/db'
import { DEFAULT_CATEGORIES } from '@/db/default-categories'
import {
  account,
  budget,
  category,
  recurringRule,
  tag,
  transaction,
  transactionTag,
  user,
  wallet,
} from '@/db/schema'
import {
  addDays,
  addMonths,
  nextOccurrence,
  occurrencesUntil,
  type Schedule,
} from '@/lib/recurrence'

// Public demo login (shown on the sign-in page, see M-02), not a secret.
const DEMO_EMAIL = 'demo@budgetmaster.app'
const EMPTY_EMAIL = 'empty@budgetmaster.app'
const DEMO_PASSWORD = 'demo-budget-2026'

type NewTransaction = typeof transaction.$inferInsert
type Extra = Pick<NewTransaction, 'payee' | 'note' | 'toAmount'>

// mulberry32: tiny seeded PRNG, so every run produces the same data.
let seed = 2026
function random() {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const chance = (p: number) => random() < p
const pick = <T>(items: T[]) => items[Math.floor(random() * items.length)]
const cents = (min: number, max: number) =>
  Math.round((min + random() * (max - min)) * 100)
const money = (value: number) => Math.round(value * 100)

const today = new Date().toISOString().slice(0, 10)
const thisMonth = `${today.slice(0, 7)}-01`
const monthStart = (monthsAgo: number) => addMonths(thisMonth, -monthsAgo)
// Day `day` (1-based) of the month `monthsAgo` months back, never later than today.
const dayOf = (monthsAgo: number, day: number) => {
  const date = addDays(monthStart(monthsAgo), day - 1)
  return date > today ? today : date
}
const start = monthStart(14)
const weekday = (date: string) => new Date(date).getUTCDay()

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
  const categories = await db
    .insert(category)
    .values(DEFAULT_CATEGORIES.map((c) => ({ ...c, userId: id })))
    .returning()
  return { id, categories }
}

const byName = <T extends { name: string; id: string }>(rows: T[]) =>
  Object.fromEntries(rows.map((r) => [r.name, r.id])) as Record<string, string>

async function main() {
  await db.delete(user).where(inArray(user.email, [DEMO_EMAIL, EMPTY_EMAIL]))

  await createUser(EMPTY_EMAIL, 'Sam New')
  const demo = await createUser(DEMO_EMAIL, 'Alex Demo')
  const userId = demo.id

  const extraCategories = await db
    .insert(category)
    .values([
      // Used by a budget, never spent on.
      {
        userId,
        name: 'Pets',
        type: 'expense',
        icon: 'paw-print',
        color: '#a16207',
      },
      // Long name for layout testing, budget without spending.
      {
        userId,
        name: 'Home improvement and garden supplies',
        type: 'expense',
        icon: 'hammer',
        color: '#78716c',
      },
      // Archived, but older transactions still point to it.
      {
        userId,
        name: 'Photography',
        type: 'expense',
        icon: 'camera',
        color: '#475569',
        archivedAt: new Date(monthStart(9)),
      },
    ])
    .returning()
  const cat = byName([...demo.categories, ...extraCategories])

  const wallets = await db
    .insert(wallet)
    .values([
      {
        userId,
        name: 'Main account',
        type: 'checking',
        currency: 'EUR',
        initialBalance: money(2400),
        color: '#2563eb',
        icon: 'landmark',
        sortOrder: 0,
      },
      {
        userId,
        name: 'Cash',
        type: 'cash',
        currency: 'EUR',
        initialBalance: money(80),
        color: '#16a34a',
        icon: 'wallet',
        sortOrder: 1,
      },
      {
        userId,
        name: 'Savings',
        type: 'savings',
        currency: 'EUR',
        initialBalance: money(5000),
        color: '#0d9488',
        icon: 'piggy-bank',
        sortOrder: 2,
      },
      // Spending accumulates here and is paid off from the main account each month,
      // so its balance is usually negative.
      {
        userId,
        name: 'Credit card',
        type: 'credit_card',
        currency: 'EUR',
        initialBalance: 0,
        color: '#7c3aed',
        icon: 'credit-card',
        sortOrder: 3,
      },
      // Second currency, funded by a EUR to USD transfer.
      {
        userId,
        name: 'US trip',
        type: 'cash',
        currency: 'USD',
        initialBalance: 0,
        color: '#ea580c',
        icon: 'banknote',
        sortOrder: 4,
      },
      // Closed: history only, balance moved to the main account.
      {
        userId,
        name: 'Student account',
        type: 'checking',
        currency: 'EUR',
        initialBalance: money(420),
        color: '#64748b',
        icon: 'landmark',
        sortOrder: 5,
        archivedAt: new Date(monthStart(9)),
      },
    ])
    .returning()
  const w = byName(wallets)

  const tags = await db
    .insert(tag)
    .values([
      { userId, name: 'Vacation', color: '#0891b2' },
      { userId, name: 'Reimbursable', color: '#ca8a04' },
      { userId, name: 'Gift', color: '#db2777' },
      { userId, name: 'Business', color: '#4f46e5' },
      { userId, name: 'Tax deductible', color: '#15803d' },
      { userId, name: 'Wedding', color: '#e11d48' }, // never used
    ])
    .returning()
  const tagId = byName(tags)

  const transactions: NewTransaction[] = []
  const tagsFor = new Map<NewTransaction, string[]>()
  const add = (t: Omit<NewTransaction, 'userId'>, tagNames: string[] = []) => {
    const row = { userId, ...t }
    transactions.push(row)
    if (tagNames.length) tagsFor.set(row, tagNames)
    return row
  }
  const expense = (
    date: string,
    walletName: string,
    categoryName: string,
    amount: number,
    extra: Extra = {},
    tagNames?: string[],
  ) =>
    add(
      {
        type: 'expense',
        date,
        walletId: w[walletName],
        categoryId: cat[categoryName],
        amount,
        ...extra,
      },
      tagNames,
    )
  const income = (
    date: string,
    walletName: string,
    categoryName: string,
    amount: number,
    extra: Extra = {},
    tagNames?: string[],
  ) =>
    add(
      {
        type: 'income',
        date,
        walletId: w[walletName],
        categoryId: cat[categoryName],
        amount,
        ...extra,
      },
      tagNames,
    )
  const transfer = (
    date: string,
    from: string,
    to: string,
    amount: number,
    extra: Extra = {},
  ) =>
    add({
      type: 'transfer',
      date,
      walletId: w[from],
      toWalletId: w[to],
      amount,
      ...extra,
    })

  // ---- Recurring rules and the transactions they created ----

  const first31 = (() => {
    let month = start
    while (addMonths(`${month.slice(0, 8)}31`, 0).slice(8) !== '31') {
      month = addMonths(month, 1)
    }
    return `${month.slice(0, 8)}31`
  })()
  const firstMonday = (() => {
    let date = start
    while (weekday(date) !== 1) date = addDays(date, 1)
    return date
  })()

  type RuleSeed = Schedule &
    Pick<NewTransaction, 'type' | 'amount' | 'payee' | 'note'> & {
      wallet: string
      category?: string
      toWallet?: string
      paused?: boolean
      // Generate transactions only until this date (pause date).
      generatedUntil?: string
      // Older amount before a price change.
      previousAmount?: { amount: number; until: string }
    }

  const rules: RuleSeed[] = [
    {
      type: 'income',
      wallet: 'Main account',
      category: 'Salary',
      amount: money(2850),
      payee: 'Acme Corp',
      frequency: 'monthly',
      interval: 1,
      startDate: addDays(start, 24),
    },
    {
      type: 'expense',
      wallet: 'Main account',
      category: 'Housing',
      amount: money(950),
      payee: 'Landlord',
      note: 'Rent',
      frequency: 'monthly',
      interval: 1,
      startDate: start,
    },
    // On the 31st: lands on the last day of shorter months.
    {
      type: 'expense',
      wallet: 'Credit card',
      category: 'Subscriptions',
      amount: money(13.99),
      payee: 'Netflix',
      frequency: 'monthly',
      interval: 1,
      startDate: first31,
      previousAmount: { amount: money(12.99), until: monthStart(6) },
    },
    {
      type: 'expense',
      wallet: 'Credit card',
      category: 'Subscriptions',
      amount: money(11.99),
      payee: 'Spotify',
      frequency: 'monthly',
      interval: 1,
      startDate: addDays(start, 14),
    },
    {
      type: 'expense',
      wallet: 'Main account',
      category: 'Health',
      amount: money(39.9),
      payee: 'FitLife Gym',
      frequency: 'monthly',
      interval: 1,
      startDate: addDays(start, 4),
      paused: true,
      generatedUntil: monthStart(3),
    },
    {
      type: 'expense',
      wallet: 'Main account',
      category: 'Housing',
      amount: money(420),
      payee: 'HomeSafe Insurance',
      note: 'Home insurance, yearly',
      frequency: 'yearly',
      interval: 1,
      startDate: addDays(start, 9),
    },
    {
      type: 'transfer',
      wallet: 'Main account',
      toWallet: 'Savings',
      amount: money(300),
      note: 'Monthly savings',
      frequency: 'monthly',
      interval: 1,
      startDate: addDays(start, 25),
    },
    // Every second week.
    {
      type: 'transfer',
      wallet: 'Main account',
      toWallet: 'Cash',
      amount: money(70),
      note: 'Pocket money',
      frequency: 'weekly',
      interval: 2,
      startDate: firstMonday,
    },
    // Ended: the contract was cancelled.
    {
      type: 'expense',
      wallet: 'Main account',
      category: 'Utilities',
      amount: money(25),
      payee: 'TeleCom',
      note: 'Old phone plan',
      frequency: 'monthly',
      interval: 1,
      startDate: addDays(start, 2),
      endDate: addDays(monthStart(6), 2),
    },
  ]

  for (const rule of rules) {
    const until = rule.generatedUntil ?? today
    const [row] = await db
      .insert(recurringRule)
      .values({
        userId,
        type: rule.type,
        walletId: w[rule.wallet],
        categoryId: rule.category ? cat[rule.category] : null,
        toWalletId: rule.toWallet ? w[rule.toWallet] : null,
        amount: rule.amount,
        payee: rule.payee,
        note: rule.note,
        frequency: rule.frequency,
        interval: rule.interval,
        startDate: rule.startDate,
        endDate: rule.endDate,
        nextDate: nextOccurrence(rule, until),
        paused: rule.paused ?? false,
      })
      .returning()
    for (const date of occurrencesUntil(rule, until)) {
      const amount =
        rule.previousAmount && date < rule.previousAmount.until
          ? rule.previousAmount.amount
          : rule.amount
      add({
        type: rule.type,
        date,
        walletId: row.walletId,
        categoryId: row.categoryId,
        toWalletId: row.toWalletId,
        amount,
        payee: rule.payee,
        note: rule.note,
        recurringRuleId: row.id,
      })
    }
  }

  // ---- Everyday spending, day by day ----

  for (let date = start; date <= today; date = addDays(date, 1)) {
    const day = weekday(date)
    const currentMonth = date >= thisMonth
    const dayOfMonth = Number(date.slice(8))
    const isWinter = ['11', '12', '01', '02'].includes(date.slice(5, 7))

    if ([2, 4, 6].includes(day) && chance(0.8)) {
      expense(
        date,
        chance(0.8) ? 'Main account' : 'Cash',
        'Groceries',
        cents(12, 95),
        { payee: pick(['Lidl', 'Billa', 'Tesco', 'Farmers market']) },
      )
    }
    if (day >= 1 && day <= 5 && chance(0.35)) {
      expense(
        date,
        chance(0.5) ? 'Cash' : 'Credit card',
        'Restaurants & cafés',
        cents(1.8, 4.5),
        {
          payee: 'Café Central',
        },
      )
    }
    if (dayOfMonth === 2) {
      expense(date, 'Main account', 'Transport', money(49), {
        payee: 'City Transit',
        note: 'Monthly pass',
      })
    }
    if (dayOfMonth === 12) {
      expense(
        date,
        'Main account',
        'Utilities',
        isWinter ? cents(85, 120) : cents(40, 65),
        { payee: 'PowerGrid', note: 'Electricity' },
      )
    }
    // The current month is fixed below, so the budgets show known states.
    if (!currentMonth) {
      if ([5, 6].includes(day) && chance(0.5)) {
        expense(date, 'Credit card', 'Restaurants & cafés', cents(15, 80), {
          payee: pick([
            'Trattoria Roma',
            'Sushi Bar',
            'Burger House',
            'Thai Garden',
          ]),
        })
      }
      if (chance(0.04)) {
        expense(date, 'Credit card', 'Transport', cents(9, 28), {
          payee: 'Taxi',
        })
      }
    }
    if (chance(0.06)) {
      expense(date, 'Credit card', 'Shopping', cents(15, 180), {
        payee: pick(['Zalando', 'IKEA', 'Decathlon', 'Amazon']),
      })
    }
    if (chance(0.05)) {
      expense(date, 'Credit card', 'Entertainment', cents(8, 45), {
        payee: pick(['Cinema City', 'Steam', 'Bowling Alley']),
      })
    }
    if (chance(0.03)) {
      expense(date, 'Cash', 'Health', cents(5, 40), { payee: 'Pharmacy' })
    }
    // Monthly interest on the last day of the month.
    if (addDays(date, 1).endsWith('-01')) {
      // The very first payout is the smallest possible amount: 0.01.
      const first = date < addMonths(start, 1)
      income(date, 'Savings', 'Interest', first ? 1 : cents(2, 9), {
        payee: 'Bank',
      })
    }
  }

  // ---- Current month: known budget states ----
  // Restaurants 150.00 of 120.00 (over), Transport 68.00 of 80.00 (85 %).
  for (const [day, amount, payee] of [
    [3, 32.5, 'Trattoria Roma'],
    [7, 41.9, 'Sushi Bar'],
    [11, 28, 'Burger House'],
    [16, 47.6, 'Thai Garden'],
  ] as const) {
    expense(
      dayOf(0, day),
      'Credit card',
      'Restaurants & cafés',
      money(amount),
      {
        payee,
      },
    )
  }
  expense(dayOf(0, 9), 'Credit card', 'Transport', money(19), { payee: 'Taxi' })

  // ---- One-off events ----

  // Big purchase.
  expense(dayOf(7, 15), 'Credit card', 'Shopping', money(1899.99), {
    payee: 'TechStore',
    note: 'Work laptop, 2 year warranty',
  })
  // Purchase and its refund.
  expense(dayOf(7, 3), 'Credit card', 'Shopping', money(79.9), {
    payee: 'Zalando',
    note: 'Running shoes',
  })
  income(dayOf(7, 13), 'Main account', 'Refunds', money(79.9), {
    payee: 'Zalando',
    note: 'Returned shoes (wrong size)',
  })

  // Trip abroad: EUR to USD transfer with a different target amount, spending in USD.
  expense(
    dayOf(6, 20),
    'Credit card',
    'Travel',
    money(489),
    {
      payee: 'SkyAir',
      note: 'Flights VIE ⇄ JFK',
    },
    ['Vacation'],
  )
  transfer(dayOf(5, 9), 'Main account', 'US trip', money(600), {
    toAmount: money(648),
    note: 'Exchanged at the airport',
  })
  for (const [day, categoryName, amount, payee, tagNames] of [
    [10, 'Travel', 210, 'Brooklyn Hotel', ['Vacation']],
    [10, 'Transport', 2.9, 'MTA Subway', ['Vacation']],
    [11, 'Restaurants & cafés', 38.4, "Joe's Pizza", ['Vacation']],
    [11, 'Entertainment', 30, 'MoMA', ['Vacation']],
    [
      12,
      'Restaurants & cafés',
      96.75,
      'Steakhouse',
      ['Vacation', 'Business', 'Reimbursable'],
    ],
    [13, 'Shopping', 64.2, 'Souvenir shop', ['Vacation', 'Gift']],
    [14, 'Transport', 2.9, 'MTA Subway', ['Vacation']],
  ] as const) {
    expense(dayOf(5, day), 'US trip', categoryName, money(amount), { payee }, [
      ...tagNames,
    ])
  }

  // Busy day: twelve transactions on one Saturday.
  const busyDay = (() => {
    let date = dayOf(1, 1)
    while (weekday(date) !== 6) date = addDays(date, 1)
    return date
  })()
  for (const [walletName, categoryName, amount, payee] of [
    ['Cash', 'Groceries', 18.4, 'Farmers market'],
    ['Cash', 'Restaurants & cafés', 3.2, 'Bakery'],
    ['Cash', 'Restaurants & cafés', 2.6, 'Café Central'],
    ['Credit card', 'Shopping', 42.99, 'Decathlon'],
    ['Credit card', 'Entertainment', 24, 'Cinema City'],
    ['Credit card', 'Restaurants & cafés', 58.3, 'Trattoria Roma'],
    ['Credit card', 'Transport', 14.5, 'Taxi'],
    ['Cash', 'Gifts & donations', 15, 'Flower shop'],
    ['Cash', 'Health', 7.85, 'Pharmacy'],
    ['Main account', 'Transport', 6, 'City parking'],
    ['Cash', 'Restaurants & cafés', 4.5, 'Gelato Bar'],
  ] as const) {
    expense(busyDay, walletName, categoryName, money(amount), { payee })
  }
  transfer(busyDay, 'Main account', 'Cash', money(100), {
    note: 'ATM withdrawal',
  })

  // December: holiday spending pushes expenses over income.
  const december =
    today.slice(5, 7) === '12'
      ? thisMonth
      : `${Number(today.slice(0, 4)) - 1}-12-01`
  for (const [day, amount, payee] of [
    [6, 45, 'Toy Store'],
    [9, 120, 'Jewellery Shop'],
    [12, 35.5, 'Bookstore'],
    [15, 89, 'Electronics Hub'],
    [18, 150, 'Department Store'],
    [20, 25, 'Christmas market'],
  ] as const) {
    expense(
      addDays(december, day - 1),
      'Credit card',
      'Gifts & donations',
      money(amount),
      {
        payee,
      },
      ['Gift'],
    )
  }
  expense(
    addDays(december, 21),
    'Main account',
    'Gifts & donations',
    money(50),
    {
      payee: 'Red Cross',
      note: 'Donation',
    },
    ['Tax deductible'],
  )
  expense(addDays(december, 27), 'Credit card', 'Travel', money(1240), {
    payee: 'Alpine Resorts',
    note: 'Ski week in Austria, half board',
  })

  // Freelance income.
  income(
    dayOf(10, 18),
    'Main account',
    'Freelance',
    money(850),
    {
      payee: 'Bakery Lo',
      note: 'Website redesign',
    },
    ['Business'],
  )
  income(
    dayOf(4, 7),
    'Main account',
    'Freelance',
    money(1200),
    {
      payee: 'GreenLeaf Studio',
      note: 'Mobile app prototype',
    },
    ['Business'],
  )
  income(
    dayOf(1, 22),
    'Main account',
    'Freelance',
    money(420.5),
    {
      payee: 'Bakery Lo',
      note: 'Maintenance, invoice 2026-14',
    },
    ['Business', 'Tax deductible'],
  )

  // Reimbursed business expense.
  expense(
    dayOf(2, 11),
    'Credit card',
    'Restaurants & cafés',
    money(64.8),
    {
      payee: 'Bistro 21',
      note: 'Client lunch',
    },
    ['Business', 'Reimbursable'],
  )
  income(
    dayOf(2, 25),
    'Main account',
    'Other income',
    money(64.8),
    {
      payee: 'Acme Corp',
      note: 'Expense report #2026-031',
    },
    ['Reimbursable'],
  )

  // Notes: long, multi-line and non-ASCII.
  expense(dayOf(3, 8), 'Main account', 'Groceries', money(142.37), {
    payee: 'Tesco',
    note: 'Big monthly shop: rice, pasta, olive oil, coffee beans, cleaning supplies, toilet paper, frozen vegetables, two kinds of cheese, snacks for the weekend trip, dog treats for the neighbours, and a birthday cake for the office. Remember to keep the receipt for the warranty on the blender.',
  })
  expense(dayOf(2, 14), 'Cash', 'Restaurants & cafés', money(12.4), {
    payee: 'Café Zoë',
    note: 'Café ☕ with Zoë and Jürgen, birthday 🎂',
  })
  expense(dayOf(1, 5), 'Main account', 'Education', money(129), {
    payee: 'Udemy',
    note: 'TypeScript course\nCertificate after 40 hours\nDiscount code applied',
  })

  // Archived category with history.
  expense(dayOf(12, 6), 'Credit card', 'Photography', money(349), {
    payee: 'FotoShop',
    note: 'Camera lens 50 mm',
  })
  expense(dayOf(11, 20), 'Credit card', 'Photography', money(24.9), {
    payee: 'FotoShop',
    note: 'Memory card',
  })

  // Archived wallet: spending, then the remaining balance moves to the main account.
  const studentSpending = [
    expense(dayOf(13, 4), 'Student account', 'Groceries', money(36.2), {
      payee: 'Lidl',
    }),
    expense(dayOf(12, 9), 'Student account', 'Education', money(65), {
      payee: 'University',
      note: 'Library fee',
    }),
    expense(
      dayOf(11, 15),
      'Student account',
      'Restaurants & cafés',
      money(9.8),
      {
        payee: 'Canteen',
      },
    ),
  ]
  const studentLeft =
    money(420) - studentSpending.reduce((sum, t) => sum + t.amount, 0)
  transfer(dayOf(10, 1), 'Student account', 'Main account', studentLeft, {
    note: 'Closing the student account',
  })

  // Today and the near future.
  expense(today, 'Cash', 'Restaurants & cafés', money(3.2), {
    payee: 'Café Central',
  })
  expense(today, 'Main account', 'Groceries', money(23.45), { payee: 'Billa' })
  expense(addDays(today, 5), 'Credit card', 'Entertainment', money(89), {
    payee: 'Ticket Hub',
    note: 'Concert tickets (booked, not charged yet)',
  })

  // Credit card bill: last month's card spending, paid from the main account on the 5th.
  for (let monthsAgo = 13; monthsAgo >= 0; monthsAgo--) {
    const payDate = dayOf(monthsAgo, 5)
    if (payDate > today || Number(payDate.slice(8)) !== 5) continue
    const billStart = monthStart(monthsAgo + 1)
    const bill = transactions
      .filter(
        (t) =>
          t.walletId === w['Credit card'] &&
          t.type === 'expense' &&
          t.date >= billStart &&
          t.date < monthStart(monthsAgo),
      )
      .reduce((sum, t) => sum + t.amount, 0)
    if (bill > 0) {
      transfer(payDate, 'Main account', 'Credit card', bill, {
        note: 'Credit card bill',
      })
    }
  }

  // ---- Insert ----

  const untagged = transactions.filter((t) => !tagsFor.has(t))
  for (let i = 0; i < untagged.length; i += 500) {
    await db.insert(transaction).values(untagged.slice(i, i + 500))
  }
  for (const [row, tagNames] of tagsFor) {
    const [inserted] = await db.insert(transaction).values(row).returning()
    await db.insert(transactionTag).values(
      tagNames.map((name) => ({
        transactionId: inserted.id,
        tagId: tagId[name],
      })),
    )
  }

  await db.insert(budget).values([
    { userId, categoryId: null, amount: money(2200), currency: 'EUR' },
    { userId, categoryId: cat.Groceries, amount: money(400), currency: 'EUR' },
    {
      userId,
      categoryId: cat['Restaurants & cafés'],
      amount: money(120),
      currency: 'EUR',
    },
    { userId, categoryId: cat.Transport, amount: money(80), currency: 'EUR' },
    {
      userId,
      categoryId: cat.Entertainment,
      amount: money(60),
      currency: 'EUR',
    },
    { userId, categoryId: cat.Pets, amount: money(50), currency: 'EUR' },
    {
      userId,
      categoryId: cat['Home improvement and garden supplies'],
      amount: money(100),
      currency: 'EUR',
    },
  ])

  // ---- Summary and sanity checks ----

  const change = (t: NewTransaction, walletId: string) => {
    if (t.walletId === walletId)
      return t.type === 'income' ? t.amount : -t.amount
    if (t.toWalletId === walletId) return t.toAmount ?? t.amount
    return 0
  }
  // Balance at the end of each day up to today, oldest first.
  const dailyBalances = (walletId: string) => {
    let running = wallets.find((x) => x.id === walletId)?.initialBalance ?? 0
    const result: number[] = []
    const past = transactions.filter((t) => t.date <= today)
    past.sort((a, b) => a.date.localeCompare(b.date))
    for (let i = 0; i < past.length; i++) {
      running += change(past[i], walletId)
      if (past[i + 1]?.date !== past[i].date) result.push(running)
    }
    return result
  }
  const balance = (walletId: string) => dailyBalances(walletId).at(-1) ?? 0
  const neverNegative = (walletId: string) =>
    dailyBalances(walletId).every((value) => value >= 0)
  const format = (value: number) => (value / 100).toFixed(2)

  console.log(`Seeded ${DEMO_EMAIL} / ${DEMO_PASSWORD} and ${EMPTY_EMAIL}`)
  console.log(
    `${transactions.length} transactions (${tagsFor.size} tagged), ${rules.length} recurring rules, ${start} to ${addDays(today, 5)}`,
  )
  for (const x of wallets) {
    console.log(
      `  ${x.name.padEnd(16)} ${format(balance(x.id)).padStart(10)} ${x.currency}`,
    )
  }

  const decemberTotals = (type: 'income' | 'expense') =>
    transactions
      .filter(
        (t) =>
          t.type === type &&
          t.date >= december &&
          t.date < addMonths(december, 1) &&
          t.walletId !== w['US trip'],
      )
      .reduce((sum, t) => sum + t.amount, 0)
  const checks: [string, boolean][] = [
    ['Main account never negative', neverNegative(w['Main account'])],
    ['Cash never negative', neverNegative(w.Cash)],
    ['Savings never negative', neverNegative(w.Savings)],
    ['Credit card owes this month', balance(w['Credit card']) < 0],
    ['Student account is empty', balance(w['Student account']) === 0],
    [
      'December is overspent',
      decemberTotals('expense') > decemberTotals('income'),
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
