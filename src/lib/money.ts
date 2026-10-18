// Fixed until users can pick one (M-17); the same on server and client, so SSR matches.
export const APP_LOCALE = 'en-IE'

// Amounts are stored in minor units (ISO 4217 exponent): cents for EUR, whole yen for JPY.
export function formatMoney(
  minor: number,
  currency: string,
  locale: string = APP_LOCALE,
  options: Intl.NumberFormatOptions = {},
) {
  const format = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    ...options,
  })
  return format.format(minor / 10 ** currencyDigits(currency))
}

export const currencyDigits = (currency: string) =>
  new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
    .maximumFractionDigits ?? 2

// Reads what people type: "12,5", "12.50", "1 234,56", "1,234.56". The last separator is the
// decimal mark when at most `digits` digits follow it, otherwise it groups thousands.
// Returns minor units, or null when the input is not an amount.
export function parseAmount(input: string, digits = 2): number | null {
  const cleaned = input.replace(/[\s\u00a0']/g, '')
  if (!/^[\d.,]+$/.test(cleaned) || !/\d/.test(cleaned)) return null
  const lastSeparator = Math.max(
    cleaned.lastIndexOf('.'),
    cleaned.lastIndexOf(','),
  )
  const decimals = cleaned.length - lastSeparator - 1
  const hasFraction = lastSeparator !== -1 && digits > 0 && decimals <= digits
  const whole = (
    hasFraction ? cleaned.slice(0, lastSeparator) : cleaned
  ).replace(/[.,]/g, '')
  const fraction = hasFraction ? cleaned.slice(lastSeparator + 1) : ''
  const minor =
    Number(whole || '0') * 10 ** digits +
    Number(fraction.padEnd(digits, '0') || '0')
  return Number.isSafeInteger(minor) ? minor : null
}

// "+€12.00" or "−€3.20" with a real minus sign; zero has no sign.
export function formatSignedMoney(minor: number, currency: string) {
  const sign = minor > 0 ? '+' : minor < 0 ? '−' : ''
  return sign + formatMoney(Math.abs(minor), currency)
}
