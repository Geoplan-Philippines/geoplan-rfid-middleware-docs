# SSI RFID Middleware — API Docs (standalone)

A self-contained, static API reference for the middleware. No build step, no
NestJS, no database. Just HTML + Tailwind (Play CDN) + vanilla JS.

It documents **every endpoint in this repo today** plus a set of **proposed
future endpoints** derived from the project brief and discovery tracker. Each
endpoint is tagged:

- 🟢 **Implemented** — code exists under `src/modules`.
- 🟠 **Planned** — proposal only; not built yet.

## Run it

It's just static files. Pick one:

```bash
# Option A — open the file directly
#   double-click api-docs/index.html, or:
start api-docs/index.html        # Windows
```

```bash
# Option B — serve it (avoids any file:// quirks, lets the architecture
# diagram load from ../docs)
npx serve api-docs
# or
python -m http.server 8080 --directory api-docs
```

Then browse to the served URL. Tailwind loads from its CDN, so the first load
needs internet access.

## Files

| File         | Purpose                                                              |
| ------------ | ------------------------------------------------------------------- |
| `index.html` | Page shell, overview, conventions, filter/search controls.          |
| `data.js`    | **Single source of truth** — all endpoints as plain JS objects.     |
| `app.js`     | Renderer. Builds the sidebar, cards, tables and copy buttons.       |

## Keeping it accurate

When you add/change a controller under `src/modules`, update the matching entry
in `data.js`. Each implemented endpoint carries a `source` path pointing back to
its controller so the two stay easy to reconcile.

`Planned` entries are intentionally loose — confirm exact request/response
shapes against the ICD and the (pending) ETP API contracts before building them.
