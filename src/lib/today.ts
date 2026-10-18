import { createIsomorphicFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'

import { localTodayIso, todayIn } from '@/lib/recurrence'

// The browser stores its IANA time zone here (TimeZoneCookie in __root.tsx).
export const TIME_ZONE_COOKIE = 'tz'

// "Today" on the user's clock: the server reads the time zone cookie, the browser uses its
// own clock, so server-rendered pages and server functions agree with what the user sees.
// Without the cookie yet (the very first request) the server uses UTC.
export const currentDay = createIsomorphicFn()
  .server(() => todayIn(getCookie(TIME_ZONE_COOKIE)))
  .client(() => localTodayIso())
