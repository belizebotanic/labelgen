import { describe, test, assertEq, assertThrows } from './runner.js';

describe('test harness smoke', () => {
  test('1 + 1 equals 2', () => {
    assertEq(1 + 1, 2);
  });
  test('assertThrows catches throws', () => {
    assertThrows(() => { throw new Error('expected'); });
  });
});
