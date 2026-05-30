import { describe, test, assertTrue } from './runner.js';
import { measureText } from '../render/measure.js';

describe('measure.measureText', () => {
  test('returns finite positive width for "Hello"', () => {
    const m = measureText({ family: 'sans-serif', sizePt: 10, italic: false, bold: false, text: 'Hello' });
    assertTrue(Number.isFinite(m.widthPx) && m.widthPx > 0, `widthPx=${m.widthPx}`);
  });
  test('width grows with text length', () => {
    const a = measureText({ family: 'sans-serif', sizePt: 10, italic: false, bold: false, text: 'A' });
    const b = measureText({ family: 'sans-serif', sizePt: 10, italic: false, bold: false, text: 'AAAAAAAAAA' });
    assertTrue(b.widthPx > a.widthPx);
  });
  test('width grows with font size', () => {
    const a = measureText({ family: 'sans-serif', sizePt: 10, italic: false, bold: false, text: 'Test' });
    const b = measureText({ family: 'sans-serif', sizePt: 30, italic: false, bold: false, text: 'Test' });
    assertTrue(b.widthPx > a.widthPx);
  });
  test('returns ascent and descent', () => {
    const m = measureText({ family: 'sans-serif', sizePt: 10, italic: false, bold: false, text: 'Hello' });
    assertTrue(Number.isFinite(m.ascentPx));
    assertTrue(Number.isFinite(m.descentPx));
  });
});
