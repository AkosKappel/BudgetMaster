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
  const digits = format.resolvedOptions().maximumFractionDigits ?? 2
  return format.format(minor / 10 ** digits)
}

// "+€12.00" or "−€3.20" with a real minus sign; zero has no sign.
export function formatSignedMoney(minor: number, currency: string) {
  const sign = minor > 0 ? '+' : minor < 0 ? '−' : ''
  return sign + formatMoney(Math.abs(minor), currency)
}
