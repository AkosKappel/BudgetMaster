import assert from 'node:assert/strict'
import { test } from 'node:test'

import { changeFor, projectBalance, ruleDates } from './forecast.ts'

const wallets = new Set(['main', 'savings'])

test('changeFor counts only money entering or leaving the wallets', () => {
  const base = { toWalletId: null, toAmount: null, amount: 500 }
  assert.equal(
    changeFor({ ...base, type: 'income', walletId: 'main' }, wallets),
    500,
  )
  assert.equal(
    changeFor({ ...base, type: 'expense', walletId: 'main' }, wallets),
    -500,
  )
  assert.equal(
    changeFor({ ...base, type: 'expense', walletId: 'usd' }, wallets),
    0,
  )
  const transfer = { type: 'transfer' as const, amount: 500, toAmount: null }
  assert.equal(
    changeFor(
      { ...transfer, walletId: 'main', toWalletId: 'savings' },
      wallets,
    ),
    0,
  )
  assert.equal(
    changeFor(
      { ...transfer, walletId: 'main', toWalletId: 'usd', toAmount: 540 },
      wallets,
    ),
    -500,
  )
  assert.equal(
    changeFor(
      { ...transfer, walletId: 'usd', toWalletId: 'main', toAmount: 460 },
      wallets,
    ),
    460,
  )
})

test('ruleDates lists future payments only, none for paused rules', () => {
  const rule = {
    startDate: '2026-01-31',
    frequency: 'monthly' as const,
    interval: 1,
    endDate: null,
    nextDate: '2026-10-31',
    paused: false,
  }
  assert.deepEqual(ruleDates(rule, '2026-10-19', '2027-01-15'), [
    '2026-10-31',
    '2026-11-30',
    '2026-12-31',
  ])
  assert.deepEqual(
    ruleDates({ ...rule, paused: true }, '2026-10-19', '2027-01-15'),
    [],
  )
  assert.deepEqual(
    ruleDates({ ...rule, endDate: '2026-11-30' }, '2026-10-19', '2027-01-15'),
    ['2026-10-31', '2026-11-30'],
  )
  assert.deepEqual(
    ruleDates({ ...rule, nextDate: null }, '2026-10-19', '2027-01-15'),
    [],
  )
})

test('projectBalance adds events per day and finds the first lowest day', () => {
  const { points, lowest } = projectBalance(1000, '2026-10-19', 5, [
    { id: 'e0', date: '2026-10-20', label: 'Rent', change: -800 },
    { id: 'e1', date: '2026-10-22', label: 'Gym', change: -50 },
    { id: 'e2', date: '2026-10-23', label: 'Salary', change: 2000 },
    {
      id: 'e3',
      date: '2026-10-19',
      label: 'Today, already counted',
      change: -999,
    },
  ])
  assert.deepEqual(
    points.map((p) => p.balance),
    [1000, 200, 200, 150, 2150, 2150],
  )
  assert.deepEqual(lowest, { date: '2026-10-22', balance: 150 })
})
