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

    /* Frame holding the label and four "+" buttons around it. */
    .canvas {
      display: grid;
      grid-template-columns: auto 1fr auto;
      grid-template-rows: auto 1fr auto;
      gap: var(--space-2);
      justify-items: center;
      align-items: center;
      padding: var(--space-3);
    }
    .canvas .top    { grid-column: 2; grid-row: 1; }
    .canvas .bottom { grid-column: 2; grid-row: 3; }
    .canvas .left   { grid-column: 1; grid-row: 2; }
    .canvas .right  { grid-column: 3; grid-row: 2; }
    .canvas .center { grid-column: 2; grid-row: 2; }

    .add-btn {
      width: 32px; height: 32px;
      border-radius: 50%;
      border: var(--border);
      background: var(--color-bg);
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      color: var(--color-text);
    }
    .add-btn:not(:disabled):hover {
      background: var(--color-accent-soft);
      border-color: var(--color-accent);
    }
    .add-btn:disabled {
      opacity: 0.25;
      cursor: not-allowed;
    }

    .surface {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: var(--space-2);
      background: white;
      border-radius: var(--radius-sm);
    }
    .surface svg {
      max-width: 100%;
      max-height: 70vh;
      border: 1px dashed var(--color-border);
    }

    /* Cell overlay rects rendered inside the SVG (editor mode only). */
    .surface svg .lg-cell-area {
      fill: transparent;
      stroke: var(--color-border);
      stroke-width: 0.2;
      stroke-dasharray: 1, 1;
      pointer-events: all;
      cursor: pointer;
    }
    .surface svg .lg-cell-area.selected {
      stroke: var(--color-accent);
      stroke-width: 0.4;
    }
    .surface svg .lg-cell-area:hover {
      stroke: var(--color-accent);
    }
  `;

  _setMode(m) { store.actions.setViewMode(m); }

  _onClick(e) {
    let n = e.target;
    while (n && n !== e.currentTarget) {
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

  _selectedCellPath() {
    const sel = this.state.selection;
    if (!sel || sel.kind !== 'cell') return null;
    return sel.path;
  }

  _insertRowAbove() {
    const p = this._selectedCellPath(); if (!p) return;
    const [b, r, c] = p;
    store.actions.insertRowAt(b, r);
    store.actions.setSelection({ kind: 'cell', path: [b, r + 1, c] });
  }
  _insertRowBelow() {
    const p = this._selectedCellPath(); if (!p) return;
    const [b, r, c] = p;
    store.actions.insertRowAt(b, r + 1);
    // Selection's row index unchanged; the new row is below it.
    store.actions.setSelection({ kind: 'cell', path: [b, r, c] });
  }
  _insertCellBefore() {
    const p = this._selectedCellPath(); if (!p) return;
    const [b, r, c] = p;
    store.actions.insertCellAt(b, r, c);
    store.actions.setSelection({ kind: 'cell', path: [b, r, c + 1] });
  }
  _insertCellAfter() {
    const p = this._selectedCellPath(); if (!p) return;
    const [b, r, c] = p;
    store.actions.insertCellAt(b, r, c + 1);
    store.actions.setSelection({ kind: 'cell', path: [b, r, c] });
  }

  _breadcrumbText() {
    const sel = this.state.selection;
    if (!sel) return 'Click a cell to select';
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
    const cellSelected = selection?.kind === 'cell';
    let svgEl;
    if (viewMode === 'grid') {
      const rows = csvRows ?? [];
      svgEl = renderSheet(template, rows);
    } else {
      svgEl = renderLabelEditor(template, row, selection);
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

      ${viewMode === 'single' ? html`
        <div class="canvas">
          <button class="add-btn top"    title="Insert row above selected cell"
                  ?disabled=${!cellSelected} @click=${this._insertRowAbove}>+</button>
          <button class="add-btn left"   title="Insert cell before selected cell"
                  ?disabled=${!cellSelected} @click=${this._insertCellBefore}>+</button>
          <div class="surface center" @click=${this._onClick}>${svgEl}</div>
          <button class="add-btn right"  title="Insert cell after selected cell"
                  ?disabled=${!cellSelected} @click=${this._insertCellAfter}>+</button>
          <button class="add-btn bottom" title="Insert row below selected cell"
                  ?disabled=${!cellSelected} @click=${this._insertRowBelow}>+</button>
        </div>
      ` : html`
        <div class="surface" @click=${this._onClick}>${svgEl}</div>
      `}
    `;
  }
}
customElements.define('label-preview', LabelPreview);
