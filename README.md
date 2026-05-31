# labelgen

Browser-based visual editor for SVG label sheets. Design a label, optionally
load CSV data to preview real values, and export single labels or full sheets.
No backend, no production build.

**Live app:** <https://brettatoms.github.io/labelgen/>

## What you can do

- Edit row / column structure visually — click any cell to select, use the
  surrounding **+** buttons to insert rows above/below or cells left/right
- Per-cell text with `{{placeholder}}` tokens
- Per-cell typography (align, italic, bold, optional font-size override)
- Load CSV data (upload, paste, or include a public HTTPS URL in a share link)
  to preview real values
- Edit the CSV inline (Table or Text view, your choice) and click any row to
  mark it as the active preview
- Export the current label or the full sheet as SVG; save the template as
  JSON; load a saved template back
- Share a design as a URL — the template is encoded in the hash (`#t=...`)
- Switch display units between mm and inches per card (storage stays in mm)

## Run locally

Requires Node 24. With [devenv](https://devenv.sh) installed:

    devenv shell
    npm install
    npm run dev          # http://localhost:8000/

`devenv` is optional — any Node 24 install works, just `npm install` and
`npm run dev`. A direnv shortcut for auto-activating the devenv shell:

    ln -s .envrc.devenv .envrc
    direnv allow

The dev server is `@web/dev-server` with `@open-wc/dev-server-hmr` for Lit
hot module replacement.

## Tests

    npm run dev

Open <http://localhost:8000/tests/> and confirm "N passed, 0 failed".

## Stack

- [Lit 3](https://lit.dev) — custom elements with reactive properties
- [lz-string](https://github.com/pieroxy/lz-string) — URL-safe template
  compression for share links
- [PapaParse](https://www.papaparse.com) — CSV parsing
- [Lucide](https://lucide.dev) — icons

All runtime libraries are loaded via an ES module import map from
[esm.sh](https://esm.sh) — no production build step. Deploy is the static
files in the repo root.
