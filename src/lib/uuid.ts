// UUID version 7 (RFC 9562): 48-bit millisecond timestamp, then random bits. Generated in
// the browser so an optimistic row already has its final id, and ids stay time-ordered like
// the database default `uuidv7()`.
export function uuidv7(now = Date.now()) {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  for (let i = 0; i < 6; i++)
    bytes[i] = Math.floor(now / 2 ** (8 * (5 - i))) & 0xff
  bytes[6] = (bytes[6] & 0x0f) | 0x70
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
