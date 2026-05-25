# Simplex Islands

HTML5 simplex-noise island generator, ported from the original JavaFX experiment and designed for GitHub Pages.

## Phase 1

- Responsive HTML5 canvas UI
- Grid and globe preview modes
- Deterministic seed, octave, roughness, scale, threshold, radial mask, and edge fade controls
- Biome presets
- Click/tap to select a land start tile
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
