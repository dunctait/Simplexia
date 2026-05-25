(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IslandRenderer = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  function createRenderer(canvas, generator) {
    const ctx = canvas.getContext('2d', { alpha: false });
    let current = null;
    let options = { view: 'grid', showGrid: false };

    function render(result, nextOptions = {}) {
      current = result;
      options = { ...options, ...nextOptions };
      resizeCanvas(canvas);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (options.view === 'globe') renderGlobe(ctx, canvas, result, generator);
      else renderGrid(ctx, canvas, result, generator, options.showGrid);
      return current;
    }

    function tileFromPointer(clientX, clientY) {
      if (!current) return null;
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor(((clientX - rect.left) / rect.width) * current.settings.columns);
      const y = Math.floor(((clientY - rect.top) / rect.height) * current.settings.rows);
      if (x < 0 || y < 0 || x >= current.settings.columns || y >= current.settings.rows) return null;
      return { x, y };
    }

    return { render, tileFromPointer };
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
    drawStart(ctx, result, cellW, cellH);
  }

  function renderGlobe(ctx, canvas, result, generator) {
    const { settings, values } = result;
    const preset = generator.BIOME_PRESETS[settings.biomePreset];
    const radius = canvas.width * 0.45;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    ctx.fillStyle = '#0b1119';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let py = Math.floor(cy - radius); py <= Math.ceil(cy + radius); py += 1) {
      for (let px = Math.floor(cx - radius); px <= Math.ceil(cx + radius); px += 1) {
        const nx = (px - cx) / radius;
        const ny = (py - cy) / radius;
        if (nx * nx + ny * ny > 1) continue;
        const sx = Math.floor(((Math.atan2(nx, Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))) / Math.PI) + 0.5) * settings.columns);
        const sy = Math.floor(((ny + 1) / 2) * settings.rows);
        const color = preset.biomes[generator.classify(values[clamp(sy, 0, settings.rows - 1)][clamp(sx, 0, settings.columns - 1)], settings)].color;
        ctx.fillStyle = shade(color, 0.72 + 0.28 * Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)));
        ctx.fillRect(px, py, 1, 1);
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = Math.max(2, canvas.width * 0.004);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
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

  function drawStart(ctx, result, cellW, cellH) {
    ctx.fillStyle = '#e13d49';
    ctx.strokeStyle = '#ffffff';
    const x = result.settings.start.x * cellW;
    const y = result.settings.start.y * cellH;
    ctx.beginPath();
    ctx.arc(x + cellW / 2, y + cellH / 2, Math.max(4, Math.min(cellW, cellH) * 1.6), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  function shade(hex, factor) {
    const value = Number.parseInt(hex.slice(1), 16);
    const r = clamp(Math.round(((value >> 16) & 255) * factor), 0, 255);
    const g = clamp(Math.round(((value >> 8) & 255) * factor), 0, 255);
    const b = clamp(Math.round((value & 255) * factor), 0, 255);
    return `rgb(${r},${g},${b})`;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  return { createRenderer };
});
