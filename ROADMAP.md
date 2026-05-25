# Simplexia Roadmap

## Product Direction

Primary experience is now "randomize and explore a living toy planet" with advanced controls hidden behind a secondary panel.

## Phase 1.5 (Current Focus)

1. Keep globe interaction smooth on mobile (spin, pinch-zoom, inertia).
2. Maintain fast async generation with cancellation.
3. Keep visual style playful and readable for young players.
4. Preserve deterministic seeds and local save/load behavior.

## Phase 2 (Play Layer)

1. Placeable towns with population tiers.
2. Biome-specific land creatures with simple idle/walk loops.
3. Sea life system with fish schools, jump arcs, and surface ripples.
4. Cloud/weather states (clear, scattered, overcast, storm bands).
5. Day/night cycle with city lights and moon phases.
6. Collectible "planet postcards" from saved seeds.

## Phase 3 (Simulation Layer)

1. Rivers generated from elevation flow.
2. Moisture + temperature maps driving richer biome blends.
3. Seasonal biome transitions.
4. Resource overlays (wood, stone, fish, fertile zones).
5. Autonomous settlement growth rules.
6. Light ecology loop (predator/prey balance by biome).

## Phase 4 (Creator Layer)

1. Brush tools for raising/lowering terrain.
2. Biome paint tools.
3. Object stamping (towns, forests, reefs, volcanoes).
4. Preset packs (tropical, arctic, volcanic, candy world).
5. Export screenshot/video capture mode.
6. Shareable seed links with encoded settings.

## Phase 5 (Systems + Harness)

1. Scenario tests for generation quality thresholds.
2. Performance budget checks for low-end mobile.
3. Golden-image rendering tests for visual regressions.
4. Property migration tests for backward compatibility.
5. Determinism checks across browsers and devices.
6. CI matrix for desktop and mobile viewport runs.

## External Inspiration To Borrow

1. Real-time erosion + river tools (World Creator, World Machine).
2. Terrain stamping and biome masks (Gaia).
3. Climate-driven world rules (StellarGen-style planetary constraints).
4. Procedural cloud/atmosphere layering from modern planet generator demos.
5. "View modes" from simulation-style generators (elevation, moisture, temperature, biome, resources).

## Suggested Asset Directions

1. Voxel creature/building packs (CC0 or permissive license) for style consistency.
2. Low-poly animated fish packs for jump/school behavior.
3. Stylized cloud/noise texture sets for child-friendly rendering.
4. Ambient space SFX and water SFX bundles.
5. Sticker-like UI icon packs for kid-oriented controls.

## Stretch Ideas (12+ Additional)

1. Ring customization (thickness, tilt, color).
2. Multi-moon count slider.
3. Aurora bands near poles.
4. Volcano eruption events.
5. Meteor shower events.
6. Rainbow weather effect after rain.
7. Balloon/airship visitors.
8. Whale-like mega-fish rare spawn.
9. Tiny roads between nearby towns.
10. Biome music layers.
11. Parent lock for advanced settings.
12. Story mode prompts ("Make a water world", "Build 3 towns").
13. Creature naming and favorites.
14. Planet "mood" slider (calm, lively, chaotic).
15. In-game camera bookmarks for favorite views.

## Reference Links

- Gaia feature list: https://www.procedural-worlds.com/products/indie/gaia/
- World Creator features: https://www.world-creator.com/en/features.phtml
- World Machine overview: https://www.world-machine.com/
- StellarGen planetary system generator: https://www.stellargen.space/
- Procedural planet demo discussion (biomes/oceans/atmosphere): https://www.reddit.com/r/proceduralgeneration/comments/1rju11y/procedural_planet_with_biomes_oceans_and/
