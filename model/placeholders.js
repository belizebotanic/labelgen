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
