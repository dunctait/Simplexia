# Simplex Islands Agent Instructions

## Project Overview

Simplex Islands is an HTML5 procedural planet generator. It is hosted directly from GitHub Pages and is designed for autonomous development with fast local checks, unit tests, and Playwright smoke tests.

Current product direction:

- globe-only UI; the old 2D mode is removed
- globe is the default and primary experience
- settings are globe-oriented, with `resolution` replacing the old grid-specific `rows`, `columns`, and `scale`
- localStorage persists the active globe settings and saved generations
- generation is async, worker-backed, and cancels stale runs

## Tech Stack

- Vanilla HTML/CSS/JavaScript, no build step
- GitHub Pages deployment
- Node test runner for unit tests
- Playwright for mobile/desktop E2E and layout checks

## Commands

```powershell
npm test
npm run e2e
npm run predeploy
deploy.ps1
```

`deploy.ps1` is the local end-to-end deploy wrapper. It:

- builds `vendor/globe-bundle.js`
- runs the full unit and E2E check suite
- runs predeploy validation
- commits any resulting changes
- pushes to the `simplexia` remote on `master`

`deploy.bat` is a thin Windows wrapper around `deploy.ps1`.

## Architecture

- `src/simplex-noise.js` ports the deterministic 2D simplex noise implementation.
- `src/generator.js` owns globe terrain settings, spherical noise generation, biome classification, summaries, and exports.
- `src/storage.js` owns localStorage persistence and normalization.
- `src/renderer.js` delegates rendering to the 3D globe scene.
- `src/globe-scene.js` owns the Three.js/WebGL globe scene.
- `vendor/globe-bundle.js` is the browser-ready Three.js bundle generated from `src/globe-scene.js` with `npm run build:globe`.
- `src/ui.js` owns DOM binding, state updates, save/load controls, and app orchestration.

Boundary rules:

- generation logic stays DOM-free and canvas-free
- rendering stays mutation-light and does not regenerate maps
- storage accepts and returns plain serializable generation snapshots
- the active range-control input should not be fully re-synced on every slider `input` event; only update the active control's value label and persist the new value, otherwise the browser can snap the slider back on release

## UX Constraints

- Mobile-first, usable in portrait and landscape
- Touch targets must remain at least 40px high
- Controls must not overlap the globe or each other
- The globe must remain a real Three.js/WebGL scene, not a 2D projection or rectangular texture stretched over a sphere.

## Harness Notes

- Add tests before or alongside behavior changes.
- Keep the unit suite deterministic by using fixed seeds.
- Keep E2E focused on critical autonomous checks: app loads, controls mutate state, canvas is nonblank, saves persist, and mobile layout is coherent.
- CI should remain fast enough to run on every PR and push.
- Keep a regression check for slider release behavior: the range value must remain changed after generation completes, not only during drag.
- The smoke test should cover resolution changes because it is the easiest way to catch accidental UI/state reversion.
