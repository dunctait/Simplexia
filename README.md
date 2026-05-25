# Simplex Islands

HTML5 procedural planet generator designed for GitHub Pages.

## Phase 1

- Responsive Three.js/WebGL globe UI
- Deterministic seed, resolution, continent scale, surface detail, roughness, sea level, and biome controls
- Worker-backed async generation with stale-run cancellation
- Biome presets
- Export current generation as JSON
- Save/load generations in localStorage
- Unit tests, Playwright E2E checks, and GitHub Actions CI

## Phase 2 Direction

Saved generations are already serializable so they can become simulation inputs. The next layer can add a "run" mode, deployable life forms, climate, clouds, rivers, or biome-specific behavior without replacing the generator core.

## Development

```powershell
npm install
npm test
npm run e2e
npm run predeploy
```

See [DEVELOPMENT.md](DEVELOPMENT.md) for the workflow and deployment notes.
