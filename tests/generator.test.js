const test = require('node:test');
const assert = require('node:assert/strict');
const generator = require('../src/generator.js');

test('generation is deterministic for fixed settings', () => {
  const settings = generator.normalizeSettings({ seed: 42, resolution: 96 });
  const first = generator.generate(settings);
  const second = generator.generate(settings);
  assert.equal(first.globe, true);
  assert.deepEqual(first.summary.counts, second.summary.counts);
});

test('globe generation has normalized summary values', () => {
  const result = generator.generateGlobe({ resolution: 96, seed: 7 });
  assert.equal(result.globe, true);
  assert.equal(result.values, undefined);
  assert.ok(result.summary.water >= 0 && result.summary.water <= 1);
  assert.ok(result.summary.land >= 0 && result.summary.land <= 1);
});

test('thresholds remain ordered when normalized', () => {
  const settings = generator.normalizeSettings({ seaLevel: 0.5, beachLevel: 0.2, mountainLevel: 0.25 });
  assert.ok(settings.seaLevel < settings.beachLevel);
  assert.ok(settings.beachLevel < settings.mountainLevel);
});

test('resolution normalizes to globe rendering range', () => {
  const settings = generator.normalizeSettings({ resolution: 5000 });
  assert.equal(settings.resolution, 384);
});

test('legacy rows and columns normalize into resolution', () => {
  const settings = generator.normalizeSettings({ columns: 2048, rows: 1024 });
  assert.equal(settings.resolution, 384);
});

test('legacy continentScale normalizes into landmassFrequency', () => {
  const settings = generator.normalizeSettings({ continentScale: 2.1 });
  assert.equal(settings.landmassFrequency, 2.1);
});

test('planet feature toggles are normalized as binary flags', () => {
  const settings = generator.normalizeSettings({ showRings: 7, showMoons: -1, showClouds: 0, showFish: 1, playfulPalette: 3 });
  assert.equal(settings.showRings, 1);
  assert.equal(settings.showMoons, 0);
  assert.equal(settings.showClouds, 0);
  assert.equal(settings.showFish, 1);
  assert.equal(settings.playfulPalette, 1);
});

test('globe generation produces deterministic summary without grid values', () => {
  const first = generator.generateGlobe({ seed: 12, octaves: 5 });
  const second = generator.generateGlobe({ seed: 12, octaves: 5 });
  assert.equal(first.globe, true);
  assert.equal(first.values, undefined);
  assert.deepEqual(first.summary.counts, second.summary.counts);
});

test('export string contains serializable settings', () => {
  const result = generator.generate({ seed: 99 });
  const parsed = JSON.parse(result.exportString);
  assert.equal(parsed.version, 1);
  assert.equal(parsed.settings.seed, 99);
});
