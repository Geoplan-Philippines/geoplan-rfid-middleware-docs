# Geoplan RFID Middleware API Docs (standalone)

A self-contained, static integration reference. No build step, no NestJS, no
database. Just HTML + Tailwind (Play CDN) + vanilla JS.

It documents partner-owned delivery contracts separately for ETP POS and
Samooha, every middleware endpoint in this repo today, and proposed future
middleware endpoints. Each middleware endpoint is tagged:

- 🟢 **Implemented**: code exists under `src/modules`.
- 🟠 **Planned**: proposal only, not built yet.

## Run it

It's just static files. Pick one:

```bash
# Option A: open the file directly
#   double-click api-docs/index.html, or:
start api-docs/index.html        # Windows
```

```bash
# Option B: serve it (avoids any file:// quirks)
npx serve api-docs
# or
python -m http.server 8080 --directory api-docs
```

Then browse to the served URL. Tailwind and the fonts load from CDNs, so the
first load needs internet access.

## Files

| File                              | Purpose                                                       |
| --------------------------------- | ------------------------------------------------------------- |
| `index.html`                      | Page shell, overview, partner section, conventions, search.   |
| `js/data.js`                      | **Single source of truth**: partner contracts and endpoints.  |
| `js/app.js`                       | Renderer. Builds navigation, contracts, tables, and examples. |
| `assets/architecture-diagram.png` | Architecture diagram shown in the overview.                   |

## Keeping it accurate

When a partner contract changes, update its entry in `PARTNER_REQUIREMENTS`.
ETP POS and Samooha are intentionally separate entries even when they share a
schema. When a controller changes under `src/modules`, update the matching
entry in `GROUPS`. Each implemented endpoint carries a `source` path pointing
back to its controller.

`Planned` entries and partner items marked `to confirm` are not final. Confirm
them against the agreed ICD plus the ETP POS and Samooha contracts before
building against them.
