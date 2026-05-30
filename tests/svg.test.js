import { describe, test, assertEq, assertTrue } from './runner.js';
import * as T from '../model/template.js';
import { renderLabel, renderSheet, renderLabelToString } from '../render/svg.js';

describe('svg.renderLabel', () => {
  test('returns an SVGSVGElement', () => {
    const el = renderLabel(T.create(), null);
    assertTrue(el instanceof SVGSVGElement, el.constructor.name);
  });
  test('viewBox matches the label dimensions', () => {
    const t = T.create();
    const el = renderLabel(t, null);
    const vb = el.getAttribute('viewBox');
    assertEq(vb, `0 0 ${t.label.width_mm} ${t.label.height_mm}`);
  });
});

describe('svg.renderLabelToString', () => {
  test('is a non-empty string starting with <svg', () => {
    const s = renderLabelToString(T.create(), null);
    assertTrue(typeof s === 'string' && s.startsWith('<svg'), s.slice(0, 30));
  });
  test('does not contain <script> or javascript:', () => {
    const t = T.setCell(T.create(), 0, 0, 0, { text: '<script>alert(1)</script>' });
    const s = renderLabelToString(t, null);
    assertTrue(!s.toLowerCase().includes('<script'), 'leaked <script tag');
    assertTrue(!s.toLowerCase().includes('javascript:'), 'leaked javascript:');
  });
});

describe('svg.renderSheet', () => {
  test('returns an SVGSVGElement with sheet dimensions', () => {
    const t = T.create();
    const el = renderSheet(t, []);
    assertTrue(el instanceof SVGSVGElement);
    const vb = el.getAttribute('viewBox');
    assertEq(vb, `0 0 ${t.sheet.width_mm} ${t.sheet.height_mm}`);
  });
});
