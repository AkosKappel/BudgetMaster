// Amounts are stored in minor units (ISO 4217 exponent): cents for EUR, whole yen for JPY.
export function formatMoney(minor: number, currency: string, locale?: string) {
  const format = new Intl.NumberFormat(locale, { style: 'currency', currency })
  const digits = format.resolvedOptions().maximumFractionDigits ?? 2
  return format.format(minor / 10 ** digits)
}
