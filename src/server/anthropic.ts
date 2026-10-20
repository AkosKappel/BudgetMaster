import Anthropic from '@anthropic-ai/sdk'

import { env } from '@/env'
import { m } from '@/paraglide/messages.js'

// Server-only: imported from server function handlers, never from modules the client
// bundles, so the SDK and this state stay out of the browser.

// Each read costs money on the owner's API key: a ceiling per user and day.
// In memory, which is enough with one app instance; a restart only resets the count.
const READS_PER_DAY = 30
const readsToday = new Map<string, { day: string; count: number }>()

export function countRead(userId: string) {
  const day = new Date().toISOString().slice(0, 10)
  const entry = readsToday.get(userId)
  const count = entry?.day === day ? entry.count + 1 : 1
  if (count > READS_PER_DAY) throw new Error(m.txn_ai_daily_limit())
  readsToday.set(userId, { day, count })
}

let client: Anthropic | undefined

export function anthropic() {
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  return client
}
