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
    seed: 0
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
    const settings = { ...DEFAULT_SETTINGS, ...input };
    settings.columns = clampInt(settings.columns, 48, 2048);
    settings.rows = clampInt(settings.rows, 48, 2048);
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
    return settings;
  }

  function generate(input) {
    const settings = normalizeSettings(input);
    const simplex = SimplexNoise.create(settings.seed);
    const values = Array.from({ length: settings.rows }, () => new Float32Array(settings.columns));
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

    return {
      settings,
      values,
      summary: summarize(values, settings),
      exportString: toExportString(settings)
    };
  }

  function generateGlobe(input) {
    const settings = normalizeSettings(input);
    const sample = createSphericalSampler(settings);
    const counts = [0, 0, 0, 0];
    const sampleRows = 96;
    const sampleColumns = 192;
    for (let y = 0; y < sampleRows; y += 1) {
      const latitude = -Math.PI / 2 + (y / (sampleRows - 1)) * Math.PI;
      const radius = Math.cos(latitude);
      for (let x = 0; x < sampleColumns; x += 1) {
        const longitude = (x / sampleColumns) * Math.PI * 2;
        const nx = Math.cos(longitude) * radius;
        const ny = Math.sin(latitude);
        const nz = Math.sin(longitude) * radius;
        counts[classify(sample(nx, ny, nz), settings)] += 1;
      }
    }
    const total = counts.reduce((sum, count) => sum + count, 0);
    return {
      settings,
      globe: true,
      summary: {
        water: counts[0] / total,
        land: (total - counts[0]) / total,
        counts
      },
      exportString: toExportString(settings)
    };
  }

  function sphericalValue(nx, ny, nz, input) {
    const settings = normalizeSettings(input);
    return createSphericalSampler(settings)(nx, ny, nz);
  }

  function createSphericalSampler(input) {
    const settings = normalizeSettings(input);
    const simplex = SimplexNoise.create(settings.seed);
    return (nx, ny, nz) => {
      let frequency = Math.max(0.6, settings.scale * 180);
      let weight = 1;
      let total = 0;
      let weightSum = 0;
      for (let octave = 0; octave < settings.octaves; octave += 1) {
        const a = simplex.noise(nx * frequency + 31.7, ny * frequency - 11.3);
        const b = simplex.noise(ny * frequency + 19.1, nz * frequency + 47.2);
        const c = simplex.noise(nz * frequency - 23.5, nx * frequency + 7.7);
        const blended = (a + b + c) / 3;
        total += blended * weight;
        weightSum += weight;
        frequency *= 2;
        weight *= settings.roughness;
      }
      const continental = 0.5 + total / (2 * (weightSum || 1));
      const polarLift = Math.abs(ny) * 0.08;
      return clampNumber(continental + polarLift, 0, 1);
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

  return { DEFAULT_SETTINGS, BIOME_PRESETS, normalizeSettings, generate, generateGlobe, sphericalValue, createSphericalSampler, classify, toExportString };
});
