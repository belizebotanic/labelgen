import { substitute } from '../model/placeholders.js';

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
    const rowMidY = rowTop + g.rowH / 2;
    const cellCount = row.cells.length;
    const cellW = g.contentW / cellCount;

    for (const [ci, cell] of row.cells.entries()) {
      const cellLeft = g.contentX + ci * cellW;
      const text = substitute(cell.text, dataRow);
      const sizePt = cell.font_size_pt ?? label.font.size_pt;
      const family = label.font.family;
      const italic = !!cell.italic;
      const bold = !!cell.bold;

      let x_mm;
      if (cell.align === 'left')       x_mm = cellLeft;
      else if (cell.align === 'right') x_mm = cellLeft + cellW;
      else                              x_mm = cellLeft + cellW / 2;

      out.push({
        kind: 'text',
        x_mm,
        y_mm: rowMidY,
        text,
        align: cell.align,
        family,
        sizePt,
        italic,
        bold,
        baseline: 'middle',
        rowIdx: ri,
        cellIdx: ci
      });
    }
  }

  return out;
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
