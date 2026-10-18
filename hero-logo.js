// 3D JJ monogram for the hero. Same geometry as assets/brand/logo-mark.svg, built from
// glossy tubes. Falls back to the flat SVG (already in the markup) when WebGL is
// unavailable or the visitor prefers reduced motion.
const host = document.querySelector('[data-hero-logo]');
const hero = document.querySelector('.hero-story');

function hasWebGL() {
  try {
    const probe = document.createElement('canvas');
    return Boolean(probe.getContext('webgl2') || probe.getContext('webgl'));
  } catch {
    return false;
  }
}

async function boot() {
  if (!host || !hero) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!hasWebGL()) return;

  const THREE = await import('./vendor/three.module.min.js');

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  host.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 13);

  // Reflections come from a small "studio" scene rendered into a cube map. Most of it is
  // fixed soft panels; a pair of sodium streetlights sweeps overhead on a loop, so the chrome
  // catches them the way car paint does on the freeway at night.
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(0x070d1c);
  const panel = (color, strength, width, height, position) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength), side: THREE.DoubleSide })
    );
    mesh.position.set(...position);
    mesh.lookAt(0, 0, 0);
    studio.add(mesh);
    return mesh;
  };
  panel(0xdfe8ff, 3.2, 9, 2.4, [0, 6, 4]);
  panel(0x6fa4ff, 3.4, 3, 9, [-6, 0, 3]);
  panel(0xd6e4ff, 2.2, 3, 9, [6, 1, 2]);
  panel(0xff3b4a, 1.4, 6, 1.2, [3, -5, 3]);
  panel(0xe8eeff, 1.2, 6, 1.2, [-3, -5, 3]);
  const lamps = [panel(0xffa94d, 14, 1.6, 6, [0, 6, 0]), panel(0xffa94d, 14, 1.6, 6, [0, 6, 0])];

  const cubeTarget = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType });
  const cubeCamera = new THREE.CubeCamera(0.1, 40, cubeTarget);
  scene.environment = cubeTarget.texture;

  function sweepLamps(t) {
    lamps.forEach((lamp, index) => {
      // Each lamp travels from in front of the logo, over the top, to behind it.
      const phase = ((t * 0.42 + index * 0.5) % 1) * 2 - 1;
      lamp.position.set(1.2, 5.5 - Math.abs(phase) * 1.5, -phase * 9);
      lamp.lookAt(0, 0, 0);
    });
    cubeCamera.update(renderer, studio);
    cubeTarget.texture.needsPMREMUpdate = true;
  }

  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 4, 7);
  scene.add(key);
  const rim = new THREE.PointLight(0x5b8cff, 60, 0, 2);
  rim.position.set(-4, -2, 3);
  scene.add(rim);

  // Geometry: map the SVG's 100x100 coordinates into scene units.
  const UNIT = 18;
  const P = (x, y) => new THREE.Vector3((x - 51) / UNIT, -(y - 50) / UNIT, 0);
  const radius = 4.5 / UNIT;

  const material = new THREE.MeshPhysicalMaterial({
    color: 0x86adff,
    metalness: 0.05,
    roughness: 0.16,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.2,
  });

  const logo = new THREE.Group();
  const tube = (path) => {
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, 120, radius, 36, false), material);
    logo.add(mesh);
  };
  const cap = (point) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 36, 20), material);
    mesh.position.copy(point);
    logo.add(mesh);
  };
  const stem = (x) => {
    const path = new THREE.CurvePath();
    path.add(new THREE.LineCurve3(P(x, 22), P(x, 58)));
    path.add(new THREE.CubicBezierCurve3(P(x, 58), P(x, 70), P(x - 6, 78), P(x - 16, 78)));
    tube(path);
    cap(P(x - 16, 78));
  };

  const bar = new THREE.CurvePath();
  bar.add(new THREE.LineCurve3(P(20, 22), P(82, 22)));
  tube(bar);
  cap(P(20, 22));
  cap(P(82, 22));
  stem(34);
  stem(68);
  scene.add(logo);

  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host);
  resize();

  // Interaction state
  const state = { tiltX: 0, tiltY: 0, targetX: 0, targetY: 0, spin: 0, spinTarget: 0 };
  window.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    const box = host.getBoundingClientRect();
    const nx = (event.clientX - (box.left + box.width / 2)) / (window.innerWidth / 2);
    const ny = (event.clientY - (box.top + box.height / 2)) / (window.innerHeight / 2);
    state.targetY = Math.max(-1, Math.min(1, nx)) * 0.7;
    state.targetX = Math.max(-1, Math.min(1, ny)) * 0.4;
  });
  host.addEventListener('click', () => {
    state.spinTarget += Math.PI * 2;
  });

  function heroProgress() {
    const value = parseFloat(hero.style.getPropertyValue('--hero-progress'));
    return Number.isFinite(value) ? value : 0;
  }

  let visible = true;
  let running = false;
  let revealed = false;
  const clock = new THREE.Clock();

  function frame() {
    if (!visible || document.hidden) {
      running = false;
      return;
    }
    const t = clock.getElapsedTime();
    const progress = heroProgress();

    state.tiltX += (state.targetX - state.tiltX) * 0.07;
    state.tiltY += (state.targetY - state.tiltY) * 0.07;
    state.spin += (state.spinTarget - state.spin) * 0.06;

    // slow idle sway + cursor tilt + a full turn as the hero scrolls away
    logo.rotation.y = Math.sin(t * 0.5) * 0.22 + state.tiltY + state.spin + progress * Math.PI * 1.4;
    logo.rotation.x = Math.sin(t * 0.37) * 0.07 + state.tiltX;
    logo.position.y = Math.sin(t * 0.8) * 0.09 + progress * 0.4;
    const scale = 1 - progress * 0.22;
    logo.scale.setScalar(scale);

    sweepLamps(t * (1 + progress * 1.5));
    renderer.render(scene, camera);
    if (!revealed) {
      revealed = true;
      host.classList.add('is-3d');
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
  }).observe(hero);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) start();
  });
  start();
}

boot().catch(() => {
  // Any failure leaves the flat SVG logo in place.
});
