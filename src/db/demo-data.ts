// Demo data generator, relative to today so the demo always looks current. Deterministic:
// the same day always produces the same data. Used by `pnpm db:seed` (scripts/seed.ts) and
// by "Try the demo", which gives every visitor a private copy of Alex's personal space.
// Server-only: it imports the database.

import { eq } from 'drizzle-orm'

import { db } from '@/db'
import {
  budget,
  category,
  recurringRule,
  tag,
  transaction,
  transactionTag,
  wallet,
} from '@/db/schema'
import {
  addDays,
  addMonths,
  budgetPeriod,
  nextOccurrence,
  occurrencesUntil,
  type Schedule,
  todayIso,
} from '@/lib/recurrence'

type NewTransaction = typeof transaction.$inferInsert
type NewWallet = Omit<typeof wallet.$inferInsert, 'spaceId'>
type Extra = Pick<
  NewTransaction,
  'payee' | 'note' | 'toAmount' | 'createdBy' | 'paidBy'
>

// mulberry32: tiny seeded PRNG, so every run produces the same data.
let seed = 2026
function random() {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const chance = (p: number) => random() < p
const pick = <T>(items: readonly T[]) =>
  items[Math.floor(random() * items.length)]
const cents = (min: number, max: number) =>
  Math.round((min + random() * (max - min)) * 100)
export const money = (value: number) => Math.round(value * 100)

export let today = todayIso()
let thisMonth = `${today.slice(0, 7)}-01`
const monthStart = (monthsAgo: number) => addMonths(thisMonth, -monthsAgo)
// Day `day` (1-based) of the month `monthsAgo` months back, never later than today.
const dayOf = (monthsAgo: number, day: number) => {
  const date = addDays(monthStart(monthsAgo), day - 1)
  return date > today ? today : date
}
export let start = monthStart(14)
const weekday = (date: string) => new Date(date).getUTCDay()
const firstWeekday = (from: string, day: number) => {
  let date = from
  while (weekday(date) !== day) date = addDays(date, 1)
  return date
}
const days = function* (from: string, to: string) {
  for (let date = from; date <= to; date = addDays(date, 1)) yield date
}

const byName = <T extends { name: string; id: string }>(rows: T[]) =>
  Object.fromEntries(rows.map((r) => [r.name, r.id])) as Record<string, string>

// Everything seeded into one space: lookups by name and the transactions to insert.
export class Ledger {
  rows: NewTransaction[] = []
  tagsFor = new Map<NewTransaction, string[]>()
  wallets: Record<string, string> = {}
  categories: Record<string, string> = {}
  tags: Record<string, string> = {}
  walletRows: (typeof wallet.$inferSelect)[] = []

  constructor(readonly spaceId: string) {}

  async load(wallets: NewWallet[], tags: { name: string; color: string }[]) {
    this.walletRows = await db
      .insert(wallet)
      .values(
        wallets.map((w, i) => ({ sortOrder: i, ...w, spaceId: this.spaceId })),
      )
      .returning()
    this.wallets = byName(this.walletRows)
    if (tags.length) {
      const rows = await db
        .insert(tag)
        .values(tags.map((t) => ({ ...t, spaceId: this.spaceId })))
        .returning()
      this.tags = byName(rows)
    }
    await this.reloadCategories()
  }

  async reloadCategories() {
    const rows = await db
      .select()
      .from(category)
      .where(eq(category.spaceId, this.spaceId))
    this.categories = byName(rows)
  }

  add(row: Omit<NewTransaction, 'spaceId'>, tagNames: readonly string[] = []) {
    const full = { ...row, spaceId: this.spaceId }
    this.rows.push(full)
    if (tagNames.length) this.tagsFor.set(full, [...tagNames])
    return full
  }

  expense(
    date: string,
    walletName: string,
    categoryName: string,
    amount: number,
    extra: Extra = {},
    tagNames?: readonly string[],
  ) {
    return this.add(
      {
        type: 'expense',
        date,
        walletId: this.wallets[walletName],
        categoryId: this.categories[categoryName],
        amount,
        ...extra,
      },
      tagNames,
    )
  }

  income(
    date: string,
    walletName: string,
    categoryName: string,
    amount: number,
    extra: Extra = {},
    tagNames?: readonly string[],
  ) {
    return this.add(
      {
        type: 'income',
        date,
        walletId: this.wallets[walletName],
        categoryId: this.categories[categoryName],
        amount,
        ...extra,
      },
      tagNames,
    )
  }

  transfer(
    date: string,
    from: string,
    to: string,
    amount: number,
    extra: Extra = {},
  ) {
    return this.add({
      type: 'transfer',
      date,
      walletId: this.wallets[from],
      toWalletId: this.wallets[to],
      amount,
      ...extra,
    })
  }

  // Inserts the rule and the transactions it has created so far (createdBy null: made by
  // the app, not by a person).
  async rule(rule: RuleSeed) {
    const until = rule.generatedUntil ?? today
    const [row] = await db
      .insert(recurringRule)
      .values({
        spaceId: this.spaceId,
        type: rule.type,
        walletId: this.wallets[rule.wallet],
        categoryId: rule.category ? this.categories[rule.category] : null,
        toWalletId: rule.toWallet ? this.wallets[rule.toWallet] : null,
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
      this.add({
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

  async insert() {
    const untagged = this.rows.filter((t) => !this.tagsFor.has(t))
    for (let i = 0; i < untagged.length; i += 500) {
      await db.insert(transaction).values(untagged.slice(i, i + 500))
    }
    for (const [row, tagNames] of this.tagsFor) {
      const [inserted] = await db.insert(transaction).values(row).returning()
      await db.insert(transactionTag).values(
        tagNames.map((name) => ({
          spaceId: this.spaceId,
          transactionId: inserted.id,
          tagId: this.tags[name],
        })),
      )
    }
  }

  // Balance at the end of each day up to today, oldest first.
  dailyBalances(walletName: string) {
    const walletId = this.wallets[walletName]
    let running =
      this.walletRows.find((w) => w.id === walletId)?.initialBalance ?? 0
    const past = this.rows
      .filter((t) => t.date <= today)
      .sort((a, b) => a.date.localeCompare(b.date))
    const result: number[] = []
    past.forEach((t, i) => {
      if (t.walletId === walletId)
        running += t.type === 'income' ? t.amount : -t.amount
      else if (t.toWalletId === walletId) running += t.toAmount ?? t.amount
      if (past[i + 1]?.date !== t.date) result.push(running)
    })
    return result
  }

  balance = (walletName: string) => this.dailyBalances(walletName).at(-1) ?? 0
  neverNegative = (walletName: string) =>
    this.dailyBalances(walletName).every((value) => value >= 0)

  spent(categoryName: string, from: string, to: string) {
    return this.rows
      .filter(
        (t) =>
          t.type === 'expense' &&
          t.categoryId === this.categories[categoryName] &&
          t.date >= from &&
          t.date <= to,
      )
      .reduce((sum, t) => sum + t.amount, 0)
  }

  total(
    type: 'income' | 'expense',
    from: string,
    to: string,
    walletNames: string[],
  ) {
    const ids = walletNames.map((name) => this.wallets[name])
    return this.rows
      .filter(
        (t) =>
          t.type === type &&
          t.date >= from &&
          t.date <= to &&
          ids.includes(t.walletId),
      )
      .reduce((sum, t) => sum + t.amount, 0)
  }
}

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

export async function addCategory(
  ledger: Ledger,
  values: Omit<typeof category.$inferInsert, 'spaceId' | 'parentId'> & {
    parent?: string
  },
) {
  const { parent, ...rest } = values
  await db.insert(category).values({
    ...rest,
    spaceId: ledger.spaceId,
    parentId: parent ? ledger.categories[parent] : null,
  })
  await ledger.reloadCategories()
}

export async function seedAlex(ledger: Ledger, alexId: string) {
  const me = { createdBy: alexId }
  await ledger.load(
    [
      {
        name: 'Main account',
        type: 'checking',
        currency: 'EUR',
        initialBalance: money(2400),
        color: '#2563eb',
        icon: 'landmark',
      },
      {
        name: 'Cash',
        type: 'cash',
        currency: 'EUR',
        initialBalance: money(80),
        color: '#16a34a',
        icon: 'wallet',
      },
      {
        name: 'Savings',
        type: 'savings',
        currency: 'EUR',
        initialBalance: money(5000),
        color: '#0d9488',
        icon: 'piggy-bank',
      },
      // Spending accumulates here and is paid off from the main account each month, so
      // its balance is usually negative.
      {
        name: 'Credit card',
        type: 'credit_card',
        currency: 'EUR',
        initialBalance: 0,
        color: '#7c3aed',
        icon: 'credit-card',
      },
      // Second currency, funded by a EUR to USD transfer.
      {
        name: 'US trip',
        type: 'cash',
        currency: 'USD',
        initialBalance: 0,
        color: '#ea580c',
        icon: 'banknote',
      },
      // Closed: history only, balance moved to the main account.
      {
        name: 'Student account',
        type: 'checking',
        currency: 'EUR',
        initialBalance: money(420),
        color: '#64748b',
        icon: 'landmark',
        archivedAt: new Date(monthStart(9)),
      },
    ],
    [
      { name: 'Vacation', color: '#0891b2' },
      { name: 'Reimbursable', color: '#ca8a04' },
      { name: 'Gift', color: '#db2777' },
      { name: 'Business', color: '#4f46e5' },
      { name: 'Tax deductible', color: '#15803d' },
      { name: 'Wedding', color: '#e11d48' }, // never used
    ],
  )
  // Contributions to the shared Household space.
  await addCategory(ledger, {
    name: 'Household',
    type: 'expense',
    icon: 'handshake',
    color: '#4b3f8f',
  })
  // Used by a budget, never spent on.
  await addCategory(ledger, {
    name: 'Pets',
    type: 'expense',
    icon: 'paw-print',
    color: '#a16207',
  })
  // Long child name for layout testing, budget without spending.
  await addCategory(ledger, {
    name: 'Home improvement and garden supplies',
    type: 'expense',
    icon: 'hammer',
    color: '#78716c',
    parent: 'Home',
  })
  // Archived, but older transactions still point to it.
  await addCategory(ledger, {
    name: 'Photography',
    type: 'expense',
    icon: 'camera',
    color: '#475569',
    archivedAt: new Date(monthStart(9)),
  })

  const first31 = (() => {
    let month = start
    while (addMonths(`${month.slice(0, 8)}31`, 0).slice(8) !== '31') {
      month = addMonths(month, 1)
    }
    return `${month.slice(0, 8)}31`
  })()

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
      category: 'Household',
      amount: money(1050),
      payee: 'Household',
      note: 'My share of rent and bills',
      frequency: 'monthly',
      interval: 1,
      startDate: addDays(start, 25),
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
      // The latest charge is the first at the new price, for "Worth a look" on Home.
      previousAmount: { amount: money(10.99), until: addDays(today, -31) },
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
      type: 'transfer',
      wallet: 'Main account',
      toWallet: 'Savings',
      amount: money(600),
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
      amount: money(40),
      note: 'Pocket money',
      frequency: 'weekly',
      interval: 2,
      startDate: firstWeekday(start, 1),
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
  for (const rule of rules) await ledger.rule(rule)

  // The current budget month (25th to 24th) is fixed below, so the budgets show known
  // states.
  const period = budgetPeriod(today, 25)
  const inPeriod = (offset: number) => {
    const date = addDays(period.start, offset)
    return date > today ? today : date
  }

  for (const date of days(start, today)) {
    const day = weekday(date)
    const isWinter = ['11', '12', '01', '02'].includes(date.slice(5, 7))
    const dayOfMonth = Number(date.slice(8))

    if (day === 4 && chance(0.6)) {
      ledger.expense(
        date,
        chance(0.6) ? 'Main account' : 'Cash',
        'Groceries',
        cents(6, 35),
        {
          ...me,
          payee: pick(['Lidl', 'Billa', 'Corner shop']),
        },
      )
    }
    if (day >= 1 && day <= 5 && chance(0.35)) {
      ledger.expense(
        date,
        chance(0.5) ? 'Cash' : 'Credit card',
        'Restaurants & cafés',
        cents(1.8, 4.5),
        { ...me, payee: 'Café Central' },
      )
    }
    if (dayOfMonth === 2) {
      ledger.expense(date, 'Main account', 'Transport', money(49), {
        ...me,
        payee: 'City Transit',
        note: 'Monthly pass',
      })
    }
    if (date < period.start) {
      if ([5, 6].includes(day) && chance(0.5)) {
        ledger.expense(
          date,
          'Credit card',
          'Restaurants & cafés',
          cents(15, 80),
          {
            ...me,
            payee: pick([
              'Trattoria Roma',
              'Sushi Bar',
              'Burger House',
              'Thai Garden',
            ]),
          },
        )
      }
      if (chance(0.04)) {
        ledger.expense(date, 'Credit card', 'Transport', cents(9, 28), {
          ...me,
          payee: 'Taxi',
        })
      }
    }
    if (chance(0.06)) {
      ledger.expense(date, 'Credit card', 'Shopping', cents(15, 180), {
        ...me,
        payee: pick(['Zalando', 'Decathlon', 'Amazon']),
      })
    }
    if (chance(0.05)) {
      ledger.expense(date, 'Credit card', 'Entertainment', cents(8, 45), {
        ...me,
        payee: pick(['Cinema City', 'Steam', 'Bowling Alley']),
      })
    }
    if (chance(isWinter ? 0.05 : 0.03)) {
      ledger.expense(date, 'Cash', 'Health', cents(5, 40), {
        ...me,
        payee: 'Pharmacy',
      })
    }
    // Monthly interest on the last day of the month; the very first payout is the smallest
    // possible amount, 0.01.
    if (addDays(date, 1).endsWith('-01')) {
      const first = date < addMonths(start, 1)
      ledger.income(date, 'Savings', 'Interest', first ? 1 : cents(2, 9), {
        payee: 'Bank',
      })
    }
  }

  // Current budget month: Restaurants over its 120.00 budget, Transport around 85 % of 80.00
  // (checked in the report).
  for (const [offset, amount, payee] of [
    [3, 32.5, 'Trattoria Roma'],
    [7, 41.9, 'Sushi Bar'],
    [11, 28, 'Burger House'],
    [16, 47.6, 'Thai Garden'],
  ] as const) {
    ledger.expense(
      inPeriod(offset),
      'Credit card',
      'Restaurants & cafés',
      money(amount),
      {
        ...me,
        payee,
      },
    )
  }
  ledger.expense(inPeriod(9), 'Credit card', 'Transport', money(19), {
    ...me,
    payee: 'Taxi',
  })

  // Big purchase, and a purchase with its refund.
  ledger.expense(dayOf(7, 15), 'Credit card', 'Shopping', money(1899.99), {
    ...me,
    payee: 'TechStore',
    note: 'Work laptop, 2 year warranty',
  })
  ledger.expense(dayOf(7, 3), 'Credit card', 'Shopping', money(79.9), {
    ...me,
    payee: 'Zalando',
    note: 'Running shoes',
  })
  ledger.income(dayOf(7, 13), 'Main account', 'Refunds', money(79.9), {
    ...me,
    payee: 'Zalando',
    note: 'Returned shoes (wrong size)',
  })

  // Trip abroad: EUR to USD transfer with a different target amount, spending in USD.
  ledger.expense(
    dayOf(6, 20),
    'Credit card',
    'Travel',
    money(489),
    { ...me, payee: 'SkyAir', note: 'Flights VIE ⇄ JFK' },
    ['Vacation'],
  )
  ledger.transfer(dayOf(5, 9), 'Main account', 'US trip', money(600), {
    ...me,
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
    ledger.expense(
      dayOf(5, day),
      'US trip',
      categoryName,
      money(amount),
      { ...me, payee },
      tagNames,
    )
  }

  // Busy day: twelve transactions on one Saturday.
  const busyDay = firstWeekday(dayOf(1, 1), 6)
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
    ledger.expense(busyDay, walletName, categoryName, money(amount), {
      ...me,
      payee,
    })
  }
  ledger.transfer(busyDay, 'Main account', 'Cash', money(100), {
    ...me,
    note: 'ATM withdrawal',
  })

  // December: holiday spending pushes expenses over income.
  const december = decemberStart()
  for (const [day, amount, payee] of [
    [6, 45, 'Toy Store'],
    [9, 120, 'Jewellery Shop'],
    [12, 35.5, 'Bookstore'],
    [15, 89, 'Electronics Hub'],
    [18, 150, 'Department Store'],
    [20, 25, 'Christmas market'],
  ] as const) {
    ledger.expense(
      addDays(december, day - 1),
      'Credit card',
      'Gifts & donations',
      money(amount),
      { ...me, payee },
      ['Gift'],
    )
  }
  ledger.expense(
    addDays(december, 21),
    'Main account',
    'Gifts & donations',
    money(50),
    { ...me, payee: 'Red Cross', note: 'Donation' },
    ['Tax deductible'],
  )
  ledger.expense(addDays(december, 27), 'Credit card', 'Travel', money(1240), {
    ...me,
    payee: 'Alpine Resorts',
    note: 'Ski week in Austria, half board',
  })

  // Freelance income.
  ledger.income(
    dayOf(11, 18),
    'Main account',
    'Freelance',
    money(850),
    { ...me, payee: 'Bakery Lo', note: 'Website redesign' },
    ['Business'],
  )
  ledger.income(
    dayOf(4, 7),
    'Main account',
    'Freelance',
    money(1200),
    { ...me, payee: 'GreenLeaf Studio', note: 'Mobile app prototype' },
    ['Business'],
  )
  ledger.income(
    dayOf(1, 22),
    'Main account',
    'Freelance',
    money(420.5),
    { ...me, payee: 'Bakery Lo', note: 'Maintenance, invoice 2026-14' },
    ['Business', 'Tax deductible'],
  )

  // Reimbursed business expense.
  ledger.expense(
    dayOf(2, 11),
    'Credit card',
    'Restaurants & cafés',
    money(64.8),
    { ...me, payee: 'Bistro 21', note: 'Client lunch' },
    ['Business', 'Reimbursable'],
  )
  ledger.income(
    dayOf(2, 25),
    'Main account',
    'Other income',
    money(64.8),
    { ...me, payee: 'Acme Corp', note: 'Expense report #2026-031' },
    ['Reimbursable'],
  )

  // Notes: long, multi-line and non-ASCII. Parent category used directly.
  ledger.expense(dayOf(3, 8), 'Main account', 'Food', money(142.37), {
    ...me,
    payee: 'Tesco',
    note: 'Big shop before the trip: rice, pasta, olive oil, coffee beans, frozen vegetables, two kinds of cheese, snacks for the weekend, dog treats for the neighbours, and a birthday cake for the office. Remember to keep the receipt for the warranty on the blender.',
  })
  ledger.expense(dayOf(2, 14), 'Cash', 'Restaurants & cafés', money(12.4), {
    ...me,
    payee: 'Café Zoë',
    note: 'Café ☕ with Zoë and Jürgen, birthday 🎂',
  })
  ledger.expense(dayOf(1, 5), 'Main account', 'Education', money(129), {
    ...me,
    payee: 'Udemy',
    note: 'TypeScript course\nCertificate after 40 hours\nDiscount code applied',
  })

  // Archived category with history.
  ledger.expense(dayOf(12, 6), 'Credit card', 'Photography', money(349), {
    ...me,
    payee: 'FotoShop',
    note: 'Camera lens 50 mm',
  })
  ledger.expense(dayOf(11, 20), 'Credit card', 'Photography', money(24.9), {
    ...me,
    payee: 'FotoShop',
    note: 'Memory card',
  })

  // Archived wallet: spending, then the remaining balance moves to the main account.
  const studentSpending = [
    ledger.expense(dayOf(13, 4), 'Student account', 'Groceries', money(36.2), {
      ...me,
      payee: 'Lidl',
    }),
    ledger.expense(dayOf(12, 9), 'Student account', 'Education', money(65), {
      ...me,
      payee: 'University',
      note: 'Library fee',
    }),
    ledger.expense(
      dayOf(11, 15),
      'Student account',
      'Restaurants & cafés',
      money(9.8),
      {
        ...me,
        payee: 'Canteen',
      },
    ),
  ]
  const studentLeft =
    money(420) - studentSpending.reduce((sum, t) => sum + t.amount, 0)
  ledger.transfer(
    dayOf(10, 1),
    'Student account',
    'Main account',
    studentLeft,
    {
      ...me,
      note: 'Closing the student account',
    },
  )

  // Today and the near future.
  ledger.expense(today, 'Cash', 'Restaurants & cafés', money(3.2), {
    ...me,
    payee: 'Café Central',
  })
  ledger.expense(today, 'Main account', 'Groceries', money(23.45), {
    ...me,
    payee: 'Billa',
  })
  ledger.expense(addDays(today, 5), 'Credit card', 'Entertainment', money(89), {
    ...me,
    payee: 'Ticket Hub',
    note: 'Concert tickets (booked, not charged yet)',
  })

  // Credit card bill: last month's card spending, paid from the main account on the 5th.
  for (let monthsAgo = 13; monthsAgo >= 0; monthsAgo--) {
    const payDate = dayOf(monthsAgo, 5)
    if (Number(payDate.slice(8)) !== 5) continue
    const bill = ledger.rows
      .filter(
        (t) =>
          t.walletId === ledger.wallets['Credit card'] &&
          t.type === 'expense' &&
          t.date >= monthStart(monthsAgo + 1) &&
          t.date < monthStart(monthsAgo),
      )
      .reduce((sum, t) => sum + t.amount, 0)
    if (bill > 0) {
      ledger.transfer(payDate, 'Main account', 'Credit card', bill, {
        note: 'Credit card bill',
      })
    }
  }
}

export async function seedJordan(ledger: Ledger, jordanId: string) {
  const me = { createdBy: jordanId }
  await ledger.load(
    [
      {
        name: 'Bank',
        type: 'checking',
        currency: 'EUR',
        initialBalance: money(1200),
        color: '#0284c7',
        icon: 'landmark',
      },
      {
        name: 'Cash',
        type: 'cash',
        currency: 'EUR',
        initialBalance: money(40),
        color: '#16a34a',
        icon: 'wallet',
      },
      {
        name: 'Savings',
        type: 'savings',
        currency: 'EUR',
        initialBalance: money(3000),
        color: '#0d9488',
        icon: 'piggy-bank',
      },
    ],
    [],
  )
  await addCategory(ledger, {
    name: 'Household',
    type: 'expense',
    icon: 'handshake',
    color: '#4b3f8f',
  })
  for (const rule of [
    {
      type: 'income',
      wallet: 'Bank',
      category: 'Salary',
      amount: money(2100),
      payee: 'City Hospital',
      frequency: 'monthly',
      interval: 1,
      startDate: start,
    },
    {
      type: 'expense',
      wallet: 'Bank',
      category: 'Household',
      amount: money(1050),
      payee: 'Household',
      frequency: 'monthly',
      interval: 1,
      startDate: addDays(start, 1),
    },
    {
      type: 'transfer',
      wallet: 'Bank',
      toWallet: 'Savings',
      amount: money(500),
      note: 'Savings',
      frequency: 'monthly',
      interval: 1,
      startDate: addDays(start, 2),
    },
  ] satisfies RuleSeed[]) {
    await ledger.rule(rule)
  }
  for (const date of days(start, today)) {
    if (chance(0.3)) {
      ledger.expense(date, 'Cash', 'Restaurants & cafés', cents(2, 6), {
        ...me,
        payee: 'Hospital canteen',
      })
    }
    if (chance(0.05)) {
      ledger.expense(date, 'Bank', 'Shopping', cents(10, 90), {
        ...me,
        payee: pick(['H&M', 'Bookstore', 'Amazon']),
      })
    }
    if (date.endsWith('-15')) {
      ledger.transfer(date, 'Bank', 'Cash', money(60), {
        ...me,
        note: 'ATM withdrawal',
      })
    }
  }
}

export async function seedHousehold(
  ledger: Ledger,
  alexId: string,
  jordanId: string,
) {
  await ledger.load(
    [
      {
        name: 'Joint account',
        type: 'checking',
        currency: 'EUR',
        initialBalance: money(2500),
        color: '#4b3f8f',
        icon: 'landmark',
      },
    ],
    [
      { name: 'Guests', color: '#ea580c' },
      { name: 'Renovation', color: '#78716c' },
    ],
  )
  await addCategory(ledger, {
    name: 'Contributions',
    type: 'income',
    icon: 'handshake',
    color: '#4b3f8f',
  })

  const rules: RuleSeed[] = [
    {
      type: 'income',
      wallet: 'Joint account',
      category: 'Contributions',
      amount: money(1050),
      payee: 'Alex',
      frequency: 'monthly',
      interval: 1,
      startDate: addDays(start, 25),
    },
    {
      type: 'income',
      wallet: 'Joint account',
      category: 'Contributions',
      amount: money(1050),
      payee: 'Jordan',
      frequency: 'monthly',
      interval: 1,
      startDate: addDays(start, 1),
    },
    {
      type: 'expense',
      wallet: 'Joint account',
      category: 'Housing',
      amount: money(1400),
      payee: 'Landlord',
      note: 'Rent',
      frequency: 'monthly',
      interval: 1,
      startDate: start,
    },
    {
      type: 'expense',
      wallet: 'Joint account',
      category: 'Utilities',
      amount: money(29.99),
      payee: 'FiberNet',
      note: 'Internet',
      frequency: 'monthly',
      interval: 1,
      startDate: addDays(start, 7),
    },
    {
      type: 'expense',
      wallet: 'Joint account',
      category: 'Housing',
      amount: money(420),
      payee: 'HomeSafe Insurance',
      note: 'Home insurance, yearly',
      frequency: 'yearly',
      interval: 1,
      startDate: addDays(start, 9),
    },
  ]
  for (const rule of rules) await ledger.rule(rule)

  const members = [alexId, jordanId]
  for (const date of days(start, today)) {
    const day = weekday(date)
    const isWinter = ['11', '12', '01', '02'].includes(date.slice(5, 7))
    if ([2, 6].includes(day) && chance(0.85)) {
      ledger.expense(date, 'Joint account', 'Groceries', cents(20, 80), {
        createdBy: pick(members),
        payee: pick(['Lidl', 'Billa', 'Tesco', 'Farmers market']),
      })
    }
    if (date.endsWith('-12')) {
      ledger.expense(
        date,
        'Joint account',
        'Utilities',
        isWinter ? cents(85, 120) : cents(40, 65),
        { payee: 'PowerGrid', note: 'Electricity' },
      )
    }
    if (day === 0 && chance(0.15)) {
      ledger.expense(
        date,
        'Joint account',
        'Restaurants & cafés',
        cents(40, 120),
        {
          createdBy: pick(members),
          payee: 'Pizza delivery',
          note: 'Friends over',
        },
        ['Guests'],
      )
    }
  }
  ledger.expense(
    dayOf(8, 14),
    'Joint account',
    'Furniture',
    money(649),
    { createdBy: jordanId, payee: 'IKEA', note: 'New sofa' },
    ['Renovation'],
  )
  ledger.expense(
    dayOf(8, 20),
    'Joint account',
    'Home',
    money(86.4),
    { createdBy: alexId, payee: 'Hardware store', note: 'Paint and brushes' },
    ['Renovation'],
  )
}

export function decemberStart() {
  return today.slice(5, 7) === '12'
    ? thisMonth
    : `${Number(today.slice(0, 4)) - 1}-12-01`
}

export async function addPersonalBudgets(alex: Ledger) {
  await db.insert(budget).values([
    { spaceId: alex.spaceId, categoryId: null, amount: money(1400) },
    {
      spaceId: alex.spaceId,
      categoryId: alex.categories.Groceries,
      amount: money(120),
    },
    {
      spaceId: alex.spaceId,
      categoryId: alex.categories['Restaurants & cafés'],
      amount: money(120),
    },
    {
      spaceId: alex.spaceId,
      categoryId: alex.categories.Transport,
      amount: money(80),
    },
    {
      spaceId: alex.spaceId,
      categoryId: alex.categories.Entertainment,
      amount: money(60),
    },
    {
      spaceId: alex.spaceId,
      categoryId: alex.categories.Pets,
      amount: money(50),
      // Shows a carried-over limit: nothing is spent on pets, and the budget is old enough.
      rollover: true,
      createdAt: new Date(`${start}T00:00:00Z`),
    },
    {
      spaceId: alex.spaceId,
      categoryId: alex.categories['Home improvement and garden supplies'],
      amount: money(100),
    },
  ])
}

// Restarts the generator for a day (the visitor's, for demos). The data depends on the
// order of `random()` calls, so callers seed one space at a time (the CLI does, the demo
// sign-in queues).
export function resetDemoClock(day = todayIso()) {
  seed = 2026
  today = day
  thisMonth = `${today.slice(0, 7)}-01`
  start = monthStart(14)
}

// Fills a new personal space with Alex's data: what "Try the demo" gives each visitor,
// relative to their own today, so nothing shows up as tomorrow's.
export async function seedPersonalDemo(
  spaceId: string,
  userId: string,
  day: string,
) {
  resetDemoClock(day)
  const ledger = new Ledger(spaceId)
  await seedAlex(ledger, userId)
  await ledger.insert()
  await addPersonalBudgets(ledger)
}
