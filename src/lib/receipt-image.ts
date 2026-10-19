// Receipt photos (I-04) arrive as data URLs from the browser, already resized.
export const RECEIPT_MAX_BYTES = 1_000_000
export const RECEIPT_TYPES = ['image/webp', 'image/jpeg'] as const
export type ReceiptType = (typeof RECEIPT_TYPES)[number]

// Decodes a data URL and checks that the bytes really are the image type it claims, so
// nothing else can be stored and served back as an image.
export function decodeReceipt(
  dataUrl: string,
): { type: ReceiptType; bytes: Buffer } | null {
  const match = /^data:(image\/(?:webp|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(
    dataUrl,
  )
  if (!match) return null
  const type = match[1] as ReceiptType
  const bytes = Buffer.from(match[2], 'base64')
  if (bytes.length === 0 || bytes.length > RECEIPT_MAX_BYTES) return null
  const isWebp =
    bytes.subarray(0, 4).toString('latin1') === 'RIFF' &&
    bytes.subarray(8, 12).toString('latin1') === 'WEBP'
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (type === 'image/webp' ? !isWebp : !isJpeg) return null
  return { type, bytes }
}
