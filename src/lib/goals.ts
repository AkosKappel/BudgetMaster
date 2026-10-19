// Whole months from `today` to `targetDate`, counting a part month as one: the money still
// has to be put aside that month.
export function monthsUntil(today: string, targetDate: string) {
  const [y1, m1, d1] = today.split('-').map(Number)
  const [y2, m2, d2] = targetDate.split('-').map(Number)
  const months = (y2 - y1) * 12 + (m2 - m1) + (d2 > d1 ? 1 : 0)
  return Math.max(months, 0)
}

// How far a goal is and what it takes to reach it on time. `perMonth` is null without a
// date, and when the date has passed with money still missing.
export function goalProgress(
  saved: number,
  target: number,
  today: string,
  targetDate: string | null,
) {
  const remaining = Math.max(target - saved, 0)
  const percent = Math.min(Math.max(Math.floor((saved / target) * 100), 0), 100)
  const monthsLeft = targetDate ? monthsUntil(today, targetDate) : null
  const perMonth =
    remaining === 0 ? 0 : monthsLeft ? Math.ceil(remaining / monthsLeft) : null
  return { remaining, percent, monthsLeft, perMonth, reached: remaining === 0 }
}
