// Calendar dates are ISO `YYYY-MM-DD` strings, computed in UTC so DST never shifts a day.
// ISO strings sort and compare correctly as plain strings.

import { m } from '../paraglide/messages.js'
import { formatLocale } from './locale.ts'

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface Schedule {
  startDate: string
  frequency: Frequency
  interval: number
  endDate?: string | null
}

const DAY_MS = 86_400_000

const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10)

export function addDays(date: string, days: number): string {
  return toIso(Date.parse(date) + days * DAY_MS)
}

// Clamps to the last day of the target month: Jan 31 + 1 month = Feb 28 (or 29).
export function addMonths(date: string, months: number): string {
  const [year, month, day] = date.split('-').map(Number)
  const target = year * 12 + (month - 1) + months
  const targetYear = Math.floor(target / 12)
  const targetMonth = target % 12
  const lastDay = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate()
  return toIso(Date.UTC(targetYear, targetMonth, Math.min(day, lastDay)))
}

// The nth date is always computed from the start date, so a rule on the 31st returns to
// the 31st after a short month instead of drifting to the 28th.
export function nthOccurrence(schedule: Schedule, n: number): string {
  const steps = n * schedule.interval
  switch (schedule.frequency) {
    case 'daily':
      return addDays(schedule.startDate, steps)
    case 'weekly':
      return addDays(schedule.startDate, steps * 7)
    case 'monthly':
      return addMonths(schedule.startDate, steps)
    case 'yearly':
      return addMonths(schedule.startDate, steps * 12)
  }
}

// All occurrences up to and including `until` (and the end date, if any).
export function occurrencesUntil(schedule: Schedule, until: string): string[] {
  const last =
    schedule.endDate && schedule.endDate < until ? schedule.endDate : until
  const dates: string[] = []
  for (let n = 0; ; n++) {
    const date = nthOccurrence(schedule, n)
    if (date > last) return dates
    dates.push(date)
  }
}

// The first occurrence after `after`, or null when the schedule has ended by then.
export function nextOccurrence(
  schedule: Schedule,
  after: string,
): string | null {
  for (let n = 0; ; n++) {
    const date = nthOccurrence(schedule, n)
    if (schedule.endDate && date > schedule.endDate) return null
    if (date > after) return date
  }
}

// The budget month containing `date` when months start on `startDay` (1 to 28): with
// startDay 25, 2026-10-18 belongs to 2026-09-25 .. 2026-10-24.
export function budgetPeriod(date: string, startDay: number) {
  const startThisMonth = `${date.slice(0, 8)}${String(startDay).padStart(2, '0')}`
  const start =
    Number(date.slice(8)) >= startDay
      ? startThisMonth
      : addMonths(startThisMonth, -1)
  return { start, end: addDays(addMonths(start, 1), -1) }
}

// Today as a calendar date in UTC, the same clock the seed uses.
export const todayIso = () => new Date().toISOString().slice(0, 10)

// Today in an IANA time zone ("sv" formats as YYYY-MM-DD). An unknown zone falls back to UTC.
export function todayIn(timeZone: string | undefined, now = new Date()) {
  try {
    // Without a zone Intl would use the server's own clock, not UTC.
    return new Intl.DateTimeFormat('sv', {
      timeZone: timeZone ?? 'UTC',
    }).format(now)
  } catch {
    return now.toISOString().slice(0, 10)
  }
}

// Today on the user's own clock, for form defaults ("sv" formats as YYYY-MM-DD).
export const localTodayIso = () => new Date().toLocaleDateString('sv')

const ordinal = (n: number) => {
  const suffix =
    n % 10 === 1 && n !== 11
      ? 'st'
      : n % 10 === 2 && n !== 12
        ? 'nd'
        : n % 10 === 3 && n !== 13
          ? 'rd'
          : 'th'
  return `${n}${suffix}`
}

// "Every month on the 25th", "Every 2 weeks on Monday", "Every year on 3 March".
export function describeSchedule({ startDate, frequency, interval }: Schedule) {
  const date = new Date(`${startDate}T00:00:00Z`)
  const units = {
    daily: m.setup_schedule_every_day,
    weekly: m.setup_schedule_every_week,
    monthly: m.setup_schedule_every_month,
    yearly: m.setup_schedule_every_year,
  }
  const every = units[frequency]({ count: interval })
  switch (frequency) {
    case 'daily':
      return every
    case 'weekly':
      return m.setup_schedule_weekly({
        every,
        weekday: date.toLocaleDateString(formatLocale(), {
          weekday: 'long',
          timeZone: 'UTC',
        }),
      })
    case 'monthly':
      // English needs the suffix ("25th"); other languages use the plain day number.
      return m.setup_schedule_monthly({
        every,
        day: date.getUTCDate(),
        ordinal: ordinal(date.getUTCDate()),
      })
    case 'yearly':
      return m.setup_schedule_yearly({
        every,
        date: date.toLocaleDateString(formatLocale(), {
          day: 'numeric',
          month: 'long',
          timeZone: 'UTC',
        }),
      })
  }
}
