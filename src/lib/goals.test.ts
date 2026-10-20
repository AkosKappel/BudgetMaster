import assert from 'node:assert/strict'
import { test } from 'node:test'

import { goalProgress, monthsUntil } from './goals.ts'

test('monthsUntil counts a started month as one', () => {
  assert.equal(monthsUntil('2026-10-19', '2027-04-19'), 6)
  assert.equal(monthsUntil('2026-10-19', '2027-04-20'), 7)
  assert.equal(monthsUntil('2026-10-19', '2026-10-31'), 1)
  assert.equal(monthsUntil('2026-10-19', '2026-10-01'), 0)
  assert.equal(monthsUntil('2026-10-19', '2026-10-19'), 1)
})

test('goalProgress spreads what is missing over the months left', () => {
  assert.deepEqual(goalProgress(40_000, 100_000, '2026-10-19', '2027-04-19'), {
    remaining: 60_000,
    percent: 40,
    monthsLeft: 6,
    perMonth: 10_000,
    reached: false,
  })
  // No date: no monthly amount.
  assert.equal(goalProgress(0, 500, '2026-10-19', null).perMonth, null)
  // Date passed with money missing.
  assert.equal(goalProgress(0, 500, '2026-10-19', '2026-09-01').perMonth, null)
  // Reached, and a negative balance shows as 0 %.
  assert.equal(goalProgress(600, 500, '2026-10-19', null).reached, true)
  assert.equal(goalProgress(600, 500, '2026-10-19', null).percent, 100)
  assert.equal(goalProgress(-200, 500, '2026-10-19', null).percent, 0)
})
