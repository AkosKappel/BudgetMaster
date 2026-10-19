import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  type Expense,
  findCategoryRise,
  findDuplicates,
  findPriceRises,
} from './insights.ts'

const today = '2026-10-19'
const expense = (overrides: Partial<Expense>): Expense => ({
  id: crypto.randomUUID(),
  date: today,
  payee: 'Tesco',
  amount: 4210,
  walletId: 'w1',
  recurringRuleId: null,
  ...overrides,
})

test('flags the same payee, amount and wallet within two days', () => {
  const found = findDuplicates(
    [
      expense({ date: '2026-10-10' }),
      expense({ date: '2026-10-12', payee: ' tesco ' }),
      // Third one pairs with nothing left over.
      expense({ date: '2026-10-12' }),
      expense({ date: '2026-10-15', walletId: 'w2' }),
      expense({ date: '2026-10-16', amount: 999 }),
    ],
    today,
  )
  assert.deepEqual(found, [
    {
      kind: 'duplicate',
      payee: 'Tesco',
      amount: 4210,
      dates: ['2026-10-10', '2026-10-12'],
    },
  ])
})

test('ignores old, recurring and far-apart payments', () => {
  assert.deepEqual(
    findDuplicates(
      [
        expense({ date: '2026-09-01' }),
        expense({ date: '2026-09-02' }),
        expense({ date: '2026-10-01', recurringRuleId: 'r' }),
        expense({ date: '2026-10-01', recurringRuleId: 'r' }),
        expense({ date: '2026-10-05' }),
        expense({ date: '2026-10-08' }),
      ],
      today,
    ),
    [],
  )
})

test('spots a recurring payment that got more expensive', () => {
  const netflix = { payee: 'Netflix', recurringRuleId: 'n' }
  const found = findPriceRises(
    [
      expense({ ...netflix, date: '2026-08-31', amount: 1299 }),
      expense({ ...netflix, date: '2026-09-30', amount: 1299 }),
      expense({ ...netflix, date: '2026-10-15', amount: 1599 }),
      // Cheaper is fine, and an old rise is not news.
      expense({ recurringRuleId: 'g', date: '2026-10-01', amount: 2000 }),
      expense({ recurringRuleId: 'g', date: '2026-10-10', amount: 1800 }),
      expense({ recurringRuleId: 'o', date: '2026-01-01', amount: 100 }),
      expense({ recurringRuleId: 'o', date: '2026-02-01', amount: 200 }),
    ],
    today,
  )
  assert.deepEqual(found, [
    { kind: 'price-rise', payee: 'Netflix', before: 1299, after: 1599 },
  ])
})

test('reports the biggest category rise with its weekend share', () => {
  const rise = findCategoryRise(
    [
      // Saturday and Sunday.
      { category: 'Restaurants', date: '2026-10-17', amount: 6000 },
      { category: 'Restaurants', date: '2026-10-18', amount: 3000 },
      { category: 'Restaurants', date: '2026-10-14', amount: 3000 },
      { category: 'Groceries', date: '2026-10-14', amount: 10500 },
      { category: 'Hobbies', date: '2026-10-14', amount: 5000 },
    ],
    [
      { category: 'Restaurants', date: '2026-09-14', amount: 8000 },
      { category: 'Groceries', date: '2026-09-14', amount: 10000 },
    ],
  )
  assert.deepEqual(rise, {
    kind: 'category-up',
    category: 'Restaurants',
    now: 12000,
    before: 8000,
    change: 50,
    weekendShare: 75,
  })
  assert.equal(
    findCategoryRise(
      [{ category: 'A', date: today, amount: 1500 }],
      [{ category: 'A', date: today, amount: 1000 }],
    ),
    undefined,
  )
})
