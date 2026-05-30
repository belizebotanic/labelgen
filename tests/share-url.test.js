import { describe, test, assertEq, assertTrue, assertThrows } from './runner.js';
import * as SU from '../model/share-url.js';
import * as T from '../model/template.js';

describe('share-url encode/decode roundtrip', () => {
  test('template only', () => {
    const t = T.create();
    const hash = SU.encode({ template: t });
    const decoded = SU.decode(hash);
    assertEq(decoded.template, t);
    assertEq(decoded.dataUrl, undefined);
  });
  test('template + dataUrl', () => {
    const t = T.create();
    const url = 'https://example.com/x.csv';
    const hash = SU.encode({ template: t, dataUrl: url });
    const decoded = SU.decode(hash);
    assertEq(decoded.template, t);
    assertEq(decoded.dataUrl, url);
  });
});

describe('share-url.decode error handling', () => {
  test('empty hash → all undefined', () => {
    const r = SU.decode('');
    assertEq(r.template, undefined);
    assertEq(r.dataUrl, undefined);
  });
  test('garbage t= → template undefined, error noted', () => {
    const r = SU.decode('#t=NOT_VALID_LZ_STRING');
    assertEq(r.template, undefined);
    assertTrue(r.errors.length > 0);
  });
  test('non-https d= → dataUrl undefined, error noted', () => {
    const url = encodeURIComponent('http://example.com/x.csv');
    const r = SU.decode('#d=' + url);
    assertEq(r.dataUrl, undefined);
    assertTrue(r.errors.length > 0);
  });
  test('javascript: d= rejected', () => {
    const url = encodeURIComponent('javascript:alert(1)');
    const r = SU.decode('#d=' + url);
    assertEq(r.dataUrl, undefined);
    assertTrue(r.errors.length > 0);
  });
});

describe('share-url decompression cap', () => {
  test('decompressed payload over 100KB is rejected', () => {
    // Build a template-shaped object that's huge enough.
    // We use a bogus { version: 1, junk: 'x'.repeat(...) } since the size check
    // happens BEFORE schema validation in decode().
    const huge = { version: 1, junk: 'x'.repeat(200_000) };
    const hash = SU._encodeRaw(huge);  // bypass schema validation
    const r = SU.decode('#t=' + hash);
    assertEq(r.template, undefined);
    assertTrue(r.errors.some(e => /size/i.test(e)));
  });
});

describe('share-url validates HTTPS-only on encode', () => {
  test('encode rejects non-https dataUrl', () => {
    assertThrows(() => SU.encode({ template: T.create(), dataUrl: 'http://x' }));
    assertThrows(() => SU.encode({ template: T.create(), dataUrl: 'data:text/csv,a' }));
  });
});
