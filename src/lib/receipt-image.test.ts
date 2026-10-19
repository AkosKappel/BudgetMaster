import assert from 'node:assert/strict'
import { test } from 'node:test'

import { decodeReceipt, RECEIPT_MAX_BYTES } from './receipt-image.ts'

const dataUrl = (type: string, bytes: number[] | Buffer) =>
  `data:${type};base64,${Buffer.from(bytes).toString('base64')}`

const webp = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0, 0, 0, 0]),
  Buffer.from('WEBPVP8 '),
])

test('accepts WebP and JPEG whose bytes match the type', () => {
  assert.equal(decodeReceipt(dataUrl('image/webp', webp))?.type, 'image/webp')
  assert.equal(
    decodeReceipt(dataUrl('image/jpeg', [0xff, 0xd8, 0xff, 0xe0]))?.type,
    'image/jpeg',
  )
})

test('refuses other types, mismatched bytes and oversized files', () => {
  assert.equal(decodeReceipt(dataUrl('image/png', [0x89, 0x50])), null)
  assert.equal(decodeReceipt(dataUrl('image/jpeg', webp)), null)
  assert.equal(decodeReceipt(dataUrl('image/webp', [0xff, 0xd8, 0xff])), null)
  assert.equal(decodeReceipt('data:image/jpeg;base64,'), null)
  assert.equal(decodeReceipt('<svg onload=alert(1)>'), null)
  const big = Buffer.alloc(RECEIPT_MAX_BYTES + 1)
  big.set([0xff, 0xd8, 0xff])
  assert.equal(decodeReceipt(dataUrl('image/jpeg', big)), null)
})
