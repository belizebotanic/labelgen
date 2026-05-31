import { LitElement, html, css } from 'lit';
import { store } from '../store.js';
import { iconChevronDown } from './icons.js';

class SheetPanel extends LitElement {
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
      display: flex; align-items: center; justify-content: space-between;
      user-select: none;
    }
    summary::-webkit-details-marker { display: none; }
    summary h3 { margin: 0; font-size: var(--font-size-base); }
    summary .chev { transition: transform 120ms ease-out; color: var(--color-text-muted); display: inline-flex; }
    details:not([open]) summary .chev { transform: rotate(-90deg); }
    .body { padding: 0 var(--space-3) var(--space-3); }
    .row {
      display: grid;
      grid-template-columns: 1fr 90px;
      gap: var(--space-2);
      margin-bottom: var(--space-1);
      align-items: center;
    }
    label { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    input { width: 100%; padding: var(--space-1) var(--space-2); border: var(--border); border-radius: var(--radius-sm); font: inherit; }
  `;

  _onNum(key) {
    return (e) => {
      const v = parseFloat(e.target.value);
      if (Number.isFinite(v)) store.actions.setSheet({ [key]: v });
    };
  }
  _onInt(key) {
    return (e) => {
      const v = parseInt(e.target.value, 10);
      if (Number.isFinite(v) && v > 0) store.actions.setSheet({ [key]: v });
    };
  }

  render() {
    const s = this.state.template.sheet;
    return html`
      <details open>
        <summary><h3>Sheet</h3><span class="chev">${iconChevronDown}</span></summary>
        <div class="body">
          <div class="row"><label>Width (mm)</label><input type="number" min="1" .value=${s.width_mm}  @change=${this._onNum('width_mm')}></div>
          <div class="row"><label>Height (mm)</label><input type="number" min="1" .value=${s.height_mm} @change=${this._onNum('height_mm')}></div>
          <div class="row"><label>Margin (mm)</label><input type="number" min="0" .value=${s.margin_mm} @change=${this._onNum('margin_mm')}></div>
          <div class="row"><label>Gutter (mm)</label><input type="number" min="0" .value=${s.gutter_mm} @change=${this._onNum('gutter_mm')}></div>
          <div class="row"><label>Rows</label>       <input type="number" min="1" step="1" .value=${s.rows} @change=${this._onInt('rows')}></div>
          <div class="row"><label>Columns</label>    <input type="number" min="1" step="1" .value=${s.cols} @change=${this._onInt('cols')}></div>
        </div>
      </details>
    `;
  }
}
customElements.define('sheet-panel', SheetPanel);
