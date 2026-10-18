import assert from 'node:assert/strict'
import { test } from 'node:test'

import { toCsv } from './csv.ts'

test('toCsv quotes only what needs quoting', () => {
  assert.equal(
    toCsv([
      ['date', 'payee', 'amount'],
      ['2026-10-18', 'Tesco, Main St', 12.5],
      ['2026-10-17', 'Say "hi"', null],
      ['2026-10-16', 'two\nlines', -3],
    ]),
    'date,payee,amount\r\n2026-10-18,"Tesco, Main St",12.5\r\n2026-10-17,"Say ""hi""",\r\n2026-10-16,"two\nlines",-3',
  )
})
