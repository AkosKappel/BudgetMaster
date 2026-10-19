import assert from 'node:assert/strict'
import { test } from 'node:test'

import { describeDevice } from './devices.ts'

test('describeDevice names the browser and system', () => {
  assert.equal(
    describeDevice(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
    ),
    'Edge on Windows',
  )
  assert.equal(
    describeDevice(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    ),
    'Safari on iPhone',
  )
  assert.equal(
    describeDevice(
      'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
    ),
    'Chrome on Android',
  )
  assert.equal(
    describeDevice(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:131.0) Gecko/20100101 Firefox/131.0',
    ),
    'Firefox on macOS',
  )
})

test('describeDevice falls back for unknown or missing agents', () => {
  assert.equal(describeDevice(null), 'Unknown device')
  assert.equal(describeDevice('curl/8.5.0'), 'Unknown device')
})
