import { LitElement, html, css } from 'lit';
import { store } from '../store.js';
import { iconChevronDown } from './icons.js';
import { mmToIn, inToMm } from '../render/units.js';

function fromMm(mm, unit) {
  if (unit === 'in') return Number(mmToIn(mm).toFixed(3));
  return Number(mm.toFixed(2));
}
function toMm(value, unit) {
  return unit === 'in' ? inToMm(value) : value;
}

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
      display: flex; align-items: center; gap: var(--space-2);
      user-select: none;
    }
    summary::-webkit-details-marker { display: none; }
    summary h3 { margin: 0; font-size: var(--font-size-base); flex: 1; }
    summary .chev { transition: transform 120ms ease-out; color: var(--color-text-muted); display: inline-flex; }
    details:not([open]) summary .chev { transform: rotate(-90deg); }
    summary select {
      padding: 2px var(--space-1);
      border: var(--border);
      border-radius: var(--radius-sm);
      background: var(--color-bg);
      font: inherit;
      font-size: var(--font-size-sm);
      cursor: pointer;
    }
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

  _onLength(key) {
    const unit = this.state.panelUnits.sheet;
    return (e) => {
      const v = parseFloat(e.target.value);
      if (Number.isFinite(v)) store.actions.setSheet({ [key]: toMm(v, unit) });
    };
  }
  _onInt(key) {
    return (e) => {
      const v = parseInt(e.target.value, 10);
      if (Number.isFinite(v) && v > 0) store.actions.setSheet({ [key]: v });
    };
  }
  _onUnit(e) {
    store.actions.setPanelUnit('sheet', e.target.value);
  }

  render() {
    const s = this.state.template.sheet;
    const unit = this.state.panelUnits.sheet;
    const u = unit; // shorthand for the label suffix
    const v = (mm) => fromMm(mm, unit);
    const step = unit === 'in' ? '0.001' : '0.1';
    return html`
      <details open>
        <summary>
          <span class="chev">${iconChevronDown}</span>
          <h3>Sheet</h3>
          <select
            title="Display unit for length fields in this card"
            @click=${(e) => e.stopPropagation()}
            @change=${this._onUnit}
            .value=${unit}>
            <option value="mm">mm</option>
            <option value="in">in</option>
          </select>
        </summary>
        <div class="body">
          <div class="row"><label>Width (${u})</label> <input type="number" step=${step} min="0.1" .value=${v(s.width_mm)}  @change=${this._onLength('width_mm')}></div>
          <div class="row"><label>Height (${u})</label><input type="number" step=${step} min="0.1" .value=${v(s.height_mm)} @change=${this._onLength('height_mm')}></div>
          <div class="row"><label>Margin (${u})</label><input type="number" step=${step} min="0"   .value=${v(s.margin_mm)} @change=${this._onLength('margin_mm')}></div>
          <div class="row"><label>Gutter (${u})</label><input type="number" step=${step} min="0"   .value=${v(s.gutter_mm)} @change=${this._onLength('gutter_mm')}></div>
          <div class="row"><label>Rows</label>         <input type="number" min="1" step="1" .value=${s.rows} @change=${this._onInt('rows')}></div>
          <div class="row"><label>Columns</label>      <input type="number" min="1" step="1" .value=${s.cols} @change=${this._onInt('cols')}></div>
        </div>
      </details>
    `;
  }
}
customElements.define('sheet-panel', SheetPanel);
