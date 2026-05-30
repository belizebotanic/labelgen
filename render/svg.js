import { layoutLabel } from './layout.js';
import { ptToMm } from './units.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function renderLabel(template, row) {
  const W = template.label.width_mm;
  const H = template.label.height_mm;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', `${W}mm`);
  svg.setAttribute('height', `${H}mm`);
  for (const shape of layoutLabel(template, row)) {
    svg.appendChild(shapeToNode(shape));
  }
  return svg;
}

export function renderLabelToString(template, row) {
  return new XMLSerializer().serializeToString(renderLabel(template, row));
}

export function renderSheet(template, rows) {
  const SW = template.sheet.width_mm;
  const SH = template.sheet.height_mm;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('viewBox', `0 0 ${SW} ${SH}`);
  svg.setAttribute('width', `${SW}mm`);
  svg.setAttribute('height', `${SH}mm`);

  const { margin_mm: M, gutter_mm: G, rows: R, cols: C } = template.sheet;
  const labelW = template.label.width_mm;
  const labelH = template.label.height_mm;

  let idx = 0;
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const x = M + c * (labelW + G);
      const y = M + r * (labelH + G);
      const row = rows[idx++] ?? null;
      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('transform', `translate(${x},${y})`);
      for (const shape of layoutLabel(template, row)) {
        g.appendChild(shapeToNode(shape));
      }
      svg.appendChild(g);
    }
  }
  return svg;
}

export function renderSheetToString(template, rows) {
  return new XMLSerializer().serializeToString(renderSheet(template, rows));
}

// ---------- shape → DOM ----------

function shapeToNode(s) {
  if (s.kind === 'rect') return rectNode(s);
  if (s.kind === 'text') return textNode(s);
  // unknown shapes are skipped silently (forward compat)
  return document.createDocumentFragment();
}

function rectNode(s) {
  const r = document.createElementNS(SVG_NS, 'rect');
  r.setAttribute('x', s.x_mm);
  r.setAttribute('y', s.y_mm);
  r.setAttribute('width', s.w_mm);
  r.setAttribute('height', s.h_mm);
  if (s.rx_mm) r.setAttribute('rx', s.rx_mm);
  r.setAttribute('fill', s.fill ?? 'none');
  r.setAttribute('stroke', s.stroke ?? 'none');
  if (s.strokeWidth_mm) r.setAttribute('stroke-width', s.strokeWidth_mm);
  return r;
}

function textNode(s) {
  const t = document.createElementNS(SVG_NS, 'text');
  t.setAttribute('x', s.x_mm);
  t.setAttribute('y', s.y_mm);
  t.setAttribute('font-family', s.family);
  // Font size in user-units; viewBox is in mm so we convert pt → mm.
  t.setAttribute('font-size', ptToMm(s.sizePt));
  t.setAttribute('fill', '#000');
  if (s.italic) t.setAttribute('font-style', 'italic');
  if (s.bold)   t.setAttribute('font-weight', '700');
  if (s.align === 'left')        t.setAttribute('text-anchor', 'start');
  else if (s.align === 'right')  t.setAttribute('text-anchor', 'end');
  else                            t.setAttribute('text-anchor', 'middle');
  t.setAttribute('dominant-baseline', s.baseline === 'middle' ? 'central' : s.baseline);
  // SAFETY: textContent escapes user input; never assign innerHTML.
  t.textContent = s.text;
  return t;
}
