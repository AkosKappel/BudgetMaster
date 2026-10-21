import { formatLocale } from './locale.ts'

// Amounts are stored in minor units (ISO 4217 exponent): cents for EUR, whole yen for JPY.
export function formatMoney(
  minor: number,
  currency: string,
  locale: string = formatLocale(),
  options: Intl.NumberFormatOptions = {},
) {
  const format = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    // Hungarian formats would spell out "EUR"; people write "€" there too.
    currencyDisplay: locale.startsWith('hu') ? 'narrowSymbol' : 'symbol',
    ...options,
  })
  return format.format(minor / 10 ** currencyDigits(currency))
}

export const currencyDigits = (currency: string) =>
  new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
    .maximumFractionDigits ?? 2

// Reads what people type: "12,5", "12.50", "1 234,56", "1,234.56", and sums like "12+4,50"
// or "3*2.40" (a receipt added up in the field). Multiplication and division bind first,
// and their right side is a plain factor. Returns minor units, or null when the input is not
// an amount, divides by zero or comes out below zero.
export function parseAmount(input: string, digits = 2): number | null {
  const expression = input
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
  if (!/[+\-*/]/.test(expression)) return parseNumber(expression, digits)
  // Numbers at even indexes, operators at odd ones.
  const tokens = expression.split(/([+\-*/])/)
  let total = 0
  let sign = 1
  for (let i = 0; i < tokens.length; i += 2) {
    let term = parseNumber(tokens[i], digits)
    if (term === null) return null
    while (tokens[i + 1] === '*' || tokens[i + 1] === '/') {
      const factor = parseNumber(tokens[i + 2] ?? '', 6)
      if (factor === null || (tokens[i + 1] === '/' && factor === 0))
        return null
      term =
        tokens[i + 1] === '*' ? (term * factor) / 1e6 : (term * 1e6) / factor
      i += 2
    }
    total += sign * term
    sign = tokens[i + 1] === '-' ? -1 : 1
  }
  const minor = Math.round(total)
  return Number.isSafeInteger(minor) && minor >= 0 ? minor : null
}

function parseNumber(input: string, digits: number): number | null {
  const cleaned = input.replace(/[\s\u00a0']/g, '')
  if (!/^[\d.,]+$/.test(cleaned) || !/\d/.test(cleaned)) return null
  const lastSeparator = Math.max(
    cleaned.lastIndexOf('.'),
    cleaned.lastIndexOf(','),
  )
  const decimals = cleaned.length - lastSeparator - 1
  // Up to two decimals are a fraction even for a currency without minor units, so a bank
  // export's "1234.00" yen reads as 1234, not 123400.
  const hasFraction = lastSeparator !== -1 && decimals <= Math.max(digits, 2)
  const whole = (
    hasFraction ? cleaned.slice(0, lastSeparator) : cleaned
  ).replace(/[.,]/g, '')
  const fraction = hasFraction ? cleaned.slice(lastSeparator + 1) : ''
  const minor =
    Number(whole || '0') * 10 ** digits +
    Math.round(
      Number(fraction.padEnd(digits, '0') || '0') /
        10 ** Math.max(fraction.length - digits, 0),
    )
  return Number.isSafeInteger(minor) ? minor : null
}

// "+€12.00" or "−€3.20" with a real minus sign; zero has no sign.
export function formatSignedMoney(minor: number, currency: string) {
  const sign = minor > 0 ? '+' : minor < 0 ? '−' : ''
  return sign + formatMoney(Math.abs(minor), currency)
}
