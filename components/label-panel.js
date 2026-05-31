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

class LabelPanel extends LitElement {
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
    .body { padding: 0 var(--space-3) var(--space-3); }
    select {
      width: 100%;
      padding: var(--space-1) var(--space-2);
      border: var(--border);
      border-radius: var(--radius-sm);
      background: var(--color-bg);
      font: inherit;
      cursor: pointer;
    }
    .row { display: grid; grid-template-columns: 1fr 90px; gap: var(--space-2); margin-bottom: var(--space-1); align-items: center; }
    label { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    input { width: 100%; padding: var(--space-1) var(--space-2); border: var(--border); border-radius: var(--radius-sm); font: inherit; }
  `;

  _onLength(key) {
    return (e) => {
      const unit = this.state.panelUnits.label;
      const v = parseFloat(e.target.value);
      if (!Number.isFinite(v)) return;
      const newMm = toMm(v, unit);
      if (newMm === this.state.template.label[key]) return;
      store.actions.setLabel({ [key]: newMm });
    };
  }
  _onBorder(e) {
    const unit = this.state.panelUnits.label;
    const v = parseFloat(e.target.value);
    if (!Number.isFinite(v)) return;
    const newMm = toMm(v, unit);
    if (newMm === this.state.template.label.border.width_mm) return;
    store.actions.setLabel({ border: { width_mm: newMm } });
  }
  _onFontSize(e) {
    const v = parseFloat(e.target.value);
    if (!Number.isFinite(v)) return;
    if (v === this.state.template.label.font.size_pt) return;
    store.actions.setLabel({ font: { size_pt: v } });
  }
  _onFontFamily(e) {
    if (e.target.value === this.state.template.label.font.family) return;
    store.actions.setLabel({ font: { family: e.target.value } });
  }
  _onUnit(e) {
    store.actions.setPanelUnit('label', e.target.value);
  }

  render() {
    const l = this.state.template.label;
    const unit = this.state.panelUnits.label;
    const u = unit;
    const v = (mm) => fromMm(mm, unit);
    const step = unit === 'in' ? '0.001' : '0.1';
    return html`
      <details open>
        <summary>
          <h3>Label</h3>
          <span class="chev">${iconChevronDown}</span>
        </summary>
        <div class="body">
          <div class="row">
            <label>Unit</label>
            <select
              title="Display unit for length fields in this card"
              @change=${this._onUnit}
              .value=${unit}>
              <option value="mm">mm</option>
              <option value="in">in</option>
            </select>
          </div>
          <div class="row"><label>Width (${u})</label>     <input type="number" step=${step} min="0.1" .value=${v(l.width_mm)}  @input=${this._onLength('width_mm')}></div>
          <div class="row"><label>Height (${u})</label>    <input type="number" step=${step} min="0.1" .value=${v(l.height_mm)} @input=${this._onLength('height_mm')}></div>
          <div class="row"><label>Padding (${u})</label>   <input type="number" step=${step} min="0"   .value=${v(l.padding_mm)} @input=${this._onLength('padding_mm')}></div>
          <div class="row"><label>Corner R (${u})</label>  <input type="number" step=${step} min="0"   .value=${v(l.corner_radius_mm)} @input=${this._onLength('corner_radius_mm')}></div>
          <div class="row"><label>Border W (${u})</label>  <input type="number" step=${step} min="0"   .value=${v(l.border.width_mm)} @input=${this._onBorder}></div>
          <div class="row"><label>Font family</label>      <input type="text" .value=${l.font.family} @input=${this._onFontFamily}></div>
          <div class="row"><label>Font size (pt)</label>   <input type="number" min="1" .value=${l.font.size_pt} @input=${this._onFontSize}></div>
        </div>
      </details>
    `;
  }
}
customElements.define('label-panel', LabelPanel);
