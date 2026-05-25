(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./simplex-noise.js'));
  else root.IslandGenerator = factory(root.SimplexNoise);
})(typeof self !== 'undefined' ? self : this, function (SimplexNoise) {
  const DEFAULT_SETTINGS = Object.freeze({
    resolution: 160,
    landmassFrequency: 1.15,
    surfaceScale: 2.2,
    octaves: 4,
    roughness: 0.66,
    seaLevel: 0.21,
    beachLevel: 0.27,
    mountainLevel: 0.6,
    playfulPalette: 1,
    showRings: 0,
    showMoons: 1,
    showClouds: 1,
    showFish: 0,
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
    if (input.columns || input.rows) settings.resolution = Math.round(Math.max(input.columns || 0, input.rows || 0) / 8) * 8;
    if (input.scale && !input.surfaceScale) settings.surfaceScale = clampNumber(input.scale * 180, 1, 9);
    if (input.continentScale && !input.landmassFrequency) settings.landmassFrequency = input.continentScale;
    settings.resolution = clampInt(settings.resolution, 64, 384);
    settings.landmassFrequency = clampNumber(settings.landmassFrequency, 0.45, 2.8);
    settings.surfaceScale = clampNumber(settings.surfaceScale, 1, 9);
    settings.octaves = clampInt(settings.octaves, 1, 8);
    settings.roughness = clampNumber(settings.roughness, 0.1, 1);
    settings.seed = clampInt(settings.seed, 0, 255);
    settings.seaLevel = clampNumber(settings.seaLevel, 0.05, 0.55);
    settings.beachLevel = clampNumber(Math.max(settings.beachLevel, settings.seaLevel + 0.01), 0.08, 0.7);
    settings.mountainLevel = clampNumber(Math.max(settings.mountainLevel, settings.beachLevel + 0.01), 0.3, 0.95);
    settings.playfulPalette = clampInt(settings.playfulPalette, 0, 1);
    settings.showRings = clampInt(settings.showRings, 0, 1);
    settings.showMoons = clampInt(settings.showMoons, 0, 1);
    settings.showClouds = clampInt(settings.showClouds, 0, 1);
    settings.showFish = clampInt(settings.showFish, 0, 1);
    settings.biomePreset = BIOME_PRESETS[settings.biomePreset] ? settings.biomePreset : DEFAULT_SETTINGS.biomePreset;
    return settings;
  }

  function generate(input) {
    return generateGlobe(input);
  }

  function generateGlobe(input) {
    const settings = normalizeSettings(input);
    const sample = createSphericalSampler(settings);
    const values = [];
    const counts = [0, 0, 0, 0];
    const sampleRows = Math.max(48, Math.round(settings.resolution * 0.6));
    const sampleColumns = sampleRows * 2;
    for (let y = 0; y < sampleRows; y += 1) {
      const latitude = -Math.PI / 2 + (y / (sampleRows - 1)) * Math.PI;
      const radius = Math.cos(latitude);
      for (let x = 0; x < sampleColumns; x += 1) {
        const longitude = (x / sampleColumns) * Math.PI * 2;
        const nx = Math.cos(longitude) * radius;
        const ny = Math.sin(latitude);
        const nz = Math.sin(longitude) * radius;
        values.push(sample(nx, ny, nz));
      }
    }
    const low = percentile(values, 0.02);
    const high = percentile(values, 0.98);
    values.forEach((value) => {
      counts[classify(normalizeValue(value, low, high), settings)] += 1;
    });
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
    const continentFrequency = settings.landmassFrequency;
    const detailBaseFrequency = settings.surfaceScale;
    return (nx, ny, nz) => {
      const continentRaw = triPlanarNoise(simplex, nx, ny, nz, continentFrequency, 0);
      const continent = smoothstep(-0.34, 0.52, continentRaw);
      let frequency = detailBaseFrequency;
      let weight = 1;
      let total = 0;
      let weightSum = 0;
      for (let octave = 0; octave < settings.octaves; octave += 1) {
        total += triPlanarNoise(simplex, nx, ny, nz, frequency, octave + 1) * weight;
        weightSum += weight;
        frequency *= 2;
        weight *= settings.roughness;
      }
      const detail = 0.5 + total / (2 * (weightSum || 1));
      const islandChain = smoothstep(0.18, 0.88, triPlanarNoise(simplex, nx, ny, nz, continentFrequency * 2.3, 11));
      const polarIce = Math.max(0, Math.abs(ny) - 0.72) * 0.18;
      const value = continent * 0.58 + detail * 0.16 + islandChain * 0.05 + polarIce - 0.24;
      return clampNumber(value, 0, 1);
    };
  }

  function triPlanarNoise(simplex, nx, ny, nz, frequency, offset) {
    const ox = 17.13 * offset;
    const oy = -29.71 * offset;
    const oz = 43.19 * offset;
    const a = simplex.noise(nx * frequency + 31.7 + ox, ny * frequency - 11.3 + oy);
    const b = simplex.noise(ny * frequency + 19.1 + oy, nz * frequency + 47.2 + oz);
    const c = simplex.noise(nz * frequency - 23.5 + oz, nx * frequency + 7.7 + ox);
    return (a + b + c) / 3;
  }

  function smoothstep(edge0, edge1, value) {
    const x = clampNumber((value - edge0) / (edge1 - edge0), 0, 1);
    return x * x * (3 - 2 * x);
  }

  function percentile(values, ratio) {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)))];
  }

  function normalizeValue(value, low, high) {
    return clampNumber((value - low) / ((high - low) || 1), 0, 1);
  }

  function classify(value, settings) {
    if (value < settings.seaLevel) return 0;
    if (value < settings.beachLevel) return 1;
    if (value < settings.mountainLevel) return 2;
    return 3;
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
