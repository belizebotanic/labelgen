import { LitElement, html, css } from 'lit';
import { store } from '../store.js';

class LabelPanel extends LitElement {
  static properties = { state: { type: Object } };

  static styles = css`
    :host { display: block; }
    .panel { background: var(--color-surface); border: var(--border); border-radius: var(--radius-md); padding: var(--space-3); }
    h3 { margin: 0 0 var(--space-2); font-size: var(--font-size-base); }
    .row { display: grid; grid-template-columns: 1fr 90px; gap: var(--space-2); margin-bottom: var(--space-1); align-items: center; }
    label { font-size: var(--font-size-sm); color: var(--color-text-muted); }
    input { padding: var(--space-1) var(--space-2); border: var(--border); border-radius: var(--radius-sm); font: inherit; }
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
      <div class="panel">
        <h3>Label</h3>
        <div class="row"><label>Width (mm)</label>      <input type="number" min="1" .value=${l.width_mm}  @change=${this._onNum('width_mm')}></div>
        <div class="row"><label>Height (mm)</label>     <input type="number" min="1" .value=${l.height_mm} @change=${this._onNum('height_mm')}></div>
        <div class="row"><label>Padding (mm)</label>    <input type="number" min="0" .value=${l.padding_mm} @change=${this._onNum('padding_mm')}></div>
        <div class="row"><label>Corner R (mm)</label>   <input type="number" min="0" .value=${l.corner_radius_mm} @change=${this._onNum('corner_radius_mm')}></div>
        <div class="row"><label>Border W (mm)</label>   <input type="number" min="0" .value=${l.border.width_mm} @change=${this._onBorder}></div>
        <div class="row"><label>Font family</label>     <input type="text" .value=${l.font.family} @change=${this._onFontFamily}></div>
        <div class="row"><label>Font size (pt)</label>  <input type="number" min="1" .value=${l.font.size_pt} @change=${this._onFontSize}></div>
      </div>
    `;
  }
}
customElements.define('label-panel', LabelPanel);
