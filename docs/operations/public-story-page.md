# Public build-story page — `/story`

The marketing/build-story page lives at `public/story/index.html` and is served
**without authentication** at `https://imperioncrm.azurewebsites.net/story` (#248).

## How it works

- **File:** `public/story/index.html` — fully self-contained static HTML (inline
  CSS/JS). External calls: Google Fonts and the *public, unauthenticated* GitHub
  REST API (best-effort commit-count hydration; falls back to static numbers).
- **Auth bypass:** `src/middleware.ts` matcher excludes `story($|/)`. The anchor
  matters — without it any route merely *starting* with "story" would also skip
  the sign-in gate. Everything else remains gated per CLAUDE.md §7.3.
- **Bare path:** `next.config.mjs` rewrites `/story` → `/story/index.html`
  (public files have no directory-index resolution).
- **Deploy:** the App Service workflow copies `public/` into the standalone
  bundle (`main_imperioncrm.yml`), so no extra deploy step is needed.

## Security posture

Static content only: no session, no data layer, no secrets, no app routes. To
update the page, replace `public/story/index.html` in a PR. To take it down,
delete the directory and remove the matcher exclusion + rewrite.
