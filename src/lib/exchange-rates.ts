// Reads the ECB reference rate feed (eurofxref XML): a `<Cube time="YYYY-MM-DD">` per day
// holding `<Cube currency="USD" rate="1.0845"/>` entries, units per one euro. Keeps only
// the currencies the app supports.
export function parseEcbRates(xml: string, currencies: readonly string[]) {
  const rates: { date: string; currency: string; rate: string }[] = []
  const days = xml.split(/<Cube\s+time=['"]/).slice(1)
  for (const day of days) {
    const date = day.slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    for (const [, currency, rate] of day.matchAll(
      /<Cube\s+currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g,
    )) {
      if (currencies.includes(currency)) rates.push({ date, currency, rate })
    }
  }
  return rates
}
