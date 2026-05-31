import { LitElement, html, css } from 'lit';
import Papa from 'papaparse';
import { store, defaultCsvRows } from '../store.js';
import { iconChevronDown, iconTrash, iconFolderOpen } from './icons.js';

/**
 * CSV data panel: collapsible, with a Table | Text mode toggle and an
 * Upload .csv button. Both views are editable; switching modes flushes
 * the current mode's pending edits into the canonical csvRows.
 *
 * Columns are tracked in component state so that deleting all rows
 * doesn't lose the column definition.
 */
class CsvImporter extends LitElement {
  static properties = {
    state: { type: Object },
    _viewMode: { state: true },     // 'table' | 'text'
    _error: { state: true },
    _textBuffer: { state: true },   // editable text in Text mode
    _columns: { state: true }       // [string] header order (kept across delete-all)
  };

  constructor() {
    super();
    this._viewMode = 'table';
    this._error = '';
    this._textBuffer = '';
    this._columns = [];
  }

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

    .toolbar {
      display: flex;
      gap: var(--space-2);
      align-items: center;
      margin-bottom: var(--space-2);
      flex-wrap: wrap;
    }
    .mode-toggle {
      display: inline-flex;
      border: var(--border);
      border-radius: var(--radius-sm);
      overflow: hidden;
    }
    .mode-toggle button {
      padding: var(--space-1) var(--space-3);
      border: 0;
      background: var(--color-bg);
      cursor: pointer;
      font: inherit;
      font-size: var(--font-size-sm);
      color: var(--color-text);
    }
    .mode-toggle button + button { border-left: var(--border); }
    .mode-toggle button[aria-pressed="true"] {
      background: var(--color-accent-soft);
      color: var(--color-accent);
    }
    .upload-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-1) var(--space-2);
      border: var(--border);
      border-radius: var(--radius-sm);
      background: var(--color-bg);
      cursor: pointer;
      font: inherit;
      font-size: var(--font-size-sm);
      margin-left: auto;
    }
    .upload-btn:hover { background: var(--color-accent-soft); border-color: var(--color-accent); }
    .upload-btn input { display: none; }

    .add-btn, .clear-btn {
      padding: var(--space-1) var(--space-2);
      border: var(--border);
      border-radius: var(--radius-sm);
      background: var(--color-bg);
      cursor: pointer;
      font: inherit;
      font-size: var(--font-size-sm);
    }
    .add-btn:hover { background: var(--color-accent-soft); border-color: var(--color-accent); }
    .clear-btn { color: var(--color-danger); }
    .clear-btn:hover { background: color-mix(in srgb, var(--color-danger) 8%, var(--color-bg)); border-color: var(--color-danger); }

    .banner {
      background: var(--color-accent-soft);
      border: 1px solid var(--color-accent);
      border-radius: var(--radius-sm);
      padding: var(--space-2);
      margin-bottom: var(--space-2);
      font-size: var(--font-size-sm);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-2);
    }

    .table-wrap {
      max-height: 280px;
      overflow: auto;
      background: transparent;
    }
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: var(--font-size-sm);
    }
    thead { position: sticky; top: 0; z-index: 1; background: var(--color-surface); }
    th {
      padding: var(--space-1) var(--space-2);
      text-align: left;
      font-weight: 600;
      background: var(--color-bg);
      border-top: var(--border);
      border-bottom: var(--border);
    }
    /* First / last data columns in the header get a side border so the
       header reads as a bordered block flanked by the action gutters. */
    thead th:nth-child(2) { border-left: var(--border); }
    thead th:nth-last-child(2) { border-right: var(--border); }
    /* Action columns blend with the surrounding card chrome — they read as
       "outside" the data table so the row-delete trash can't be confused with
       a cell-level action. */
    th.col-actions {
      background: var(--color-surface);
      border-top: 0;
      border-bottom: 0;
      border-left: 0;
      border-right: 0;
      width: 32px;
    }
    th input {
      flex: 1;
      padding: 2px var(--space-1);
      border: 1px dashed transparent;
      border-radius: var(--radius-sm);
      background: transparent;
      font: inherit;
      font-weight: 600;
      min-width: 0;
    }
    th input:hover { border-color: var(--color-border); }
    th input:focus { outline: none; border-color: var(--color-accent); background: var(--color-bg); }
    th .col-head { display: flex; align-items: center; gap: 2px; }
    td {
      padding: 0;
      background: var(--color-bg);
      border-bottom: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);
      border-right: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);
    }
    /* Vertical separators between data columns in the header too. */
    thead th { border-right: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent); }
    thead th.col-actions { border-right: 0; }
    td:first-of-type, td:last-child { background: var(--color-surface); }
    td.row-actions {
      width: 32px;
      background: var(--color-surface);
      border-bottom: 0;
      border-right: 0;
      text-align: center;
    }
    tbody tr:last-child td { border-bottom: var(--border); }
    tbody tr:last-child td.row-actions { border-bottom: 0; }
    /* Outer data-cell borders */
    tbody td:nth-child(2) { border-left: var(--border); }
    tbody td:nth-last-child(2) { border-right: var(--border); }

    td input {
      width: 100%;
      padding: var(--space-1) var(--space-2);
      border: 0;
      background: transparent;
      font: inherit;
    }
    td input:focus { outline: 1px solid var(--color-accent); outline-offset: -1px; }
    tr.active td { background: var(--color-accent-soft); }
    /* Don't tint the action columns when the row is active. */
    tr.active td.row-actions { background: var(--color-surface); }
    tr.active td:nth-child(2) { box-shadow: inset 3px 0 0 var(--color-accent); }
    .icon-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 24px; height: 24px;
      border: 0;
      background: transparent;
      cursor: pointer;
      color: var(--color-text-muted);
      border-radius: var(--radius-sm);
    }
    .icon-btn:hover { color: var(--color-danger); background: color-mix(in srgb, var(--color-danger) 8%, transparent); }

    textarea {
      width: 100%;
      min-height: 120px;
      max-height: 280px;
      padding: var(--space-2);
      border: var(--border);
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
      font-size: var(--font-size-sm);
      resize: vertical;
    }
    .empty {
      color: var(--color-text-muted);
      font-size: var(--font-size-sm);
      padding: var(--space-2) 0;
    }
    .error {
      color: var(--color-danger);
      font-size: var(--font-size-sm);
      margin-top: var(--space-1);
    }
  `;

  // ---------------- Data <-> view helpers ----------------

  _rowsToText(rows, cols) {
    const hasCols = cols && cols.length;
    const hasRows = rows && rows.length;
    if (!hasCols && !hasRows) return '';
    if (!hasRows) {
      // Columns only: emit a single header line, no data rows.
      return cols.map(c => /[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c).join(',');
    }
    return Papa.unparse(rows, { columns: cols && cols.length ? cols : undefined });
  }

  _parseText(text) {
    const r = Papa.parse(text, { header: true, skipEmptyLines: true });
    if (r.errors && r.errors.length) {
      this._error = r.errors.map(e => e.message).join('; ');
    } else {
      this._error = '';
    }
    const cols = r.meta?.fields ?? [];
    store.actions.setCsvRows(r.data, this.state.dataUrl ?? null);
    this._columns = cols;
  }

  // ---------------- Toolbar actions ----------------

  _setMode(mode) {
    if (mode === this._viewMode) return;
    // Flushing direction: when leaving Text mode, parse the text buffer.
    if (this._viewMode === 'text') {
      this._parseText(this._textBuffer);
    }
    this._viewMode = mode;
    if (mode === 'text') {
      // Entering Text mode: serialize current rows into the buffer.
      this._textBuffer = this._rowsToText(this.state.csvRows ?? [], this._effectiveColumns());
    }
  }

  async _onFile(e) {
    const file = e.target.files[0];
    if (!file) { return; }
    const text = await file.text();
    this._parseText(text);
    if (this._viewMode === 'text') this._textBuffer = text;
    e.target.value = '';
  }

  _onClear() {
    const rows = defaultCsvRows();
    store.actions.setCsvRows(rows, null);
    this._columns = Object.keys(rows[0]);
    this._textBuffer = '';
    this._error = '';
  }

  // ---------------- Text-mode handlers ----------------

  _onTextInput(e) {
    this._textBuffer = e.target.value;
  }
  _onTextBlur() {
    this._parseText(this._textBuffer);
  }

  // ---------------- Table-mode handlers ----------------

  _effectiveColumns() {
    if (this._columns && this._columns.length) return this._columns;
    const r = this.state.csvRows;
    if (r && r.length) return Object.keys(r[0]);
    return [];
  }

  _ensureColumnsCaptured() {
    if (this._columns.length === 0) {
      const r = this.state.csvRows;
      if (r && r.length) this._columns = Object.keys(r[0]);
    }
  }

  _setCell(rowIdx, key, value) {
    const rows = (this.state.csvRows ?? []).map((r, i) => i === rowIdx ? { ...r, [key]: value } : r);
    store.actions.setCsvRows(rows, this.state.dataUrl ?? null);
  }

  _renameColumn(oldKey, newKey) {
    newKey = (newKey ?? '').trim();
    if (!newKey || newKey === oldKey) return;
    const cols = this._effectiveColumns().map(c => c === oldKey ? newKey : c);
    const rows = (this.state.csvRows ?? []).map(r => {
      const out = {};
      for (const c of cols) out[c] = c === newKey ? r[oldKey] ?? '' : r[c] ?? '';
      return out;
    });
    this._columns = cols;
    store.actions.setCsvRows(rows, this.state.dataUrl ?? null);
  }

  _addRow() {
    this._ensureColumnsCaptured();
    const cols = this._effectiveColumns();
    if (cols.length === 0) {
      // No columns yet — create one default.
      this._columns = ['column_1'];
    }
    const blank = this._effectiveColumns().reduce((o, c) => { o[c] = ''; return o; }, {});
    const rows = [...(this.state.csvRows ?? []), blank];
    store.actions.setCsvRows(rows, this.state.dataUrl ?? null);
  }

  _removeRow(rowIdx) {
    const rows = (this.state.csvRows ?? []).filter((_, i) => i !== rowIdx);
    store.actions.setCsvRows(rows.length ? rows : null, this.state.dataUrl ?? null);
  }

  _addColumn() {
    const cols = this._effectiveColumns();
    let n = cols.length + 1;
    let name = `col${n}`;
    while (cols.includes(name)) {
      n++;
      name = `col${n}`;
    }
    const newCols = [...cols, name];
    const rows = (this.state.csvRows ?? []).map(r => ({ ...r, [name]: '' }));
    this._columns = newCols;
    store.actions.setCsvRows(rows, this.state.dataUrl ?? null);
  }

  _removeColumn(key) {
    if (!confirm(`Remove column "${key}" and all its values?`)) return;
    const cols = this._effectiveColumns().filter(c => c !== key);
    const rows = (this.state.csvRows ?? []).map(r => {
      const { [key]: _, ...rest } = r;
      return rest;
    });
    this._columns = cols;
    store.actions.setCsvRows(rows, this.state.dataUrl ?? null);
  }

  _selectRow(i) { store.actions.setActiveRowIdx(i); }

  // ---------------- Render ----------------

  render() {
    const { csvRows, activeRowIdx, dataUrl } = this.state;
    const cols = this._effectiveColumns();
    const hasData = csvRows && csvRows.length > 0;
    const hasColumns = cols.length > 0;

    return html`
      <details open>
        <summary><h3>CSV data</h3><span class="chev">${iconChevronDown}</span></summary>
        <div class="body">
          ${dataUrl ? html`
            <div class="banner">
              <span>Loaded ${csvRows?.length ?? 0} row${(csvRows?.length ?? 0) === 1 ? '' : 's'} from ${new URL(dataUrl).hostname}</span>
              <button class="clear-btn" @click=${this._onClear}>Replace</button>
            </div>
          ` : ''}

          <div class="toolbar">
            <div class="mode-toggle">
              <button aria-pressed=${this._viewMode === 'table'} @click=${() => this._setMode('table')}>Table</button>
              <button aria-pressed=${this._viewMode === 'text'}  @click=${() => this._setMode('text')}>Text</button>
            </div>
            ${this._viewMode === 'table' ? html`
              <button class="add-btn" @click=${this._addRow}>+ Row</button>
              <button class="add-btn" @click=${this._addColumn}>+ Column</button>
            ` : ''}
            ${hasData || hasColumns ? html`
              <button class="clear-btn" @click=${this._onClear}>Clear</button>
            ` : ''}
            <label class="upload-btn" title="Upload a .csv file (replaces current data)">
              ${iconFolderOpen}
              <span>Upload .csv</span>
              <input type="file" accept=".csv,text/csv" @change=${this._onFile}>
            </label>
          </div>

          ${this._viewMode === 'table'
            ? this._renderTable(csvRows, activeRowIdx, cols)
            : this._renderText()}

          ${this._error ? html`<div class="error">${this._error}</div>` : ''}
        </div>
      </details>
    `;
  }

  _renderTable(csvRows, activeRowIdx, cols) {
    if (!cols.length && !(csvRows && csvRows.length)) {
      return html`<div class="empty">No data. Upload a .csv, paste in Text mode, or click "+ Row" / "+ Column" to start fresh.</div>`;
    }
    const rows = csvRows ?? [];
    return html`
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="col-actions" title="Active preview row"></th>
              ${cols.map((c) => html`
                <th>
                  <div class="col-head">
                    <input
                      .value=${c}
                      title="Rename column (commit on blur)"
                      @change=${(e) => this._renameColumn(c, e.target.value)}>
                    <button class="icon-btn" title="Remove column '${c}'" @click=${() => this._removeColumn(c)}>${iconTrash}</button>
                  </div>
                </th>`)}
              <th class="col-actions" title="Delete row"></th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, i) => html`
              <tr class=${i === activeRowIdx ? 'active' : ''}>
                <td class="row-actions">
                  <button class="icon-btn" title="Set as active preview row" @click=${() => this._selectRow(i)}>${i === activeRowIdx ? '●' : '○'}</button>
                </td>
                ${cols.map((c) => html`<td>
                  <input
                    .value=${r[c] ?? ''}
                    @input=${(e) => this._setCell(i, c, e.target.value)}>
                </td>`)}
                <td class="row-actions">
                  <button class="icon-btn" title="Delete row" @click=${() => this._removeRow(i)}>${iconTrash}</button>
                </td>
              </tr>`)}
          </tbody>
        </table>
      </div>
    `;
  }

  _renderText() {
    return html`
      <textarea
        placeholder="paste CSV here (first row is treated as headers)..."
        .value=${this._textBuffer}
        @input=${this._onTextInput}
        @change=${this._onTextBlur}></textarea>
    `;
  }
}
customElements.define('csv-importer', CsvImporter);
