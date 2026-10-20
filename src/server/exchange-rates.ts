import { max } from 'drizzle-orm'

import { db } from '@/db'
import { exchangeRate } from '@/db/schema'
import { CURRENCIES } from '@/lib/currencies'
import { parseEcbRates } from '@/lib/exchange-rates'
import { addDays, todayIn } from '@/lib/recurrence'

// Server-only. The last 90 days of ECB reference rates; older transactions use the earliest
// stored rate (see `per_euro` in migration 0020).
const FEED = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml'
const RETRY_MS = 6 * 3_600_000

let lastAttempt = 0
let pending: Promise<void> | null = null

// Called before totals that convert currencies. Fetches when the newest stored rate is older
// than yesterday (the ECB publishes on working days around 16:00 CET), at most every six
// hours, and never fails the request: without rates, other currencies are left out of
// totals as before.
export async function ensureExchangeRates() {
  if (pending) return pending
  if (Date.now() - lastAttempt < RETRY_MS) return
  const [{ latest }] = await db
    .select({ latest: max(exchangeRate.date) })
    .from(exchangeRate)
  // Weekends and holidays have no rates, so three days without one is still fresh.
  if (latest && latest >= addDays(todayIn('Europe/Frankfurt'), -3)) return
  lastAttempt = Date.now()
  pending = refresh().finally(() => {
    pending = null
  })
  return pending
}

async function refresh() {
  try {
    const response = await fetch(FEED, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) throw new Error(`ECB feed answered ${response.status}`)
    const rates = parseEcbRates(await response.text(), CURRENCIES)
    if (rates.length === 0) throw new Error('ECB feed had no rates')
    await db.insert(exchangeRate).values(rates).onConflictDoNothing()
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'warn',
        msg: 'exchange rates not updated',
        error: String(error),
      }),
    )
  }
}
