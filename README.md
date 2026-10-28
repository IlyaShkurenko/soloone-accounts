# SoloOne accounts

Small public, read-only port directory. No login or mobile build. Existing port
accounts only, Free/In use filters, connection status, hidden stability ranking,
and a Real phone badge for port41. No database writes or provider wakeups.

## Deploy on Vercel

Import `IlyaShkurenko/soloone-accounts`, select the `main` branch and keep the root
directory at the repository root. `vercel.json` configures the Other framework preset,
syntax-check build command and `public` output directory. No environment variables
or secrets are required for the production frontend.

Vercel forwards `/api/ports` to `https://api.solo1.ai/api/ports` using an
[external rewrite](https://vercel.com/docs/routing/rewrites). The backend endpoint
must be deployed separately before live data can load. This repository contains
only the dashboard; it does not deploy the backend. The page shows an error if the
backend is unavailable rather than displaying sample data.

`server.mjs` is the local preview server, not a Vercel serverless function.

## Run

Node 22 or later; no installation or compilation required.

```sh
npm run check
API_BASE=http://localhost:9001 npm start
```

Open http://localhost:9004. Without `API_BASE`, the proxy uses
`https://api.solo1.ai`; that backend must contain the new `/api/ports` endpoint.
`PORT` defaults to 9004, `HOST` to 127.0.0.1. Publish behind an HTTPS reverse proxy.
The Node server only serves the three public assets and proxies the read-only API.

The backend owns the `/api/ports` contract. Availability follows existing SoloOne
mode: `warming` means Free, `ready` means In use. Connection is a separate status.
Ranking uses recent disconnects and retained warmup activity; activity counts are
not exposed to this frontend.
Refresh is automatic once per minute. A failed refresh leaves previous data explicitly
marked stale. Partial history and unverified connections are visible. The page does
not reserve ports or change their SoloOne status.

## Verification

`npm run check`, plus browser checks for Free/In use filters, search, empty results,
port41 badge, refresh failure and a 390px viewport. Backend tests cover ordering,
unknown/blocked states, log deduplication and minimal public response projection.
