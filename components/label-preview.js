import { LitElement, html, css } from 'lit';
import { renderLabelEditor, renderLabelToString, renderSheet, renderSheetToString } from '../render/svg.js';
import { encode as encodeShare } from '../model/share-url.js';
import { validate as validateTemplate } from '../model/template.js';
import { store } from '../store.js';
import {
  iconSquare, iconGrid, iconImage, iconPrinter,
  iconSave, iconFolderOpen, iconLink, iconLink2
} from './icons.js';

const URL_WARN_LEN = 1500;

class LabelPreview extends LitElement {
  static properties = {
    state: { type: Object },
    _toast: { state: true }
  };
  constructor() { super(); this._toast = ''; }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: var(--space-3);
      box-sizing: border-box;
    }

    /* ---- Header (toolbar row inside the preview card) ---- */
    .header {
      display: flex;
      gap: var(--space-2);
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: var(--space-3);
    }
    .header-left {
      display: flex;
      gap: var(--space-2);
      align-items: center;
      flex-wrap: wrap;
    }
    .header-right {
      display: flex;
      gap: var(--space-1);
      align-items: center;
      margin-left: auto;
    }

    /* ---- View-mode toggle (icon-only) ---- */
    .view-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 32px; height: 32px;
      padding: 0;
      border: var(--border);
      border-radius: var(--radius-sm);
      background: var(--color-bg);
      cursor: pointer;
      color: var(--color-text);
    }
    .view-btn[aria-pressed="true"] {
      background: var(--color-accent-soft);
      border-color: var(--color-accent);
      color: var(--color-accent);
    }
    .view-btn:hover:not([aria-pressed="true"]) {
      background: color-mix(in srgb, var(--color-accent) 6%, var(--color-bg));
    }

    /* ---- Action buttons in the header-right (icon-only) ---- */
    .action-btn, label.action-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 32px; height: 32px;
      padding: 0;
      border: var(--border);
      border-radius: var(--radius-sm);
      background: var(--color-bg);
      cursor: pointer;
      color: var(--color-text);
      font: inherit;
    }
    .action-btn:hover {
      background: var(--color-accent-soft);
      border-color: var(--color-accent);
      color: var(--color-accent);
    }
    label.action-btn input { display: none; }

    .breadcrumb {
      color: var(--color-text-muted);
      font-size: var(--font-size-sm);
      padding: var(--space-1) var(--space-2);
      background: var(--color-bg);
      border: var(--border);
      border-radius: var(--radius-sm);
    }
    .breadcrumb.selected {
      color: var(--color-text);
      background: var(--color-accent-soft);
      border-color: var(--color-accent);
    }

    .toast {
      color: var(--color-success);
      font-size: var(--font-size-sm);
      margin-left: var(--space-2);
    }

    /* ---- Main canvas: label with + buttons around it ---- */
    .canvas {
      flex: 1;
      display: grid;
      grid-template-columns: auto 1fr auto;
      grid-template-rows: auto 1fr auto;
      gap: var(--space-2);
      justify-items: center;
      align-items: center;
      min-height: 0;
    }
    .canvas .top    { grid-column: 2; grid-row: 1; }
    .canvas .bottom { grid-column: 2; grid-row: 3; }
    .canvas .left   { grid-column: 1; grid-row: 2; }
    .canvas .right  { grid-column: 3; grid-row: 2; }
    .canvas .center { grid-column: 2; grid-row: 2; min-height: 0; }

    .add-btn {
      width: 32px; height: 32px;
      border-radius: 50%;
      border: var(--border);
      background: var(--color-bg);
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      color: var(--color-text);
    }
    .add-btn:not(:disabled):hover {
      background: var(--color-accent-soft);
      border-color: var(--color-accent);
    }
    .add-btn:disabled {
      opacity: 0.25;
      cursor: not-allowed;
    }

    .surface {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: var(--space-2);
      background: white;
      border-radius: var(--radius-sm);
      max-height: 100%;
    }
    .surface svg {
      max-width: 100%;
      max-height: 100%;
      border: 1px dashed var(--color-border);
    }
    .surface svg .lg-cell-area {
      fill: transparent;
      stroke: var(--color-border);
      stroke-width: 0.2;
      stroke-dasharray: 1, 1;
      pointer-events: all;
      cursor: pointer;
    }
    .surface svg .lg-cell-area.selected {
      stroke: var(--color-accent);
      stroke-width: 0.4;
    }
    .surface svg .lg-cell-area:hover {
      stroke: var(--color-accent);
    }

    /* ---- Footer (row info, bottom-right of preview card) ---- */
    .footer {
      display: flex;
      justify-content: flex-end;
      margin-top: var(--space-2);
      color: var(--color-text-muted);
      font-size: var(--font-size-sm);
    }
  `;

  _setMode(m) { store.actions.setViewMode(m); }

  _onCanvasClick(e) {
    let n = e.target;
    while (n && n !== e.currentTarget) {
      if (n.dataset && n.dataset.row != null && n.dataset.cell != null) {
        store.actions.setSelection({
          kind: 'cell',
          path: [Number(n.dataset.row), Number(n.dataset.cell)]
        });
        return;
      }
      n = n.parentNode;
    }
    store.actions.setSelection(null);
  }

  _selectedCellPath() {
    const sel = this.state.selection;
    if (!sel || sel.kind !== 'cell') return null;
    return sel.path;
  }

  _insertRowAbove() {
    const p = this._selectedCellPath(); if (!p) return;
    const [r, c] = p;
    store.actions.insertRowAt(r);
    store.actions.setSelection({ kind: 'cell', path: [r + 1, c] });
  }
  _insertRowBelow() {
    const p = this._selectedCellPath(); if (!p) return;
    const [r, c] = p;
    store.actions.insertRowAt(r + 1);
    store.actions.setSelection({ kind: 'cell', path: [r, c] });
  }
  _insertCellBefore() {
    const p = this._selectedCellPath(); if (!p) return;
    const [r, c] = p;
    store.actions.insertCellAt(r, c);
    store.actions.setSelection({ kind: 'cell', path: [r, c + 1] });
  }
  _insertCellAfter() {
    const p = this._selectedCellPath(); if (!p) return;
    const [r, c] = p;
    store.actions.insertCellAt(r, c + 1);
    store.actions.setSelection({ kind: 'cell', path: [r, c] });
  }

  _breadcrumbText() {
    const sel = this.state.selection;
    if (!sel) return 'Click a cell to select';
    if (sel.kind === 'cell') return `row ${sel.path[0] + 1} · cell ${sel.path[1] + 1}`;
    return '';
  }

  // ---- Action handlers (export / save / load / share) ----

  _flash(msg) {
    this._toast = msg;
    setTimeout(() => { this._toast = ''; }, 1500);
  }

  _downloadText(filename, text, mime = 'application/octet-stream') {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  _exportLabel() {
    const { template, csvRows, activeRowIdx } = this.state;
    const row = (csvRows && activeRowIdx != null) ? csvRows[activeRowIdx] : null;
    this._downloadText('label.svg', renderLabelToString(template, row), 'image/svg+xml');
  }
  _exportSheet() {
    const { template, csvRows } = this.state;
    const rows = csvRows ?? [];
    const perPage = template.sheet.rows * template.sheet.cols;
    if (rows.length <= perPage) {
      this._downloadText('sheet.svg', renderSheetToString(template, rows), 'image/svg+xml');
      return;
    }
    let page = 1;
    for (let i = 0; i < rows.length; i += perPage) {
      const slice = rows.slice(i, i + perPage);
      this._downloadText(`sheet-${page}.svg`, renderSheetToString(template, slice), 'image/svg+xml');
      page++;
    }
  }
  _saveTemplate() {
    this._downloadText('template.json', JSON.stringify(this.state.template, null, 2), 'application/json');
  }
  async _loadTemplate(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const validated = validateTemplate(parsed);
      store.actions.setTemplate(validated);
      this._flash('Loaded');
    } catch (err) {
      alert('Could not load template: ' + err.message);
    } finally {
      e.target.value = '';
    }
  }
  async _copyShareLink() {
    const hash = encodeShare({ template: this.state.template });
    const url = location.origin + location.pathname + hash;
    await navigator.clipboard.writeText(url);
    if (hash.length > URL_WARN_LEN) this._flash(`Copied (long URL: ${hash.length} chars)`);
    else this._flash('Copied');
  }
  async _copyShareLinkWithData() {
    const cur = this.state.dataUrl ?? '';
    const input = prompt('Public https:// URL of the CSV data file:', cur);
    if (input == null || input.trim() === '') return;
    try {
      const hash = encodeShare({ template: this.state.template, dataUrl: input.trim() });
      const url = location.origin + location.pathname + hash;
      await navigator.clipboard.writeText(url);
      this._flash('Copied');
    } catch (err) {
      alert(err.message);
    }
  }

  render() {
    const { template, csvRows, activeRowIdx, viewMode, selection } = this.state;
    const row = (csvRows && activeRowIdx != null) ? csvRows[activeRowIdx] : null;
    const cellSelected = selection?.kind === 'cell';
    let svgEl;
    if (viewMode === 'grid') {
      svgEl = renderSheet(template, csvRows ?? []);
    } else {
      svgEl = renderLabelEditor(template, row, selection);
    }

    return html`
      <div class="header">
        <div class="header-left">
          <button class="view-btn" title="Single label view"
                  aria-pressed=${viewMode === 'single'}
                  @click=${() => this._setMode('single')}>${iconSquare}</button>
          <button class="view-btn" title="Grid view (full sheet)"
                  aria-pressed=${viewMode === 'grid'}
                  @click=${() => this._setMode('grid')}>${iconGrid}</button>
          <span class="breadcrumb ${selection ? 'selected' : ''}">${this._breadcrumbText()}</span>
          ${this._toast ? html`<span class="toast">${this._toast}</span>` : ''}
        </div>
        <div class="header-right">
          <button class="action-btn" title="Export current label as SVG"
                  @click=${this._exportLabel}>${iconImage}</button>
          <button class="action-btn" title="Export full sheet of labels as SVG"
                  @click=${this._exportSheet}>${iconPrinter}</button>
          <button class="action-btn" title="Save template to .json file"
                  @click=${this._saveTemplate}>${iconSave}</button>
          <label class="action-btn" title="Load template from .json file">
            <input type="file" accept="application/json,.json" @change=${this._loadTemplate}>
            ${iconFolderOpen}
          </label>
          <button class="action-btn" title="Copy share link"
                  @click=${this._copyShareLink}>${iconLink}</button>
          <button class="action-btn" title="Copy share link including a public https URL to a CSV data file"
                  @click=${this._copyShareLinkWithData}>${iconLink2}</button>
        </div>
      </div>

      ${viewMode === 'single' ? html`
        <div class="canvas">
          <button class="add-btn top"    title="Insert row above selected cell"
                  ?disabled=${!cellSelected} @click=${this._insertRowAbove}>+</button>
          <button class="add-btn left"   title="Insert cell before selected cell"
                  ?disabled=${!cellSelected} @click=${this._insertCellBefore}>+</button>
          <div class="surface center" @click=${this._onCanvasClick}>${svgEl}</div>
          <button class="add-btn right"  title="Insert cell after selected cell"
                  ?disabled=${!cellSelected} @click=${this._insertCellAfter}>+</button>
          <button class="add-btn bottom" title="Insert row below selected cell"
                  ?disabled=${!cellSelected} @click=${this._insertRowBelow}>+</button>
        </div>
      ` : html`
        <div class="surface" @click=${this._onCanvasClick}>${svgEl}</div>
      `}

      <div class="footer">
        ${csvRows ? `Row ${activeRowIdx + 1} of ${csvRows.length}` : 'No data loaded'}
      </div>
    `;
  }
}
customElements.define('label-preview', LabelPreview);
