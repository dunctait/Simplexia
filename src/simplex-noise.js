(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SimplexNoise = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const grad3 = [
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [1, 0], [-1, 0], [1, 0], [-1, 0],
    [0, 1], [0, -1], [0, 1], [0, -1]
  ];
  const basePermutation = [
    151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
    190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,
    125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,
    105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,
    135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,
    82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,
    153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,
    251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,
    157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,
    66,215,61,156,180
  ];
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;

  function buildPermutation(seed) {
    const perm = new Array(512);
    const permMod12 = new Array(512);
    for (let i = 0; i < 512; i += 1) {
      perm[i] = (basePermutation[i & 255] + seed) % 255;
      permMod12[i] = perm[i] % 12;
    }
    return { perm, permMod12 };
  }

  function fastFloor(value) {
    const integer = value | 0;
    return value < integer ? integer - 1 : integer;
  }

  function create(seed = 0) {
    const tables = buildPermutation(seed);
    return {
      noise(xin, yin) {
        const s = (xin + yin) * F2;
        const i = fastFloor(xin + s);
        const j = fastFloor(yin + s);
        const t = (i + j) * G2;
        const x0 = xin - (i - t);
        const y0 = yin - (j - t);
        const i1 = x0 > y0 ? 1 : 0;
        const j1 = x0 > y0 ? 0 : 1;
        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1 + 2 * G2;
        const y2 = y0 - 1 + 2 * G2;
        const ii = i & 255;
        const jj = j & 255;
        const gi0 = tables.permMod12[ii + tables.perm[jj]];
        const gi1 = tables.permMod12[ii + i1 + tables.perm[jj + j1]];
        const gi2 = tables.permMod12[ii + 1 + tables.perm[jj + 1]];
        return 70 * (
          contribution(gi0, x0, y0) +
          contribution(gi1, x1, y1) +
          contribution(gi2, x2, y2)
        );
      }
    };
  }

  function contribution(gradientIndex, x, y) {
    let t = 0.5 - x * x - y * y;
    if (t < 0) return 0;
    t *= t;
    const gradient = grad3[gradientIndex];
    return t * t * (gradient[0] * x + gradient[1] * y);
  }

  return { create, buildPermutation };
});
