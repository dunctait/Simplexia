importScripts('./simplex-noise.js', './generator.js');

self.onmessage = (event) => {
  const { id, settings, view } = event.data;
  const result = view === 'globe'
    ? self.IslandGenerator.generateGlobe(settings)
    : self.IslandGenerator.generate(settings);
  const transfer = result.values ? result.values.map((row) => row.buffer) : [];
  self.postMessage({ id, result }, transfer);
};
