import assert from 'node:assert/strict'
import { test } from 'node:test'

import { parseEcbRates } from './exchange-rates.ts'

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01">
  <Cube>
    <Cube time='2026-10-20'>
      <Cube currency='USD' rate='1.0845'/>
      <Cube currency='JPY' rate='162.31'/>
      <Cube currency='TRY' rate='37.1'/>
    </Cube>
    <Cube time="2026-10-19">
      <Cube currency="USD" rate="1.0811"/>
    </Cube>
  </Cube>
</gesmes:Envelope>`

test('parseEcbRates reads every day and keeps the supported currencies', () => {
  assert.deepEqual(parseEcbRates(FEED, ['USD', 'JPY']), [
    { date: '2026-10-20', currency: 'USD', rate: '1.0845' },
    { date: '2026-10-20', currency: 'JPY', rate: '162.31' },
    { date: '2026-10-19', currency: 'USD', rate: '1.0811' },
  ])
})

test('parseEcbRates returns nothing for an unexpected page', () => {
  assert.deepEqual(parseEcbRates('<html>Maintenance</html>', ['USD']), [])
})
