import { LitElement, html, css } from 'lit';
import { renderLabelEditor, renderSheet } from '../render/svg.js';
import { store } from '../store.js';

class LabelPreview extends LitElement {
  static properties = { state: { type: Object } };

  static styles = css`
    :host { display: block; }
    .toolbar {
      display: flex;
      gap: var(--space-2);
      margin-bottom: var(--space-3);
      align-items: center;
      flex-wrap: wrap;
    }
    .toolbar button {
      padding: var(--space-1) var(--space-2);
      border: var(--border);
      border-radius: var(--radius-sm);
      background: var(--color-bg);
      cursor: pointer;
      font: inherit;
    }
    .toolbar button[aria-pressed="true"] {
      background: var(--color-accent-soft);
      border-color: var(--color-accent);
    }
    .breadcrumb {
      color: var(--color-text-muted);
      font-size: var(--font-size-sm);
      margin-left: var(--space-3);
      padding: var(--space-1) var(--space-2);
      background: var(--color-bg);
      border: var(--border);
      border-radius: var(--radius-sm);
    }
    .breadcrumb.selected {
      color: var(--color-text);
      background: var(--color-accent-soft);
      border-color: var(--color-accent);
    }
    .row-info {
      color: var(--color-text-muted);
      font-size: var(--font-size-sm);
      margin-left: auto;
    }
    .surface {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: var(--space-3);
      background: white;
      border-radius: var(--radius-sm);
    }
    .surface svg {
      max-width: 100%;
      max-height: 70vh;
      border: 1px dashed var(--color-border);
    }
    /* Editor hit zones (single-label preview only). Invisible by default;
       a soft tint appears when the whole label is hovered so the user
       discovers them, and the zone the cursor is on darkens. */
    .surface svg .lg-hit {
      fill: var(--color-accent);
      opacity: 0;
      cursor: pointer;
      transition: opacity 80ms ease-out;
    }
    .surface svg:hover .lg-hit {
      opacity: 0.18;
    }
    .surface svg .lg-hit:hover {
      opacity: 0.65;
    }
  `;

  _setMode(m) { store.actions.setViewMode(m); }

  _onClick(e) {
    let n = e.target;
    while (n && n !== e.currentTarget) {
      // Hit-zone overlays — insert row / cell at a specific position.
      const action = n.dataset?.action;
      if (action === 'insertRow') {
        store.actions.insertRowAt(Number(n.dataset.band), Number(n.dataset.atIdx));
        return;
      }
      if (action === 'insertCell') {
        store.actions.insertCellAt(
          Number(n.dataset.band),
          Number(n.dataset.row),
          Number(n.dataset.atIdx)
        );
        return;
      }
      // Content shape — select the underlying cell.
      if (n.dataset && n.dataset.band != null && n.dataset.cell != null) {
        store.actions.setSelection({
          kind: 'cell',
          path: [Number(n.dataset.band), Number(n.dataset.row), Number(n.dataset.cell)]
        });
        return;
      }
      n = n.parentNode;
    }
    store.actions.setSelection(null);
  }

  _breadcrumbText() {
    const sel = this.state.selection;
    if (!sel) return 'Click a label element to select';
    const t = this.state.template;
    const bandName = (b) => t.content.bands[b]?.name ?? '?';
    if (sel.kind === 'band') return `${bandName(sel.path[0])} band`;
    if (sel.kind === 'row')  return `${bandName(sel.path[0])} band · row ${sel.path[1] + 1}`;
    if (sel.kind === 'cell') return `${bandName(sel.path[0])} band · row ${sel.path[1] + 1} · cell ${sel.path[2] + 1}`;
    return '';
  }

  render() {
    const { template, csvRows, activeRowIdx, viewMode, selection } = this.state;
    const row = (csvRows && activeRowIdx != null) ? csvRows[activeRowIdx] : null;
    let svgEl;
    if (viewMode === 'grid') {
      const rows = csvRows ?? [];
      svgEl = renderSheet(template, rows);
    } else {
      // Single-label preview uses the editor variant which adds hover-revealed
      // "+ row" / "+ cell" hit zones. Grid view skips them — too dense.
      svgEl = renderLabelEditor(template, row);
    }
    return html`
      <div class="toolbar">
        <button aria-pressed=${viewMode === 'single'} @click=${() => this._setMode('single')}>Single label</button>
        <button aria-pressed=${viewMode === 'grid'}   @click=${() => this._setMode('grid')}>Grid</button>
        <span class="breadcrumb ${selection ? 'selected' : ''}">${this._breadcrumbText()}</span>
        <span class="row-info">
          ${csvRows ? `Row ${activeRowIdx + 1} of ${csvRows.length}` : 'No data loaded'}
        </span>
      </div>
      <div class="surface" @click=${this._onClick}>${svgEl}</div>
    `;
  }
}
customElements.define('label-preview', LabelPreview);
