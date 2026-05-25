(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./simplex-noise.js'));
  else root.IslandGenerator = factory(root.SimplexNoise);
})(typeof self !== 'undefined' ? self : this, function (SimplexNoise) {
  const DEFAULT_SETTINGS = Object.freeze({
    columns: 128,
    rows: 128,
    octaves: 4,
    roughness: 0.66,
    scale: 0.012,
    seaLevel: 0.21,
    beachLevel: 0.27,
    mountainLevel: 0.6,
    edgeFade: 0.08,
    radialEnabled: true,
    biomePreset: 'classic',
    seed: 0,
    start: { x: 64, y: 64 }
  });

  const BIOME_PRESETS = Object.freeze({
    classic: {
      label: 'Classic Islands',
      biomes: [
        { id: 'sea', label: 'Sea', color: '#123f7a' },
        { id: 'beach', label: 'Beach', color: '#d8ad6a' },
        { id: 'forest', label: 'Forest', color: '#32915b' },
        { id: 'mountain', label: 'Mountain', color: '#d7dce0' }
      ]
    },
    volcanic: {
      label: 'Volcanic',
      biomes: [
        { id: 'deep', label: 'Deep Water', color: '#10283f' },
        { id: 'ash', label: 'Ash Shore', color: '#8c7a67' },
        { id: 'jungle', label: 'Jungle', color: '#236c45' },
        { id: 'lava', label: 'Lava Rock', color: '#c4512d' }
      ]
    },
    arctic: {
      label: 'Arctic',
      biomes: [
        { id: 'fjord', label: 'Fjord', color: '#174b68' },
        { id: 'tundra', label: 'Tundra', color: '#a8c2b2' },
        { id: 'pine', label: 'Pine', color: '#3b6c61' },
        { id: 'ice', label: 'Ice Cap', color: '#f0f8fa' }
      ]
    }
  });

  function normalizeSettings(input = {}) {
    const settings = { ...DEFAULT_SETTINGS, ...input, start: { ...DEFAULT_SETTINGS.start, ...(input.start || {}) } };
    settings.columns = clampInt(settings.columns, 48, 256);
    settings.rows = clampInt(settings.rows, 48, 256);
    settings.octaves = clampInt(settings.octaves, 1, 8);
    settings.roughness = clampNumber(settings.roughness, 0.1, 1);
    settings.scale = clampNumber(settings.scale, 0.003, 0.05);
    settings.edgeFade = clampNumber(settings.edgeFade, 0, 0.35);
    settings.seed = clampInt(settings.seed, 0, 255);
    settings.seaLevel = clampNumber(settings.seaLevel, 0.05, 0.55);
    settings.beachLevel = clampNumber(Math.max(settings.beachLevel, settings.seaLevel + 0.01), 0.08, 0.7);
    settings.mountainLevel = clampNumber(Math.max(settings.mountainLevel, settings.beachLevel + 0.01), 0.3, 0.95);
    settings.radialEnabled = Boolean(settings.radialEnabled);
    settings.biomePreset = BIOME_PRESETS[settings.biomePreset] ? settings.biomePreset : DEFAULT_SETTINGS.biomePreset;
    settings.start.x = clampInt(settings.start.x, 0, settings.columns - 1);
    settings.start.y = clampInt(settings.start.y, 0, settings.rows - 1);
    return settings;
  }

  function generate(input) {
    const settings = normalizeSettings(input);
    const simplex = SimplexNoise.create(settings.seed);
    const values = Array.from({ length: settings.rows }, () => new Array(settings.columns).fill(0));
    let frequency = settings.scale;
    let weight = 1;

    for (let octave = 0; octave < settings.octaves; octave += 1) {
      for (let y = 0; y < settings.rows; y += 1) {
        for (let x = 0; x < settings.columns; x += 1) {
          values[y][x] += simplex.noise(x * frequency, y * frequency) * weight;
        }
      }
      frequency *= 2;
      weight *= settings.roughness;
    }

    normalize(values);
    if (settings.radialEnabled) applyRadialMask(values);
    applyEdgeMask(values, settings.edgeFade);
    normalize(values);

    if (classify(values[settings.start.y][settings.start.x], settings) === 0) {
      settings.start = findNearestLand(values, settings);
    }

    return {
      settings,
      values,
      summary: summarize(values, settings),
      exportString: toExportString(settings)
    };
  }

  function classify(value, settings) {
    if (value < settings.seaLevel) return 0;
    if (value < settings.beachLevel) return 1;
    if (value < settings.mountainLevel) return 2;
    return 3;
  }

  function summarize(values, settings) {
    const counts = [0, 0, 0, 0];
    values.forEach((row) => row.forEach((value) => { counts[classify(value, settings)] += 1; }));
    const total = settings.columns * settings.rows;
    return {
      water: counts[0] / total,
      land: (total - counts[0]) / total,
      counts
    };
  }

  function normalize(values) {
    let min = Infinity;
    let max = -Infinity;
    values.forEach((row) => row.forEach((value) => {
      min = Math.min(min, value);
      max = Math.max(max, value);
    }));
    const divisor = max - min || 1;
    values.forEach((row, y) => row.forEach((value, x) => {
      values[y][x] = (value - min) / divisor;
    }));
  }

  function applyRadialMask(values) {
    const rows = values.length;
    const columns = values[0].length;
    const centerX = (columns - 1) / 2;
    const centerY = (rows - 1) / 2;
    const furthest = Math.sqrt(centerX * centerX + centerY * centerY) || 1;
    values.forEach((row, y) => row.forEach((value, x) => {
      const dx = centerX - x;
      const dy = centerY - y;
      values[y][x] = value * Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / furthest);
    }));
  }

  function applyEdgeMask(values, edgeFade) {
    if (edgeFade <= 0) return;
    const rows = values.length;
    const columns = values[0].length;
    values.forEach((row, y) => row.forEach((value, x) => {
      const edgeDistance = Math.min(x / columns, y / rows, 1 - x / columns, 1 - y / rows);
      const factor = Math.min(1, edgeDistance / edgeFade);
      values[y][x] = value * factor;
    }));
  }

  function findNearestLand(values, settings) {
    const cx = Math.floor(settings.columns / 2);
    const cy = Math.floor(settings.rows / 2);
    let best = { x: cx, y: cy };
    let bestDistance = Infinity;
    values.forEach((row, y) => row.forEach((value, x) => {
      if (classify(value, settings) === 0) return;
      const distance = (x - cx) ** 2 + (y - cy) ** 2;
      if (distance < bestDistance) {
        best = { x, y };
        bestDistance = distance;
      }
    }));
    return best;
  }

  function toExportString(settings) {
    return JSON.stringify({ version: 1, settings }, null, 2);
  }

  function clampInt(value, min, max) {
    return Math.round(clampNumber(value, min, max));
  }

  function clampNumber(value, min, max) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return min;
    return Math.min(max, Math.max(min, numeric));
  }

  return { DEFAULT_SETTINGS, BIOME_PRESETS, normalizeSettings, generate, classify, toExportString };
});
