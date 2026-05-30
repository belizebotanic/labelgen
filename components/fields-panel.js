import { LitElement, html, css } from 'lit';
import { listInTemplate } from '../model/placeholders.js';

class FieldsPanel extends LitElement {
  static properties = { state: { type: Object } };

  static styles = css`
    :host { display: block; }
    .panel { background: var(--color-surface); border: var(--border); border-radius: var(--radius-md); padding: var(--space-3); }
    h3 { margin: 0 0 var(--space-2); font-size: var(--font-size-base); }
    ul { list-style: none; padding: 0; margin: 0; }
    li { padding: var(--space-1) 0; font-family: var(--font-mono); font-size: var(--font-size-sm); display: flex; justify-content: space-between; align-items: center; }
    .missing { color: var(--color-danger); }
    .present { color: var(--color-success); }
    .empty { color: var(--color-text-muted); font-size: var(--font-size-sm); }
  `;

  render() {
    const fields = listInTemplate(this.state.template);
    if (fields.length === 0) {
      return html`<div class="panel"><h3>Fields</h3><div class="empty">No placeholders in any cell.</div></div>`;
    }
    const csvCols = this.state.csvRows && this.state.csvRows[0]
      ? new Set(Object.keys(this.state.csvRows[0]))
      : null;
    return html`
      <div class="panel">
        <h3>Fields</h3>
        <ul>
          ${fields.map((f) => {
            let badge = '';
            if (csvCols) badge = csvCols.has(f)
              ? html`<span class="present">in CSV</span>`
              : html`<span class="missing">missing</span>`;
            return html`<li><span>{{${f}}}</span>${badge}</li>`;
          })}
        </ul>
      </div>
    `;
  }
}
customElements.define('fields-panel', FieldsPanel);
