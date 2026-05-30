import { describe, test, assertEq, assertTrue } from './runner.js';
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
