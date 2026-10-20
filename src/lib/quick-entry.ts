import { parseDate } from './import.ts'
import { addDays } from './recurrence.ts'

export interface QuickEntryOptions {
  today: string
  wallets: readonly { id: string; name: string }[]
  categories: readonly { id: string; name: string; type: string }[]
}

export interface QuickEntry {
  type?: 'income' | 'expense'
  amount?: string
  walletId?: string
  categoryId?: string
  date?: string
  payee?: string
}

const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]
const INCOME_WORDS = new Set(['income', 'received', 'got', 'earned'])
const FILLER = new Set(['with', 'from', 'on', 'at', 'in', 'for', 'by', 'paid'])
const AMOUNT = /^([+-]?)[€$£]?(\d+(?:[.,]\d{1,2})?)(?:€|eur|usd|\$|£)?$/i

// A date word relative to today: "today", "yesterday", "tomorrow", a weekday (the latest
// one up to today), or an ISO date.
function dateFor(word: string, today: string): string | undefined {
  if (word === 'today') return today
  if (word === 'yesterday') return addDays(today, -1)
  if (word === 'tomorrow') return addDays(today, 1)
  if (/^\d{4}-\d{2}-\d{2}$/.test(word))
    return parseDate(word, 'YYYY-MM-DD') ?? undefined
  // "fri", "friday"; at least three letters, so "sun" works but "s" is a payee.
  const weekday =
    word.length >= 3 ? WEEKDAYS.findIndex((day) => day.startsWith(word)) : -1
  if (weekday === -1) return undefined
  const current = new Date(`${today}T00:00:00Z`).getUTCDay()
  return addDays(today, -((current - weekday + 7) % 7))
}

// Reads a typed line like "coffee 3.20 cash yesterday" or "+1500 salary" into form values.
// Words that match nothing become the payee. A local parser, nothing is sent anywhere.
export function parseQuickEntry(
  text: string,
  { today, wallets, categories }: QuickEntryOptions,
): QuickEntry {
  const entry: QuickEntry = {}
  const rest: string[] = []
  const lower = (s: string) => s.trim().toLowerCase()

  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    const key = lower(word)
    const amount = AMOUNT.exec(word)
    if (!entry.amount && amount) {
      entry.amount = amount[2]
      if (amount[1] === '+') entry.type = 'income'
      continue
    }
    if (INCOME_WORDS.has(key)) {
      entry.type = 'income'
      continue
    }
    const date = entry.date ? undefined : dateFor(key, today)
    if (date) {
      entry.date = date
      continue
    }
    const wallet = entry.walletId
      ? undefined
      : wallets.find(
          (w) => lower(w.name) === key || lower(w.name).split(/\s+/)[0] === key,
        )
    if (wallet) {
      entry.walletId = wallet.id
      continue
    }
    const category = entry.categoryId
      ? undefined
      : categories.find(
          (c) =>
            (!entry.type || c.type === entry.type) &&
            (lower(c.name) === key ||
              (key.length >= 4 && lower(c.name).startsWith(key))),
        )
    if (category) {
      entry.categoryId = category.id
      if (category.type === 'income' || category.type === 'expense')
        entry.type = category.type
      continue
    }
    rest.push(word)
  }

  const payee = rest.filter((word) => !FILLER.has(lower(word))).join(' ')
  if (payee) entry.payee = payee.charAt(0).toUpperCase() + payee.slice(1)
  return entry
}
