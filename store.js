import * as Template from './model/template.js';
import { saveTemplate, loadTemplate } from './model/storage.js';
import { encode as encodeShare, decode as decodeShare } from './model/share-url.js';

const DEBOUNCE_MS = 250;

/**
 * Starter CSV when nothing is loaded yet: 2 columns, 1 empty row, so the user
 * can immediately edit a cell instead of starting from an empty-state prompt.
 */
export function defaultCsvRows() {
  return [{ col1: '', col2: '' }];
}

/**
 * Create a new store. Exported as a factory for testability;
 * the production singleton is `store` (see bottom of file).
 */
export function createStore(initial = {}) {
  let state = {
    template: initial.template ?? Template.create(),
    csvRows: initial.csvRows ?? defaultCsvRows(),
    activeRowIdx: initial.activeRowIdx ?? 0,
    selection: initial.selection ?? null,
    dataUrl: initial.dataUrl ?? null,
    viewMode: initial.viewMode ?? 'single', // 'single' | 'grid'
    // Per-card display unit preference (session-only; not persisted, not shared).
    panelUnits: initial.panelUnits ?? { sheet: 'mm', label: 'mm' }
  };
  const subs = new Set();

  function getState() { return state; }
  function setState(patch) {
    state = { ...state, ...patch };
    for (const fn of subs) fn(state);
  }
  function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }

  // Template-op helpers that auto-update the store.
  const actions = {
    addRow()                                   { setState({ template: Template.addRow(state.template) }); },
    insertRowAt(atIdx)                         { setState({ template: Template.insertRowAt(state.template, atIdx) }); },
    removeRow(rowIdx)                          { setState({ template: Template.removeRow(state.template, rowIdx) }); },
    addCell(rowIdx)                            { setState({ template: Template.addCell(state.template, rowIdx) }); },
    insertCellAt(rowIdx, atIdx)                { setState({ template: Template.insertCellAt(state.template, rowIdx, atIdx) }); },
    removeCell(rowIdx, cellIdx)                { setState({ template: Template.removeCell(state.template, rowIdx, cellIdx) }); },
    setCell(rowIdx, cellIdx, patch)            { setState({ template: Template.setCell(state.template, rowIdx, cellIdx, patch) }); },
    setSheet(patch)                            { setState({ template: Template.setSheet(state.template, patch) }); },
    setLabel(patch)                            { setState({ template: Template.setLabel(state.template, patch) }); },
    setTemplate(t)                             { setState({ template: t }); },
    setCsvRows(rows, dataUrl = null)           { setState({ csvRows: rows, activeRowIdx: rows && rows.length ? 0 : null, dataUrl }); },
    setActiveRowIdx(i)                         { setState({ activeRowIdx: i }); },
    setSelection(sel)                          { setState({ selection: sel }); },
    setViewMode(mode)                          { setState({ viewMode: mode }); },
    setPanelUnit(panel, unit)                  { setState({ panelUnits: { ...state.panelUnits, [panel]: unit } }); }
  };

  return { getState, setState, subscribe, actions };
}

// ---------- production singleton + persistence ----------

export const store = createStore();

let saveTimer = null;
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const s = store.getState();
    saveTemplate(s.template);
    const hash = encodeShare({ template: s.template, dataUrl: s.dataUrl || undefined });
    history.replaceState(null, '', hash);
  }, DEBOUNCE_MS);
}

let lastTemplateRef = null;
let lastDataUrl = null;
store.subscribe(() => {
  const s = store.getState();
  if (s.template !== lastTemplateRef || s.dataUrl !== lastDataUrl) {
    lastTemplateRef = s.template;
    lastDataUrl = s.dataUrl;
    scheduleSave();
  }
});

/**
 * Hydrate the store from URL hash → localStorage → default.
 * Returns { dataUrl } so the caller can kick off the remote fetch.
 */
export function hydrate() {
  const fromUrl = decodeShare(location.hash);
  if (fromUrl.template) {
    store.setState({ template: fromUrl.template, dataUrl: fromUrl.dataUrl ?? null });
    return { dataUrl: fromUrl.dataUrl ?? null, errors: fromUrl.errors };
  }
  const fromStorage = loadTemplate();
  if (fromStorage) {
    store.setState({ template: fromStorage });
    return { dataUrl: null, errors: fromUrl.errors };
  }
  // Default template is already in store from createStore().
  return { dataUrl: null, errors: fromUrl.errors };
}
