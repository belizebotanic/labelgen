import { describe, test, assertEq, assertTrue, assertThrows } from './runner.js';
import * as T from '../model/template.js';

describe('Template.create', () => {
  test('returns a template at version 1', () => {
    assertEq(T.create().version, 1);
  });
  test('default sheet is A4 with sensible defaults', () => {
    const t = T.create();
    assertEq(t.sheet.width_mm, 210);
    assertEq(t.sheet.height_mm, 297);
    assertTrue(t.sheet.margin_mm > 0);
    assertTrue(t.sheet.rows >= 1);
    assertTrue(t.sheet.cols >= 1);
  });
  test('default label has one band, one row, one cell with "Hello"', () => {
    const t = T.create();
    assertEq(t.content.bands.length, 1);
    const band = t.content.bands[0];
    assertEq(band.name, 'middle');
    assertEq(band.rows.length, 1);
    assertEq(band.rows[0].cells.length, 1);
    assertEq(band.rows[0].cells[0].text, 'Hello');
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
    T.addRow(t, 0);
    assertEq(JSON.stringify(t), snapshot);
  });
});

describe('Template.addRow / removeRow', () => {
  test('addRow appends an empty row with one default cell', () => {
    const t = T.create();
    const t2 = T.addRow(t, 0);
    assertEq(t2.content.bands[0].rows.length, 2);
    assertEq(t2.content.bands[0].rows[1].cells.length, 1);
  });
  test('removeRow drops the indexed row', () => {
    let t = T.create();
    t = T.addRow(t, 0);
    t = T.removeRow(t, 0, 0);
    assertEq(t.content.bands[0].rows.length, 1);
  });
  test('removeRow does not remove the last row', () => {
    const t = T.create();
    const t2 = T.removeRow(t, 0, 0);
    assertEq(t2.content.bands[0].rows.length, 1);
  });
});

describe('Template.addCell / removeCell', () => {
  test('addCell appends a default cell to the indexed row', () => {
    const t = T.addCell(T.create(), 0, 0);
    assertEq(t.content.bands[0].rows[0].cells.length, 2);
  });
  test('removeCell drops the indexed cell', () => {
    let t = T.addCell(T.create(), 0, 0);
    t = T.removeCell(t, 0, 0, 0);
    assertEq(t.content.bands[0].rows[0].cells.length, 1);
  });
  test('removeCell does not remove the last cell in a row', () => {
    const t = T.removeCell(T.create(), 0, 0, 0);
    assertEq(t.content.bands[0].rows[0].cells.length, 1);
  });
});

describe('Template.setCell / setSheet / setLabel', () => {
  test('setCell merges a patch', () => {
    const t = T.setCell(T.create(), 0, 0, 0, { align: 'right', italic: true });
    const cell = t.content.bands[0].rows[0].cells[0];
    assertEq(cell.align, 'right');
    assertEq(cell.italic, true);
    assertEq(cell.text, 'Hello'); // unchanged
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
  test('rejects unknown version', () => {
    const t = T.create();
    t.version = 99;
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
    t.content.bands[0].rows[0].cells[0].align = 'middle';
    assertThrows(() => T.validate(t));
  });
  test('rejects bad band name', () => {
    const t = T.create();
    t.content.bands[0].name = 'whatever';
    assertThrows(() => T.validate(t));
  });
  test('rejects oversize cell text', () => {
    const t = T.create();
    t.content.bands[0].rows[0].cells[0].text = 'x'.repeat(5000);
    assertThrows(() => T.validate(t));
  });
  test('rejects too many bands', () => {
    const t = T.create();
    while (t.content.bands.length < 11) {
      t.content.bands.push({ name: 'middle', rows: [{ cells: [{ text: 'x', align: 'left', italic: false, bold: false }] }] });
    }
    assertThrows(() => T.validate(t));
  });
  test('rejects too many rows in a band', () => {
    const t = T.create();
    while (t.content.bands[0].rows.length < 51) {
      t.content.bands[0].rows.push({ cells: [{ text: 'x', align: 'left', italic: false, bold: false }] });
    }
    assertThrows(() => T.validate(t));
  });
  test('rejects too many cells in a row', () => {
    const t = T.create();
    while (t.content.bands[0].rows[0].cells.length < 21) {
      t.content.bands[0].rows[0].cells.push({ text: 'x', align: 'left', italic: false, bold: false });
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
