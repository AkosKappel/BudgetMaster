// Turning a bank's CSV columns into transactions. Pure functions, shared by the import
// page and its tests.

export const DATE_FORMATS = [
  'YYYY-MM-DD',
  'DD.MM.YYYY',
  'DD/MM/YYYY',
  'MM/DD/YYYY',
] as const
export type DateFormat = (typeof DATE_FORMATS)[number]

const PATTERNS: Record<DateFormat, RegExp> = {
  'YYYY-MM-DD': /^(?<y>\d{4})-(?<m>\d{1,2})-(?<d>\d{1,2})/,
  'DD.MM.YYYY': /^(?<d>\d{1,2})\.\s?(?<m>\d{1,2})\.\s?(?<y>\d{4})/,
  'DD/MM/YYYY': /^(?<d>\d{1,2})\/(?<m>\d{1,2})\/(?<y>\d{4})/,
  'MM/DD/YYYY': /^(?<m>\d{1,2})\/(?<d>\d{1,2})\/(?<y>\d{4})/,
}

// An ISO date, or null when the value does not match the format or is not a real day.
export function parseDate(value: string, format: DateFormat): string | null {
  const match = PATTERNS[format].exec(value.trim())
  if (!match?.groups) return null
  const { y, m, d } = match.groups
  const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  const date = new Date(`${iso}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(iso)
    ? iso
    : null
}

// The format that reads the most samples (exports end with totals or notes that read as
// nothing); on a tie the earlier one wins, so day-first beats month-first.
export function guessDateFormat(samples: string[]): DateFormat {
  const reads = (format: DateFormat) =>
    samples.filter((value) => parseDate(value, format) !== null).length
  return DATE_FORMATS.reduce((best, format) =>
    reads(format) > reads(best) ? format : best,
  )
}

// "-12,50", "1 234.56", "(80.00)" or "12.50-": a signed amount in minor units, or null.
export function parseSignedAmount(
  value: string,
  parse: (text: string) => number | null,
): number | null {
  const text = value.replace(/[^\d.,()\-−+]/g, '')
  if (!text) return null
  const negative =
    /^[-−]/.test(text) || /[-−]$/.test(text) || /^\(.*\)$/.test(text)
  const minor = parse(text.replace(/[()\-−+]/g, ''))
  if (minor === null) return null
  return negative ? -minor : minor
}
