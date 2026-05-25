(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IslandStorage = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const STORAGE_KEY = 'simplex-islands.generations.v1';

  function loadAll(storage = globalThis.localStorage) {
    try {
      const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter(isValidSave) : [];
    } catch {
      return [];
    }
  }

  function saveGeneration(record, storage = globalThis.localStorage) {
    const saves = loadAll(storage);
    const clean = {
      id: record.id || `island-${Date.now()}`,
      name: String(record.name || 'Untitled island').slice(0, 40),
      createdAt: record.createdAt || new Date().toISOString(),
      settings: record.settings
    };
    const next = [clean, ...saves.filter((save) => save.id !== clean.id)].slice(0, 24);
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
    return clean;
  }

  function deleteGeneration(id, storage = globalThis.localStorage) {
    const next = loadAll(storage).filter((save) => save.id !== id);
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  function isValidSave(value) {
    return value && typeof value.id === 'string' && value.settings && typeof value.settings === 'object';
  }

  return { STORAGE_KEY, loadAll, saveGeneration, deleteGeneration };
});
