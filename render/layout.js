import { substitute } from '../model/placeholders.js';

const BAND_POSITIONS = { top: 0, middle: 1, bottom: 2 };

// Hit zone thickness in mm for "+ row" / "+ cell" affordances.
const HIT_ZONE_MM = 3;

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
function isTopmostBand(template, band) {
  const me = BAND_POSITIONS[band.name];
  return template.content.bands.every(b => (BAND_POSITIONS[b.name] ?? 0) >= me);
}
function isBottommostBand(template, band) {
  const me = BAND_POSITIONS[band.name];
  return template.content.bands.every(b => (BAND_POSITIONS[b.name] ?? 0) <= me);
}

export function layoutEditorOverlays(template) {
  const out = [];
  const g = labelGeometry(template);
  const bands = template.content.bands ?? [];

  for (const [bandIdx, band] of bands.entries()) {
    const bandTop = bandTopY(template, band);
    const rowH = g.bandH / band.rows.length;
    const lastRowIdx = band.rows.length - 1;

    for (const [ri, row_] of band.rows.entries()) {
      const rowTop = bandTop + ri * rowH;
      const rowBottom = rowTop + rowH;
      const cellCount = row_.cells.length;
      const cellW = g.contentW / cellCount;
      const lastCellIdx = cellCount - 1;

      // ---- Row hit zones (span full label width) ----

      // "+ Row above" at atIdx = ri. If this is the first row of the topmost
      // band, the zone extends up to the label's top edge.
      const aboveExtend = ri === 0 && isTopmostBand(template, band);
      const aboveTopY = aboveExtend ? 0 : rowTop - HIT_ZONE_MM / 2;
      const aboveBotY = rowTop + HIT_ZONE_MM / 2;
      out.push({
        kind: 'hit',
        action: 'insertRow',
        bandIdx,
        atIdx: ri,
        x_mm: 0,
        y_mm: aboveTopY,
        w_mm: g.W,
        h_mm: aboveBotY - aboveTopY
      });

      // "+ Row below" at atIdx = ri+1. If this is the last row of the
      // bottommost band, the zone extends down to the label's bottom edge.
      const belowExtend = ri === lastRowIdx && isBottommostBand(template, band);
      const belowTopY = rowBottom - HIT_ZONE_MM / 2;
      const belowBotY = belowExtend ? g.H : rowBottom + HIT_ZONE_MM / 2;
      out.push({
        kind: 'hit',
        action: 'insertRow',
        bandIdx,
        atIdx: ri + 1,
        x_mm: 0,
        y_mm: belowTopY,
        w_mm: g.W,
        h_mm: belowBotY - belowTopY
      });

      // ---- Cell hit zones (span row height; outermost extend to label edge) ----

      for (const [ci] of row_.cells.entries()) {
        const cellLeft = g.contentX + ci * cellW;
        const cellRight = cellLeft + cellW;

        // "+ Cell before" at atIdx = ci
        const beforeExtend = ci === 0;
        const beforeLeftX  = beforeExtend ? 0 : cellLeft - HIT_ZONE_MM / 2;
        const beforeRightX = cellLeft + HIT_ZONE_MM / 2;
        out.push({
          kind: 'hit',
          action: 'insertCell',
          bandIdx,
          rowIdx: ri,
          atIdx: ci,
          x_mm: beforeLeftX,
          y_mm: rowTop,
          w_mm: beforeRightX - beforeLeftX,
          h_mm: rowH
        });

        // "+ Cell after" at atIdx = ci+1
        const afterExtend = ci === lastCellIdx;
        const afterLeftX  = cellRight - HIT_ZONE_MM / 2;
        const afterRightX = afterExtend ? g.W : cellRight + HIT_ZONE_MM / 2;
        out.push({
          kind: 'hit',
          action: 'insertCell',
          bandIdx,
          rowIdx: ri,
          atIdx: ci + 1,
          x_mm: afterLeftX,
          y_mm: rowTop,
          w_mm: afterRightX - afterLeftX,
          h_mm: rowH
        });
      }
    }
  }

  return out;
}
