# SoloOne ports

This standalone read-only dashboard consumes backend `GET /api/ports`.
Backend owns inventory, status and ranking; do not infer availability in the browser.
Never add provider credentials, customer data or database access to this project.
No dependencies or bundle step are needed. `npm run check` validates JavaScript syntax;
`npm start` serves the app at http://localhost:9004. `API_BASE` sets the backend origin.
For UI changes, check desktop/mobile, filters, empty states and failed refresh.
Vercel serves `public` and rewrites `/api/ports` to the production backend;
`server.mjs` is for local preview only. Never publish local snapshots or secrets.
Canonical contracts live in the backend repository at `docs/features/ports-dashboard.md`.
