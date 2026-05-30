// Schema constants (also used by validate())
export const MIN_DIM_MM = 0.1;
export const MAX_DIM_MM = 10000;
export const MIN_FONT_PT = 1;
export const MAX_FONT_PT = 1000;
export const MAX_TEXT_LEN = 4096;
export const MAX_BANDS = 10;
export const MAX_ROWS_PER_BAND = 50;
export const MAX_CELLS_PER_ROW = 20;
export const VALID_ALIGNS = ['left', 'center', 'right'];
export const VALID_BANDS = ['top', 'middle', 'bottom'];
export const VALID_LAYERS = ['engrave', 'cut'];

export function create() {
  return {
    version: 1,
    sheet: {
      width_mm: 210, height_mm: 297,
      margin_mm: 10, gutter_mm: 2,
      rows: 7, cols: 3
    },
    label: {
      width_mm: 60, height_mm: 40,
      padding_mm: 3,
      corner_radius_mm: 1,
      border: { width_mm: 0 },
      font: { family: 'SansSerif', size_pt: 10 },
      hang_holes: [],
      layer: 'engrave'
    },
    content: {
      bands: [defaultBand('middle')]
    }
  };
}

function defaultBand(name) {
  return { name, rows: [defaultRow()] };
}
function defaultRow() {
  return { cells: [defaultCell('Hello')] };
}
function defaultCell(text = '') {
  return { text, align: 'center', italic: false, bold: false };
}

// All ops return a new template; we use structuredClone to avoid shared refs.
function clone(t) { return structuredClone(t); }

export function addRow(t, bandIdx) {
  const out = clone(t);
  out.content.bands[bandIdx].rows.push(defaultRow());
  return out;
}

export function removeRow(t, bandIdx, rowIdx) {
  const out = clone(t);
  const rows = out.content.bands[bandIdx].rows;
  if (rows.length <= 1) return out; // never drop to zero
  rows.splice(rowIdx, 1);
  return out;
}

export function addCell(t, bandIdx, rowIdx) {
  const out = clone(t);
  out.content.bands[bandIdx].rows[rowIdx].cells.push(defaultCell());
  return out;
}

export function removeCell(t, bandIdx, rowIdx, cellIdx) {
  const out = clone(t);
  const cells = out.content.bands[bandIdx].rows[rowIdx].cells;
  if (cells.length <= 1) return out;
  cells.splice(cellIdx, 1);
  return out;
}

export function setCell(t, bandIdx, rowIdx, cellIdx, patch) {
  const out = clone(t);
  Object.assign(out.content.bands[bandIdx].rows[rowIdx].cells[cellIdx], patch);
  return out;
}

export function setSheet(t, patch) {
  const out = clone(t);
  Object.assign(out.sheet, patch);
  return out;
}

export function setLabel(t, patch) {
  const out = clone(t);
  // shallow-merge nested font / border too if provided
  if (patch.font) Object.assign(out.label.font, patch.font);
  if (patch.border) Object.assign(out.label.border, patch.border);
  const { font, border, ...rest } = patch;
  Object.assign(out.label, rest);
  return out;
}

// ---------------- validation ----------------

function err(msg) { throw new Error('Template validate: ' + msg); }

function reqNum(obj, key, min, max) {
  const v = obj[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) err(`${key} must be a finite number`);
  if (v < min || v > max) err(`${key}=${v} out of range [${min},${max}]`);
}

function reqStr(obj, key, maxLen) {
  const v = obj[key];
  if (typeof v !== 'string') err(`${key} must be a string`);
  if (v.length > maxLen) err(`${key} exceeds ${maxLen} chars`);
}

function reqEnum(obj, key, values) {
  if (!values.includes(obj[key])) err(`${key}=${obj[key]} not in ${values.join(',')}`);
}

function reqBool(obj, key) {
  if (typeof obj[key] !== 'boolean') err(`${key} must be boolean`);
}

export function validate(t) {
  if (t == null || typeof t !== 'object') err('not an object');
  if (t.version !== 1) err('version must be 1');

  // sheet
  if (!t.sheet || typeof t.sheet !== 'object') err('sheet missing');
  reqNum(t.sheet, 'width_mm', MIN_DIM_MM, MAX_DIM_MM);
  reqNum(t.sheet, 'height_mm', MIN_DIM_MM, MAX_DIM_MM);
  reqNum(t.sheet, 'margin_mm', 0, MAX_DIM_MM);
  reqNum(t.sheet, 'gutter_mm', 0, MAX_DIM_MM);
  reqNum(t.sheet, 'rows', 1, 200);
  reqNum(t.sheet, 'cols', 1, 200);

  // label
  if (!t.label || typeof t.label !== 'object') err('label missing');
  reqNum(t.label, 'width_mm', MIN_DIM_MM, MAX_DIM_MM);
  reqNum(t.label, 'height_mm', MIN_DIM_MM, MAX_DIM_MM);
  reqNum(t.label, 'padding_mm', 0, MAX_DIM_MM);
  reqNum(t.label, 'corner_radius_mm', 0, MAX_DIM_MM);
  if (!t.label.border || typeof t.label.border !== 'object') err('label.border missing');
  reqNum(t.label.border, 'width_mm', 0, MAX_DIM_MM);
  if (!t.label.font || typeof t.label.font !== 'object') err('label.font missing');
  reqStr(t.label.font, 'family', 200);
  reqNum(t.label.font, 'size_pt', MIN_FONT_PT, MAX_FONT_PT);
  if (!Array.isArray(t.label.hang_holes)) err('label.hang_holes must be array');
  if (t.label.hang_holes.length > 8) err('too many hang_holes');
  reqEnum(t.label, 'layer', VALID_LAYERS);

  // content
  if (!t.content || typeof t.content !== 'object') err('content missing');
  if (!Array.isArray(t.content.bands)) err('content.bands must be array');
  if (t.content.bands.length === 0) err('content.bands must have at least one band');
  if (t.content.bands.length > MAX_BANDS) err(`too many bands (max ${MAX_BANDS})`);

  for (const [bi, band] of t.content.bands.entries()) {
    if (!band || typeof band !== 'object') err(`band ${bi} not object`);
    reqEnum(band, 'name', VALID_BANDS);
    if (!Array.isArray(band.rows)) err(`band ${bi}.rows must be array`);
    if (band.rows.length === 0) err(`band ${bi} must have at least one row`);
    if (band.rows.length > MAX_ROWS_PER_BAND) err(`band ${bi}: too many rows`);
    for (const [ri, row] of band.rows.entries()) {
      if (!row || typeof row !== 'object') err(`band ${bi} row ${ri} not object`);
      if (!Array.isArray(row.cells)) err(`band ${bi} row ${ri}.cells must be array`);
      if (row.cells.length === 0) err(`band ${bi} row ${ri} must have at least one cell`);
      if (row.cells.length > MAX_CELLS_PER_ROW) err(`band ${bi} row ${ri}: too many cells`);
      for (const [ci, cell] of row.cells.entries()) {
        if (!cell || typeof cell !== 'object') err(`band ${bi} row ${ri} cell ${ci} not object`);
        reqStr(cell, 'text', MAX_TEXT_LEN);
        reqEnum(cell, 'align', VALID_ALIGNS);
        reqBool(cell, 'italic');
        reqBool(cell, 'bold');
        if ('font_size_pt' in cell) reqNum(cell, 'font_size_pt', MIN_FONT_PT, MAX_FONT_PT);
      }
    }
  }
  return t;
}
