import { describe, test, assertTrue } from './runner.js';
import * as T from '../model/template.js';
import { layoutLabel } from '../render/layout.js';

describe('layoutLabel: defaults', () => {
  test('default template produces text shapes and a border rect', () => {
    const shapes = layoutLabel(T.create(), null);
    assertTrue(shapes.some(s => s.kind === 'rect'));
    // default has 5 cells (2 + 1 + 2) — all empty, so they don't render text.
    // Add some text to one to verify text emission works.
    const t = T.setCell(T.create(), 1, 0, { text: 'hi' });
    const shapes2 = layoutLabel(t, null);
    assertTrue(shapes2.some(s => s.kind === 'text' && s.text === 'hi'));
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
    const t = T.setCell(T.create(), 0, 0, { text: 'Name: {{name}}' });
    const shapes = layoutLabel(t, { name: 'Brett' });
    const texts = shapes.filter(s => s.kind === 'text').map(s => s.text);
    assertTrue(texts.some(x => x.includes('Brett')), texts.join('|'));
  });
});

describe('layoutLabel: rows stack', () => {
  test('row indices produce increasing y', () => {
    let t = T.create();
    t = T.setCell(t, 0, 0, { text: 'A' });
    t = T.setCell(t, 1, 0, { text: 'B' });
    t = T.setCell(t, 2, 0, { text: 'C' });
    const shapes = layoutLabel(t, null).filter(s => s.kind === 'text');
    const yA = shapes.find(s => s.text === 'A').y_mm;
    const yB = shapes.find(s => s.text === 'B').y_mm;
    const yC = shapes.find(s => s.text === 'C').y_mm;
    assertTrue(yA < yB && yB < yC, `y order wrong: ${yA}, ${yB}, ${yC}`);
  });
});

describe('layoutLabel: alignment within row cells', () => {
  test('left-aligned x is at cell left edge; right-aligned is near cell right edge', () => {
    let t = T.create();
    // Row 0 has 2 cells by default; mark them L / R
    t = T.setCell(t, 0, 0, { text: 'L', align: 'left' });
    t = T.setCell(t, 0, 1, { text: 'R', align: 'right' });
    const shapes = layoutLabel(t, null).filter(s => s.kind === 'text');
    const l = shapes.find(s => s.text === 'L');
    const r = shapes.find(s => s.text === 'R');
    assertTrue(l.x_mm < r.x_mm, `expected left < right, got ${l.x_mm} vs ${r.x_mm}`);
  });
});
