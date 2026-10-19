import assert from 'node:assert/strict'
import { test } from 'node:test'

import { parseCsv } from './csv.ts'
import {
  fitsHeader,
  guessDateFormat,
  headerKey,
  parseDate,
  parseSignedAmount,
} from './import.ts'
import { parseAmount } from './money.ts'

test('parseCsv guesses the delimiter and handles quotes', () => {
  assert.deepEqual(
    parseCsv(
      'Date;Payee;Amount\r\n18.10.2026;"Tesco; Main St";-12,50\r\n\r\n17.10.2026;"Say ""hi""";100\n',
    ),
    [
      ['Date', 'Payee', 'Amount'],
      ['18.10.2026', 'Tesco; Main St', '-12,50'],
      ['17.10.2026', 'Say "hi"', '100'],
    ],
  )
  assert.deepEqual(parseCsv('a,b\n1,"two\nlines"'), [
    ['a', 'b'],
    ['1', 'two\nlines'],
  ])
})

test('parseDate reads each format and rejects impossible days', () => {
  assert.equal(parseDate('2026-10-18', 'YYYY-MM-DD'), '2026-10-18')
  assert.equal(parseDate('8.3.2026', 'DD.MM.YYYY'), '2026-03-08')
  assert.equal(parseDate('08/03/2026', 'DD/MM/YYYY'), '2026-03-08')
  assert.equal(parseDate('08/03/2026', 'MM/DD/YYYY'), '2026-08-03')
  assert.equal(parseDate('31/02/2026', 'DD/MM/YYYY'), null)
  assert.equal(parseDate('2026-10-18', 'DD.MM.YYYY'), null)
})

test('guessDateFormat prefers day-first when both fit', () => {
  assert.equal(guessDateFormat(['01/02/2026', '03/04/2026']), 'DD/MM/YYYY')
  assert.equal(guessDateFormat(['12/25/2026']), 'MM/DD/YYYY')
  assert.equal(guessDateFormat(['18.10.2026']), 'DD.MM.YYYY')
  assert.equal(guessDateFormat(['18.10.2026', 'Total']), 'DD.MM.YYYY')
})

test('parseSignedAmount reads bank sign conventions', () => {
  const parse = (text: string) => parseAmount(text, 2)
  assert.equal(parseSignedAmount('-12,50', parse), -1250)
  assert.equal(parseSignedAmount('1 234.56', parse), 123456)
  assert.equal(parseSignedAmount('(80.00)', parse), -8000)
  assert.equal(parseSignedAmount('12.50-', parse), -1250)
  assert.equal(parseSignedAmount('€ 7,00', parse), 700)
  assert.equal(parseSignedAmount('', parse), null)
})

test('headerKey ignores case and spacing, fitsHeader checks every column', () => {
  assert.equal(
    headerKey(['Datum ', 'Betrag', 'Empfänger']),
    headerKey(['datum', ' BETRAG', 'empfänger']),
  )
  assert.notEqual(headerKey(['Date', 'Amount']), headerKey(['Amount', 'Date']))
  const mapping = {
    date: 0,
    dateFormat: 'DD.MM.YYYY' as const,
    amount: 1,
    outColumn: 1,
    inColumn: 2,
    split: false,
    payee: -1,
  }
  assert.equal(fitsHeader(mapping, ['a', 'b', 'c']), true)
  assert.equal(fitsHeader(mapping, ['a', 'b']), false)
})
