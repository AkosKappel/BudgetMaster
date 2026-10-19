import assert from 'node:assert/strict'
import { test } from 'node:test'

import { type YearRow, yearReview } from './year-review.ts'

const row = (
  date: string,
  type: YearRow['type'],
  amount: number,
  payee: string | null,
  category: string | null,
): YearRow => ({ date, type, amount, payee, category })

test('yearReview sums the year so far', () => {
  const review = yearReview(
    [
      row('2026-01-25', 'income', 300000, 'Acme', 'Salary'),
      row('2026-01-02', 'expense', 1500, 'Lidl', 'Groceries'),
      row('2026-01-09', 'expense', 2500, 'LIDL ', 'Groceries'),
      row('2026-01-09', 'expense', 9000, 'Shoe shop', 'Shopping'),
      row('2026-02-01', 'expense', 100000, 'Landlord', 'Housing'),
    ],
    2026,
    '2026-02-10',
  )
  assert.equal(review.complete, false)
  assert.equal(review.income, 300000)
  assert.equal(review.spent, 113000)
  assert.equal(review.saved, 187000)
  assert.equal(review.savingRate, 62)
  assert.deepEqual(review.topPayee, {
    name: 'Landlord',
    total: 100000,
    count: 1,
  })
  assert.deepEqual(review.topCategory, {
    name: 'Housing',
    total: 100000,
    count: 1,
  })
  assert.deepEqual(review.priciestMonth, { month: '2026-02', total: 100000 })
  // 1 Jan to 10 Feb is 41 days; spending on 2 Jan, 9 Jan and 1 Feb.
  assert.equal(review.days, 41)
  assert.equal(review.noSpendDays, 38)
  assert.deepEqual(review.biggest, {
    payee: 'Landlord',
    amount: 100000,
    date: '2026-02-01',
  })
})

test('yearReview groups payees and handles a past, empty year', () => {
  const review = yearReview(
    [
      row('2025-03-01', 'expense', 500, 'Lidl', 'Groceries'),
      row('2025-03-02', 'expense', 700, ' lidl', 'Groceries'),
    ],
    2025,
    '2026-10-19',
  )
  assert.equal(review.complete, true)
  assert.equal(review.days, 365)
  assert.deepEqual(review.topPayee, { name: 'Lidl', total: 1200, count: 2 })
  assert.equal(review.savingRate, null)
  assert.equal(yearReview([], 2024, '2026-10-19').biggest, null)
})
