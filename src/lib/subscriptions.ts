import { addDays, addMonths } from './recurrence.ts'

export interface Payment {
  date: string
  payee: string
  amount: number
  walletId: string
  categoryId: string | null
}

type Cadence = 'weekly' | 'monthly' | 'yearly'

// Typical gap in days and the range that still counts as that cadence (a monthly debit
// moves with weekends and short months).
const CADENCES: { cadence: Cadence; days: number; min: number; max: number }[] =
  [
    { cadence: 'weekly', days: 7, min: 6, max: 8 },
    { cadence: 'monthly', days: 30.44, min: 26, max: 35 },
    { cadence: 'yearly', days: 365.25, min: 350, max: 380 },
  ]

const PER_YEAR: Record<Cadence, number> = { weekly: 52, monthly: 12, yearly: 1 }

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)

// Payments to the same payee from the same wallet at a steady cadence and a steady amount
// (within 15 %, so a price increase still counts), still going: the latest one is not
// overdue by more than half a cycle. Weekly and monthly need three payments, yearly two.
export function findSubscriptions(payments: Payment[], today: string) {
  const groups = new Map<string, Payment[]>()
  for (const p of payments) {
    const key = `${p.walletId}|${p.payee.trim().toLowerCase()}`
    groups.set(key, [...(groups.get(key) ?? []), p])
  }
  const found = []
  for (const group of groups.values()) {
    const sorted = group.toSorted((a, b) => a.date.localeCompare(b.date))
    const gaps = sorted
      .slice(1)
      .map((p, i) => daysBetween(sorted[i].date, p.date))
    if (gaps.length === 0) continue
    const gap = median(gaps)
    const match = CADENCES.find((c) => gap >= c.min && gap <= c.max)
    if (!match) continue
    if (sorted.length < (match.cadence === 'yearly' ? 2 : 3)) continue
    // Most gaps must fit, so a payee paid at random times is not a subscription.
    if (
      gaps.filter((g) => g >= match.min && g <= match.max).length <
      gaps.length * 0.75
    )
      continue
    const last = sorted[sorted.length - 1]
    const typical = median(sorted.map((p) => p.amount))
    if (
      sorted
        .slice(-3)
        .some((p) => Math.abs(p.amount - typical) > typical * 0.15)
    )
      continue
    if (daysBetween(last.date, today) > match.days * 1.5) continue

    const nextDate =
      match.cadence === 'weekly'
        ? addDays(last.date, 7)
        : addMonths(last.date, match.cadence === 'monthly' ? 1 : 12)
    found.push({
      payee: last.payee,
      walletId: last.walletId,
      categoryId: last.categoryId,
      amount: last.amount,
      cadence: match.cadence,
      count: sorted.length,
      lastDate: last.date,
      nextDate,
      yearlyCost: last.amount * PER_YEAR[match.cadence],
    })
  }
  return found.sort((a, b) => b.yearlyCost - a.yearlyCost)
}

export const yearlyCost = (
  amount: number,
  frequency: string,
  interval: number,
) => {
  const perYear =
    { daily: 365, weekly: 52, monthly: 12, yearly: 1 }[frequency] ?? 0
  return Math.round((amount * perYear) / interval)
}
