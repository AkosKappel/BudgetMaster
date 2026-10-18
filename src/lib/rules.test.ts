import assert from 'node:assert/strict'
import { test } from 'node:test'

import { type Rule, ruleFor } from './rules.ts'

const rules: Rule[] = [
  { type: 'expense', match: 'lidl', categoryId: 'groceries' },
  { type: 'expense', match: 'lidl petrol', categoryId: 'fuel' },
  { type: 'income', match: 'acme', categoryId: 'salary' },
]

test('ruleFor matches case-insensitively and the longest match wins', () => {
  assert.equal(
    ruleFor('LIDL 1234 Bratislava', 'expense', rules)?.categoryId,
    'groceries',
  )
  assert.equal(
    ruleFor('Lidl Petrol Station', 'expense', rules)?.categoryId,
    'fuel',
  )
  assert.equal(
    ruleFor('ACME Ltd salary', 'income', rules)?.categoryId,
    'salary',
  )
})

test('ruleFor respects the type and ignores empty payees', () => {
  assert.equal(ruleFor('ACME refund', 'expense', rules), undefined)
  assert.equal(ruleFor('   ', 'expense', rules), undefined)
  assert.equal(ruleFor('Tesco', 'expense', rules), undefined)
})
