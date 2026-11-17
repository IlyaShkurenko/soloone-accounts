# Security

## What the service does with data

A public, read-only dashboard of SoloOne port accounts. The browser fetches `GET /api/ports` from the SoloOne backend
and shows each port's label, availability, connection state, stability and disconnect times
(`public/app.js`). It stores nothing, sends nothing back and has no login. On Vercel, `/api/ports` is rewritten to
the backend (`vercel.json`); `server.mjs` is a local preview server that serves the three files in `public/` and
proxies the same call.

## Configuration and secrets

The production frontend needs no variables or secrets. `server.mjs` reads three, none secret:

| Variable | Secret | What it is for |
|---|---|---|
| `API_BASE` | no | Backend origin for the local proxy, default `https://api.solo1.ai`. |
| `PORT` | no | Local port, default 9004. |
| `HOST` | no | Local listen address, default `127.0.0.1`. |

## Who can call what

- Anyone with the URL can open the page and `GET /api/ports`; there is no login by design (README.md).
- `server.mjs` answers only `GET` and `HEAD` (others get 405), serves only `/`, `/app.js`, `/styles.css` and
  `/api/ports`, and listens on `127.0.0.1` unless `HOST` says otherwise.
- Both Vercel and `server.mjs` send `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` and
  `X-Robots-Tag: noindex, nofollow`; `/api/ports` is `Cache-Control: no-store`.

## Where personal data is stored

Nowhere in this project. The page shows what the backend's `/api/ports` returns; it writes every value with
`textContent`, never as HTML. The local server logs only its start-up line.

## Secret scan

`npm run gate` runs `npm run check` (`node --check` on `server.mjs` and `public/app.js`) and then
`npm run secret-scan` (`scripts/secret-scan.mjs`): gitleaks over the whole git history, staged changes and unstaged
changes, with values redacted. CI (`.github/workflows/ci.yml`) installs gitleaks and runs the gate on every push and
pull request. Known false positives go in `.gitleaks.toml`, each with a reason; a real secret is removed and rotated,
never allowed.

## Known gaps

- The page is public, so what it shows is limited only by what the backend's `/api/ports` returns; that contract
  lives in the backend repository.
- No `Content-Security-Policy` header (`vercel.json:9-22`, `server.mjs:13-15`).
- The Vercel build runs `npm run check` only (`vercel.json:4`), not the secret scan; the gate runs in GitHub Actions.
- There are no tests yet; the gate checks syntax only.

## Reporting a problem

Report a security problem to the owner of this repository directly, not in a public issue.
