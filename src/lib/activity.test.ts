import assert from 'node:assert/strict'
import { test } from 'node:test'

import { describeActivity } from './activity.ts'

const details = {
  type: 'expense' as const,
  payee: 'Tesco',
  amount: 2410,
  date: '2026-10-18',
}

test('describeActivity says what happened to the transaction', () => {
  assert.equal(
    describeActivity({ action: 'created', currency: 'EUR', details }),
    'added Tesco, €24.10',
  )
  assert.equal(
    describeActivity({
      action: 'deleted',
      currency: 'EUR',
      details: { ...details, payee: null },
    }),
    'deleted an expense, €24.10',
  )
  assert.equal(
    describeActivity({
      action: 'updated',
      currency: 'EUR',
      details: {
        ...details,
        before: { payee: 'Tesco', amount: 4210, date: '2026-10-18' },
      },
    }),
    'changed Tesco: €42.10 → €24.10',
  )
  assert.equal(
    describeActivity({
      action: 'updated',
      currency: 'EUR',
      details: {
        ...details,
        before: { payee: 'Tesco', amount: 2410, date: '2026-10-18' },
      },
    }),
    'edited Tesco',
  )
})
