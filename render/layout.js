import { substitute } from '../model/placeholders.js';

const BAND_POSITIONS = { top: 0, middle: 1, bottom: 2 };

/**
 * Geometry helpers — used by both the content layout and the editor overlays so
 * both stay aligned to the same coordinate system.
 */
function labelGeometry(template) {
  const { label } = template;
  const W = label.width_mm;
  const H = label.height_mm;
  const pad = label.padding_mm;
  return {
    W, H, pad,
    contentX: pad,
    contentY: pad,
    contentW: W - 2 * pad,
    contentH: H - 2 * pad,
    bandH: (H - 2 * pad) / 3
  };
}

function bandTopY(template, band) {
  const g = labelGeometry(template);
  return g.contentY + g.bandH * (BAND_POSITIONS[band.name] ?? 0);
}

/**
 * Content shapes (border + text). `bandIdx`/`rowIdx`/`cellIdx` are indices into
 * the template's own arrays, so the editor can act on them directly.
 */
export function layoutLabel(template, row) {
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

  const bands = template.content.bands ?? [];

  for (const [bandIdx, band] of bands.entries()) {
    const bandTop = bandTopY(template, band);
    const rowH = g.bandH / band.rows.length;

    for (const [ri, row_] of band.rows.entries()) {
      const rowTop = bandTop + ri * rowH;
      const rowMidY = rowTop + rowH / 2;
      const cellCount = row_.cells.length;
      const cellW = g.contentW / cellCount;

      for (const [ci, cell] of row_.cells.entries()) {
        const cellLeft = g.contentX + ci * cellW;
        const text = substitute(cell.text, row);
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
          bandIdx,
          rowIdx: ri,
          cellIdx: ci
        });
      }
    }
  }

  return out;
}

/**
 * Editor-only "hit zones" — invisible (until hovered) overlays the user can
 * click to insert rows/cells at a specific position.
 *
 * Emitted shapes:
 *   { kind:'hit', action:'insertRow'|'insertCell', bandIdx, rowIdx?, atIdx,
 *     x_mm, y_mm, w_mm, h_mm }
 *
 * For each row we emit two row-insert hit zones (above and below). For each
 * cell we emit two cell-insert hit zones (before and after). Adjacent rows /
 * cells produce hit zones at the same boundary with the same `atIdx`; they
 * overlap visually but click the same action, so duplication is harmless.
 */
/**
 * Editor-mode cell-area overlays: a transparent rect per cell with a faint
 * dashed border, used both for visual structure and as click-to-select hit
 * targets. The selected cell is marked so the renderer can style it differently.
 *
 * @param {object} template
 * @param {{kind:string, path:number[]} | null} selection
 */
export function layoutEditorOverlays(template, selection = null) {
  const out = [];
  const g = labelGeometry(template);
  const bands = template.content.bands ?? [];

  const selBand = selection?.kind === 'cell' ? selection.path[0] : null;
  const selRow  = selection?.kind === 'cell' ? selection.path[1] : null;
  const selCell = selection?.kind === 'cell' ? selection.path[2] : null;

  for (const [bandIdx, band] of bands.entries()) {
    const bandTop = bandTopY(template, band);
    const rowH = g.bandH / band.rows.length;

    for (const [ri, row_] of band.rows.entries()) {
      const rowTop = bandTop + ri * rowH;
      const cellW = g.contentW / row_.cells.length;

      for (const [ci] of row_.cells.entries()) {
        const cellLeft = g.contentX + ci * cellW;
        const isSelected = bandIdx === selBand && ri === selRow && ci === selCell;
        out.push({
          kind: 'cellArea',
          bandIdx,
          rowIdx: ri,
          cellIdx: ci,
          x_mm: cellLeft,
          y_mm: rowTop,
          w_mm: cellW,
          h_mm: rowH,
          selected: isSelected
        });
      }
    }
  }

  return out;
}
