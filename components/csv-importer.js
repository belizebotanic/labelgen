import { LitElement, html, css } from 'lit';
import Papa from 'papaparse';
import { store } from '../store.js';

class CsvImporter extends LitElement {
  static properties = { state: { type: Object }, _error: { state: true } };
  constructor() { super(); this._error = ''; }

  static styles = css`
    :host { display: block; }
    .panel { background: var(--color-surface); border: var(--border); border-radius: var(--radius-md); padding: var(--space-3); }
    h3 { margin: 0 0 var(--space-2); font-size: var(--font-size-base); }
    .controls { display: flex; gap: var(--space-2); margin-bottom: var(--space-2); align-items: center; }
    button, label.file-btn { padding: var(--space-1) var(--space-2); border: var(--border); border-radius: var(--radius-sm); background: var(--color-bg); cursor: pointer; font: inherit; }
    label.file-btn input { display: none; }
    textarea { width: 100%; min-height: 80px; padding: var(--space-2); border: var(--border); border-radius: var(--radius-sm); font-family: var(--font-mono); font-size: var(--font-size-sm); }
    .banner { background: var(--color-accent-soft); border: 1px solid var(--color-accent); border-radius: var(--radius-sm); padding: var(--space-2); margin-bottom: var(--space-2); font-size: var(--font-size-sm); display: flex; justify-content: space-between; align-items: center; }
    table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
    th, td { border: var(--border); padding: var(--space-1) var(--space-2); text-align: left; }
    tr.active { background: var(--color-accent-soft); }
    tr { cursor: pointer; }
    .error { color: var(--color-danger); font-size: var(--font-size-sm); margin-top: var(--space-1); }
  `;

  _parseText(text) {
    try {
      const r = Papa.parse(text, { header: true, skipEmptyLines: true });
      if (r.errors && r.errors.length) {
        this._error = r.errors.map(e => e.message).join('; ');
      } else {
        this._error = '';
      }
      store.actions.setCsvRows(r.data, null);
    } catch (e) {
      this._error = e.message;
    }
  }

  async _onFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    this._parseText(text);
  }

  _onPaste(e) {
    this._parseText(e.target.value);
  }

  _clear() {
    store.actions.setCsvRows(null, null);
    this._error = '';
  }

  _selectRow(i) { store.actions.setActiveRowIdx(i); }

  render() {
    const { csvRows, activeRowIdx, dataUrl } = this.state;
    return html`
      <div class="panel">
        <h3>CSV data</h3>
        ${dataUrl ? html`
          <div class="banner">
            <span>Loaded ${csvRows?.length ?? 0} rows from ${new URL(dataUrl).hostname}</span>
            <button @click=${this._clear}>Replace</button>
          </div>
        ` : ''}
        ${!csvRows ? html`
          <div class="controls">
            <label class="file-btn">Upload .csv
              <input type="file" accept=".csv,text/csv" @change=${this._onFile}>
            </label>
            <span style="color: var(--color-text-muted); font-size: var(--font-size-sm);">or paste below</span>
          </div>
          <textarea placeholder="paste CSV here..." @change=${this._onPaste}></textarea>
        ` : html`
          <div class="controls">
            <button @click=${this._clear}>Clear CSV</button>
          </div>
          <table>
            <thead>
              <tr>${Object.keys(csvRows[0] ?? {}).map(k => html`<th>${k}</th>`)}</tr>
            </thead>
            <tbody>
              ${csvRows.map((r, i) => html`
                <tr class=${i === activeRowIdx ? 'active' : ''} @click=${() => this._selectRow(i)}>
                  ${Object.values(r).map(v => html`<td>${v}</td>`)}
                </tr>`)}
            </tbody>
          </table>
        `}
        ${this._error ? html`<div class="error">${this._error}</div>` : ''}
      </div>
    `;
  }
}
customElements.define('csv-importer', CsvImporter);
