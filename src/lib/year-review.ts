import { addDays } from './recurrence.ts'

export interface YearRow {
  date: string
  type: 'income' | 'expense'
  amount: number
  payee: string | null
  category: string | null
}

// The year so far (up to `today` for the current year) in a few numbers, from its income
// and expense rows. Payees are grouped ignoring case and spacing.
export function yearReview(rows: YearRow[], year: number, today: string) {
  const start = `${year}-01-01`
  const yearEnd = `${year}-12-31`
  const end = today < yearEnd ? today : yearEnd
  const expenses = rows.filter((r) => r.type === 'expense')
  const income = rows
    .filter((r) => r.type === 'income')
    .reduce((sum, r) => sum + r.amount, 0)
  const spent = expenses.reduce((sum, r) => sum + r.amount, 0)

  const top = (key: (r: YearRow) => string | null) => {
    const totals = new Map<
      string,
      { name: string; total: number; count: number }
    >()
    for (const r of expenses) {
      const name = key(r)?.trim()
      if (!name) continue
      const id = name.toLowerCase()
      const entry = totals.get(id) ?? { name, total: 0, count: 0 }
      entry.total += r.amount
      entry.count += 1
      totals.set(id, entry)
    }
    return [...totals.values()].sort((a, b) => b.total - a.total)[0] ?? null
  }

  const months = new Map<string, number>()
  for (const r of expenses)
    months.set(
      r.date.slice(0, 7),
      (months.get(r.date.slice(0, 7)) ?? 0) + r.amount,
    )
  const byMonth = [...months.entries()].sort((a, b) => b[1] - a[1])

  const spendingDays = new Set(expenses.map((r) => r.date))
  let days = 0
  let noSpendDays = 0
  for (let d = start; d <= end; d = addDays(d, 1)) {
    days += 1
    if (!spendingDays.has(d)) noSpendDays += 1
  }

  const biggest = expenses.reduce<YearRow | null>(
    (max, r) => (!max || r.amount > max.amount ? r : max),
    null,
  )

  return {
    year,
    complete: end === yearEnd,
    income,
    spent,
    saved: income - spent,
    savingRate:
      income > 0 ? Math.round(((income - spent) / income) * 100) : null,
    topPayee: top((r) => r.payee),
    topCategory: top((r) => r.category),
    priciestMonth: byMonth[0]
      ? { month: byMonth[0][0], total: byMonth[0][1] }
      : null,
    noSpendDays,
    days,
    biggest: biggest && {
      payee: biggest.payee ?? biggest.category,
      amount: biggest.amount,
      date: biggest.date,
    },
    transactions: rows.length,
  }
}

export type YearReview = ReturnType<typeof yearReview>
