import { describe, test, assertEq, assertTrue } from './runner.js';
import { mmToPx, pxToMm, ptToPx, pxToPt, mmToPt, ptToMm, DPI } from '../render/units.js';

describe('units', () => {
  test('DPI is 96', () => {
    assertEq(DPI, 96);
  });

  test('mmToPx: 25.4mm == 96px (one inch)', () => {
    // 1 inch = 25.4 mm = 96 px (CSS reference)
    const px = mmToPx(25.4);
    assertTrue(Math.abs(px - 96) < 1e-9, `expected ~96, got ${px}`);
  });

  test('mmToPx is the inverse of pxToMm', () => {
    const mm = 37.5;
    assertTrue(Math.abs(pxToMm(mmToPx(mm)) - mm) < 1e-9);
  });

  test('ptToPx: 72pt == 96px (one inch)', () => {
    const px = ptToPx(72);
    assertTrue(Math.abs(px - 96) < 1e-9, `expected ~96, got ${px}`);
  });

  test('ptToPx is the inverse of pxToPt', () => {
    const pt = 14;
    assertTrue(Math.abs(pxToPt(ptToPx(pt)) - pt) < 1e-9);
  });

  test('mmToPt: 25.4mm == 72pt', () => {
    assertTrue(Math.abs(mmToPt(25.4) - 72) < 1e-9);
  });

  test('ptToMm is the inverse of mmToPt', () => {
    const mm = 12.34;
    assertTrue(Math.abs(ptToMm(mmToPt(mm)) - mm) < 1e-9);
  });
});
