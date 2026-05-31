import { LitElement, html, css } from 'lit';
import { store } from '../store.js';
import { iconChevronDown } from './icons.js';

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
      display: flex; align-items: center; justify-content: space-between;
      user-select: none;
    }
    summary::-webkit-details-marker { display: none; }
    summary h3 { margin: 0; font-size: var(--font-size-base); }
    summary .chev { transition: transform 120ms ease-out; color: var(--color-text-muted); display: inline-flex; }
    details:not([open]) summary .chev { transform: rotate(-90deg); }
    .body { padding: 0 var(--space-3) var(--space-3); }
    .row { display: grid; grid-template-columns: 1fr 90px; gap: var(--space-2); margin-bottom: var(--space-1); align-items: center; }
    label { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    input { width: 100%; padding: var(--space-1) var(--space-2); border: var(--border); border-radius: var(--radius-sm); font: inherit; }
  `;

  _onNum(key) {
    return (e) => {
      const v = parseFloat(e.target.value);
      if (Number.isFinite(v)) store.actions.setLabel({ [key]: v });
    };
  }
  _onFontSize(e) {
    const v = parseFloat(e.target.value);
    if (Number.isFinite(v)) store.actions.setLabel({ font: { size_pt: v } });
  }
  _onFontFamily(e) {
    store.actions.setLabel({ font: { family: e.target.value } });
  }
  _onBorder(e) {
    const v = parseFloat(e.target.value);
    if (Number.isFinite(v)) store.actions.setLabel({ border: { width_mm: v } });
  }

  render() {
    const l = this.state.template.label;
    return html`
      <details open>
        <summary><h3>Label</h3><span class="chev">${iconChevronDown}</span></summary>
        <div class="body">
          <div class="row"><label>Width (mm)</label>      <input type="number" min="1" .value=${l.width_mm}  @change=${this._onNum('width_mm')}></div>
          <div class="row"><label>Height (mm)</label>     <input type="number" min="1" .value=${l.height_mm} @change=${this._onNum('height_mm')}></div>
          <div class="row"><label>Padding (mm)</label>    <input type="number" min="0" .value=${l.padding_mm} @change=${this._onNum('padding_mm')}></div>
          <div class="row"><label>Corner R (mm)</label>   <input type="number" min="0" .value=${l.corner_radius_mm} @change=${this._onNum('corner_radius_mm')}></div>
          <div class="row"><label>Border W (mm)</label>   <input type="number" min="0" .value=${l.border.width_mm} @change=${this._onBorder}></div>
          <div class="row"><label>Font family</label>     <input type="text" .value=${l.font.family} @change=${this._onFontFamily}></div>
          <div class="row"><label>Font size (pt)</label>  <input type="number" min="1" .value=${l.font.size_pt} @change=${this._onFontSize}></div>
        </div>
      </details>
    `;
  }
}
customElements.define('label-panel', LabelPanel);
