import assert from 'node:assert/strict'
import { test } from 'node:test'

import { priceChanges } from './price-changes.ts'

const today = '2026-10-19'

test('priceChanges compares this quarter with the same quarter last year', () => {
  const { payees, inflation } = priceChanges(
    [
      // A year ago (2025-07-19 .. 2025-10-19) and now (2026-07-19 .. 2026-10-19).
      { date: '2025-08-01', payee: 'Netflix', amount: 1299 },
      { date: '2025-09-01', payee: 'Netflix', amount: 1299 },
      { date: '2026-08-01', payee: 'NETFLIX ', amount: 1599 },
      { date: '2026-09-01', payee: 'Netflix', amount: 1599 },
      { date: '2025-08-10', payee: 'Café', amount: 300 },
      { date: '2025-09-10', payee: 'Café', amount: 300 },
      { date: '2026-08-10', payee: 'Café', amount: 300 },
      { date: '2026-09-10', payee: 'Café', amount: 300 },
      // Only once a year ago: left out.
      { date: '2025-08-15', payee: 'Shoes', amount: 8000 },
      { date: '2026-08-15', payee: 'Shoes', amount: 9000 },
      { date: '2026-09-15', payee: 'Shoes', amount: 9000 },
      // Outside both windows: ignored.
      { date: '2026-03-01', payee: 'Netflix', amount: 9999 },
    ],
    today,
  )
  assert.deepEqual(payees, [
    { payee: 'Netflix', before: 1299, recent: 1599, change: 23.1 },
    { payee: 'Café', before: 300, recent: 300, change: 0 },
  ])
  // (1599 + 300) / (1299 + 300) − 1
  assert.equal(inflation, 18.8)
})

test('priceChanges has no inflation without comparable payees', () => {
  assert.deepEqual(priceChanges([], today), { payees: [], inflation: null })
})
