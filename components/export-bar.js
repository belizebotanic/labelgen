import { LitElement, html, css } from 'lit';
import { store } from '../store.js';
import { renderLabelToString, renderSheetToString } from '../render/svg.js';
import { encode as encodeShare } from '../model/share-url.js';
import { validate as validateTemplate } from '../model/template.js';

const URL_WARN_LEN = 1500;

class ExportBar extends LitElement {
  static properties = { state: { type: Object }, _toast: { state: true } };
  constructor() { super(); this._toast = ''; }

  static styles = css`
    :host { display: block; }
    .bar { display: flex; gap: var(--space-2); flex-wrap: wrap; align-items: center; padding: var(--space-3); background: var(--color-surface); border: var(--border); border-radius: var(--radius-md); }
    button, label.file-btn { padding: var(--space-1) var(--space-2); border: var(--border); border-radius: var(--radius-sm); background: var(--color-bg); cursor: pointer; font: inherit; }
    label.file-btn input { display: none; }
    .toast { color: var(--color-success); font-size: var(--font-size-sm); margin-left: var(--space-2); }
    .warn  { color: var(--color-danger);  font-size: var(--font-size-sm); }
  `;

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

  _copyShareLink() {
    const hash = encodeShare({ template: this.state.template });
    const url = location.origin + location.pathname + hash;
    navigator.clipboard.writeText(url);
    if (hash.length > URL_WARN_LEN) {
      this._flash(`Copied (long URL: ${hash.length} chars)`);
    } else {
      this._flash('Copied');
    }
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
    } catch (e) {
      alert(e.message);
    }
  }

  render() {
    return html`
      <div class="bar">
        <button @click=${this._exportLabel}>Export SVG (label, active row)</button>
        <button @click=${this._exportSheet}>Export SVG (sheet, all rows)</button>
        <button @click=${this._saveTemplate}>Save template (.json)</button>
        <label class="file-btn">Load template (.json)
          <input type="file" accept="application/json,.json" @change=${this._loadTemplate}>
        </label>
        <button @click=${this._copyShareLink}>Copy share link</button>
        <button @click=${this._copyShareLinkWithData}>Copy share link with data URL...</button>
        ${this._toast ? html`<span class="toast">${this._toast}</span>` : ''}
      </div>
    `;
  }
}
customElements.define('export-bar', ExportBar);
