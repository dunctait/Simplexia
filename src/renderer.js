(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IslandRenderer = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  function createRenderer(canvas, generator, globeStage, globeFactory) {
    const ctx = canvas.getContext('2d', { alpha: false });
    let current = null;
    let options = { view: 'grid', showGrid: false };
    let globe = null;

    function render(result, nextOptions = {}) {
      current = result;
      options = { ...options, ...nextOptions };
      if (options.view === 'globe' && globeStage && globeFactory) {
        canvas.hidden = true;
        globeStage.hidden = false;
        if (!globe) globe = globeFactory(globeStage, generator);
        globe.render(result);
      } else {
        if (globeStage) globeStage.hidden = true;
        canvas.hidden = false;
        resizeCanvas(canvas);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        renderGrid(ctx, canvas, result, generator, options.showGrid);
      }
      return current;
    }

    return { render, resize: () => globe && globe.resize() };
  }

  function resizeCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const size = Math.max(240, Math.floor(Math.min(rect.width, rect.height) * devicePixelRatio));
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size;
      canvas.height = size;
    }
  }

  function renderGrid(ctx, canvas, result, generator, showGrid) {
    const { settings, values } = result;
    const preset = generator.BIOME_PRESETS[settings.biomePreset];
    const cellW = canvas.width / settings.columns;
    const cellH = canvas.height / settings.rows;
    for (let y = 0; y < settings.rows; y += 1) {
      for (let x = 0; x < settings.columns; x += 1) {
        ctx.fillStyle = preset.biomes[generator.classify(values[y][x], settings)].color;
        ctx.fillRect(Math.floor(x * cellW), Math.floor(y * cellH), Math.ceil(cellW), Math.ceil(cellH));
      }
    }
    if (showGrid && cellW >= 3) drawGrid(ctx, canvas, settings, cellW, cellH);
  }

  function drawGrid(ctx, canvas, settings, cellW, cellH) {
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= settings.columns; x += 8) {
      ctx.beginPath();
      ctx.moveTo(Math.floor(x * cellW), 0);
      ctx.lineTo(Math.floor(x * cellW), canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= settings.rows; y += 8) {
      ctx.beginPath();
      ctx.moveTo(0, Math.floor(y * cellH));
      ctx.lineTo(canvas.width, Math.floor(y * cellH));
      ctx.stroke();
    }
  }

  return { createRenderer };
});
