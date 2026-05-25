const test = require('node:test');
const assert = require('node:assert/strict');
const storage = require('../src/storage.js');

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => map.get(key) || null,
    setItem: (key, value) => map.set(key, value)
  };
}

test('saveGeneration stores newest first and caps records', () => {
  const local = memoryStorage();
  for (let index = 0; index < 26; index += 1) {
    storage.saveGeneration({ id: `id-${index}`, name: `Save ${index}`, settings: { seed: index } }, local);
  }
  const saves = storage.loadAll(local);
  assert.equal(saves.length, 24);
  assert.equal(saves[0].id, 'id-25');
});

test('deleteGeneration removes matching save', () => {
  const local = memoryStorage();
  storage.saveGeneration({ id: 'keep', settings: { seed: 1 } }, local);
  storage.saveGeneration({ id: 'drop', settings: { seed: 2 } }, local);
  const saves = storage.deleteGeneration('drop', local);
  assert.equal(saves.length, 1);
  assert.equal(saves[0].id, 'keep');
});

test('loadAll tolerates malformed storage', () => {
  const local = memoryStorage();
  local.setItem(storage.STORAGE_KEY, '{bad json');
  assert.deepEqual(storage.loadAll(local), []);
});

test('session settings and view state round-trip', () => {
  const local = memoryStorage();
  storage.saveSession({
    settings: { seed: 123, octaves: 6, biomePreset: 'arctic' },
    view: 'globe',
    showGrid: true
  }, local);
  assert.deepEqual(storage.loadSession(local), {
    settings: { seed: 123, octaves: 6, biomePreset: 'arctic' },
    view: 'globe',
    showGrid: true
  });
});

test('loadSession tolerates malformed storage', () => {
  const local = memoryStorage();
  local.setItem(storage.SESSION_KEY, '{bad json');
  assert.equal(storage.loadSession(local), null);
});
