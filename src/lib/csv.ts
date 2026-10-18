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

// Reads a bank export: quoted fields (with "" for a quote and line breaks inside quotes),
// CRLF or LF, and the delimiter banks use most (comma, semicolon or tab), guessed from the
// first line. Empty lines are skipped.
export function parseCsv(text: string): string[][] {
  const firstLine = text.slice(0, text.search(/\r?\n|$/))
  const delimiter = [';', '\t', ','].reduce((best, candidate) =>
    firstLine.split(candidate).length > firstLine.split(best).length
      ? candidate
      : best,
  )
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (char === '"') quoted = false
      else field += char
    } else if (char === '"') quoted = true
    else if (char === delimiter) {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      if (row.some((value) => value.trim() !== '')) rows.push(row)
      row = []
      field = ''
    } else field += char
  }
  row.push(field)
  if (row.some((value) => value.trim() !== '')) rows.push(row)
  return rows.map((r) => r.map((value) => value.trim()))
}
