// RFC 4180 CSV: quote every field that contains a comma, quote or newline
const escapeCell = (value) => {
  if (value === null || value === undefined) return ''
  const text = value instanceof Date ? value.toISOString() : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

// toCsv(['ID', 'Title'], [[1, 'a, b']]) → 'ID,Title\n1,"a, b"'
const toCsv = (headers, rows) =>
  [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n')

module.exports = { toCsv }
