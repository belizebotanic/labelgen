import { ptToPx } from './units.js';

let ctxCache = null;

function getCtx() {
  if (ctxCache) return ctxCache;
  const canvas = (typeof OffscreenCanvas !== 'undefined')
    ? new OffscreenCanvas(1, 1)
    : document.createElement('canvas');
  ctxCache = canvas.getContext('2d');
  return ctxCache;
}

/**
 * @param {{family:string, sizePt:number, italic:boolean, bold:boolean, text:string}} opts
 * @returns {{widthPx:number, ascentPx:number, descentPx:number}}
 */
export function measureText({ family, sizePt, italic, bold, text }) {
  const ctx = getCtx();
  const sizePx = ptToPx(sizePt);
  const style = italic ? 'italic' : 'normal';
  const weight = bold ? '700' : '400';
  // Canvas font shorthand: <style> <weight> <size>px <family>
  ctx.font = `${style} ${weight} ${sizePx}px ${quoteFamily(family)}`;
  const m = ctx.measureText(text);
  // actualBoundingBox* values are widely supported; fall back to font metrics if missing.
  const ascent = m.actualBoundingBoxAscent  ?? (sizePx * 0.8);
  const descent = m.actualBoundingBoxDescent ?? (sizePx * 0.2);
  return { widthPx: m.width, ascentPx: ascent, descentPx: descent };
}

function quoteFamily(name) {
  // Quote multi-word names; pass-through CSS generics ("sans-serif" etc.).
  if (/^[a-z\-]+$/i.test(name)) return name;
  return `"${name.replace(/"/g, '\\"')}"`;
}
