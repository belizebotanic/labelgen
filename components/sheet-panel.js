import { LitElement, html, css } from 'lit';
import { store } from '../store.js';

class SheetPanel extends LitElement {
  static properties = { state: { type: Object } };

  static styles = css`
    :host { display: block; }
    .panel {
      background: var(--color-surface);
      border: var(--border);
      border-radius: var(--radius-md);
      padding: var(--space-3);
    }
    h3 { margin: 0 0 var(--space-2); font-size: var(--font-size-base); }
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
      <div class="panel">
        <h3>Sheet</h3>
        <div class="row"><label>Width (mm)</label><input type="number" min="1" .value=${s.width_mm}  @change=${this._onNum('width_mm')}></div>
        <div class="row"><label>Height (mm)</label><input type="number" min="1" .value=${s.height_mm} @change=${this._onNum('height_mm')}></div>
        <div class="row"><label>Margin (mm)</label><input type="number" min="0" .value=${s.margin_mm} @change=${this._onNum('margin_mm')}></div>
        <div class="row"><label>Gutter (mm)</label><input type="number" min="0" .value=${s.gutter_mm} @change=${this._onNum('gutter_mm')}></div>
        <div class="row"><label>Rows</label>       <input type="number" min="1" step="1" .value=${s.rows} @change=${this._onInt('rows')}></div>
        <div class="row"><label>Columns</label>    <input type="number" min="1" step="1" .value=${s.cols} @change=${this._onInt('cols')}></div>
      </div>
    `;
  }
}
customElements.define('sheet-panel', SheetPanel);
