import * as THREE from 'three';

export function createGlobeScene(container, generator) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1119);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0.18, 5.35);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.replaceChildren(renderer.domElement);

  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  key.position.set(3, 2, 4);
  scene.add(key);
  scene.add(new THREE.AmbientLight(0x9fb2bd, 1.15));

  let mesh = null;
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

    const geometry = createTerrainSphere(result, generator);
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0,
      flatShading: false
    });
    mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.set(rotation.x, rotation.y, 0);
    scene.add(mesh);
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
    mesh.rotation.x = rotation.x;
    mesh.rotation.y = rotation.y;
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
  const geometry = new THREE.SphereGeometry(1.55, 128, 80);
  const position = geometry.attributes.position;
  const colors = [];
  const normal = new THREE.Vector3();
  const color = new THREE.Color();
  const preset = generator.BIOME_PRESETS[result.settings.biomePreset];
  const sample = generator.createSphericalSampler(result.settings);
  for (let index = 0; index < position.count; index += 1) {
    normal.set(position.getX(index), position.getY(index), position.getZ(index)).normalize();
    const height = sample(normal.x, normal.y, normal.z);
    const biome = generator.classify(height, result.settings);
    const elevation = biome === 0 ? -0.02 : 0.015 + height * 0.16 + biome * 0.014;
    position.setXYZ(index, normal.x * (1.55 + elevation), normal.y * (1.55 + elevation), normal.z * (1.55 + elevation));
    color.set(preset.biomes[biome].color);
    const shade = 0.72 + height * 0.32;
    colors.push(color.r * shade, color.g * shade, color.b * shade);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}
