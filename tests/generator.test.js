const test = require('node:test');
const assert = require('node:assert/strict');
const generator = require('../src/generator.js');

test('generation is deterministic for fixed settings', () => {
  const settings = generator.normalizeSettings({ seed: 42, columns: 64, rows: 64 });
  const first = generator.generate(settings);
  const second = generator.generate(settings);
  assert.equal(first.values[20][20], second.values[20][20]);
  assert.deepEqual(first.summary.counts, second.summary.counts);
});

test('generated values are normalized and match requested dimensions', () => {
  const result = generator.generate({ columns: 72, rows: 56, seed: 7 });
  assert.equal(result.values.length, 56);
  assert.equal(result.values[0].length, 72);
  const flat = result.values.flat();
  assert.ok(flat.every((value) => value >= 0 && value <= 1));
});

test('thresholds remain ordered when normalized', () => {
  const settings = generator.normalizeSettings({ seaLevel: 0.5, beachLevel: 0.2, mountainLevel: 0.25 });
  assert.ok(settings.seaLevel < settings.beachLevel);
  assert.ok(settings.beachLevel < settings.mountainLevel);
});

test('export string contains serializable settings', () => {
  const result = generator.generate({ seed: 99 });
  const parsed = JSON.parse(result.exportString);
  assert.equal(parsed.version, 1);
  assert.equal(parsed.settings.seed, 99);
});
