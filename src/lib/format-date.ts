import { formatLocale } from '@/lib/locale'
import { addDays } from '@/lib/recurrence'
import { m } from '@/paraglide/messages.js'

// Calendar dates are formatted in UTC, the zone they were parsed in, so a day never shifts.
const format = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Date(date).toLocaleDateString(formatLocale(), {
    timeZone: 'UTC',
    ...options,
  })

// "24 Oct", or "31 Oct 2025" outside the current year.
export const formatShortDate = (date: string) =>
  format(date, {
    day: 'numeric',
    month: 'short',
    year:
      date.slice(0, 4) === String(new Date().getFullYear())
        ? undefined
        : 'numeric',
  })

export function formatDayHeading(date: string, today: string) {
  if (date === today) return m.shell_date_today()
  if (date === addDays(today, -1)) return m.shell_date_yesterday()
  if (date === addDays(today, 1)) return m.shell_date_tomorrow()
  return format(date, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: date.slice(0, 4) === today.slice(0, 4) ? undefined : 'numeric',
  })
}
