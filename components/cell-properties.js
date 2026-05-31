import { LitElement, html, css } from 'lit';
import { store } from '../store.js';

class CellProperties extends LitElement {
  static properties = { state: { type: Object } };

  static styles = css`
    :host { display: block; }
    .panel { background: var(--color-surface); border: var(--border); border-radius: var(--radius-md); padding: var(--space-3); }
    h3 { margin: 0 0 var(--space-2); font-size: var(--font-size-base); }
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
      padding: var(--space-1) var(--space-2);
      border: var(--border);
      border-radius: var(--radius-sm);
      background: var(--color-bg);
      cursor: pointer;
      font: inherit;
      color: var(--color-danger);
    }
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
    return sel.path; // [bandIdx, rowIdx, cellIdx]
  }
  get _cell() {
    const p = this._selectedPath;
    if (!p) return null;
    const [b, r, c] = p;
    return this.state.template.content.bands[b]?.rows[r]?.cells[c] ?? null;
  }

  _patch(patch) {
    const [b, r, c] = this._selectedPath;
    store.actions.setCell(b, r, c, patch);
  }

  _removeCell() {
    const p = this._selectedPath; if (!p) return;
    const [b, r, c] = p;
    const t = this.state.template;
    const cellCount = t.content.bands[b]?.rows[r]?.cells.length ?? 0;
    if (cellCount <= 1) return;
    store.actions.removeCell(b, r, c);
    // Re-target the selection to the cell that now occupies this index
    // (or the last cell, if we removed the rightmost one).
    const newCount = cellCount - 1;
    const newC = Math.min(c, newCount - 1);
    store.actions.setSelection({ kind: 'cell', path: [b, r, newC] });
  }

  _removeRow() {
    const p = this._selectedPath; if (!p) return;
    const [b, r, c] = p;
    const t = this.state.template;
    const rowCount = t.content.bands[b]?.rows.length ?? 0;
    if (rowCount <= 1) return;
    store.actions.removeRow(b, r);
    const newCount = rowCount - 1;
    const newR = Math.min(r, newCount - 1);
    // Cell index might exceed the new row's cell count too; clamp.
    const newRowCells = this.state.template.content.bands[b]?.rows[newR]?.cells.length ?? 1;
    const newC = Math.min(c, newRowCells - 1);
    store.actions.setSelection({ kind: 'cell', path: [b, newR, newC] });
  }

  render() {
    const cell = this._cell;
    if (!cell) {
      return html`<div class="panel"><h3>Cell properties</h3><div class="empty">Click a cell in the preview to edit.</div></div>`;
    }
    const [b, r] = this._selectedPath;
    const t = this.state.template;
    const cellCount = t.content.bands[b]?.rows[r]?.cells.length ?? 0;
    const rowCount  = t.content.bands[b]?.rows.length ?? 0;
    const canRemoveCell = cellCount > 1;
    const canRemoveRow  = rowCount  > 1;
    return html`
      <div class="panel">
        <h3>Cell properties</h3>
        <div class="actions">
          <button ?disabled=${!canRemoveCell}
                  title=${canRemoveCell ? 'Remove this cell' : 'Cannot remove the only cell in a row'}
                  @click=${this._removeCell}>Remove cell</button>
          <button ?disabled=${!canRemoveRow}
                  title=${canRemoveRow ? 'Remove this row' : 'Cannot remove the only row in a band'}
                  @click=${this._removeRow}>Remove row</button>
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
    `;
  }
}
customElements.define('cell-properties', CellProperties);
