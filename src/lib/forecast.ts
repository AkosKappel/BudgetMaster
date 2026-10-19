import { addDays, occurrencesUntil, type Schedule } from './recurrence.ts'

export interface Movement {
  type: 'income' | 'expense' | 'transfer'
  walletId: string
  toWalletId: string | null
  amount: number
  toAmount: number | null
}

export interface ForecastEvent {
  id: string
  date: string
  label: string
  change: number
}

// What a movement does to the total of `wallets`: a transfer between two of them changes
// nothing, one leaving or entering the set counts like an expense or an income.
export function changeFor(m: Movement, wallets: Set<string>) {
  const from = wallets.has(m.walletId) ? m.amount : 0
  if (m.type === 'income') return from
  if (m.type === 'expense') return 0 - from
  const to =
    m.toWalletId && wallets.has(m.toWalletId) ? (m.toAmount ?? m.amount) : 0
  return to - from
}

// The payments a rule will still make after `today`, up to `until`. Paused rules make none,
// and `nextDate` skips dates the rule has already made or skipped.
export function ruleDates(
  rule: Schedule & { nextDate: string | null; paused: boolean },
  today: string,
  until: string,
) {
  if (rule.paused || !rule.nextDate) return []
  const nextDate = rule.nextDate
  return occurrencesUntil(rule, until).filter(
    (date) => date > today && date >= nextDate,
  )
}

// Balance at the end of each day from today to today + days, and the lowest one. The
// lowest point is the first day it is reached, which is when it starts to matter.
export function projectBalance(
  balance: number,
  today: string,
  days: number,
  events: ForecastEvent[],
) {
  const points: { date: string; balance: number }[] = []
  let running = balance
  for (let i = 0; i <= days; i++) {
    const date = addDays(today, i)
    if (i > 0)
      running += events
        .filter((e) => e.date === date)
        .reduce((sum, e) => sum + e.change, 0)
    points.push({ date, balance: running })
  }
  const lowest = points.reduce((low, p) => (p.balance < low.balance ? p : low))
  return { points, lowest }
}
