import assert from 'node:assert/strict'
import { test } from 'node:test'

import { formatMoney, formatSignedMoney } from './money.ts'

test('formatMoney converts minor units by the currency exponent', () => {
  assert.equal(formatMoney(123456, 'EUR', 'en-US'), '€1,234.56')
  assert.equal(formatMoney(1, 'EUR', 'en-US'), '€0.01')
  assert.equal(formatMoney(-48416, 'EUR', 'en-US'), '-€484.16')
  assert.equal(formatMoney(500, 'JPY', 'en-US'), '¥500')
  assert.equal(formatMoney(20285, 'USD', 'en-US'), '$202.85')
})

test('formatSignedMoney uses a real minus sign', () => {
  assert.equal(formatSignedMoney(1200, 'EUR'), '+€12.00')
  assert.equal(formatSignedMoney(-320, 'EUR'), '−€3.20')
  assert.equal(formatSignedMoney(0, 'EUR'), '€0.00')
})
