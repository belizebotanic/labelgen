import { describe, test, assertEq } from './runner.js';
import { extract, substitute, listInTemplate } from '../model/placeholders.js';

describe('placeholders.extract', () => {
  test('returns [] for empty string', () => {
    assertEq(extract(''), []);
  });
  test('returns [] for no placeholders', () => {
    assertEq(extract('plain text'), []);
  });
  test('returns single placeholder', () => {
    assertEq(extract('hello {{name}}'), ['name']);
  });
  test('returns multiple unique placeholders', () => {
    assertEq(extract('{{a}} and {{b}} and {{a}}'), ['a', 'b']);
  });
  test('trims whitespace inside braces', () => {
    assertEq(extract('{{ accession }}'), ['accession']);
  });
  test('ignores malformed: single braces', () => {
    assertEq(extract('{not a placeholder}'), []);
  });
  test('handles dot.notation as a single key', () => {
    assertEq(extract('{{tree.id}}'), ['tree.id']);
  });
});

describe('placeholders.substitute', () => {
  test('empty string passes through', () => {
    assertEq(substitute('', { a: 1 }), '');
  });
  test('substitutes a single placeholder', () => {
    assertEq(substitute('hi {{name}}', { name: 'Brett' }), 'hi Brett');
  });
  test('substitutes multiple placeholders', () => {
    assertEq(substitute('{{a}}/{{b}}', { a: 'x', b: 'y' }), 'x/y');
  });
  test('leaves unknown placeholders literal', () => {
    assertEq(substitute('hi {{missing}}', {}), 'hi {{missing}}');
  });
  test('null/undefined row leaves placeholders literal', () => {
    assertEq(substitute('hi {{name}}', null), 'hi {{name}}');
  });
  test('coerces non-strings to string', () => {
    assertEq(substitute('{{n}}', { n: 42 }), '42');
  });
  test('handles whitespace in placeholder name', () => {
    assertEq(substitute('{{ name }}', { name: 'ok' }), 'ok');
  });
});

describe('placeholders.listInTemplate', () => {
  test('collects unique placeholders across all cells', () => {
    const t = {
      content: { bands: [
        { name: 'top',    rows: [{ cells: [{ text: '{{a}}' }, { text: '{{b}}' }] }] },
        { name: 'middle', rows: [{ cells: [{ text: '{{a}} and {{c}}' }] }] }
      ]}
    };
    assertEq(listInTemplate(t), ['a', 'b', 'c']);
  });
  test('returns [] for template with no bands', () => {
    assertEq(listInTemplate({ content: { bands: [] } }), []);
  });
});
