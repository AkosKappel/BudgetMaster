import assert from 'node:assert/strict'
import { test } from 'node:test'

import { formatMoney, formatSignedMoney, parseAmount } from './money.ts'

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

test('parseAmount reads decimal commas, points and thousands groups', () => {
  assert.equal(parseAmount('12'), 1200)
  assert.equal(parseAmount('12,5'), 1250)
  assert.equal(parseAmount('12.50'), 1250)
  assert.equal(parseAmount('0,01'), 1)
  assert.equal(parseAmount(',5'), 50)
  assert.equal(parseAmount('12,'), 1200)
  assert.equal(parseAmount('1,234'), 123400)
  assert.equal(parseAmount('1.234,56'), 123456)
  assert.equal(parseAmount('1,234.56'), 123456)
  assert.equal(parseAmount('1 234,56'), 123456)
  assert.equal(parseAmount('1500', 0), 1500)
  assert.equal(parseAmount('1,500', 0), 1500)
  assert.equal(parseAmount(''), null)
  assert.equal(parseAmount('-5'), null)
  assert.equal(parseAmount('12a'), null)
  assert.equal(parseAmount('.'), null)
})
