// RFC 4180: fields with a comma, quote or line break are quoted, quotes are doubled.
// Lines end with CRLF so spreadsheet apps on every platform read it the same way.
export function toCsv(rows: (string | number | null)[][]) {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const text = value === null ? '' : String(value)
          return /[",\r\n]/.test(text)
            ? `"${text.replaceAll('"', '""')}"`
            : text
        })
        .join(','),
    )
    .join('\r\n')
}
