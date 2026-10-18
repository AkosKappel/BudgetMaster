import { APP_LOCALE } from '@/lib/money'
import { addDays } from '@/lib/recurrence'

// Calendar dates are formatted in UTC, the zone they were parsed in, so a day never shifts.
const format = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Date(date).toLocaleDateString(APP_LOCALE, { timeZone: 'UTC', ...options })

export const formatShortDate = (date: string) =>
  format(date, { day: 'numeric', month: 'short' })

export function formatDayHeading(date: string, today: string) {
  if (date === today) return 'Today'
  if (date === addDays(today, -1)) return 'Yesterday'
  if (date === addDays(today, 1)) return 'Tomorrow'
  return format(date, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: date.slice(0, 4) === today.slice(0, 4) ? undefined : 'numeric',
  })
}
