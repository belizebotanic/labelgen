import { LitElement, html, css } from 'lit';
import { store } from '../store.js';
import { iconTrash, iconChevronDown } from './icons.js';

class CellProperties extends LitElement {
  static properties = { state: { type: Object } };

  static styles = css`
    :host { display: block; }
    * { box-sizing: border-box; }
    details {
      background: var(--color-surface);
      border: var(--border);
      border-radius: var(--radius-md);
    }
    summary {
      padding: var(--space-2) var(--space-3);
      cursor: pointer;
      list-style: none;
      display: flex; align-items: center; gap: var(--space-2);
      user-select: none;
    }
    summary::-webkit-details-marker { display: none; }
    summary h3 { margin: 0; font-size: var(--font-size-base); flex: 1; }
    summary .chev { transition: transform 120ms ease-out; color: var(--color-text-muted); display: inline-flex; }
    details:not([open]) summary .chev { transform: rotate(-90deg); }
    .body { padding: 0 var(--space-3) var(--space-3); }

    .row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); margin-bottom: var(--space-1); align-items: center; }
    .full { grid-column: 1 / -1; }
    label { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    input, select, textarea { width: 100%; padding: var(--space-1) var(--space-2); border: var(--border); border-radius: var(--radius-sm); font: inherit; }
    textarea { font-family: var(--font-mono); min-height: 60px; resize: vertical; }
    .empty { color: var(--color-text-muted); font-size: var(--font-size-sm); }
    .actions {
      display: flex;
      gap: var(--space-2);
      margin-bottom: var(--space-3);
    }
    .actions button {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-1);
      padding: var(--space-1) var(--space-2);
      border: var(--border);
      border-radius: var(--radius-sm);
      background: var(--color-bg);
      cursor: pointer;
      font: inherit;
      color: var(--color-danger);
    }
    .actions button svg { flex: none; }
    .actions button:not(:disabled):hover {
      background: color-mix(in srgb, var(--color-danger) 8%, var(--color-bg));
      border-color: var(--color-danger);
    }
    .actions button:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      color: var(--color-text-muted);
    }
  `;

  get _selectedPath() {
    const sel = this.state.selection;
    if (!sel || sel.kind !== 'cell') return null;
    return sel.path; // [rowIdx, cellIdx]
  }
  get _cell() {
    const p = this._selectedPath;
    if (!p) return null;
    const [r, c] = p;
    return this.state.template.content.rows[r]?.cells[c] ?? null;
  }

  _patch(patch) {
    const [r, c] = this._selectedPath;
    store.actions.setCell(r, c, patch);
  }

  _removeCell() {
    const p = this._selectedPath; if (!p) return;
    const [r, c] = p;
    const t = this.state.template;
    const cellCount = t.content.rows[r]?.cells.length ?? 0;
    if (cellCount <= 1) return;
    store.actions.removeCell(r, c);
    const newCount = cellCount - 1;
    const newC = Math.min(c, newCount - 1);
    store.actions.setSelection({ kind: 'cell', path: [r, newC] });
  }

  _removeRow() {
    const p = this._selectedPath; if (!p) return;
    const [r, c] = p;
    const t = this.state.template;
    const rowCount = t.content.rows.length;
    if (rowCount <= 1) return;
    store.actions.removeRow(r);
    const newCount = rowCount - 1;
    const newR = Math.min(r, newCount - 1);
    const newRowCells = this.state.template.content.rows[newR]?.cells.length ?? 1;
    const newC = Math.min(c, newRowCells - 1);
    store.actions.setSelection({ kind: 'cell', path: [newR, newC] });
  }

  render() {
    const cell = this._cell;
    const summary = html`<summary><h3>Cell properties</h3><span class="chev">${iconChevronDown}</span></summary>`;
    if (!cell) {
      return html`
        <details open>
          ${summary}
          <div class="body"><div class="empty">Click a cell in the preview to edit.</div></div>
        </details>
      `;
    }
    const [r] = this._selectedPath;
    const t = this.state.template;
    const cellCount = t.content.rows[r]?.cells.length ?? 0;
    const rowCount  = t.content.rows.length;
    const canRemoveCell = cellCount > 1;
    const canRemoveRow  = rowCount  > 1;
    return html`
      <details open>
        ${summary}
        <div class="body">
          <div class="actions">
            <button ?disabled=${!canRemoveCell}
                    title=${canRemoveCell ? 'Remove this cell' : 'Cannot remove the only cell in a row'}
                    @click=${this._removeCell}>${iconTrash}<span>Cell</span></button>
            <button ?disabled=${!canRemoveRow}
                    title=${canRemoveRow ? 'Remove this row' : 'Cannot remove the only row'}
                    @click=${this._removeRow}>${iconTrash}<span>Row</span></button>
          </div>
          <div class="row full"><label>Text (supports {{placeholders}})</label></div>
          <div class="row full"><textarea .value=${cell.text} @input=${(e) => this._patch({ text: e.target.value })}></textarea></div>
          <div class="row">
            <label>Align</label>
            <select .value=${cell.align} @change=${(e) => this._patch({ align: e.target.value })}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
          <div class="row">
            <label>Italic</label>
            <input type="checkbox" .checked=${cell.italic} @change=${(e) => this._patch({ italic: e.target.checked })}>
          </div>
          <div class="row">
            <label>Bold</label>
            <input type="checkbox" .checked=${cell.bold} @change=${(e) => this._patch({ bold: e.target.checked })}>
          </div>
          <div class="row">
            <label>Font size override (pt)</label>
            <input type="number" min="1" .value=${cell.font_size_pt ?? ''}
                   @change=${(e) => {
                     const v = parseFloat(e.target.value);
                     this._patch({ font_size_pt: Number.isFinite(v) ? v : undefined });
                   }}>
          </div>
        </div>
      </details>
    `;
  }
}
customElements.define('cell-properties', CellProperties);
