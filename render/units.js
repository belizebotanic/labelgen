// CSS reference resolution: 96 dpi.
// 1 inch = 25.4 mm = 72 pt = 96 px (CSS)
export const DPI = 96;
const MM_PER_INCH = 25.4;
const PT_PER_INCH = 72;

export function mmToPx(mm) { return (mm / MM_PER_INCH) * DPI; }
export function pxToMm(px) { return (px * MM_PER_INCH) / DPI; }
export function ptToPx(pt) { return (pt / PT_PER_INCH) * DPI; }
export function pxToPt(px) { return (px * PT_PER_INCH) / DPI; }
export function mmToPt(mm) { return (mm / MM_PER_INCH) * PT_PER_INCH; }
export function ptToMm(pt) { return (pt / PT_PER_INCH) * MM_PER_INCH; }
