// Currencies a space can use as its base currency (budgets and totals).
export const CURRENCIES = [
  'EUR',
  'USD',
  'GBP',
  'CHF',
  'CZK',
  'HUF',
  'PLN',
  'SEK',
  'NOK',
  'DKK',
  'CAD',
  'AUD',
  'JPY',
] as const

export type Currency = (typeof CURRENCIES)[number]

export const toCurrency = (code: string): Currency =>
  (CURRENCIES as readonly string[]).includes(code) ? (code as Currency) : 'EUR'
