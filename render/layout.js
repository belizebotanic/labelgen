import { measureText } from './measure.js';
import { pxToMm, ptToMm } from './units.js';
import { substitute } from '../model/placeholders.js';

const BAND_ORDER = { top: 0, middle: 1, bottom: 2 };

/**
 * @returns {Array<
 *   {kind:'rect',  x_mm:number,y_mm:number,w_mm:number,h_mm:number, stroke:string, fill:string, rx_mm:number}
 * | {kind:'text', x_mm:number,y_mm:number, text:string, align:'left'|'center'|'right', family:string, sizePt:number, italic:boolean, bold:boolean, baseline:'top'|'middle'|'bottom', bandIdx:number, rowIdx:number, cellIdx:number}
 * >}
 */
export function layoutLabel(template, row) {
  const out = [];
  const { label } = template;
  const W = label.width_mm;
  const H = label.height_mm;
  const pad = label.padding_mm;

  // Outer border rectangle (used by the renderer; we always emit it so the
  // editor can visualize the bounds, even when border.width_mm === 0).
  out.push({
    kind: 'rect',
    x_mm: 0, y_mm: 0,
    w_mm: W, h_mm: H,
    rx_mm: label.corner_radius_mm,
    stroke: label.border.width_mm > 0 ? '#000' : 'transparent',
    strokeWidth_mm: label.border.width_mm,
    fill: 'none'
  });

  const contentX = pad;
  const contentY = pad;
  const contentW = W - 2 * pad;
  const contentH = H - 2 * pad;

  // Pre-sort bands by canonical order so the visual stacking respects top→bottom
  // regardless of the array's order in the template.
  const bands = [...(template.content.bands ?? [])].sort(
    (a, b) => (BAND_ORDER[a.name] ?? 9) - (BAND_ORDER[b.name] ?? 9)
  );

  // Each band gets contentH / 3 vertical space.
  const bandH = contentH / 3;
  const bandPositions = { top: 0, middle: 1, bottom: 2 };

  for (const [bandIdx, band] of bands.entries()) {
    const bandTop = contentY + bandH * bandPositions[band.name];
    const bandBottom = bandTop + bandH;
    const rowCount = band.rows.length;
    const rowH = bandH / rowCount;

    for (const [ri, row_] of band.rows.entries()) {
      const rowTop = bandTop + ri * rowH;
      const rowMidY = rowTop + rowH / 2;
      const cellCount = row_.cells.length;
      const cellW = contentW / cellCount;

      for (const [ci, cell] of row_.cells.entries()) {
        const cellLeft = contentX + ci * cellW;
        const text = substitute(cell.text, row);
        const sizePt = cell.font_size_pt ?? label.font.size_pt;
        const family = label.font.family;
        const italic = !!cell.italic;
        const bold = !!cell.bold;

        // Anchor point depends on alignment.
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
          bandIdx,
          rowIdx: ri,
          cellIdx: ci
        });
      }
    }
  }

  return out;
}
