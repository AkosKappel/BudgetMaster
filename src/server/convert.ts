import { type SQLWrapper, sql } from 'drizzle-orm'

import { db } from '@/db'
import { currencyDigits } from '@/lib/money'

// Server-only. Amounts in other currencies, converted into the space currency at the rate of
// their day (`convert_minor`, migration 0020). Without a rate the amount is null, so sums
// leave it out, which is how totals worked before exchange rates (I-05).
type Value = SQLWrapper

export const converted = (amount: Value, from: Value, to: string, on: Value) =>
  sql<number>`convert_minor(${amount}, ${from}, ${to}, ${on})`

export const sumConverted = (
  amount: Value,
  from: Value,
  to: string,
  on: Value,
) =>
  sql<number>`coalesce(sum(${converted(amount, from, to, on)}), 0)`.mapWith(
    Number,
  )

// Balances revalued on given days (net worth, forecast): one query for every currency and
// day, then plain arithmetic. Returns null for a currency without a known rate.
export async function rateConverter(
  to: string,
  currencies: string[],
  dates: string[],
) {
  const pairs = [...new Set([...currencies, to])].flatMap((c) =>
    dates.map((d) => ({ c, d })),
  )
  const rows = await db.execute<{ c: string; d: string; rate: string | null }>(
    sql`select x.c, x.d::text as d, per_euro(x.c, x.d) as rate
        from jsonb_to_recordset(${JSON.stringify(pairs)}::jsonb) as x(c char(3), d date)`,
  )
  const rates = new Map(
    rows.map((r) => [`${r.c}|${r.d}`, r.rate === null ? null : Number(r.rate)]),
  )
  return (minor: number, from: string, date: string): number | null => {
    if (from === to) return minor
    const fromRate = rates.get(`${from}|${date}`)
    const toRate = rates.get(`${to}|${date}`)
    if (!fromRate || !toRate) return null
    return Math.round(
      (minor / 10 ** currencyDigits(from) / fromRate) *
        toRate *
        10 ** currencyDigits(to),
    )
  }
}
