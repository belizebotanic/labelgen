import { LitElement, html, css } from 'lit';
import { store, hydrate } from './store.js';
import { secureFetch } from './model/share-url.js';
import Papa from 'papaparse';

import './components/label-preview.js';
import './components/sheet-panel.js';
import './components/label-panel.js';
import './components/cell-properties.js';
import './components/fields-panel.js';
import './components/csv-importer.js';

class LabelgenApp extends LitElement {
  static properties = { state: { state: true } };

  constructor() {
    super();
    this.state = store.getState();
    this._unsub = store.subscribe((s) => { this.state = s; });
  }

  async connectedCallback() {
    super.connectedCallback();
    const { dataUrl, errors } = hydrate();
    this.state = store.getState();
    if (errors && errors.length) console.warn('hydrate errors:', errors);
    if (dataUrl) this._loadRemoteCsv(dataUrl);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsub?.();
  }

  async _loadRemoteCsv(url) {
    try {
      const text = await secureFetch(url);
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      store.actions.setCsvRows(parsed.data, url);
    } catch (e) {
      console.warn('remote CSV load failed:', e.message);
    }
  }

  static styles = css`
    :host {
      display: grid;
      grid-template-areas:
        "preview properties"
        "csv     properties";
      grid-template-columns: minmax(0, 1fr) 320px;
      grid-template-rows: minmax(0, 1fr) auto;
      gap: var(--space-3);
      padding: var(--space-3);
      height: 100%;
      box-sizing: border-box;
    }
    .preview    { grid-area: preview;    overflow: auto; min-width: 0;
                  background: var(--color-surface);
                  border: var(--border); border-radius: var(--radius-md); }
    .properties { grid-area: properties; overflow: auto; min-width: 0;
                  display: flex; flex-direction: column; gap: var(--space-3); }
    .csv        { grid-area: csv; }

    /* Narrow viewports (phones, narrow browser windows, portrait tablets):
       stack everything full-width. The preview region sizes to its content
       instead of grabbing 1fr of the viewport height. */
    @media (max-width: 900px) {
      :host {
        grid-template-areas:
          "preview"
          "properties"
          "csv";
        grid-template-columns: minmax(0, 1fr);
        grid-template-rows: auto auto auto;
        height: auto;
        min-height: 100%;
      }
      .preview, .properties { overflow: visible; }
    }
  `;

  render() {
    return html`
      <div class="preview">
        <label-preview .state=${this.state}></label-preview>
      </div>
      <div class="properties">
        <sheet-panel     .state=${this.state}></sheet-panel>
        <label-panel     .state=${this.state}></label-panel>
        <cell-properties .state=${this.state}></cell-properties>
        <fields-panel    .state=${this.state}></fields-panel>
      </div>
      <div class="csv">
        <csv-importer .state=${this.state}></csv-importer>
      </div>
    `;
  }
}
customElements.define('labelgen-app', LabelgenApp);
