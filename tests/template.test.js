import { describe, test, assertEq, assertTrue, assertThrows } from './runner.js';
import * as T from '../model/template.js';

describe('Template.create', () => {
  test('returns a template at the current version', () => {
    assertEq(T.create().version, T.VERSION);
  });
  test('default sheet is A4 with sensible defaults', () => {
    const t = T.create();
    assertEq(t.sheet.width_mm, 210);
    assertEq(t.sheet.height_mm, 297);
    assertTrue(t.sheet.margin_mm > 0);
    assertTrue(t.sheet.rows >= 1);
    assertTrue(t.sheet.cols >= 1);
  });
  test('default content has 3 rows with cell counts 2 / 1 / 2', () => {
    const t = T.create();
    assertEq(t.content.rows.length, 3);
    assertEq(t.content.rows[0].cells.length, 2);
    assertEq(t.content.rows[1].cells.length, 1);
    assertEq(t.content.rows[2].cells.length, 2);
  });
  test('default cells all start empty', () => {
    const t = T.create();
    for (const row of t.content.rows) {
      for (const cell of row.cells) {
        assertEq(cell.text, '');
      }
    }
  });
  test('default label carries deferred fields', () => {
    const t = T.create();
    assertEq(t.label.hang_holes, []);
    assertEq(t.label.layer, 'engrave');
  });
});

describe('Template ops are immutable', () => {
  test('addRow does not mutate the source template', () => {
    const t = T.create();
    const snapshot = JSON.stringify(t);
    T.addRow(t);
    assertEq(JSON.stringify(t), snapshot);
  });
});

describe('Template.addRow / removeRow', () => {
  test('addRow appends an empty row with one default cell', () => {
    const t = T.create();
    const t2 = T.addRow(t);
    assertEq(t2.content.rows.length, t.content.rows.length + 1);
    const newRow = t2.content.rows[t2.content.rows.length - 1];
    assertEq(newRow.cells.length, 1);
    assertEq(newRow.cells[0].text, '');
  });
  test('removeRow drops the indexed row', () => {
    let t = T.create();
    const before = t.content.rows.length;
    t = T.removeRow(t, 0);
    assertEq(t.content.rows.length, before - 1);
  });
  test('removeRow does not remove the last row', () => {
    let t = T.create();
    // Drop down to one row, then attempt to remove it
    while (t.content.rows.length > 1) t = T.removeRow(t, 0);
    const t2 = T.removeRow(t, 0);
    assertEq(t2.content.rows.length, 1);
  });
});

describe('Template.insertRowAt', () => {
  test('inserts at the beginning when atIdx=0', () => {
    let t = T.create();
    t = T.setCell(t, 0, 0, { text: 'original' });
    t = T.insertRowAt(t, 0);
    assertEq(t.content.rows[1].cells[0].text, 'original');
    assertEq(t.content.rows[0].cells[0].text, '');
  });
  test('inserts at the end when atIdx=length', () => {
    let t = T.create();
    const len = t.content.rows.length;
    t = T.insertRowAt(t, len);
    assertEq(t.content.rows.length, len + 1);
  });
  test('clamps negative atIdx to 0', () => {
    const before = T.create().content.rows.length;
    const t = T.insertRowAt(T.create(), -5);
    assertEq(t.content.rows.length, before + 1);
  });
  test('clamps over-large atIdx to length', () => {
    const before = T.create().content.rows.length;
    const t = T.insertRowAt(T.create(), 999);
    assertEq(t.content.rows.length, before + 1);
  });
});

describe('Template.addCell / insertCellAt / removeCell', () => {
  test('addCell appends a default cell to the indexed row', () => {
    const t = T.addCell(T.create(), 0);
    assertEq(t.content.rows[0].cells.length, 3); // default row 0 had 2
  });
  test('insertCellAt inserts at the beginning', () => {
    let t = T.create();
    t = T.setCell(t, 0, 0, { text: 'B' });
    t = T.insertCellAt(t, 0, 0);
    assertEq(t.content.rows[0].cells.map(c => c.text), ['', 'B', '']);
  });
  test('removeCell drops the indexed cell', () => {
    const t = T.removeCell(T.create(), 0, 0);
    assertEq(t.content.rows[0].cells.length, 1); // was 2
  });
  test('removeCell does not remove the last cell in a row', () => {
    let t = T.create();
    // Reduce row 1 (which already has 1 cell) — should stay at 1
    const t2 = T.removeCell(t, 1, 0);
    assertEq(t2.content.rows[1].cells.length, 1);
  });
});

describe('Template.setCell / setSheet / setLabel', () => {
  test('setCell merges a patch', () => {
    const t = T.setCell(T.create(), 0, 0, { align: 'right', italic: true });
    const cell = t.content.rows[0].cells[0];
    assertEq(cell.align, 'right');
    assertEq(cell.italic, true);
  });
  test('setSheet merges a patch', () => {
    const t = T.setSheet(T.create(), { rows: 5, cols: 2 });
    assertEq(t.sheet.rows, 5);
    assertEq(t.sheet.cols, 2);
    assertEq(t.sheet.width_mm, 210);
  });
  test('setLabel merges a patch', () => {
    const t = T.setLabel(T.create(), { padding_mm: 5 });
    assertEq(t.label.padding_mm, 5);
  });
  test('setLabel preserves font.family when only size changes', () => {
    const original = T.create().label.font.family;
    const t = T.setLabel(T.create(), { font: { size_pt: 14 } });
    assertEq(t.label.font.size_pt, 14);
    assertEq(t.label.font.family, original);
  });
});

describe('Template.validate — happy path', () => {
  test('default template validates', () => {
    const t = T.create();
    assertEq(T.validate(t), t);
  });
});

describe('Template.validate — rejections', () => {
  test('rejects null', () => { assertThrows(() => T.validate(null)); });
  test('rejects non-object', () => { assertThrows(() => T.validate('hi')); });
  test('rejects missing version', () => {
    const t = T.create();
    delete t.version;
    assertThrows(() => T.validate(t));
  });
  test('rejects old version 1', () => {
    const t = T.create();
    t.version = 1;
    assertThrows(() => T.validate(t));
  });
  test('rejects non-finite numbers', () => {
    const t = T.create();
    t.sheet.width_mm = Infinity;
    assertThrows(() => T.validate(t));
  });
  test('rejects dimensions out of range (too small)', () => {
    const t = T.create();
    t.sheet.width_mm = 0.05;
    assertThrows(() => T.validate(t));
  });
  test('rejects dimensions out of range (too large)', () => {
    const t = T.create();
    t.sheet.width_mm = 1e9;
    assertThrows(() => T.validate(t));
  });
  test('rejects bad align value', () => {
    const t = T.create();
    t.content.rows[0].cells[0].align = 'middle';
    assertThrows(() => T.validate(t));
  });
  test('rejects oversize cell text', () => {
    const t = T.create();
    t.content.rows[0].cells[0].text = 'x'.repeat(5000);
    assertThrows(() => T.validate(t));
  });
  test('rejects too many rows', () => {
    const t = T.create();
    while (t.content.rows.length < 51) {
      t.content.rows.push({ cells: [{ text: 'x', align: 'left', italic: false, bold: false }] });
    }
    assertThrows(() => T.validate(t));
  });
  test('rejects too many cells in a row', () => {
    const t = T.create();
    while (t.content.rows[0].cells.length < 21) {
      t.content.rows[0].cells.push({ text: 'x', align: 'left', italic: false, bold: false });
    }
    assertThrows(() => T.validate(t));
  });
  test('rejects bad font size', () => {
    const t = T.create();
    t.label.font.size_pt = 0;
    assertThrows(() => T.validate(t));
  });
  test('rejects bad layer value', () => {
    const t = T.create();
    t.label.layer = 'pretty please';
    assertThrows(() => T.validate(t));
  });
});
