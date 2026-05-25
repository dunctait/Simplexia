# Development Workflow

## Overview

Simplex Islands is served directly by GitHub Pages. There is no build step; the source files in `index.html` and `src/` are the deployed app.

## Commands

```powershell
npm install
npm test
npm run e2e
npm run predeploy
```

`npm run check` runs the deterministic unit suite and Playwright E2E smoke checks. `npm run predeploy` adds repository hygiene checks such as script load order and `CLAUDE.md` convention validation.

## Deploy

The `Deploy GitHub Pages` workflow validates the app and publishes the repository root to GitHub Pages on pushes to `master` or `main`.

Expected live URL after Pages is enabled:

```text
https://dunctait.github.io/simplex-islands/
```

## Harness Engineering Notes

- Keep generation logic pure and deterministic so agents can make changes against fixed-seed tests.
- Prefer adding focused unit tests for generation rules and persistence normalization.
- Keep E2E slim: load the app, mutate controls, verify canvas output, validate mobile layout, and check save/load flows.
- Make failures actionable in CI by keeping scripts small and direct.
