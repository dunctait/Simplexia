(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SimplexIslandsUi = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const generator = window.IslandGenerator;
  const storage = window.IslandStorage;
  const restoredSession = storage.loadSession();
  const state = {
    settings: generator.normalizeSettings(restoredSession ? restoredSession.settings : undefined),
    result: null
  };

  const controlIds = ['resolution', 'continentScale', 'surfaceScale', 'octaves', 'roughness', 'seaLevel', 'beachLevel', 'mountainLevel', 'seed'];
  const ids = [...controlIds, 'biomePreset', 'summary', 'legend', 'toast', 'saveName', 'savedList', 'generation-loading'];
  const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
  const outputs = Object.fromEntries(controlIds.map((id) => [id, document.getElementById(`${id}Out`)]));
  let renderer = null;
  let activeWorker = null;
  let generationId = 0;

  function init({ globeFactory } = {}) {
    renderer = window.IslandRenderer.createRenderer(
      document.getElementById('globe-stage'),
      globeFactory,
      generator
    );
    Object.entries(generator.BIOME_PRESETS).forEach(([id, preset]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = preset.label;
      el.biomePreset.append(option);
    });
    bindControls();
    syncControls();
    refreshSaves();
    window.simplexIslands = { state, regenerate };
    regenerate();
  }

  function bindControls() {
    controlIds.forEach((id) => {
      el[id].addEventListener('input', () => {
        state.settings[id] = Number(el[id].value);
        regenerate();
      });
    });
    el.biomePreset.addEventListener('change', () => {
      state.settings.biomePreset = el.biomePreset.value;
      regenerate();
    });
    document.getElementById('randomize').addEventListener('click', () => {
      state.settings.seed = Math.floor(Math.random() * 256);
      syncControls();
      regenerate();
    });
    document.getElementById('reset').addEventListener('click', () => {
      state.settings = generator.normalizeSettings();
      syncControls();
      regenerate();
    });
    document.getElementById('copy-export').addEventListener('click', copyExport);
    document.getElementById('save').addEventListener('click', saveCurrent);
    document.getElementById('load').addEventListener('click', loadSelected);
    document.getElementById('delete').addEventListener('click', deleteSelected);
    window.addEventListener('resize', () => {
      if (renderer) renderer.resize();
      render();
    });
  }

  function regenerate() {
    state.settings = generator.normalizeSettings(state.settings);
    syncControls();
    persistSession();
    startGeneration(state.settings);
  }

  function startGeneration(settings) {
    generationId += 1;
    const id = generationId;
    if (activeWorker) activeWorker.terminate();
    setLoading(true);
    if (!window.Worker) {
      setTimeout(() => finishGeneration(id, generator.generateGlobe(settings)), 0);
      return;
    }
    try {
      activeWorker = new Worker('src/generation-worker.js');
    } catch {
      setTimeout(() => finishGeneration(id, generator.generateGlobe(settings)), 0);
      return;
    }
    activeWorker.onmessage = (event) => finishGeneration(event.data.id, event.data.result);
    activeWorker.onerror = (event) => {
      if (id !== generationId) return;
      activeWorker = null;
      setLoading(false);
      showToast(event.message || 'Generation failed');
    };
    activeWorker.postMessage({ id, settings, view: 'globe' });
  }

  function finishGeneration(id, result) {
    if (id !== generationId) return;
    if (activeWorker) {
      activeWorker.terminate();
      activeWorker = null;
    }
    state.result = result;
    render();
    setLoading(false);
  }

  function render() {
    if (!state.result) return;
    renderer.render(state.result);
    updateSummary();
    updateLegend();
  }

  function syncControls() {
    Object.entries(outputs).forEach(([id, output]) => {
      el[id].value = state.settings[id];
      output.textContent = formatValue(state.settings[id]);
    });
    el.biomePreset.value = state.settings.biomePreset;
  }

  function persistSession() {
    storage.saveSession({ settings: state.settings, view: 'globe', showGrid: false });
  }

  function setLoading(isLoading) {
    el['generation-loading'].hidden = !isLoading;
  }

  function updateSummary() {
    const land = Math.round(state.result.summary.land * 100);
    const water = Math.round(state.result.summary.water * 100);
    el.summary.textContent = `Seed ${state.settings.seed} | ${land}% land, ${water}% water`;
  }

  function updateLegend() {
    const preset = generator.BIOME_PRESETS[state.settings.biomePreset];
    el.legend.replaceChildren(...preset.biomes.map((biome, index) => {
      const item = document.createElement('span');
      item.innerHTML = `<i style="background:${biome.color}"></i>${biome.label} ${state.result.summary.counts[index]}`;
      return item;
    }));
  }

  async function copyExport() {
    await navigator.clipboard.writeText(state.result.exportString);
    showToast('Generation copied');
  }

  function saveCurrent() {
    const name = el.saveName.value.trim() || `Seed ${state.settings.seed}`;
    storage.saveGeneration({ name, settings: state.settings });
    el.saveName.value = '';
    refreshSaves();
    showToast('Generation saved');
  }

  function loadSelected() {
    const selected = selectedSave();
    if (!selected) return;
    state.settings = generator.normalizeSettings(selected.settings);
    syncControls();
    regenerate();
    showToast('Generation loaded');
  }

  function deleteSelected() {
    const selected = selectedSave();
    if (!selected) return;
    storage.deleteGeneration(selected.id);
    refreshSaves();
    showToast('Generation deleted');
  }

  function selectedSave() {
    return storage.loadAll().find((save) => save.id === el.savedList.value);
  }

  function refreshSaves() {
    el.savedList.replaceChildren(...storage.loadAll().map((save) => {
      const option = document.createElement('option');
      option.value = save.id;
      option.textContent = `${save.name} | seed ${save.settings.seed}`;
      return option;
    }));
  }

  function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.add('is-visible');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => el.toast.classList.remove('is-visible'), 1800);
  }

  function formatValue(value) {
    return Number.isInteger(value) ? value : Number(value).toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  }

  return { init };
});
