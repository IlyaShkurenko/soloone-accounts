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

## Quality and security gate

These rules apply to every change, by a person or an agent. `.claude/README.md` describes the agents and the guard
that enforce them.

- **Done means the gate is green.** `npm run gate` runs the syntax check (`npm run check`) and the secret scan. This
  repo has no type check, linter or tests yet; a first test goes in `tests/*.test.mjs` (node's test runner) together
  with a `test` script that the gate runs. CI runs the gate on every push and pull request (`.github/workflows/ci.yml`);
  the Vercel build runs only `npm run check` (`vercel.json`), not the gate.
- **Test first.** A feature or a bug fix starts with a test of the behavior that fails on the current code
  (`npm run fails-first -- <files>`), then the code that makes it pass. A bug fix always comes with the test that
  reproduces the bug.
- **Who writes what.** For anything beyond a one-line fix, the `test-writer` agent writes the tests and the `builder`
  agent writes the code; the builder doesn't change the tests. The `verifier` checks the result. Changes to sign-in,
  payments, wallets, deposits, personal data, webhooks or secrets also get the `security-reviewer`, and their tests
  get 2 to 4 `critic` runs.
- **Secrets.** Never open, print or commit `.env` files or keys. Configuration is read by variable name; the names are
  in SECURITY.md. A secret that reached git is rotated, not just deleted.
- **Test data is fictional.** Emails at example.com or example.test, phones 447700900000 to 447700900999, invented
  names. No real customer, creator or phone number in code, tests, fixtures or docs.
- **Logs** carry IDs and outcomes, never tokens, message text, phone numbers or emails.
