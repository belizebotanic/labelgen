import LZString from 'lz-string';
import { validate as validateTemplate } from './template.js';

const MAX_DECOMPRESSED_BYTES = 100_000;     // spec security cap
const MAX_FETCH_BYTES = 5 * 1024 * 1024;    // 5 MB

// ---------- URL hash encode / decode ----------

export function encode({ template, dataUrl }) {
  if (dataUrl != null && !isHttpsUrl(dataUrl)) {
    throw new Error('dataUrl must be a valid https: URL');
  }
  const tEncoded = _encodeRaw(template);
  const parts = [`t=${tEncoded}`];
  if (dataUrl) parts.push(`d=${encodeURIComponent(dataUrl)}`);
  return '#' + parts.join('&');
}

// Internal: encodes any JSON-able value without schema-validating it.
// Exposed only so tests can build adversarial payloads.
export function _encodeRaw(value) {
  const json = JSON.stringify(value);
  return LZString.compressToEncodedURIComponent(json);
}

export function decode(hash) {
  const errors = [];
  const out = { template: undefined, dataUrl: undefined, errors };
  if (!hash) return out;
  const cleaned = hash.startsWith('#') ? hash.slice(1) : hash;
  if (cleaned.length === 0) return out;

  const params = new Map();
  for (const part of cleaned.split('&')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    params.set(part.slice(0, eq), part.slice(eq + 1));
  }

  // template
  const tRaw = params.get('t');
  if (tRaw) {
    try {
      const json = LZString.decompressFromEncodedURIComponent(tRaw);
      if (json == null || json === '') {
        errors.push('t= could not be decompressed');
      } else if (json.length > MAX_DECOMPRESSED_BYTES) {
        errors.push(`t= decompressed size ${json.length} exceeds ${MAX_DECOMPRESSED_BYTES}`);
      } else {
        const candidate = JSON.parse(json);
        out.template = validateTemplate(candidate);
      }
    } catch (e) {
      errors.push(`t= invalid: ${e.message}`);
    }
  }

  // dataUrl
  const dRaw = params.get('d');
  if (dRaw) {
    let decoded;
    try { decoded = decodeURIComponent(dRaw); }
    catch (e) { errors.push(`d= invalid encoding: ${e.message}`); }
    if (decoded != null) {
      if (isHttpsUrl(decoded)) {
        out.dataUrl = decoded;
      } else {
        errors.push(`d= rejected: must be https:`);
      }
    }
  }

  return out;
}

// ---------- URL validation ----------

export function isHttpsUrl(s) {
  if (typeof s !== 'string') return false;
  let u;
  try { u = new URL(s); } catch { return false; }
  return u.protocol === 'https:';
}

// ---------- Secure fetch wrapper ----------

/**
 * The single fetch entry point. All outbound requests in the app go through this.
 * - Enforces https: scheme
 * - Sends no credentials
 * - Caps response size at MAX_FETCH_BYTES while streaming
 * @returns {Promise<string>} The response body as text.
 */
export async function secureFetch(url) {
  if (!isHttpsUrl(url)) {
    throw new Error(`Refused to fetch non-https URL: ${url}`);
  }
  const res = await fetch(url, { credentials: 'omit', redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

  // Early reject by Content-Length if provided
  const lenHeader = res.headers.get('content-length');
  if (lenHeader && Number(lenHeader) > MAX_FETCH_BYTES) {
    throw new Error(`Response too large: ${lenHeader} bytes (max ${MAX_FETCH_BYTES})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_FETCH_BYTES) {
      try { await reader.cancel(); } catch {}
      throw new Error(`Response exceeded ${MAX_FETCH_BYTES} bytes`);
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return text;
}
