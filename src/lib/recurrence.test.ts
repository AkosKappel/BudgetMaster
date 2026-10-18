import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  addMonths,
  nextOccurrence,
  nthOccurrence,
  occurrencesUntil,
} from './recurrence.ts'

test('addMonths clamps to the end of shorter months', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28')
  assert.equal(addMonths('2028-01-31', 1), '2028-02-29')
  assert.equal(addMonths('2026-03-31', -1), '2026-02-28')
  assert.equal(addMonths('2026-11-15', 2), '2027-01-15')
  assert.equal(addMonths('2026-01-15', -13), '2024-12-15')
})

test('monthly rules on the 31st do not drift after a short month', () => {
  const rule = {
    startDate: '2026-01-31',
    frequency: 'monthly',
    interval: 1,
  } as const
  assert.deepEqual(
    [0, 1, 2, 3].map((n) => nthOccurrence(rule, n)),
    ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'],
  )
})

test('weekly rules respect the interval', () => {
  const rule = {
    startDate: '2026-10-01',
    frequency: 'weekly',
    interval: 2,
  } as const
  assert.deepEqual(occurrencesUntil(rule, '2026-10-31'), [
    '2026-10-01',
    '2026-10-15',
    '2026-10-29',
  ])
})

test('yearly rules on Feb 29 fall back to Feb 28', () => {
  const rule = {
    startDate: '2028-02-29',
    frequency: 'yearly',
    interval: 1,
  } as const
  assert.equal(nthOccurrence(rule, 1), '2029-02-28')
  assert.equal(nthOccurrence(rule, 4), '2032-02-29')
})

test('end date stops occurrences', () => {
  const rule = {
    startDate: '2026-01-10',
    frequency: 'monthly',
    interval: 1,
    endDate: '2026-03-10',
  } as const
  assert.deepEqual(occurrencesUntil(rule, '2026-12-31'), [
    '2026-01-10',
    '2026-02-10',
    '2026-03-10',
  ])
  assert.equal(nextOccurrence(rule, '2026-03-10'), null)
  assert.equal(nextOccurrence(rule, '2026-02-01'), '2026-02-10')
})
