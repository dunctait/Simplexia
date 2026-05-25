(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IslandRenderer = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  function createRenderer(globeStage, globeFactory, generator) {
    const globe = globeFactory(globeStage, generator);

    function render(result) {
      globe.render(result);
      return result;
    }

    return { render, resize: () => globe.resize() };
  }

  return { createRenderer };
});
