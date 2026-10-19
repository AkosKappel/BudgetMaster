import assert from 'node:assert/strict'
import { test } from 'node:test'

import { memberBalances, settleUp } from './balances.ts'

test('an expense paid by one member is shared equally', () => {
  const balances = memberBalances(
    ['sam', 'jo'],
    [{ paidBy: 'sam', amount: 8000 }],
    [],
  )
  assert.deepEqual(Object.fromEntries(balances), { sam: 4000, jo: -4000 })
  assert.deepEqual(settleUp(balances), [
    { from: 'jo', to: 'sam', amount: 4000 },
  ])
})

test('odd cents go to the first members, so balances add up to zero', () => {
  const balances = memberBalances(
    ['a', 'b', 'c'],
    [{ paidBy: 'c', amount: 1000 }],
    [],
  )
  assert.deepEqual(Object.fromEntries(balances), { a: -334, b: -333, c: 667 })
  assert.equal(
    [...balances.values()].reduce((sum, b) => sum + b, 0),
    0,
  )
})

test('settlements pay balances back, members who left are skipped', () => {
  const balances = memberBalances(
    ['sam', 'jo'],
    [
      { paidBy: 'sam', amount: 8000 },
      { paidBy: 'jo', amount: 2000 },
      { paidBy: 'gone', amount: 99999 },
    ],
    [
      { fromUserId: 'jo', toUserId: 'sam', amount: 1000 },
      { fromUserId: 'gone', toUserId: 'sam', amount: 5 },
    ],
  )
  assert.deepEqual(Object.fromEntries(balances), { sam: 2000, jo: -2000 })
})

test('settling up clears everyone with few payments', () => {
  const transfers = settleUp(
    new Map([
      ['a', 6000],
      ['b', -1000],
      ['c', -2000],
      ['d', -3000],
    ]),
  )
  assert.deepEqual(transfers, [
    { from: 'd', to: 'a', amount: 3000 },
    { from: 'c', to: 'a', amount: 2000 },
    { from: 'b', to: 'a', amount: 1000 },
  ])
  assert.deepEqual(settleUp(new Map([['a', 0]])), [])
})
