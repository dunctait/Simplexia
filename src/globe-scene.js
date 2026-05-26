import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

const FISH_OBJ_URL = 'assets/fish/quaternius/Fish1.obj';
const BUILDING_OBJ_URLS = [
  'assets/buildings/quaternius/House2.obj',
  'assets/buildings/quaternius/Shop.obj',
  'assets/buildings/quaternius/Flat2.obj'
];
let fishPrototypePromise = null;
let fishPrototypeGeometry = null;
let buildingPrototypePromise = null;
let buildingPrototypeGeometries = [];

export function createGlobeScene(container, generator) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x081229);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  let cameraDistance = 5.5;
  camera.position.set(0, 0.2, cameraDistance);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.replaceChildren(renderer.domElement);

  const key = new THREE.DirectionalLight(0xfff7cc, 2.9);
  key.position.set(4, 2.2, 3.2);
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0xd4f5ff, 0x122032, 0.86));
  scene.add(createStars());
  const planetGroup = new THREE.Group();
  scene.add(planetGroup);
  let lastResult = null;
  let buildingRefreshTriggered = false;
  preloadFishPrototype();
  preloadBuildingPrototypes().then(() => {
    if (lastResult && !buildingRefreshTriggered) {
      buildingRefreshTriggered = true;
      render(lastResult);
    }
  });

  let mesh = null;
  let ocean = null;
  let atmosphere = null;
  let clouds = null;
  let rings = null;
  let moons = [];
  let fish = [];
  let towns = [];
  let animals = [];
  let fishJumpData = [];
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let velocityX = 0;
  let velocityY = 0;
  let autoSpin = true;
  const qDelta = new THREE.Quaternion();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const cameraRight = new THREE.Vector3(1, 0, 0);
  const initialEuler = new THREE.Euler(-0.2, -0.45, 0, 'YXZ');
  planetGroup.quaternion.setFromEuler(initialEuler);
  const pointers = new Map();
  let pinchDistance = 0;

  container.addEventListener('touchmove', (event) => event.preventDefault(), { passive: false });
  container.addEventListener('wheel', (event) => {
    event.preventDefault();
    applyZoom(event.deltaY * 0.0022);
  }, { passive: false });
  container.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    velocityX = 0;
    velocityY = 0;
    container.setPointerCapture(event.pointerId);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });
  container.addEventListener('pointermove', (event) => {
    if (!mesh) return;
    if (pointers.has(event.pointerId)) pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const nextDistance = Math.hypot(a.x - b.x, a.y - b.y);
      velocityX = 0;
      velocityY = 0;
      if (pinchDistance > 0) applyZoom((pinchDistance - nextDistance) * 0.0105);
      pinchDistance = nextDistance;
      return;
    }
    if (!dragging) return;
    event.preventDefault();
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    if (dx !== 0 || dy !== 0) autoSpin = false;
    const zoomFactor = Math.max(0.55, Math.min(1.45, cameraDistance / 5.5));
    velocityY = dx * 0.011 * zoomFactor;
    velocityX = dy * 0.0085 * zoomFactor;
    applyOrbitDelta(velocityY, velocityX);
    lastX = event.clientX;
    lastY = event.clientY;
    draw();
  });
  container.addEventListener('pointerup', (event) => {
    pointers.delete(event.pointerId);
    dragging = pointers.size > 0;
    if (pointers.size < 2) {
      pinchDistance = 0;
      velocityX = 0;
      velocityY = 0;
    }
  });
  container.addEventListener('pointercancel', (event) => {
    pointers.delete(event.pointerId);
    dragging = pointers.size > 0;
    if (pointers.size < 2) {
      pinchDistance = 0;
      velocityX = 0;
      velocityY = 0;
    }
  });

  function applyZoom(delta) {
    if (Math.abs(delta) > 0.00001) autoSpin = false;
    cameraDistance = Math.max(3.3, Math.min(8.6, cameraDistance + delta));
    camera.position.z = cameraDistance;
    camera.updateProjectionMatrix();
    draw();
  }

  function applyOrbitDelta(deltaYaw, deltaPitch) {
    if (!mesh) return;
    if (deltaYaw) {
      qDelta.setFromAxisAngle(worldUp, deltaYaw);
      planetGroup.quaternion.premultiply(qDelta);
    }
    if (deltaPitch) {
      qDelta.setFromAxisAngle(cameraRight, deltaPitch);
      planetGroup.quaternion.premultiply(qDelta);
    }
  }

  function render(result) {
    lastResult = result;
    resize();
    clearPlanet();
    const { geometry, markers } = createTerrainSphere(result, generator);
    const segments = resolutionSegments(result);
    const settings = result.settings;
    const playful = Boolean(settings.playfulPalette);

    mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 }));
    ocean = new THREE.Mesh(
      new THREE.SphereGeometry(1.552, segments, Math.max(48, Math.round(segments * 0.62))),
      new THREE.MeshPhysicalMaterial({
        color: playful ? 0x3a78ff : 0x163d75,
        transparent: true,
        opacity: playful ? 0.66 : 0.54,
        roughness: 0.22,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        depthWrite: false
      })
    );
    atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.64, segments, Math.max(48, Math.round(segments * 0.62))),
      new THREE.MeshBasicMaterial({
        color: 0x9dd7ff,
        transparent: true,
        opacity: 0.11,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false
      })
    );
    if (settings.cloudCoverage > 0.01) clouds = createCloudLayer(segments, settings.seed, settings.cloudCoverage);
    if (settings.showRings) rings = createRings(playful);
    if (settings.moonCount > 0) moons = createMoons(playful, settings.moonCount, settings.seed);
    if (settings.showFish) ({ fish, fishJumpData } = createSeaFish(markers.sea, playful, settings.seed));
    towns = createTowns(markers.landByBiome[1], markers.landByBiome[2], playful, settings.seed);
    if (buildingPrototypeGeometries.length) buildingRefreshTriggered = true;
    animals = createLandAnimals(markers.landByBiome, playful, settings.seed);

    [mesh, ocean, atmosphere, clouds, rings, ...towns, ...animals, ...fish, ...moons.map((item) => item.mesh)]
      .filter(Boolean)
      .forEach((item) => planetGroup.add(item));

    container.dataset.resolution = String(result.settings.resolution);
    container.dataset.vertexCount = String(geometry.attributes.position.count);
    draw();
  }

  function clearPlanet() {
    [mesh, ocean, atmosphere, clouds, rings, ...towns, ...animals, ...fish].forEach((item) => {
      if (!item) return;
      if (item.geometry) item.geometry.dispose();
      if (item.material) item.material.dispose();
      planetGroup.remove(item);
    });
    moons.map((item) => item.mesh).forEach((item) => {
      if (!item) return;
      if (item.geometry) item.geometry.dispose();
      if (item.material) item.material.dispose();
      planetGroup.remove(item);
    });
    mesh = null;
    ocean = null;
    atmosphere = null;
    clouds = null;
    rings = null;
    moons = [];
    towns = [];
    animals = [];
    fish = [];
    fishJumpData = [];
  }

  function resize() {
    const rect = container.getBoundingClientRect();
    const size = Math.max(240, Math.floor(Math.min(rect.width, rect.height)));
    renderer.setSize(size, size, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
  }

  function draw() {
    if (!mesh) return;
    renderer.render(scene, camera);
  }

  function animate() {
    if (mesh && !container.hidden) {
      if (!dragging && pointers.size < 2) {
        applyOrbitDelta(velocityY || (autoSpin ? 0.0032 : 0), velocityX);
        velocityX *= 0.94;
        velocityY *= 0.94;
        if (Math.abs(velocityX) < 0.0004) velocityX = 0;
        if (Math.abs(velocityY) < 0.0004) velocityY = 0;
      }
      const elapsed = performance.now() * 0.001;
      if (clouds) clouds.rotation.y += 0.0012;
      moons.forEach((moon) => {
        const phase = elapsed * moon.speed + moon.offset;
        moon.mesh.position.set(Math.cos(phase) * moon.radius, Math.sin(phase * 0.6) * moon.height, Math.sin(phase) * moon.radius);
      });
      fish.forEach((meshItem, index) => {
        const jump = fishJumpData[index];
        const t = elapsed * jump.speed + jump.offset;
        const swimX = Math.cos(t * 0.9) * jump.swimRadius;
        const swimY = Math.sin(t * 0.9) * jump.swimRadius;
        const onSurface = new THREE.Vector3()
          .copy(jump.normal)
          .multiplyScalar(jump.surfaceRadius)
          .addScaledVector(jump.tangent, swimX)
          .addScaledVector(jump.bitangent, swimY)
          .normalize();
        const wave = Math.sin(t);
        const normalized = 0.5 + 0.5 * wave;
        const radius = jump.surfaceRadius - jump.submergeDepth + normalized * (jump.submergeDepth + jump.jumpHeight);
        meshItem.position.copy(onSurface).multiplyScalar(radius);
        if (wave >= 0) meshItem.lookAt(meshItem.position.clone().add(onSurface));
        else meshItem.lookAt(meshItem.position.clone().addScaledVector(onSurface, -1));
      });
      animals.forEach((animal, index) => {
        const bob = 0.007 * Math.sin(elapsed * (1.7 + index * 0.2) + index);
        animal.position.multiplyScalar((1.566 + bob) / animal.position.length());
      });
      draw();
    }
    requestAnimationFrame(animate);
  }
  animate();

  return {
    render,
    resize,
    setAutoSpin(enabled) {
      autoSpin = Boolean(enabled);
    }
  };
}

function preloadFishPrototype() {
  if (fishPrototypeGeometry || fishPrototypePromise) return fishPrototypePromise;
  fishPrototypePromise = new Promise((resolve) => {
    const loader = new OBJLoader();
    loader.load(
      FISH_OBJ_URL,
      (obj) => {
        let meshGeometry = null;
        obj.traverse((node) => {
          if (!meshGeometry && node.isMesh && node.geometry) meshGeometry = node.geometry.clone();
        });
        if (meshGeometry) {
          meshGeometry.computeBoundingBox();
          if (meshGeometry.boundingBox) {
            const center = new THREE.Vector3();
            meshGeometry.boundingBox.getCenter(center);
            meshGeometry.translate(-center.x, -center.y, -center.z);
          }
          meshGeometry.computeVertexNormals();
          meshGeometry.scale(0.016, 0.016, 0.016);
          fishPrototypeGeometry = meshGeometry;
        }
        resolve(fishPrototypeGeometry);
      },
      undefined,
      () => resolve(null)
    );
  });
  return fishPrototypePromise;
}

function preloadBuildingPrototypes() {
  if (buildingPrototypeGeometries.length || buildingPrototypePromise) return buildingPrototypePromise;
  buildingPrototypePromise = Promise.all(BUILDING_OBJ_URLS.map((url) => loadObjGeometry(url))).then((geometries) => {
    buildingPrototypeGeometries = geometries.filter(Boolean);
    return buildingPrototypeGeometries;
  }).catch(() => {
    buildingPrototypeGeometries = [];
    return [];
  });
  return buildingPrototypePromise;
}

function loadObjGeometry(url) {
  return new Promise((resolve) => {
    const loader = new OBJLoader();
    fetch(url)
      .then((response) => (response.ok ? response.text() : Promise.reject(new Error(`Failed ${url}`))))
      .then((text) => {
        const obj = loader.parse(text);
      let geometry = null;
      obj.traverse((node) => {
        if (!geometry && node.isMesh && node.geometry) geometry = node.geometry.clone();
      });
      if (!geometry) {
        resolve(null);
        return;
      }
      geometry.computeBoundingBox();
      if (geometry.boundingBox) {
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        geometry.boundingBox.getCenter(center);
        geometry.boundingBox.getSize(size);
        const maxEdge = Math.max(size.x || 1, size.y || 1, size.z || 1);
        geometry.translate(-center.x, -geometry.boundingBox.min.y, -center.z);
        const scale = 0.11 / maxEdge;
        geometry.scale(scale, scale, scale);
      }
      geometry.computeVertexNormals();
      resolve(geometry);
      })
      .catch(() => resolve(null));
  });
}

function createTerrainSphere(result, generator) {
  const segments = resolutionSegments(result);
  const geometry = new THREE.SphereGeometry(1.55, segments, Math.max(48, Math.round(segments * 0.62)));
  const position = geometry.attributes.position;
  const colors = [];
  const normal = new THREE.Vector3();
  const color = new THREE.Color();
  const sample = generator.createSphericalSampler(result.settings);
  const rawValues = [];
  const playful = Boolean(result.settings.playfulPalette);
  const palette = getPalette(result.settings.biomePreset, playful, generator.BIOME_PRESETS);
  const markers = { sea: [], landByBiome: [[], [], [], []] };

  for (let i = 0; i < position.count; i += 1) {
    normal.set(position.getX(i), position.getY(i), position.getZ(i)).normalize();
    rawValues.push(sample(normal.x, normal.y, normal.z));
  }
  const low = percentile(rawValues, 0.02);
  const high = percentile(rawValues, 0.98);

  for (let i = 0; i < position.count; i += 1) {
    normal.set(position.getX(i), position.getY(i), position.getZ(i)).normalize();
    const height = normalizeValue(rawValues[i], low, high);
    const biome = generator.classify(height, result.settings);
    const aboveSea = Math.max(0, height - result.settings.seaLevel);
    const elevation = biome === 0 ? -0.012 : 0.004 + aboveSea * 0.065 + Math.max(0, biome - 2) * 0.01;
    const radius = 1.55 + elevation;
    position.setXYZ(i, normal.x * radius, normal.y * radius, normal.z * radius);
    color.set(palette[biome]);
    const shade = biome === 0 ? 0.88 : 0.75 + height * 0.19;
    colors.push(color.r * shade, color.g * shade, color.b * shade);
    if (i % 28 === 0) {
      if (biome === 0) markers.sea.push(normal.clone());
      else markers.landByBiome[biome].push(normal.clone());
    }
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return { geometry, markers };
}

function createCloudLayer(segments, seed, coverage) {
  const texture = createCloudTexture(seed, coverage);
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1.592, segments, Math.max(48, Math.round(segments * 0.62))),
    new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      opacity: 0.2 + coverage * 0.55,
      depthWrite: false,
      roughness: 0.95,
      metalness: 0
    })
  );
  return mesh;
}

function createCloudTexture(seed, coverage) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const random = seededRandom(seed + 97);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const puffs = Math.floor(220 + coverage * 520);
  for (let i = 0; i < puffs; i += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const base = 8 + random() * (14 + coverage * 32);
    const alpha = 0.1 + random() * (0.32 + coverage * 0.18);
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
    for (let k = 0; k < 4; k += 1) {
      ctx.beginPath();
      ctx.ellipse(x + (random() - 0.5) * base, y + (random() - 0.5) * base, base * (0.55 + random() * 0.7), base * (0.4 + random() * 0.5), random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function createSeaFish(seaNormals, playful, seed) {
  preloadFishPrototype();
  if (!seaNormals || seaNormals.length === 0) return { fish: [], fishJumpData: [] };
  const random = seededRandom(seed + 302);
  const color = playful ? 0xff9b3d : 0x7cd7ff;
  const fish = [];
  const fishJumpData = [];
  const total = Math.min(18, Math.max(6, Math.floor(seaNormals.length / 10)));
  for (let i = 0; i < total; i += 1) {
    const normal = seaNormals[Math.floor(random() * seaNormals.length)];
    const tangent = new THREE.Vector3().crossVectors(normal, new THREE.Vector3(0, 1, 0));
    if (tangent.lengthSq() < 0.001) tangent.set(1, 0, 0);
    tangent.normalize();
    const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();
    const geometry = fishPrototypeGeometry ? fishPrototypeGeometry.clone() : new THREE.BoxGeometry(0.03, 0.03, 0.09);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.06, emissive: color, emissiveIntensity: 0.14 }));
    fish.push(mesh);
    fishJumpData.push({
      normal,
      tangent,
      bitangent,
      surfaceRadius: 1.558,
      submergeDepth: 0.03 + random() * 0.02,
      swimRadius: 0.035 + random() * 0.03,
      speed: 1.6 + random() * 1.9,
      offset: random() * Math.PI * 2,
      jumpHeight: 0.07 + random() * 0.1
    });
  }
  return { fish, fishJumpData };
}

function createTowns(beach, forest, playful, seed) {
  preloadBuildingPrototypes();
  const random = seededRandom(seed + 901);
  const pool = [...beach.slice(0, 70), ...forest.slice(0, 70)];
  const towns = [];
  const baseColor = playful ? 0xf4e4c5 : 0xe1d5bf;
  for (let i = 0; i < Math.min(16, pool.length); i += 1) {
    const n = pool[Math.floor(random() * pool.length)];
    const geometry = buildingPrototypeGeometries.length
      ? buildingPrototypeGeometries[Math.floor(random() * buildingPrototypeGeometries.length)].clone()
      : new THREE.BoxGeometry(0.04, 0.04, 0.04);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.9, metalness: 0 }));
    const h = 1.565 + random() * 0.01;
    mesh.position.set(n.x * h, n.y * h, n.z * h);
    mesh.lookAt(mesh.position.clone().multiplyScalar(2));
    mesh.rotateX(-Math.PI / 2);
    mesh.rotateY(random() * Math.PI * 2);
    towns.push(mesh);
  }
  return towns;
}

function createLandAnimals(landByBiome, playful, seed) {
  const random = seededRandom(seed + 1401);
  const animals = [];
  const biomeColors = playful ? [0, 0xffd66f, 0x7dff87, 0xfff0f0] : [0, 0xc8b089, 0x80c072, 0xdad9de];
  for (let biome = 1; biome <= 3; biome += 1) {
    const points = landByBiome[biome];
    const total = Math.min(10, points.length);
    for (let i = 0; i < total; i += 1) {
      const n = points[Math.floor(random() * points.length)];
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.03, 0.05),
        new THREE.MeshStandardMaterial({ color: biomeColors[biome], roughness: 0.7, metalness: 0 })
      );
      const h = 1.566 + random() * 0.008;
      body.position.set(n.x * h, n.y * h, n.z * h);
      body.lookAt(body.position.clone().multiplyScalar(2));
      animals.push(body);
    }
  }
  return animals;
}

function getPalette(presetId, playful, presets) {
  if (!playful) return presets[presetId].biomes.map((biome) => biome.color);
  const playfulByPreset = {
    classic: ['#3f8bff', '#ffd96b', '#4fd86f', '#f5f7ff'],
    volcanic: ['#2370ff', '#ffc978', '#5ed95d', '#ff6d4d'],
    arctic: ['#45a8ff', '#e7f2d2', '#5ecab5', '#ffffff']
  };
  return playfulByPreset[presetId] || presets[presetId].biomes.map((biome) => biome.color);
}

function createRings(playful) {
  return new THREE.Mesh(
    new THREE.RingGeometry(1.95, 2.72, 96),
    new THREE.MeshStandardMaterial({ color: playful ? 0xffc871 : 0xcab59c, transparent: true, opacity: 0.48, side: THREE.DoubleSide, roughness: 0.84, metalness: 0 })
  );
}

function createMoons(playful, count, seed) {
  const random = seededRandom(seed + 2103);
  const moonMaterial = new THREE.MeshStandardMaterial({ color: playful ? 0xf6f2ff : 0xd9dde5, roughness: 0.9, metalness: 0 });
  const moons = [];
  for (let i = 0; i < count; i += 1) {
    const size = 0.05 + random() * 0.11;
    moons.push({
      mesh: new THREE.Mesh(new THREE.SphereGeometry(size, 16, 12), moonMaterial.clone()),
      radius: 2.3 + random() * 1.8,
      height: -0.6 + random() * 1.2,
      speed: (0.2 + random() * 0.8) * (i % 2 ? -1 : 1),
      offset: random() * Math.PI * 2
    });
  }
  return moons;
}

function createStars() {
  const geometry = new THREE.BufferGeometry();
  const points = [];
  for (let i = 0; i < 1000; i += 1) {
    const r = 16 + Math.random() * 20;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    points.push(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.04, sizeAttenuation: true }));
}

function resolutionSegments(result) {
  return Math.max(64, Math.min(384, result.settings.resolution));
}

function percentile(values, ratio) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)))];
}

function normalizeValue(value, low, high) {
  return Math.min(1, Math.max(0, (value - low) / ((high - low) || 1)));
}

function seededRandom(seed) {
  let value = (seed + 1) * 9973;
  return () => {
    value = (value * 1103515245 + 12345) & 0x7fffffff;
    return value / 0x7fffffff;
  };
}
