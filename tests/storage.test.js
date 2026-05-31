import { describe, test, assertEq } from './runner.js';
import * as Storage from '../model/storage.js';
import * as T from '../model/template.js';

const KEY = '__test_labelgen_template__';

describe('storage save/load roundtrip', () => {
  test('saveTemplate then loadTemplate returns same template', () => {
    localStorage.removeItem(KEY);
    const t = T.create();
    Storage._saveTo(KEY, t);
    const loaded = Storage._loadFrom(KEY);
    assertEq(loaded, t);
    localStorage.removeItem(KEY);
  });

  test('loadTemplate returns null when missing', () => {
    localStorage.removeItem(KEY);
    assertEq(Storage._loadFrom(KEY), null);
  });

  test('loadTemplate returns null on malformed JSON', () => {
    localStorage.setItem(KEY, '{ this is not json');
    assertEq(Storage._loadFrom(KEY), null);
    localStorage.removeItem(KEY);
  });

  test('loadTemplate returns null when validation fails', () => {
    localStorage.setItem(KEY, JSON.stringify({ version: 99 }));
    assertEq(Storage._loadFrom(KEY), null);
    localStorage.removeItem(KEY);
  });
});

describe('storage CSV roundtrip', () => {
  const CSV_KEY = '__test_labelgen_csv__';

  test('saveCsvRows then loadCsvRows returns the same rows', () => {
    localStorage.removeItem(CSV_KEY);
    const rows = [{ name: 'Ficus', latin: 'Ficus benjamina' }, { name: 'Palm', latin: 'Roystonea oleracea' }];
    Storage._saveCsvTo(CSV_KEY, rows);
    assertEq(Storage._loadCsvFrom(CSV_KEY), rows);
    localStorage.removeItem(CSV_KEY);
  });

  test('returns null when missing', () => {
    localStorage.removeItem(CSV_KEY);
    assertEq(Storage._loadCsvFrom(CSV_KEY), null);
  });

  test('returns null on malformed JSON', () => {
    localStorage.setItem(CSV_KEY, '{not json');
    assertEq(Storage._loadCsvFrom(CSV_KEY), null);
    localStorage.removeItem(CSV_KEY);
  });

  test('returns null when rows is not an array', () => {
    localStorage.setItem(CSV_KEY, JSON.stringify({ rows: 'oops' }));
    assertEq(Storage._loadCsvFrom(CSV_KEY), null);
    localStorage.removeItem(CSV_KEY);
  });

  test('returns null when a row has non-string values', () => {
    localStorage.setItem(CSV_KEY, JSON.stringify({ rows: [{ x: 1 }] }));
    assertEq(Storage._loadCsvFrom(CSV_KEY), null);
    localStorage.removeItem(CSV_KEY);
  });
});
