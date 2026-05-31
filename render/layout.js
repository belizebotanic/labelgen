import { substitute } from '../model/placeholders.js';
import { measureText } from './measure.js';
import { mmToPx, ptToMm } from './units.js';

const ELLIPSIS = '…';
const LINE_HEIGHT_FACTOR = 1.2;

/**
 * Geometry helpers — used by both the content layout and the editor overlays so
 * both stay aligned to the same coordinate system.
 *
 * Rows divide the content area evenly: one row fills the whole content height,
 * two each get half, N each get 1/N.
 */
function labelGeometry(template) {
  const { label } = template;
  const W = label.width_mm;
  const H = label.height_mm;
  const pad = label.padding_mm;
  const rowCount = Math.max(1, template.content.rows.length);
  return {
    W, H, pad,
    contentX: pad,
    contentY: pad,
    contentW: W - 2 * pad,
    contentH: H - 2 * pad,
    rowH: (H - 2 * pad) / rowCount
  };
}

/**
 * Content shapes (border + text). `rowIdx`/`cellIdx` are indices into the
 * template's own arrays.
 */
export function layoutLabel(template, dataRow) {
  const out = [];
  const { label } = template;
  const g = labelGeometry(template);

  out.push({
    kind: 'rect',
    x_mm: 0, y_mm: 0,
    w_mm: g.W, h_mm: g.H,
    rx_mm: label.corner_radius_mm,
    stroke: label.border.width_mm > 0 ? '#000' : 'transparent',
    strokeWidth_mm: label.border.width_mm,
    fill: 'none'
  });

  const rows = template.content.rows ?? [];

  for (const [ri, row] of rows.entries()) {
    const rowTop = g.contentY + g.rowH * ri;
    const rowBottom = rowTop + g.rowH;
    const cellCount = row.cells.length;
    const cellW = g.contentW / cellCount;

    for (const [ci, cell] of row.cells.entries()) {
      const cellLeft = g.contentX + ci * cellW;
      const cellRight = cellLeft + cellW;
      const text = substitute(cell.text, dataRow);
      const sizePt = cell.font_size_pt ?? label.font.size_pt;
      const family = label.font.family;
      const italic = !!cell.italic;
      const bold = !!cell.bold;

      // Per-cell padding shrinks the text box inside the cell, but the
      // cell-area overlay still reflects the full cell. Clamp so padding
      // never inverts the inner width.
      const cellPad = Math.max(0, Math.min(cell.padding_mm ?? 0, cellW / 2));
      const innerLeft = cellLeft + cellPad;
      const innerRight = cellRight - cellPad;
      const innerTop = rowTop + cellPad;
      const innerBottom = rowBottom - cellPad;
      const innerMidY = (innerTop + innerBottom) / 2;
      const innerW = Math.max(0, innerRight - innerLeft);

      let x_mm;
      if (cell.align === 'left')       x_mm = innerLeft;
      else if (cell.align === 'right') x_mm = innerRight;
      else                              x_mm = (innerLeft + innerRight) / 2;

      const valign = cell.valign ?? 'middle';
      const wrap = !!cell.wrap;
      const lines = wrap
        ? wrapToLines(text, innerW, { sizePt, family, italic, bold, maxLines: cell.max_lines })
        : [text];

      const lineHeight_mm = ptToMm(sizePt) * LINE_HEIGHT_FACTOR;
      const blockSpan_mm = (lines.length - 1) * lineHeight_mm;

      let firstY_mm, baseline;
      if (valign === 'top') {
        firstY_mm = innerTop;
        baseline = 'hanging';
      } else if (valign === 'bottom') {
        firstY_mm = innerBottom - blockSpan_mm;
        baseline = 'alphabetic';
      } else {
        firstY_mm = innerMidY - blockSpan_mm / 2;
        baseline = 'middle';
      }

      const shape = {
        kind: 'text',
        x_mm,
        y_mm: firstY_mm,
        align: cell.align,
        family,
        sizePt,
        italic,
        bold,
        baseline,
        rowIdx: ri,
        cellIdx: ci
      };
      if (lines.length > 1) {
        shape.lines = lines;
        shape.lineHeight_mm = lineHeight_mm;
      } else {
        shape.text = lines[0];
      }
      out.push(shape);
    }
  }

  return out;
}

/**
 * Greedy word-wrap to a cell width. Honors explicit '\n' as hard breaks. Falls
 * back to character-level break when a single word exceeds the cell width.
 * When `maxLines` is set and the wrapped output would exceed it, the last
 * allowed line is ellipsized to absorb the overflow.
 *
 * Exported for tests; consumed internally by layoutLabel.
 */
export function wrapToLines(text, cellW_mm, { sizePt, family, italic, bold, maxLines }) {
  const opts = { sizePt, family, italic, bold };
  const cellW_px = mmToPx(cellW_mm);
  if (cellW_px <= 0) return [''];

  const segments = text.split('\n');
  const lines = [];
  for (const segment of segments) {
    const words = segment.split(/\s+/).filter(w => w !== '');
    if (words.length === 0) { lines.push(''); continue; }
    let line = '';
    for (const word of words) {
      const candidate = line === '' ? word : line + ' ' + word;
      if (textWidthPx(candidate, opts) <= cellW_px) {
        line = candidate;
      } else if (line === '') {
        const parts = breakLongWord(word, cellW_px, opts);
        for (let i = 0; i < parts.length - 1; i++) lines.push(parts[i]);
        line = parts[parts.length - 1];
      } else {
        lines.push(line);
        if (textWidthPx(word, opts) <= cellW_px) {
          line = word;
        } else {
          const parts = breakLongWord(word, cellW_px, opts);
          for (let i = 0; i < parts.length - 1; i++) lines.push(parts[i]);
          line = parts[parts.length - 1];
        }
      }
    }
    lines.push(line);
  }

  if (maxLines != null && lines.length > maxLines) {
    const keep = lines.slice(0, maxLines - 1);
    const tail = lines.slice(maxLines - 1).join(' ');
    keep.push(ellipsizeToFit(tail, cellW_px, opts));
    return keep;
  }
  return lines;
}

function textWidthPx(text, opts) {
  if (text === '') return 0;
  return measureText({ ...opts, text }).widthPx;
}

function breakLongWord(word, cellW_px, opts) {
  const out = [];
  let buf = '';
  for (const ch of word) {
    const candidate = buf + ch;
    if (textWidthPx(candidate, opts) > cellW_px && buf !== '') {
      out.push(buf);
      buf = ch;
    } else {
      buf = candidate;
    }
  }
  if (buf !== '') out.push(buf);
  return out.length ? out : [''];
}

function ellipsizeToFit(text, cellW_px, opts) {
  if (textWidthPx(text + ELLIPSIS, opts) <= cellW_px) return text + ELLIPSIS;
  const words = text.split(/\s+/).filter(w => w !== '');
  while (words.length > 0) {
    words.pop();
    const candidate = words.join(' ') + ELLIPSIS;
    if (textWidthPx(candidate, opts) <= cellW_px) return candidate;
  }
  let s = text;
  while (s.length > 0) {
    s = s.slice(0, -1);
    const candidate = s + ELLIPSIS;
    if (textWidthPx(candidate, opts) <= cellW_px) return candidate;
  }
  return ELLIPSIS;
}

/**
 * Editor-mode cell-area overlays: one transparent rect per cell with a faint
 * dashed border, used both as visual structure and click-to-select targets.
 *
 * @param {object} template
 * @param {{kind:string, path:number[]} | null} selection
 */
export function layoutEditorOverlays(template, selection = null) {
  const out = [];
  const g = labelGeometry(template);
  const rows = template.content.rows ?? [];

  const selRow  = selection?.kind === 'cell' ? selection.path[0] : null;
  const selCell = selection?.kind === 'cell' ? selection.path[1] : null;

  for (const [ri, row] of rows.entries()) {
    const rowTop = g.contentY + g.rowH * ri;
    const cellW = g.contentW / row.cells.length;

    for (const [ci] of row.cells.entries()) {
      const cellLeft = g.contentX + ci * cellW;
      const isSelected = ri === selRow && ci === selCell;
      out.push({
        kind: 'cellArea',
        rowIdx: ri,
        cellIdx: ci,
        x_mm: cellLeft,
        y_mm: rowTop,
        w_mm: cellW,
        h_mm: g.rowH,
        selected: isSelected
      });
    }
  }

  return out;
}
