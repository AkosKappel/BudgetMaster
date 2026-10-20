import assert from 'node:assert/strict'
import { test } from 'node:test'

import { parseQuickEntry } from './quick-entry.ts'

// 2026-10-19 is a Monday.
const options = {
  today: '2026-10-19',
  wallets: [
    { id: 'w-cash', name: 'Cash' },
    { id: 'w-bank', name: 'Revolut card' },
  ],
  categories: [
    { id: 'c-food', name: 'Groceries', type: 'expense' },
    { id: 'c-cafe', name: 'Coffee', type: 'expense' },
    { id: 'c-salary', name: 'Salary', type: 'income' },
  ],
}

test('reads amount, wallet, date and payee from a line', () => {
  assert.deepEqual(parseQuickEntry('Starbucks 3.20 cash yesterday', options), {
    amount: '3.20',
    walletId: 'w-cash',
    date: '2026-10-18',
    payee: 'Starbucks',
  })
})

test('matches categories by name or a prefix and takes their type', () => {
  assert.deepEqual(parseQuickEntry('coffee 2,50', options), {
    amount: '2,50',
    categoryId: 'c-cafe',
    type: 'expense',
  })
  assert.deepEqual(parseQuickEntry('groc lidl 42 revolut', options), {
    categoryId: 'c-food',
    type: 'expense',
    payee: 'Lidl',
    amount: '42',
    walletId: 'w-bank',
  })
  assert.deepEqual(parseQuickEntry('salary 1500 from acme', options), {
    categoryId: 'c-salary',
    type: 'income',
    amount: '1500',
    payee: 'Acme',
  })
})

test('a plus sign or an income word makes it income', () => {
  assert.equal(parseQuickEntry('+20 mum', options).type, 'income')
  assert.equal(parseQuickEntry('received 20 from mum', options).type, 'income')
  assert.equal(parseQuickEntry('received 20 from mum', options).payee, 'Mum')
})

test('weekdays go back to the latest one, today included', () => {
  assert.equal(parseQuickEntry('fri 5', options).date, '2026-10-16')
  assert.equal(parseQuickEntry('monday 5', options).date, '2026-10-19')
  assert.equal(parseQuickEntry('2026-09-01 5', options).date, '2026-09-01')
  assert.equal(parseQuickEntry('su 5', options).payee, 'Su')
})

test('only the first amount counts, later numbers stay in the payee', () => {
  const entry = parseQuickEntry('€12 7eleven 24', options)
  assert.equal(entry.amount, '12')
  assert.equal(entry.payee, '7eleven 24')
})

test('a date that does not exist stays in the payee', () => {
  assert.deepEqual(parseQuickEntry('2026-02-30 tesco 5', options), {
    amount: '5',
    payee: '2026-02-30 tesco',
  })
})

test('reads Hungarian date, weekday, income and filler words', () => {
  assert.equal(parseQuickEntry('Tesco 5 tegnap', options).date, '2026-10-18')
  assert.equal(parseQuickEntry('pén 5', options).date, '2026-10-16')
  assert.equal(parseQuickEntry('hetfo 5', options).date, '2026-10-19')
  assert.deepEqual(parseQuickEntry('kaptam 20 az anyától', options), {
    type: 'income',
    amount: '20',
    payee: 'Anyától',
  })
})

test('reads Slovak date, weekday, income and filler words', () => {
  assert.equal(parseQuickEntry('Lidl 5 Včera', options).date, '2026-10-18')
  assert.equal(parseQuickEntry('vcera 5', options).date, '2026-10-18')
  assert.equal(parseQuickEntry('piatok 5', options).date, '2026-10-16')
  assert.deepEqual(parseQuickEntry('dostal 20 od mamy', options), {
    type: 'income',
    amount: '20',
    payee: 'Mamy',
  })
})
