import { validate } from './template.js';

const KEY = 'labelgen:template:v1';
const CSV_KEY = 'labelgen:csv:v1';
const LAST_HASH_KEY = 'labelgen:last-hash:v1';

export function loadTemplate() { return _loadFrom(KEY); }
export function saveTemplate(t) { return _saveTo(KEY, t); }
export function clearTemplate() {
  try { localStorage.removeItem(KEY); } catch {}
}

/**
 * Last-visit URL hash. Used to distinguish a refresh on the same URL
 * (restore in-progress edits from localStorage) from a fresh navigation
 * to the bare URL after viewing a share link (don't restore — start
 * clean so share links don't leave ghosts in localStorage).
 *
 * Returns null if never set or if storage is disabled.
 */
export function loadLastHash() {
  try { return localStorage.getItem(LAST_HASH_KEY); }
  catch { return null; }
}
export function saveLastHash(hash) {
  try { localStorage.setItem(LAST_HASH_KEY, hash); }
  catch {}
}

/**
 * CSV row persistence. Stored shape: { rows: [{col:string,...}, ...] }.
 * Validates lightly — array of plain objects with string values — returns
 * null on any anomaly so a corrupt entry never blocks app startup.
 */
export function loadCsvRows() { return _loadCsvFrom(CSV_KEY); }
export function saveCsvRows(rows) { return _saveCsvTo(CSV_KEY, rows); }
export function clearCsvRows() {
  try { localStorage.removeItem(CSV_KEY); } catch {}
}

export function _loadCsvFrom(key) {
  let raw;
  try { raw = localStorage.getItem(key); }
  catch { return null; }
  if (raw == null) return null;
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { return null; }
  if (!parsed || !Array.isArray(parsed.rows)) return null;
  const rows = parsed.rows;
  for (const r of rows) {
    if (!r || typeof r !== 'object' || Array.isArray(r)) return null;
    for (const k of Object.keys(r)) {
      if (typeof r[k] !== 'string') return null;
    }
  }
  return rows;
}

export function _saveCsvTo(key, rows) {
  try {
    localStorage.setItem(key, JSON.stringify({ rows }));
    return true;
  } catch (e) {
    if (e && e.name === 'QuotaExceededError') {
      try {
        localStorage.removeItem(key);
        localStorage.setItem(key, JSON.stringify({ rows }));
        return true;
      } catch { return false; }
    }
    return false;
  }
}

// Internal — also used by tests so they can isolate themselves on a private key.
export function _loadFrom(key) {
  let raw;
  try { raw = localStorage.getItem(key); }
  catch { return null; }  // disabled localStorage
  if (raw == null) return null;
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { return null; }
  try { return validate(parsed); }
  catch { return null; }
}

export function _saveTo(key, t) {
  try {
    localStorage.setItem(key, JSON.stringify(t));
    return true;
  } catch (e) {
    if (e && e.name === 'QuotaExceededError') {
      // single retry — caller may have stale data lingering
      try {
        localStorage.removeItem(key);
        localStorage.setItem(key, JSON.stringify(t));
        return true;
      } catch { return false; }
    }
    return false;
  }
}
