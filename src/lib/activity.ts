import { m } from '../paraglide/messages.js'
import { formatLocale } from './locale.ts'
import { formatMoney } from './money.ts'

const shortDate = (date: string) =>
  new Date(date).toLocaleDateString(formatLocale(), {
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
    ? m.txn_log_income()
    : type === 'transfer'
      ? m.txn_log_transfer()
      : m.txn_log_expense())

// "added Tesco, €42.10", "changed Tesco: €42.10 → €24.10", "deleted Café Zoë, €3.20".
export function describeActivity({ action, currency, details }: ActivityEntry) {
  const money = (minor: number) => formatMoney(minor, currency)
  const name = label(details.type, details.payee)
  if (action === 'created')
    return m.txn_log_added({ name, amount: money(details.amount) })
  if (action === 'deleted')
    return m.txn_log_deleted({ name, amount: money(details.amount) })

  const before = details.before
  if (!before) return m.txn_log_changed({ name })
  const changes = [
    before.amount !== details.amount &&
      `${money(before.amount)} → ${money(details.amount)}`,
    before.payee !== details.payee &&
      `${label(details.type, before.payee)} → ${name}`,
    before.date !== details.date &&
      `${shortDate(before.date)} → ${shortDate(details.date)}`,
  ].filter(Boolean)
  return changes.length
    ? m.txn_log_changed_details({
        name: label(details.type, before.payee),
        changes: changes.join(', '),
      })
    : m.txn_log_edited({ name })
}
