# Testing

Prerequisites: Node.js 18+. From repo root run `npm ci`.

## Primary command

`npm run test:all` — node:test + vitest + full smoke (build, preview, theme switch).

`npm test` — same suites with aggregated report in tests/reports/test-results.txt.

## Smoke

`npm run smoke` — scripts/smoke.mjs: optional npm ci, vite build, preview on :4173, theme switch, static checks.

`npm run smoke:static` — fast checks only (tests/smoke.mjs).

Quick smoke (no build): set SMOKE_QUICK=1 then node scripts/smoke.mjs

## Other commands

test:node, test:vitest, test:unit, smoke:full (PowerShell)

## Artifacts (tests/reports/)

test-results.txt, smoke.log, vitest.txt

Success: exit code 0 and exit_code=0 in test-results.txt. No secrets required.
