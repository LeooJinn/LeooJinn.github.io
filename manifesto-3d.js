// 3D graphic for the manifesto section: a glossy torus knot (a tangled path resolving into one
// structure) with three nodes orbiting it, matching the section's "signal / structure / useful
// result" labels. Falls back to the flat orbit drawing when WebGL is unavailable or the visitor
// prefers reduced motion.
const host = document.querySelector('[data-manifesto-3d]');
const section = document.querySelector('#manifesto');

function hasWebGL() {
  try {
    const probe = document.createElement('canvas');
    return Boolean(probe.getContext('webgl2') || probe.getContext('webgl'));
  } catch {
    return false;
  }
}

async function boot() {
  if (!host || !section) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!hasWebGL()) return;

  const THREE = await import('./vendor/three.module.min.js');
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  host.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  camera.position.set(0, 0, 15);

  // studio-style reflections, same idea as the hero logo
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0x0a1530);
  const panel = (color, strength, width, height, position) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength), side: THREE.DoubleSide })
    );
    mesh.position.set(...position);
    mesh.lookAt(0, 0, 0);
    studio.add(mesh);
  };
  panel(0xffffff, 7, 9, 3, [0, 6, 4]);
  panel(0x6fa4ff, 4, 3, 9, [-6, 0, 3]);
  panel(0xd6e4ff, 3.2, 3, 9, [6, 1, 2]);
  panel(0x39e0ca, 1.6, 7, 2, [0, -5, 3]);
  scene.environment = pmrem.fromScene(studio, 0.04).texture;
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(3, 4, 7);
  scene.add(key);
  const rim = new THREE.PointLight(0x5b8cff, 70, 0, 2);
  rim.position.set(-5, -2, 4);
  scene.add(rim);

  const group = new THREE.Group();
  scene.add(group);

  const knotMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x86adff,
    metalness: 0.05,
    roughness: 0.14,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.25,
  });
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.15, 0.34, 300, 48, 2, 3), knotMaterial);
  group.add(knot);

  // three thin rings, one per word: signal, structure, useful result
  const rings = [
    { radius: 2.3, tilt: [1.15, 0.2, 0], color: 0x67e2d1, speed: 0.55, phase: 0 },
    { radius: 2.8, tilt: [0.5, 0.9, 0.3], color: 0x83aaff, speed: -0.4, phase: 2.1 },
    { radius: 3.25, tilt: [-0.35, 0.25, 0.9], color: 0xe0b457, speed: 0.3, phase: 4.2 },
  ].map((config) => {
    const orbit = new THREE.Group();
    orbit.rotation.set(...config.tilt);
    const line = new THREE.Mesh(
      new THREE.TorusGeometry(config.radius, 0.011, 12, 240),
      new THREE.MeshBasicMaterial({ color: config.color, transparent: true, opacity: 0.5 })
    );
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 16), new THREE.MeshBasicMaterial({ color: config.color }));
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 24, 16),
      new THREE.MeshBasicMaterial({ color: config.color, transparent: true, opacity: 0.18, depthWrite: false })
    );
    node.add(halo);
    orbit.add(line, node);
    group.add(orbit);
    return { ...config, node };
  });

  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host);
  resize();

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    const box = host.getBoundingClientRect();
    pointer.tx = clamp((event.clientX - (box.left + box.width / 2)) / (window.innerWidth / 2), -1, 1) * 0.55;
    pointer.ty = clamp((event.clientY - (box.top + box.height / 2)) / (window.innerHeight / 2), -1, 1) * 0.35;
  });

  let visible = false;
  let running = false;
  let revealed = false;
  const clock = new THREE.Clock();

  function frame() {
    if (!visible || document.hidden) {
      running = false;
      return;
    }
    const t = clock.getElapsedTime();
    const box = section.getBoundingClientRect();
    const progress = clamp((window.innerHeight - box.top) / (window.innerHeight + box.height), 0, 1);

    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;

    knot.rotation.x = t * 0.22;
    knot.rotation.y = t * 0.31;
    group.rotation.y = pointer.x + progress * Math.PI * 1.2 + Math.sin(t * 0.4) * 0.15;
    group.rotation.x = pointer.y + Math.sin(t * 0.3) * 0.06;
    group.position.y = Math.sin(t * 0.7) * 0.1;

    rings.forEach((ring) => {
      const angle = t * ring.speed + ring.phase;
      ring.node.position.set(Math.cos(angle) * ring.radius, Math.sin(angle) * ring.radius, 0);
    });

    renderer.render(scene, camera);
    if (!revealed) {
      revealed = true;
      host.classList.add('is-3d');
      section.classList.add('has-3d');
    }
    requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    requestAnimationFrame(frame);
  }

  new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    if (visible) start();
  }).observe(section);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) start();
  });
  start();
}

boot().catch(() => {
  // any failure leaves the flat orbit drawing in place
});
