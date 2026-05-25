(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SimplexIslandsUi = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const generator = window.IslandGenerator;
  const storage = window.IslandStorage;
  const restoredSession = storage.loadSession();
  const state = {
    settings: generator.normalizeSettings(restoredSession ? restoredSession.settings : undefined),
    result: null,
    view: restoredSession ? restoredSession.view : 'globe',
    showGrid: restoredSession ? restoredSession.showGrid : false
  };

  const ids = [
    'columns', 'rows', 'octaves', 'roughness', 'scale', 'seaLevel', 'beachLevel', 'mountainLevel',
    'edgeFade', 'seed', 'radialEnabled', 'showGrid', 'biomePreset', 'summary', 'legend', 'toast',
    'saveName', 'savedList', 'generation-loading'
  ];
  const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
  const outputs = Object.fromEntries(['columns', 'rows', 'octaves', 'roughness', 'scale', 'seaLevel', 'beachLevel', 'mountainLevel', 'edgeFade', 'seed'].map((id) => [id, document.getElementById(`${id}Out`)]));
  let renderer = null;
  let activeWorker = null;
  let generationId = 0;

  function init({ globeFactory } = {}) {
    renderer = window.IslandRenderer.createRenderer(
      document.getElementById('map-canvas'),
      generator,
      document.getElementById('globe-stage'),
      globeFactory
    );
    Object.entries(generator.BIOME_PRESETS).forEach(([id, preset]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = preset.label;
      el.biomePreset.append(option);
    });
    bindControls();
    syncControls();
    syncViewToggle();
    syncModeControls();
    refreshSaves();
    window.simplexIslands = { state, regenerate };
    regenerate();
  }

  function bindControls() {
    ['columns', 'rows', 'octaves', 'roughness', 'scale', 'seaLevel', 'beachLevel', 'mountainLevel', 'edgeFade', 'seed'].forEach((id) => {
      el[id].addEventListener('input', () => {
        state.settings[id] = Number(el[id].value);
        regenerate();
      });
    });
    el.radialEnabled.addEventListener('change', () => {
      state.settings.radialEnabled = el.radialEnabled.checked;
      regenerate();
    });
    el.showGrid.addEventListener('change', () => {
      state.showGrid = el.showGrid.checked;
      render();
      persistSession();
    });
    el.biomePreset.addEventListener('change', () => {
      state.settings.biomePreset = el.biomePreset.value;
      regenerate();
    });
    document.querySelectorAll('[data-view]').forEach((button) => {
      button.addEventListener('click', () => {
        state.view = button.dataset.view;
        syncViewToggle();
        syncModeControls();
        regenerate();
      });
    });
    document.getElementById('randomize').addEventListener('click', () => {
      state.settings.seed = Math.floor(Math.random() * 256);
      syncControls();
      regenerate();
    });
    document.getElementById('reset').addEventListener('click', () => {
      state.settings = generator.normalizeSettings();
      state.view = 'grid';
      state.showGrid = false;
      syncControls();
      syncViewToggle();
      syncModeControls();
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
    syncModeControls();
    persistSession();
    startGeneration(effectiveGenerationSettings());
  }

  function startGeneration(settings) {
    generationId += 1;
    const id = generationId;
    if (activeWorker) activeWorker.terminate();
    setLoading(true);
    if (!window.Worker) {
      setTimeout(() => finishGeneration(id, state.view === 'globe' ? generator.generateGlobe(settings) : generator.generate(settings)), 0);
      return;
    }
    try {
      activeWorker = new Worker('src/generation-worker.js');
    } catch {
      setTimeout(() => finishGeneration(id, state.view === 'globe' ? generator.generateGlobe(settings) : generator.generate(settings)), 0);
      return;
    }
    activeWorker.onmessage = (event) => {
      finishGeneration(event.data.id, event.data.result);
    };
    activeWorker.onerror = (event) => {
      if (id !== generationId) return;
      activeWorker = null;
      setLoading(false);
      showToast(event.message || 'Generation failed');
    };
    activeWorker.postMessage({ id, settings, view: state.view });
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
    renderer.render(state.result, { view: state.view, showGrid: state.showGrid });
    updateSummary();
    updateLegend();
  }

  function syncControls() {
    Object.entries(outputs).forEach(([id, output]) => {
      el[id].value = state.settings[id];
      output.textContent = formatValue(state.settings[id]);
    });
    el.radialEnabled.checked = state.settings.radialEnabled;
    el.showGrid.checked = state.showGrid;
    el.biomePreset.value = state.settings.biomePreset;
  }

  function syncViewToggle() {
    document.querySelectorAll('[data-view]').forEach((item) => {
      item.classList.toggle('is-active', item.dataset.view === state.view);
    });
  }

  function syncModeControls() {
    document.querySelectorAll('.grid-mask-control').forEach((item) => {
      item.classList.toggle('is-muted', state.view === 'globe');
      item.title = state.view === 'globe' ? 'Grid-only island mask control' : '';
    });
  }

  function effectiveGenerationSettings() {
    if (state.view !== 'globe') return state.settings;
    return {
      ...state.settings,
      edgeFade: 0,
      radialEnabled: false
    };
  }

  function persistSession() {
    storage.saveSession({
      settings: state.settings,
      view: state.view,
      showGrid: state.showGrid
    });
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
    const saves = storage.loadAll();
    return saves.find((save) => save.id === el.savedList.value);
  }

  function refreshSaves() {
    const saves = storage.loadAll();
    el.savedList.replaceChildren(...saves.map((save) => {
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
    return Number.isInteger(value) ? value : Number(value).toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  }

  return { init };
});
