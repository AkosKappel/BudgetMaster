import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  activeFilterCount,
  transactionFiltersSchema,
} from './transaction-filters.ts'

test('valid filters pass through, a blank search is dropped', () => {
  const filters = transactionFiltersSchema.parse({
    q: '  rent ',
    type: 'expense',
    from: '2026-09-01',
    min: 50,
  })
  assert.deepEqual(filters, {
    q: 'rent',
    type: 'expense',
    from: '2026-09-01',
    min: 50,
  })
  assert.equal(transactionFiltersSchema.parse({ q: '   ' }).q, undefined)
})

test('invalid values are dropped instead of failing', () => {
  const filters = transactionFiltersSchema.parse({
    type: 'bogus',
    category: 'not-a-uuid',
    from: '2026-13-40',
    min: -5,
    max: 'abc',
    q: 'coffee',
  })
  assert.equal(filters.q, 'coffee')
  assert.equal(activeFilterCount(filters), 1)
  assert.equal(activeFilterCount({}), 0)
})
