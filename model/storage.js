import { validate } from './template.js';

const KEY = 'labelgen:template:v1';

export function loadTemplate() { return _loadFrom(KEY); }
export function saveTemplate(t) { return _saveTo(KEY, t); }
export function clearTemplate() { localStorage.removeItem(KEY); }

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
