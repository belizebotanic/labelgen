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

  render() {
    const cell = this._cell;
    if (!cell) {
      return html`<div class="panel"><h3>Cell properties</h3><div class="empty">Click a cell in the preview to edit.</div></div>`;
    }
    return html`
      <div class="panel">
        <h3>Cell properties</h3>
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
