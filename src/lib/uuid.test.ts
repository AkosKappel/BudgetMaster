import assert from 'node:assert/strict'
import { test } from 'node:test'

import { uuidv7 } from './uuid.ts'

test('uuidv7 has the version and variant bits and sorts by time', () => {
  const id = uuidv7(1_760_000_000_000)
  assert.match(
    id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  )
  assert.ok(uuidv7(1_760_000_000_000) < uuidv7(1_760_000_000_001))
  assert.equal(
    id.slice(0, 13).replace('-', ''),
    (1_760_000_000_000).toString(16).padStart(12, '0'),
  )
})
