# CLAUDE.md

Project-level guidance for Claude. The user's global `~/.claude/CLAUDE.md`
also applies — in particular, **never commit, push, or open PRs without
explicit approval**.

## What this is

`labelgen` — browser-based visual editor for SVG label sheets. Lit + plain
JavaScript, no production build toolchain. Deployed as a static site to
GitHub Pages.

## Project layout

```
index.html              — entry, import map, CSP, mounts <labelgen-app>
styles.css              — design tokens (CSS custom properties) + reset
app.js                  — <labelgen-app> root, page layout
store.js                — singleton reactive store + action helpers

model/
  template.js           — Template factory, ops, strict validation
  placeholders.js       — extract / substitute {{token}}
  storage.js            — localStorage load / save
  share-url.js          — URL-hash encode/decode + secureFetch

render/
  units.js              — mm / pt / px / in conversions
  measure.js            — Canvas-based text measurement
  layout.js             — template + data row → positioned shapes
  svg.js                — positioned shapes → SVGElement / string

components/
  icons.js              — inlined Lucide SVG icons (Lit html templates)
  label-preview.js      — preview canvas, +/- buttons, action toolbar
  sheet-panel.js        — sheet dimensions / grid
  label-panel.js        — label dimensions / typography
  cell-properties.js    — selected-cell editor + remove buttons
  fields-panel.js       — placeholder list
  csv-importer.js       — Table | Text data editor

tests/
  index.html            — open in browser
  runner.js             — minimal describe/test/assert framework
  *.test.js             — per-module tests
```

## Hard rules

1. **No production build.** Runtime libs (Lit, lz-string, PapaParse) come
   from a pinned esm.sh import map in `index.html`. `node_modules` exists
   only for dev tools (`@web/dev-server`, the HMR plugin). Don't add a
   bundler or compile step.
2. **No `innerHTML` or `unsafeHTML` with user content, anywhere.** All
   rendering goes through Lit's auto-escaping templates. Cell text is
   rendered via `textContent` in `render/svg.js`.
3. **All template ingestion goes through `validate()`** in
   `model/template.js`. URL hash → `decode()` → `validate()`. File upload →
   `JSON.parse` → `validate()`. localStorage → same.
4. **All outbound HTTP goes through `secureFetch()`** in
   `model/share-url.js`. HTTPS-only, 5 MB cap, `credentials: 'omit'`.
5. **Storage is mm.** Per-card unit selectors (mm | in) are display only.
   Conversion happens at the component edge.
6. **Templates are versioned.** Bump `VERSION` in `model/template.js` and
   update `validate()` when the shape changes. Old templates fail validation
   and fall back to the default — not silently migrated.

## Dev workflow

```
devenv shell        # if using devenv (Node 24 from nixpkgs-unstable)
npm install         # one time
npm run dev         # serves at http://localhost:8000/
```

Tests run in the browser at `/tests/`. Pure-module tests can also be
sanity-checked from Node:

```
node -e "import('./model/template.js').then(T => console.log(T.validate(T.create()).version))"
```

## Deploy

GitHub Pages, branch `main`, root path. The repo's files at HEAD are the
served artifact. No CI required.

## State management

- `store.js` holds the canonical state. Components subscribe via the root
  `<labelgen-app>` which threads state down as a property.
- Template changes auto-persist to `localStorage` and the URL hash
  (`#t=<lz-string-encoded>`) with a 250ms debounce.
- CSV data is session-only — not persisted to localStorage, not encoded in
  the share link.
- View mode (single / grid) and per-card units are session-only.

## Architecture notes

- Pure modules (`model/`, `render/`) are framework-agnostic JavaScript.
  Importable in Node without DOM (mostly — `measure.js` needs Canvas).
- Components import from `model/`, `render/`, and `../store.js`. They never
  reach into other components.
- The label preview's `<label-preview>` owns the action toolbar (export,
  save, share, etc.) since they all operate on the visible label state.

## Designs / specs

`docs/superpowers/specs/` and `docs/superpowers/plans/` contain the
brainstorm and implementation plan from the original build. They've drifted
from the current code (the design evolved during construction) — useful for
historical context but not authoritative. The code is the source of truth.
