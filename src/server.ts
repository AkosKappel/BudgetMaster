import handler, { createServerEntry } from '@tanstack/react-start/server-entry'

import { paraglideMiddleware } from '@/paraglide/server.js'

// Every request runs with its language (cookie, then Accept-Language, then English), so
// messages and number and date formats rendered on the server match the browser.
export default createServerEntry({
  fetch(request, opts) {
    // The original request goes on: the app's URLs carry no locale to strip.
    return paraglideMiddleware(request, () => handler.fetch(request, opts))
  },
})
