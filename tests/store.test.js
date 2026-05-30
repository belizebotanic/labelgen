import { describe, test, assertEq, assertTrue } from './runner.js';
import { createStore } from '../store.js';
import * as T from '../model/template.js';

describe('store', () => {
  test('getState returns initial state', () => {
    const s = createStore({ template: T.create() });
    assertEq(s.getState().template.version, 1);
    assertEq(s.getState().csvRows, null);
    assertEq(s.getState().activeRowIdx, null);
    assertEq(s.getState().selection, null);
  });
  test('setState merges patches and notifies subscribers', () => {
    const s = createStore({ template: T.create() });
    let calls = 0;
    s.subscribe(() => { calls++; });
    s.setState({ activeRowIdx: 0 });
    assertEq(s.getState().activeRowIdx, 0);
    assertEq(calls, 1);
  });
  test('action helpers wrap template ops immutably', () => {
    const s = createStore({ template: T.create() });
    s.actions.addCell(0, 0);
    assertEq(s.getState().template.content.bands[0].rows[0].cells.length, 2);
  });
  test('unsubscribe stops notifications', () => {
    const s = createStore({ template: T.create() });
    let calls = 0;
    const off = s.subscribe(() => { calls++; });
    s.setState({ activeRowIdx: 1 });
    off();
    s.setState({ activeRowIdx: 2 });
    assertEq(calls, 1);
  });
});
