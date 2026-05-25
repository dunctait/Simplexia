importScripts('./simplex-noise.js', './generator.js');

self.onmessage = (event) => {
  const { id, settings } = event.data;
  const result = self.IslandGenerator.generateGlobe(settings);
  self.postMessage({ id, result });
};
