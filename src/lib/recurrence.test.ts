import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  addMonths,
  budgetPeriod,
  describeSchedule,
  type Frequency,
  nextOccurrence,
  nthOccurrence,
  occurrencesUntil,
  todayIn,
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

test('budgetPeriod follows the start day across months and years', () => {
  assert.deepEqual(budgetPeriod('2026-10-18', 1), {
    start: '2026-10-01',
    end: '2026-10-31',
  })
  assert.deepEqual(budgetPeriod('2026-10-18', 25), {
    start: '2026-09-25',
    end: '2026-10-24',
  })
  assert.deepEqual(budgetPeriod('2026-10-25', 25), {
    start: '2026-10-25',
    end: '2026-11-24',
  })
  assert.deepEqual(budgetPeriod('2027-01-10', 15), {
    start: '2026-12-15',
    end: '2027-01-14',
  })
  assert.deepEqual(budgetPeriod('2026-03-01', 28), {
    start: '2026-02-28',
    end: '2026-03-27',
  })
})

test('todayIn uses the time zone and falls back to UTC', () => {
  // 23:30 UTC on 31 Dec is already 1 Jan in Bratislava and still 31 Dec in New York.
  const now = new Date('2026-12-31T23:30:00Z')
  assert.equal(todayIn('Europe/Bratislava', now), '2027-01-01')
  assert.equal(todayIn('America/New_York', now), '2026-12-31')
  assert.equal(todayIn('Not/AZone', now), '2026-12-31')
})

test('describeSchedule reads like a sentence', () => {
  const rule = (
    frequency: Frequency,
    interval = 1,
    startDate = '2026-10-25',
  ) => ({
    startDate,
    frequency,
    interval,
  })
  assert.equal(describeSchedule(rule('daily')), 'Every day')
  assert.equal(describeSchedule(rule('monthly')), 'Every month on the 25th')
  assert.equal(
    describeSchedule(rule('monthly', 1, '2026-10-22')),
    'Every month on the 22nd',
  )
  assert.equal(
    describeSchedule(rule('monthly', 3, '2026-10-11')),
    'Every 3 months on the 11th',
  )
  assert.equal(
    describeSchedule(rule('weekly', 2, '2026-10-19')),
    'Every 2 weeks on Monday',
  )
  assert.equal(
    describeSchedule(rule('yearly', 1, '2026-03-03')),
    'Every year on 3 March',
  )
})
