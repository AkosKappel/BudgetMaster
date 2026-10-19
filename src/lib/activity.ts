import { APP_LOCALE, formatMoney } from './money.ts'

const shortDate = (date: string) =>
  new Date(date).toLocaleDateString(APP_LOCALE, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })

export interface ActivityEntry {
  action: 'created' | 'updated' | 'deleted'
  currency: string
  details: {
    type: 'income' | 'expense' | 'transfer'
    payee: string | null
    amount: number
    date: string
    before?: { payee: string | null; amount: number; date: string }
  }
}

const label = (type: string, payee: string | null) =>
  payee ??
  (type === 'income'
    ? 'an income'
    : type === 'transfer'
      ? 'a transfer'
      : 'an expense')

// "added Tesco, €42.10", "changed Tesco: €42.10 → €24.10", "deleted Café Zoë, €3.20".
export function describeActivity({ action, currency, details }: ActivityEntry) {
  const money = (minor: number) => formatMoney(minor, currency)
  const name = label(details.type, details.payee)
  if (action === 'created') return `added ${name}, ${money(details.amount)}`
  if (action === 'deleted') return `deleted ${name}, ${money(details.amount)}`

  const before = details.before
  if (!before) return `changed ${name}`
  const changes = [
    before.amount !== details.amount &&
      `${money(before.amount)} → ${money(details.amount)}`,
    before.payee !== details.payee &&
      `${label(details.type, before.payee)} → ${name}`,
    before.date !== details.date &&
      `${shortDate(before.date)} → ${shortDate(details.date)}`,
  ].filter(Boolean)
  return changes.length
    ? `changed ${label(details.type, before.payee)}: ${changes.join(', ')}`
    : `edited ${name}`
}
