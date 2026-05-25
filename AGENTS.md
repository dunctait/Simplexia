# Simplex Islands Agent Instructions

## Project Overview

Simplex Islands is an HTML5 port of the original JavaFX simplex-noise island generator. It is hosted directly from GitHub Pages and is designed for autonomous development with fast local checks, unit tests, and Playwright smoke tests.

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
```

## Architecture

- `src/simplex-noise.js` ports the deterministic 2D simplex noise implementation.
- `src/generator.js` owns terrain settings, map generation, masks, biome classification, summaries, and exports.
- `src/storage.js` owns localStorage persistence and normalization.
- `src/renderer.js` owns canvas rendering and pointer-to-tile conversion.
- `src/ui.js` owns DOM binding, state updates, save/load controls, and app orchestration.

Boundary rules:

- generation logic stays DOM-free and canvas-free
- rendering stays mutation-light and does not regenerate maps
- storage accepts and returns plain serializable generation snapshots

## UX Constraints

- Mobile-first, usable in portrait and landscape
- Touch targets must remain at least 40px high
- Controls must not overlap the canvas or each other
- Grid and globe modes must render from the same generated map data

## Harness Notes

- Add tests before or alongside behavior changes.
- Keep the unit suite deterministic by using fixed seeds.
- Keep E2E focused on critical autonomous checks: app loads, controls mutate state, canvas is nonblank, saves persist, and mobile layout is coherent.
- CI should remain fast enough to run on every PR and push.
