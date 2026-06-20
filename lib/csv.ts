/**
 * lib/csv.ts — Minimal CSV parser
 *
 * Dependency-free CSV reader good enough for user spreadsheet exports: handles
 * quoted fields, escaped double-quotes (""), commas inside quotes, and CRLF/LF
 * line endings. Returns the header row plus the data rows. Used by the Lists
 * panel's "Import CSV" (create/update a list whose attributes match the column
 * headers).
 */

export interface ParsedCsv {
  headers: string[]
  rows: string[][]
}

export function parseCsv(text: string): ParsedCsv {
  const rows: string[][] = []
  let field = ""
  let row: string[] = []
  let inQuotes = false

  // Strip a leading BOM if present.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ",") {
        row.push(field)
        field = ""
      } else if (ch === "\n") {
        row.push(field)
        rows.push(row)
        row = []
        field = ""
      } else if (ch === "\r") {
        // ignore; handled by \n
      } else {
        field += ch
      }
    }
  }
  // Flush trailing field/row.
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  // Drop fully-empty trailing rows.
  const cleaned = rows.filter((r) => r.some((c) => c.trim() !== ""))
  if (cleaned.length === 0) return { headers: [], rows: [] }

  const headers = cleaned[0].map((h) => h.trim())
  return { headers, rows: cleaned.slice(1) }
}

/** Guess an attribute type from a column's values. */
export function inferColumnType(
  header: string,
  values: string[],
): "string" | "number" | "link" {
  const h = header.toLowerCase()
  const nonEmpty = values.map((v) => v.trim()).filter(Boolean)
  if (h.includes("url") || h.includes("link") || (nonEmpty.every((v) => /^https?:\/\//.test(v)) && nonEmpty.length > 0))
    return "link"
  if (
    h.includes("price") ||
    h.includes("cost") ||
    h.includes("$") ||
    (nonEmpty.length > 0 && nonEmpty.every((v) => !isNaN(Number(v.replace(/[$,]/g, "")))))
  )
    return "number"
  return "string"
}
