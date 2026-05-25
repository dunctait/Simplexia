# Simplex Islands

HTML5 simplex-noise island generator, ported from the original JavaFX experiment and designed for GitHub Pages.

## Phase 1

- Responsive HTML5 canvas UI
- Grid preview and real 3D globe preview
- Deterministic seed, octave, roughness, scale, threshold, grid radial mask, and grid edge fade controls
- Rows and columns can be pushed up to 2048 for high-resolution experiments
- Biome presets
- Export current generation as JSON
- Save/load generations in localStorage
- Unit tests, Playwright E2E checks, and GitHub Actions CI

## Phase 2 Direction

Saved generations are already serializable so they can become simulation inputs. The next layer can add a "run" mode, deployable life forms, biome-specific behavior, and time-step persistence without replacing the generator core.

## Development

```powershell
npm install
npm test
npm run e2e
npm run predeploy
```

See [DEVELOPMENT.md](DEVELOPMENT.md) for the workflow and deployment notes.
