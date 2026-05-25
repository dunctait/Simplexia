import * as THREE from 'three';

export function createGlobeScene(container, generator) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05080d);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0.18, 5.35);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.replaceChildren(renderer.domElement);

  const key = new THREE.DirectionalLight(0xfff6df, 3.1);
  key.position.set(4, 1.8, 3.2);
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0xd6efff, 0x05070c, 0.72));

  let mesh = null;
  let ocean = null;
  let atmosphere = null;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let velocityX = 0;
  let velocityY = 0;
  const rotation = { x: -0.18, y: -0.45 };

  container.addEventListener('touchmove', (event) => {
    event.preventDefault();
  }, { passive: false });

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
    rotation.x = Math.max(-1.1, Math.min(1.1, rotation.x));
    lastX = event.clientX;
    lastY = event.clientY;
    draw();
  });
  container.addEventListener('pointerup', () => {
    dragging = false;
  });
  container.addEventListener('pointercancel', () => {
    dragging = false;
  });

  function render(result) {
    resize();
    if (mesh) {
      mesh.geometry.dispose();
      mesh.material.dispose();
      scene.remove(mesh);
    }
    if (ocean) {
      ocean.geometry.dispose();
      ocean.material.dispose();
      scene.remove(ocean);
    }
    if (atmosphere) {
      atmosphere.geometry.dispose();
      atmosphere.material.dispose();
      scene.remove(atmosphere);
    }

    const geometry = createTerrainSphere(result, generator);
    const segments = resolutionSegments(result);
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.78,
      metalness: 0,
      flatShading: false
    });
    mesh = new THREE.Mesh(geometry, material);
    ocean = new THREE.Mesh(
      new THREE.SphereGeometry(1.552, segments, Math.max(48, Math.round(segments * 0.62))),
      new THREE.MeshPhysicalMaterial({
        color: 0x163d75,
        transparent: true,
        opacity: 0.54,
        roughness: 0.18,
        metalness: 0,
        transmission: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        depthWrite: false
      })
    );
    atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.64, segments, Math.max(48, Math.round(segments * 0.62))),
      new THREE.MeshBasicMaterial({
        color: 0x7fb7ff,
        transparent: true,
        opacity: 0.13,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false
      })
    );
    [mesh, ocean, atmosphere].forEach((item) => item.rotation.set(rotation.x, rotation.y, 0));
    scene.add(mesh);
    scene.add(ocean);
    scene.add(atmosphere);
    container.dataset.resolution = String(result.settings.resolution);
    container.dataset.vertexCount = String(geometry.attributes.position.count);
    draw();
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
    [mesh, ocean, atmosphere].forEach((item) => {
      item.rotation.x = rotation.x;
      item.rotation.y = rotation.y;
    });
    renderer.render(scene, camera);
  }

  function animate() {
    if (mesh && !container.hidden) {
      if (!dragging) {
        rotation.x = Math.max(-1.1, Math.min(1.1, rotation.x + velocityX));
        rotation.y += velocityY || 0.003;
        velocityX *= 0.94;
        velocityY *= 0.94;
        if (Math.abs(velocityX) < 0.0004) velocityX = 0;
        if (Math.abs(velocityY) < 0.0004) velocityY = 0;
      }
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
  const preset = generator.BIOME_PRESETS[result.settings.biomePreset];
  const sample = generator.createSphericalSampler(result.settings);
  const rawValues = [];
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
    const elevation = biome === 0 ? -0.012 : 0.004 + aboveSea * 0.065 + Math.max(0, biome - 2) * 0.012;
    position.setXYZ(index, normal.x * (1.55 + elevation), normal.y * (1.55 + elevation), normal.z * (1.55 + elevation));
    color.set(preset.biomes[biome].color);
    const shade = biome === 0 ? 0.82 : 0.68 + height * 0.24;
    colors.push(color.r * shade, color.g * shade, color.b * shade);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
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
