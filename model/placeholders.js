const TOKEN_RE = /\{\{\s*([^{}\s][^{}]*?)\s*\}\}/g;

export function extract(text) {
  if (typeof text !== 'string' || text.length === 0) return [];
  const seen = new Set();
  const out = [];
  for (const match of text.matchAll(TOKEN_RE)) {
    const name = match[1].trim();
    if (!seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

export function substitute(text, row) {
  if (typeof text !== 'string') return text;
  if (row == null) return text;
  return text.replace(TOKEN_RE, (whole, raw) => {
    const key = raw.trim();
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      const v = row[key];
      return v == null ? '' : String(v);
    }
    return whole;
  });
}

/**
 * True if every placeholder referenced anywhere in `template` has a non-empty
 * value on `row`. A missing key, a null/undefined value, or a whitespace-only
 * string all count as unfilled. Templates with no placeholders return true
 * for any row.
 */
export function isRowFilled(template, row) {
  if (row == null) return false;
  const names = listInTemplate(template);
  if (names.length === 0) return true;
  for (const name of names) {
    if (!Object.prototype.hasOwnProperty.call(row, name)) return false;
    const v = row[name];
    if (v == null) return false;
    if (typeof v === 'string' && v.trim() === '') return false;
  }
  return true;
}

/**
 * Subset of `rows` that have every template placeholder filled. Preserves the
 * original order so sheet rendering still flows row-major in CSV order.
 */
export function filledRowsFor(template, rows) {
  if (!Array.isArray(rows)) return [];
  return rows.filter((r) => isRowFilled(template, r));
}

export function listInTemplate(template) {
  const seen = new Set();
  const out = [];
  const rows = template?.content?.rows ?? [];
  for (const row of rows) {
    for (const cell of row.cells ?? []) {
      for (const name of extract(cell.text ?? '')) {
        if (!seen.has(name)) {
          seen.add(name);
          out.push(name);
        }
      }
    }
  }
  return out;
}
