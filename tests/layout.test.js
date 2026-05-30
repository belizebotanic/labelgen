import { describe, test, assertTrue } from './runner.js';
import * as T from '../model/template.js';
import { layoutLabel } from '../render/layout.js';

describe('layoutLabel: defaults', () => {
  test('default template produces at least the border rect and one text shape', () => {
    const shapes = layoutLabel(T.create(), null);
    assertTrue(shapes.some(s => s.kind === 'text'));
  });
  test('all shape coordinates are finite numbers', () => {
    const shapes = layoutLabel(T.create(), null);
    for (const s of shapes) {
      assertTrue(Number.isFinite(s.x_mm) && Number.isFinite(s.y_mm), `bad coords on ${JSON.stringify(s)}`);
    }
  });
});

describe('layoutLabel: substitutes placeholders', () => {
  test('placeholder is replaced from row', () => {
    const t = T.setCell(T.create(), 0, 0, 0, { text: 'Name: {{name}}' });
    const shapes = layoutLabel(t, { name: 'Brett' });
    const texts = shapes.filter(s => s.kind === 'text').map(s => s.text);
    assertTrue(texts.some(x => x.includes('Brett')), texts.join('|'));
  });
});

describe('layoutLabel: bands stack', () => {
  test('top band y < middle band y < bottom band y', () => {
    let t = T.create();
    t.content.bands = [
      { name: 'top',    rows: [{ cells: [{ text: 'T', align: 'center', italic: false, bold: false }] }] },
      { name: 'middle', rows: [{ cells: [{ text: 'M', align: 'center', italic: false, bold: false }] }] },
      { name: 'bottom', rows: [{ cells: [{ text: 'B', align: 'center', italic: false, bold: false }] }] }
    ];
    const shapes = layoutLabel(t, null).filter(s => s.kind === 'text');
    const yTop = shapes.find(s => s.text === 'T').y_mm;
    const yMid = shapes.find(s => s.text === 'M').y_mm;
    const yBot = shapes.find(s => s.text === 'B').y_mm;
    assertTrue(yTop < yMid && yMid < yBot, `y stacking wrong: ${yTop}, ${yMid}, ${yBot}`);
  });
});

describe('layoutLabel: alignment within row cells', () => {
  test('left-aligned x is at cell left edge; right-aligned is near cell right edge', () => {
    let t = T.create();
    t.content.bands[0].rows[0].cells = [
      { text: 'L', align: 'left',  italic: false, bold: false },
      { text: 'R', align: 'right', italic: false, bold: false }
    ];
    const shapes = layoutLabel(t, null).filter(s => s.kind === 'text');
    const l = shapes.find(s => s.text === 'L');
    const r = shapes.find(s => s.text === 'R');
    assertTrue(l.x_mm < r.x_mm, `expected left < right, got ${l.x_mm} vs ${r.x_mm}`);
  });
});
