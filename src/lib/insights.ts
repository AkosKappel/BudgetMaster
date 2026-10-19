import { addDays } from './recurrence.ts'

export interface Expense {
  id: string
  date: string
  payee: string | null
  amount: number
  walletId: string
  recurringRuleId: string | null
}

// One category line (a split part or a whole transaction), its category rolled up to the
// top-level one.
export interface CategoryLine {
  category: string
  date: string
  amount: number
}

export type Insight =
  | {
      kind: 'duplicate'
      payee: string
      amount: number
      dates: [string, string]
    }
  | {
      kind: 'price-rise'
      payee: string
      before: number
      after: number
    }
  | {
      kind: 'category-up'
      category: string
      now: number
      before: number
      // Percent, rounded.
      change: number
      // Share of this month's spending in the category that fell on a weekend, percent.
      weekendShare: number
    }

const daysBetween = (a: string, b: string) =>
  Math.abs(Date.parse(b) - Date.parse(a)) / 86_400_000

const isWeekend = (date: string) => {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay()
  return day === 0 || day === 6
}

// The same payee, amount and wallet twice within two days in the last month, entered by
// hand: often a double charge or a transaction entered twice.
export function findDuplicates(expenses: Expense[], today: string) {
  const from = addDays(today, -30)
  const recent = expenses
    .filter((e) => e.payee && !e.recurringRuleId && e.date >= from)
    .toSorted((a, b) => a.date.localeCompare(b.date))
  const found: Insight[] = []
  const used = new Set<string>()
  for (const [i, a] of recent.entries()) {
    if (used.has(a.id)) continue
    const b = recent
      .slice(i + 1)
      .find(
        (e) =>
          !used.has(e.id) &&
          e.walletId === a.walletId &&
          e.amount === a.amount &&
          e.payee?.trim().toLowerCase() === a.payee?.trim().toLowerCase() &&
          daysBetween(a.date, e.date) <= 2,
      )
    if (!b) continue
    used.add(a.id).add(b.id)
    found.push({
      kind: 'duplicate',
      payee: a.payee ?? '',
      amount: a.amount,
      dates: [a.date, b.date],
    })
  }
  return found
}

// A recurring payment whose latest amount (in the last 45 days) is higher than the one
// before: a subscription that got more expensive.
export function findPriceRises(expenses: Expense[], today: string) {
  const byRule = new Map<string, Expense[]>()
  for (const e of expenses)
    if (e.recurringRuleId)
      byRule.set(e.recurringRuleId, [
        ...(byRule.get(e.recurringRuleId) ?? []),
        e,
      ])
  const found: Insight[] = []
  for (const payments of byRule.values()) {
    const [last, previous] = payments.toSorted((a, b) =>
      b.date.localeCompare(a.date),
    )
    if (
      previous &&
      last.amount > previous.amount &&
      last.date >= addDays(today, -45)
    )
      found.push({
        kind: 'price-rise',
        payee: last.payee ?? 'A recurring payment',
        before: previous.amount,
        after: last.amount,
      })
  }
  return found
}

// The category with the biggest rise against the same days of last month: at least 25 %
// and 20.00 (in minor units of a two-decimal currency) more, so small noise stays out.
export function findCategoryRise(
  now: CategoryLine[],
  before: CategoryLine[],
): Insight | undefined {
  const total = (lines: CategoryLine[]) => {
    const sums = new Map<string, number>()
    for (const line of lines)
      sums.set(line.category, (sums.get(line.category) ?? 0) + line.amount)
    return sums
  }
  const nowTotals = total(now)
  const beforeTotals = total(before)
  const rises = [...nowTotals]
    .map(([category, amount]) => {
      const previous = beforeTotals.get(category) ?? 0
      return { category, amount, previous, increase: amount - previous }
    })
    .filter(
      (r) =>
        r.previous > 0 && r.increase >= 2000 && r.increase >= r.previous * 0.25,
    )
    .toSorted((a, b) => b.increase - a.increase)
  const top = rises[0]
  if (!top) return undefined
  const weekend = now
    .filter((l) => l.category === top.category && isWeekend(l.date))
    .reduce((sum, l) => sum + l.amount, 0)
  return {
    kind: 'category-up',
    category: top.category,
    now: top.amount,
    before: top.previous,
    change: Math.round((top.increase / top.previous) * 100),
    weekendShare: Math.round((weekend / top.amount) * 100),
  }
}
