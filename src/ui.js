(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SimplexIslandsUi = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const generator = window.IslandGenerator;
  const storage = window.IslandStorage;
  const state = {
    settings: generator.normalizeSettings(),
    result: null,
    view: 'grid',
    showGrid: false
  };

  const ids = [
    'columns', 'rows', 'octaves', 'roughness', 'scale', 'seaLevel', 'beachLevel', 'mountainLevel',
    'edgeFade', 'seed', 'radialEnabled', 'showGrid', 'biomePreset', 'summary', 'legend', 'toast',
    'saveName', 'savedList'
  ];
  const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
  const outputs = Object.fromEntries(['columns', 'rows', 'octaves', 'roughness', 'scale', 'seaLevel', 'beachLevel', 'mountainLevel', 'edgeFade', 'seed'].map((id) => [id, document.getElementById(`${id}Out`)]));
  let renderer = null;

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
    regenerate();
    refreshSaves();
    window.simplexIslands = { state, regenerate };
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
    });
    el.biomePreset.addEventListener('change', () => {
      state.settings.biomePreset = el.biomePreset.value;
      regenerate();
    });
    document.querySelectorAll('[data-view]').forEach((button) => {
      button.addEventListener('click', () => {
        state.view = button.dataset.view;
        document.querySelectorAll('[data-view]').forEach((item) => item.classList.toggle('is-active', item === button));
        render();
      });
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
    state.result = generator.generate(state.settings);
    state.settings = state.result.settings;
    syncControls();
    render();
  }

  function render() {
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
