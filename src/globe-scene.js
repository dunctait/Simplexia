import * as THREE from 'three';

export function createGlobeScene(container, generator) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x081229);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0.2, 5.5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.replaceChildren(renderer.domElement);

  const key = new THREE.DirectionalLight(0xfff7cc, 2.9);
  key.position.set(4, 2.2, 3.2);
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0xd4f5ff, 0x122032, 0.86));
  scene.add(createStars());

  let mesh = null;
  let ocean = null;
  let atmosphere = null;
  let clouds = null;
  let rings = null;
  let moons = [];
  let fish = [];
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let velocityX = 0;
  let velocityY = 0;
  const rotation = { x: -0.2, y: -0.45 };

  container.addEventListener('touchmove', (event) => event.preventDefault(), { passive: false });
  container.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    dragging = true;
    velocityX = 0;
    velocityY = 0;
    lastX = event.clientX;
    lastY = event.clientY;
    container.setPointerCapture(event.pointerId);
  });
  container.addEventListener('pointermove', (event) => {
    if (!dragging || !mesh) return;
    event.preventDefault();
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    velocityY = dx * 0.018;
    velocityX = dy * 0.014;
    rotation.y += velocityY;
    rotation.x += velocityX;
    lastX = event.clientX;
    lastY = event.clientY;
    draw();
  });
  container.addEventListener('pointerup', () => { dragging = false; });
  container.addEventListener('pointercancel', () => { dragging = false; });

  function render(result) {
    resize();
    clearPlanet();

    const geometry = createTerrainSphere(result, generator);
    const segments = resolutionSegments(result);
    const settings = result.settings;
    const playful = Boolean(settings.playfulPalette);

    mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.82,
      metalness: 0
    }));
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
        color: playful ? 0x92d8ff : 0x7fb7ff,
        transparent: true,
        opacity: playful ? 0.2 : 0.13,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false
      })
    );
    if (settings.showClouds) clouds = createCloudLayer(segments, settings.seed);
    if (settings.showRings) rings = createRings(playful);
    if (settings.showMoons) moons = createMoons(playful);
    if (settings.showFish) fish = createFish(playful);

    const rotatables = [mesh, ocean, atmosphere, clouds].filter(Boolean);
    rotatables.forEach((item) => item.rotation.set(rotation.x, rotation.y, 0));
    [mesh, ocean, atmosphere, clouds, rings].filter(Boolean).forEach((item) => scene.add(item));
    moons.forEach((item) => scene.add(item.mesh));
    fish.forEach((item) => scene.add(item.mesh));

    container.dataset.resolution = String(result.settings.resolution);
    container.dataset.vertexCount = String(geometry.attributes.position.count);
    draw();
  }

  function clearPlanet() {
    [mesh, ocean, atmosphere, clouds, rings].forEach((item) => {
      if (!item) return;
      item.geometry.dispose();
      item.material.dispose();
      scene.remove(item);
    });
    moons.forEach((item) => {
      item.mesh.geometry.dispose();
      item.mesh.material.dispose();
      scene.remove(item.mesh);
    });
    fish.forEach((item) => {
      item.mesh.geometry.dispose();
      item.mesh.material.dispose();
      scene.remove(item.mesh);
    });
    mesh = null;
    ocean = null;
    atmosphere = null;
    clouds = null;
    rings = null;
    moons = [];
    fish = [];
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
    [mesh, ocean, atmosphere, clouds, rings].filter(Boolean).forEach((item) => {
      item.rotation.x = rotation.x;
      item.rotation.y = rotation.y;
    });
    renderer.render(scene, camera);
  }

  function animate() {
    if (mesh && !container.hidden) {
      if (!dragging) {
        rotation.x += velocityX;
        rotation.y += velocityY || 0.0032;
        velocityX *= 0.94;
        velocityY *= 0.94;
        if (Math.abs(velocityX) < 0.0004) velocityX = 0;
        if (Math.abs(velocityY) < 0.0004) velocityY = 0;
      }
      const elapsed = performance.now() * 0.001;
      if (clouds) clouds.rotation.y += 0.0008;
      moons.forEach((moon, index) => {
        const phase = elapsed * moon.speed + moon.offset;
        moon.mesh.position.set(Math.cos(phase) * moon.radius, Math.sin(phase * 0.6) * moon.height, Math.sin(phase) * moon.radius);
      });
      fish.forEach((item, index) => {
        const phase = elapsed * item.speed + item.offset;
        item.mesh.position.set(Math.cos(phase) * item.radius, Math.sin(phase * 2.2) * 0.12, Math.sin(phase) * item.radius);
      });
      draw();
    }
    requestAnimationFrame(animate);
  }
  animate();

  return { render, resize };
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

  for (let index = 0; index < position.count; index += 1) {
    normal.set(position.getX(index), position.getY(index), position.getZ(index)).normalize();
    rawValues.push(sample(normal.x, normal.y, normal.z));
  }
  const low = percentile(rawValues, 0.02);
  const high = percentile(rawValues, 0.98);

  for (let index = 0; index < position.count; index += 1) {
    normal.set(position.getX(index), position.getY(index), position.getZ(index)).normalize();
    const height = normalizeValue(rawValues[index], low, high);
    const biome = generator.classify(height, result.settings);
    const aboveSea = Math.max(0, height - result.settings.seaLevel);
    const elevation = biome === 0 ? -0.012 : 0.004 + aboveSea * 0.065 + Math.max(0, biome - 2) * 0.01;
    position.setXYZ(index, normal.x * (1.55 + elevation), normal.y * (1.55 + elevation), normal.z * (1.55 + elevation));
    color.set(palette[biome]);
    const shade = biome === 0 ? 0.88 : 0.75 + height * 0.19;
    colors.push(color.r * shade, color.g * shade, color.b * shade);
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
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
    new THREE.MeshStandardMaterial({
      color: playful ? 0xffc871 : 0xcab59c,
      transparent: true,
      opacity: 0.48,
      side: THREE.DoubleSide,
      roughness: 0.84,
      metalness: 0
    })
  );
}

function createCloudLayer(segments, seed) {
  const texture = createCloudTexture(seed);
  return new THREE.Mesh(
    new THREE.SphereGeometry(1.59, segments, Math.max(48, Math.round(segments * 0.62))),
    new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      roughness: 0.95,
      metalness: 0
    })
  );
}

function createCloudTexture(seed) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const random = seededRandom(seed + 97);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 420; i += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const w = 12 + random() * 32;
    const h = 6 + random() * 18;
    const alpha = 0.18 + random() * 0.32;
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createMoons(playful) {
  const moonMaterial = new THREE.MeshStandardMaterial({
    color: playful ? 0xf6f2ff : 0xd9dde5,
    roughness: 0.9,
    metalness: 0
  });
  return [
    { mesh: new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 18), moonMaterial.clone()), radius: 3.2, height: 0.42, speed: 0.42, offset: 0 },
    { mesh: new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 16), moonMaterial.clone()), radius: 2.7, height: -0.34, speed: -0.58, offset: Math.PI * 0.7 }
  ];
}

function createFish(playful) {
  const color = playful ? 0xff9b3d : 0x7cd7ff;
  const items = [];
  for (let i = 0; i < 8; i += 1) {
    items.push({
      mesh: new THREE.Mesh(
        new THREE.ConeGeometry(0.04, 0.12, 8),
        new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.1, emissive: color, emissiveIntensity: 0.2 })
      ),
      radius: 1.75 + (i % 3) * 0.06,
      speed: 0.4 + i * 0.05,
      offset: i * 0.75
    });
    items[i].mesh.rotation.x = Math.PI / 2;
  }
  return items;
}

function createStars() {
  const geometry = new THREE.BufferGeometry();
  const points = [];
  for (let i = 0; i < 1000; i += 1) {
    const r = 16 + Math.random() * 20;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    points.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
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
