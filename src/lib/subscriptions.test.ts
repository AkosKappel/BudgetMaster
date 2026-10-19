import assert from 'node:assert/strict'
import { test } from 'node:test'

import { findSubscriptions, type Payment, yearlyCost } from './subscriptions.ts'

const pay = (
  date: string,
  payee: string,
  amount: number,
  walletId = 'card',
): Payment => ({
  date,
  payee,
  amount,
  walletId,
  categoryId: 'subs',
})

test('finds a monthly payment, also across a price increase', () => {
  const [found, ...rest] = findSubscriptions(
    [
      pay('2026-06-03', 'Spotify', 1199),
      pay('2026-07-03', 'Spotify', 1199),
      pay('2026-08-04', 'SPOTIFY ', 1199),
      pay('2026-09-03', 'Spotify', 1299),
      pay('2026-10-03', 'Spotify', 1299),
    ],
    '2026-10-19',
  )
  assert.equal(rest.length, 0)
  assert.equal(found.cadence, 'monthly')
  assert.equal(found.amount, 1299)
  assert.equal(found.nextDate, '2026-11-03')
  assert.equal(found.yearlyCost, 1299 * 12)
})

test('ignores irregular, too few, stopped and differently priced payments', () => {
  const found = findSubscriptions(
    [
      // Irregular: a café visited now and then.
      pay('2026-07-01', 'Café', 350),
      pay('2026-07-09', 'Café', 420),
      pay('2026-08-20', 'Café', 380),
      pay('2026-10-01', 'Café', 350),
      // Two monthly payments are not enough.
      pay('2026-09-10', 'Gym', 3000),
      pay('2026-10-10', 'Gym', 3000),
      // Stopped in July.
      pay('2026-05-15', 'Old phone', 1500),
      pay('2026-06-15', 'Old phone', 1500),
      pay('2026-07-15', 'Old phone', 1500),
      // Same payee and cadence, but the amounts vary a lot (groceries).
      pay('2026-08-01', 'Lidl', 4000),
      pay('2026-09-01', 'Lidl', 9000),
      pay('2026-10-01', 'Lidl', 2500),
    ],
    '2026-10-19',
  )
  assert.deepEqual(found, [])
})

test('finds a yearly payment from two years and keeps wallets apart', () => {
  const found = findSubscriptions(
    [
      pay('2025-03-01', 'Insurance', 24000, 'main'),
      pay('2026-03-02', 'Insurance', 25000, 'main'),
      pay('2026-03-02', 'Insurance', 25000, 'other'),
    ],
    '2026-10-19',
  )
  assert.equal(found.length, 1)
  assert.equal(found[0].cadence, 'yearly')
  assert.equal(found[0].nextDate, '2027-03-02')
})

test('yearlyCost spreads a rule over a year', () => {
  assert.equal(yearlyCost(1000, 'monthly', 1), 12000)
  assert.equal(yearlyCost(1000, 'weekly', 2), 26000)
  assert.equal(yearlyCost(1000, 'yearly', 1), 1000)
})
