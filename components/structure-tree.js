import { LitElement, html, css } from 'lit';
import { store } from '../store.js';

const BAND_ORDER = ['top', 'middle', 'bottom'];
const SNIPPET_LEN = 25;

class StructureTree extends LitElement {
  static properties = { state: { type: Object } };

  static styles = css`
    :host { display: block; }
    .panel {
      background: var(--color-surface);
      border: var(--border);
      border-radius: var(--radius-md);
      padding: var(--space-2);
      font-size: var(--font-size-sm);
    }
    h3 { margin: 0 0 var(--space-2); font-size: var(--font-size-base); padding: 0 var(--space-1); }
    ul { list-style: none; padding: 0; margin: 0; }
    li.band   { margin-top: var(--space-2); }
    li.row    { margin-left: var(--space-3); }
    li.cell   { margin-left: var(--space-4); display: flex; align-items: center; gap: var(--space-1); }
    .label { padding: 2px var(--space-1); border-radius: var(--radius-sm); cursor: pointer; user-select: none; flex: 1; }
    .label:hover { background: var(--color-accent-soft); }
    .label.selected { background: var(--color-accent-soft); border: 1px solid var(--color-accent); }
    .snippet { color: var(--color-text-muted); font-family: var(--font-mono); }
    button.inline {
      padding: 0 var(--space-1);
      border: var(--border);
      border-radius: var(--radius-sm);
      background: var(--color-bg);
      cursor: pointer;
      font-size: 11px;
      line-height: 1.4;
    }
    button.inline:disabled { opacity: 0.4; cursor: not-allowed; }
    button.add-band {
      margin-top: var(--space-2);
      padding: var(--space-1) var(--space-2);
      border: var(--border);
      border-radius: var(--radius-sm);
      background: var(--color-bg);
      cursor: pointer;
      width: 100%;
      font: inherit;
    }
    button.add-band:disabled { opacity: 0.4; cursor: not-allowed; }
    .controls { display: inline-flex; gap: 2px; margin-left: var(--space-1); }
  `;

  _isSelected(kind, path) {
    const sel = this.state.selection;
    if (!sel || sel.kind !== kind) return false;
    if (sel.path.length !== path.length) return false;
    return sel.path.every((v, i) => v === path[i]);
  }
  _select(kind, path) { store.actions.setSelection({ kind, path }); }

  _addRow(bandIdx)            { store.actions.addRow(bandIdx); }
  _removeRow(bandIdx, rowIdx) { store.actions.removeRow(bandIdx, rowIdx); }
  _addCell(bandIdx, rowIdx)   { store.actions.addCell(bandIdx, rowIdx); }
  _removeCell(b, r, c)        { store.actions.removeCell(b, r, c); }

  _addBand() {
    const t = this.state.template;
    const present = new Set(t.content.bands.map(b => b.name));
    const next = BAND_ORDER.find(n => !present.has(n));
    if (!next) return;
    const newBand = { name: next, rows: [{ cells: [{ text: '', align: 'center', italic: false, bold: false }] }] };
    const updated = structuredClone(t);
    updated.content.bands.push(newBand);
    updated.content.bands.sort((a, b) => BAND_ORDER.indexOf(a.name) - BAND_ORDER.indexOf(b.name));
    store.actions.setTemplate(updated);
  }

  _snippet(text) {
    const t = (text ?? '').replace(/\s+/g, ' ').trim();
    if (t.length === 0) return '∅';
    if (t.length <= SNIPPET_LEN) return t;
    return t.slice(0, SNIPPET_LEN - 1) + '…';
  }

  render() {
    const t = this.state.template;
    const bands = t.content.bands;
    const presentBands = new Set(bands.map(b => b.name));
    const canAddBand = presentBands.size < BAND_ORDER.length;

    return html`
      <div class="panel">
        <h3>Structure</h3>
        <ul>
          ${bands.map((band, bi) => html`
            <li class="band">
              <span class="label ${this._isSelected('band', [bi]) ? 'selected' : ''}"
                    @click=${() => this._select('band', [bi])}>
                ${band.name}
                <span class="controls">
                  <button class="inline" title="Add row" @click=${(e) => { e.stopPropagation(); this._addRow(bi); }}>+ row</button>
                </span>
              </span>
              <ul>
                ${band.rows.map((row, ri) => html`
                  <li class="row">
                    <span class="label ${this._isSelected('row', [bi, ri]) ? 'selected' : ''}"
                          @click=${() => this._select('row', [bi, ri])}>
                      row ${ri + 1}
                      <span class="controls">
                        <button class="inline" title="Add cell" @click=${(e) => { e.stopPropagation(); this._addCell(bi, ri); }}>+ cell</button>
                        <button class="inline" ?disabled=${band.rows.length <= 1}
                                @click=${(e) => { e.stopPropagation(); this._removeRow(bi, ri); }}>− row</button>
                      </span>
                    </span>
                    <ul>
                      ${row.cells.map((cell, ci) => html`
                        <li class="cell">
                          <span class="label ${this._isSelected('cell', [bi, ri, ci]) ? 'selected' : ''}"
                                @click=${() => this._select('cell', [bi, ri, ci])}>
                            cell ${ci + 1}: <span class="snippet">${this._snippet(cell.text)}</span>
                          </span>
                          <button class="inline" ?disabled=${row.cells.length <= 1}
                                  @click=${() => this._removeCell(bi, ri, ci)}>−</button>
                        </li>`)}
                    </ul>
                  </li>`)}
              </ul>
            </li>`)}
        </ul>
        <button class="add-band" ?disabled=${!canAddBand} @click=${this._addBand}>+ Add band</button>
      </div>
    `;
  }
}
customElements.define('structure-tree', StructureTree);
