import * as Template from './model/template.js';
import {
  saveTemplate, loadTemplate, clearTemplate,
  saveCsvRows, loadCsvRows, clearCsvRows,
  saveLastHash, loadLastHash
} from './model/storage.js';
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
    // Cell-grid overlay visibility in single view (session-only).
    showCellGrid: initial.showCellGrid ?? true,
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
    toggleCellGrid()                           { setState({ showCellGrid: !state.showCellGrid }); },
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

let csvSaveTimer = null;
let lastCsvRef = null;
function scheduleCsvSave() {
  if (csvSaveTimer) clearTimeout(csvSaveTimer);
  csvSaveTimer = setTimeout(() => {
    csvSaveTimer = null;
    saveCsvRows(store.getState().csvRows ?? []);
  }, DEBOUNCE_MS);
}
store.subscribe(() => {
  const s = store.getState();
  if (s.csvRows !== lastCsvRef) {
    lastCsvRef = s.csvRows;
    scheduleCsvSave();
  }
});

/**
 * Hydrate the store from URL hash → localStorage → default.
 * Returns { dataUrl } so the caller can kick off the remote fetch.
 */
export function hydrate() {
  const fromUrl = decodeShare(location.hash);
  const currentHash = location.hash || '';
  const prevHash = loadLastHash();

  // Restore CSV from localStorage only when no remote data URL is in play —
  // a share-link dataUrl will overwrite csvRows once the fetch resolves, so
  // there is no point restoring local rows that would be immediately replaced.
  if (fromUrl.template) {
    const patch = { template: fromUrl.template, dataUrl: fromUrl.dataUrl ?? null };
    if (!fromUrl.dataUrl) {
      const savedCsv = loadCsvRows();
      if (savedCsv && savedCsv.length > 0) {
        patch.csvRows = savedCsv;
        patch.activeRowIdx = 0;
      }
    }
    store.setState(patch);
    saveLastHash(currentHash);
    return { dataUrl: fromUrl.dataUrl ?? null, errors: fromUrl.errors };
  }

  // No template in the URL. Only restore from localStorage if this looks like
  // a refresh of the same URL (or a first-ever visit, where prevHash is null
  // and there is nothing to compare against). Otherwise the user just
  // navigated away from a share link to the bare URL — show the empty
  // default and clear stale persistence so it doesn't haunt future visits.
  const sameAsLast = prevHash === null || prevHash === currentHash;
  if (sameAsLast) {
    const patch = {};
    const fromStorage = loadTemplate();
    if (fromStorage) patch.template = fromStorage;
    const savedCsv = loadCsvRows();
    if (savedCsv && savedCsv.length > 0) {
      patch.csvRows = savedCsv;
      patch.activeRowIdx = 0;
    }
    if (Object.keys(patch).length) store.setState(patch);
  } else {
    clearTemplate();
    clearCsvRows();
  }
  saveLastHash(currentHash);
  return { dataUrl: null, errors: fromUrl.errors };
}
