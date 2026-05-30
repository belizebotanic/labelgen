# labelgen (web)

Browser-based visual editor for SVG label sheets. Design a label layout, optionally
load a sample CSV to preview real data, export single labels or full sheets as SVG,
and share your design via URL. No backend, no production build.

## Dev shell

This project uses [devenv](https://devenv.sh) to manage the dev environment
(Node 24 from nixpkgs-unstable). With devenv installed:

```
devenv shell
npm install
```

If you want `cd`ing into the directory to auto-activate the shell, create a local
direnv symlink (gitignored, so the auto-activation is opt-in per checkout):

```
ln -s .envrc.devenv .envrc
direnv allow
```

If you don't want devenv, any Node 24.x install also works — just `npm install`
directly.

## Run locally (with HMR)

```
npm run dev
```

Open <http://localhost:8000/>.

## Run tests

```
npm run dev
```

Open <http://localhost:8000/tests/>. Confirm "N passed, 0 failed".

A `python3 -m http.server 8000` fallback also works if you want to serve the repo
without Node — you'll just lose HMR.

## Deploy

This is a static site. Enable GitHub Pages on the `main` branch root and the app
will be served at `https://<you>.github.io/labelgen2/` (path depends on the repo
name).

## Sharing designs

The current template is automatically encoded in the URL hash (`#t=...`). Copy the
URL to share. Optionally include a public HTTPS URL to a CSV file using the
"Copy share link with data URL..." button; the recipient's browser will fetch the
CSV directly.

## Architecture

See `docs/superpowers/specs/2026-05-30-labelgen-web-design.md` for the design,
and `docs/superpowers/plans/2026-05-30-labelgen-web-implementation.md` for the
implementation plan.

## Stack

- [Lit 3](https://lit.dev/) — custom elements with reactive properties
- [lz-string](https://github.com/pieroxy/lz-string) — URL-safe template compression
- [PapaParse](https://www.papaparse.com/) — CSV parsing
- No production build toolchain. Modules loaded via ES module import map from esm.sh.
