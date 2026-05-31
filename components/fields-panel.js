import { LitElement, html, css } from 'lit';
import { listInTemplate } from '../model/placeholders.js';
import { iconChevronDown } from './icons.js';

class FieldsPanel extends LitElement {
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
    summary h3 { margin: 0; font-size: var(--font-size-base); }
    summary .chev { transition: transform 120ms ease-out; color: var(--color-text-muted); display: inline-flex; }
    details:not([open]) summary .chev { transform: rotate(-90deg); }
    .body { padding: 0 var(--space-3) var(--space-3); }
    ul { list-style: none; padding: 0; margin: 0; }
    li { padding: var(--space-1) 0; font-family: var(--font-mono); font-size: var(--font-size-sm); display: flex; justify-content: space-between; align-items: center; }
    .missing { color: var(--color-danger); }
    .present { color: var(--color-success); }
    .empty { color: var(--color-text-muted); font-size: var(--font-size-sm); }
  `;

  render() {
    const fields = listInTemplate(this.state.template);
    const summary = html`<summary><span class="chev">${iconChevronDown}</span><h3>Fields</h3></summary>`;
    if (fields.length === 0) {
      return html`
        <details open>
          ${summary}
          <div class="body"><div class="empty">No placeholders in any cell.</div></div>
        </details>
      `;
    }
    const csvCols = this.state.csvRows && this.state.csvRows[0]
      ? new Set(Object.keys(this.state.csvRows[0]))
      : null;
    return html`
      <details open>
        ${summary}
        <div class="body">
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
      </details>
    `;
  }
}
customElements.define('fields-panel', FieldsPanel);
