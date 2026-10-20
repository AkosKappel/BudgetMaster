import handler, { createServerEntry } from '@tanstack/react-start/server-entry'

import { paraglideMiddleware } from '@/paraglide/server.js'
import { runNotificationJobs } from '@/server/notification-jobs'

// Reminders and the weekly digest (I-08): checked every half hour in this one app process.
// The flag keeps Vite's module reloads in development from starting a second timer.
const scheduled = globalThis as { notificationTimer?: NodeJS.Timeout }
scheduled.notificationTimer ??= setInterval(
  () => void runNotificationJobs(),
  30 * 60_000,
)

// Every request runs with its language (cookie, then Accept-Language, then English), so
// messages and number and date formats rendered on the server match the browser.
export default createServerEntry({
  fetch(request, opts) {
    // The original request goes on: the app's URLs carry no locale to strip.
    return paraglideMiddleware(request, () => handler.fetch(request, opts))
  },
})
