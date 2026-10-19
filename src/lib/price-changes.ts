import { addMonths } from './recurrence.ts'

export interface Purchase {
  date: string
  payee: string
  amount: number
}

const median = (values: number[]) => {
  const sorted = values.toSorted((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2)
}

// How the typical amount paid to the same payee moved: the median of the last three months
// against the median of the same three months a year earlier. Payees need two payments in
// both windows, so a one-off does not count. `inflation` compares what this basket of
// payees cost then and now, in percent with one decimal.
export function priceChanges(purchases: Purchase[], today: string) {
  const recentFrom = addMonths(today, -3)
  const earlierTo = addMonths(today, -12)
  const earlierFrom = addMonths(today, -15)

  const byPayee = new Map<
    string,
    { name: string; before: number[]; recent: number[] }
  >()
  for (const p of purchases) {
    const key = p.payee.trim().toLowerCase()
    const entry = byPayee.get(key) ?? {
      name: p.payee.trim(),
      before: [],
      recent: [],
    }
    if (p.date > recentFrom && p.date <= today) entry.recent.push(p.amount)
    else if (p.date > earlierFrom && p.date <= earlierTo)
      entry.before.push(p.amount)
    byPayee.set(key, entry)
  }

  const payees = [...byPayee.values()]
    .filter((p) => p.before.length >= 2 && p.recent.length >= 2)
    .map((p) => {
      const before = median(p.before)
      const recent = median(p.recent)
      return {
        payee: p.name,
        before,
        recent,
        change: Math.round(((recent - before) / before) * 1000) / 10,
      }
    })
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))

  const totalThen = payees.reduce((sum, p) => sum + p.before, 0)
  const totalNow = payees.reduce((sum, p) => sum + p.recent, 0)
  const inflation =
    totalThen > 0
      ? Math.round(((totalNow - totalThen) / totalThen) * 1000) / 10
      : null
  return { payees, inflation }
}
