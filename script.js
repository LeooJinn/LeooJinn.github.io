const year = document.querySelector('#year');
if (year) {
  year.textContent = String(new Date().getFullYear());
}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const revealItems = document.querySelectorAll('.reveal');
if (reduceMotion || !('IntersectionObserver' in window)) {
  revealItems.forEach((item) => item.classList.add('is-visible'));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  );

  revealItems.forEach((item) => revealObserver.observe(item));
}

const sectionLinks = [...document.querySelectorAll('[data-section-link]')];
const sectionRailFill = document.querySelector('.section-rail-fill');
const sectionRailCurrent = document.querySelector('.section-rail-current');
const sections = sectionLinks
  .map((link) => document.getElementById(link.dataset.sectionLink))
  .filter(Boolean);

function setActiveSection(id) {
  const index = sections.findIndex((section) => section.id === id);
  if (index < 0) return;

  sectionLinks.forEach((link) => {
    if (link.dataset.sectionLink === id) {
      link.setAttribute('aria-current', 'location');
    } else {
      link.removeAttribute('aria-current');
    }
  });

  if (sectionRailFill) {
    const progress = sections.length > 1 ? index / (sections.length - 1) : 0;
    sectionRailFill.style.transform = `scaleY(${progress})`;
  }

  if (sectionRailCurrent) {
    sectionRailCurrent.textContent = sectionLinks[index]?.querySelector('strong')?.textContent || id;
  }
}

if ('IntersectionObserver' in window && sections.length) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]) setActiveSection(visible[0].target.id);
    },
    { rootMargin: '-20% 0px -50% 0px', threshold: [0.05, 0.2, 0.5] },
  );

  sections.forEach((section) => sectionObserver.observe(section));
  setActiveSection(window.location.hash ? window.location.hash.slice(1) : 'top');
}

sectionLinks.forEach((link) => {
  link.addEventListener('click', () => setActiveSection(link.dataset.sectionLink));
});

const heroStory = document.querySelector('.hero-story');
const heroStoryCanvas = document.querySelector('#hero-story-canvas');
const heroPhase = document.querySelector('[data-hero-phase]');
const heroPhaseName = document.querySelector('[data-hero-phase-name]');
const heroProgressLabel = document.querySelector('[data-hero-progress]');
const heroStoryLabels = [...document.querySelectorAll('.hero-story-object-label')];
const heroStoryState = {
  visible: false,
  running: false,
  progress: 0,
  time: 0,
  lastTime: 0,
  pointerX: 0.5,
  pointerY: 0.5,
};

const heroPhases = [
  ['01 / 04', 'Start with a question'],
  ['02 / 04', 'Make the path visible'],
  ['03 / 04', 'Test the system'],
  ['04 / 04', 'Ship something useful'],
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function heroScrollProgress() {
  if (!heroStory) return 0;
  const travel = Math.max(1, heroStory.offsetHeight - window.innerHeight);
  return clamp(-heroStory.getBoundingClientRect().top / travel, 0, 1);
}

// The hero backdrop: a freeway at 2 AM, seen from the driver's seat. Oncoming headlights and
// the taillights ahead are drawn as long-exposure streaks; sodium streetlights pass overhead.
// World units are metres-ish: x across the road, z forward from the camera.
const freeway = {
  cars: [],
  seeded: false,
  travelled: 0,
  stars: [],
  skyline: [],
};

function seedFreeway() {
  let seed = 11;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  // Two lanes each way. Oncoming (white) on the left, same direction (red) on the right.
  const lanes = [-5.4, -1.9, 1.9, 5.4];
  for (let i = 0; i < 64; i += 1) {
    const lane = lanes[i % 4];
    freeway.cars.push({
      x: lane + (rand() - 0.5) * 0.5,
      z: 4 + rand() * 170,
      oncoming: lane < 0,
      speed: 0.6 + rand() * 0.5,
      trail: 6 + rand() * 10,
    });
  }
  for (let i = 0; i < 90; i += 1) {
    freeway.stars.push([rand(), rand() * 0.5, 0.3 + rand() * 0.9, rand() * 6.28]);
  }
  // Distant city lights strung along the horizon.
  for (let i = 0; i < 260; i += 1) {
    const x = rand();
    const cluster = Math.exp(-(((x - 0.78) / 0.16) ** 2)) + 0.35 * Math.exp(-(((x - 0.3) / 0.12) ** 2));
    if (rand() > cluster + 0.12) continue;
    freeway.skyline.push([x, rand() ** 2, rand() > 0.22, rand()]);
  }
  freeway.seeded = true;
}

function drawHeroSignal(ctx, width, height, progress, time) {
  if (!freeway.seeded) seedFreeway();

  const unit = height / 1000;
  const vx = width * (0.75 + (heroStoryState.pointerX - 0.5) * -0.03);
  const vy = height * (0.6 + (heroStoryState.pointerY - 0.5) * -0.02);
  const focal = height * 0.95;
  const camHeight = 1.25 + progress * 0.5;
  const nearZ = 2.2;
  const project = (x, y, z) => [vx + (x * focal) / z, vy + ((camHeight - y) * focal) / z];
  const fade = (z) => clamp(1 - z / 180, 0, 1);
  // Things right next to the camera would be huge and blurry; let them dissolve instead.
  const near = (z) => clamp((z - nearZ) / 14, 0, 1);

  // Faster as the hero scrolls away, as if pulling onto the freeway.
  const speed = reduceMotion ? 0 : 0.016 * (1 + progress * 2.2);
  const dt = Math.min(48, heroStoryState.delta || 16);
  freeway.travelled += speed * dt;

  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, vy);
  sky.addColorStop(0, '#04060c');
  sky.addColorStop(0.55, '#08101f');
  sky.addColorStop(1, '#16203a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, vy + 1);

  freeway.stars.forEach(([sx, sy, size, phase]) => {
    const twinkle = 0.55 + Math.sin(time * 0.0012 + phase) * 0.25;
    ctx.globalAlpha = twinkle * 0.7;
    ctx.fillStyle = '#dfe8ff';
    ctx.fillRect(sx * width, sy * vy, size * unit * 1.4, size * unit * 1.4);
  });
  ctx.globalAlpha = 1;

  // Hills on the horizon, then the ground.
  const ground = ctx.createLinearGradient(0, vy - 40 * unit, 0, height);
  ground.addColorStop(0, '#05080f');
  ground.addColorStop(1, '#030409');
  ctx.fillStyle = ground;
  ctx.beginPath();
  ctx.moveTo(0, vy);
  for (let x = 0; x <= width; x += 20) {
    const t = x / width;
    const y = vy - (Math.sin(t * 5.2 + 1.3) * 0.5 + 0.6) * 26 * unit - Math.sin(t * 13 + 0.4) * 7 * unit;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  // Haze where the city meets the sky: sodium on the right, cool on the left.
  const haze = ctx.createRadialGradient(vx, vy, 0, vx, vy, width * 0.5);
  haze.addColorStop(0, 'rgba(255, 166, 77, 0.16)');
  haze.addColorStop(0.4, 'rgba(120, 110, 170, 0.08)');
  haze.addColorStop(1, 'rgba(10, 16, 30, 0)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = 'lighter';
  freeway.skyline.forEach(([sx, depth, warm, phase]) => {
    const y = vy - 2 * unit - depth * 18 * unit;
    const flicker = 0.6 + Math.sin(time * 0.002 + phase * 40) * 0.12;
    ctx.globalAlpha = (0.25 + (1 - depth) * 0.5) * flicker;
    ctx.fillStyle = warm ? '#ffbe73' : '#b9cdff';
    ctx.fillRect(sx * width, y, 1.6 * unit, 1.6 * unit);
  });
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  // Road surface
  const [lx0, ly0] = project(-8, 0, nearZ);
  const [rx0] = project(8, 0, nearZ);
  const road = ctx.createLinearGradient(0, vy, 0, height);
  road.addColorStop(0, '#0b111e');
  road.addColorStop(1, '#05070c');
  ctx.fillStyle = road;
  ctx.beginPath();
  ctx.moveTo(vx, vy);
  ctx.lineTo(rx0, ly0);
  ctx.lineTo(lx0, ly0);
  ctx.closePath();
  ctx.fill();

  // Lane dashes and edge lines, scrolling toward the camera.
  const dashGap = 9;
  const offset = freeway.travelled % dashGap;
  ctx.lineCap = 'butt';
  [-3.7, 3.7].forEach((x) => {
    for (let z = dashGap - offset + nearZ; z < 150; z += dashGap) {
      const [ax, ay] = project(x, 0, z);
      const [bx, by] = project(x, 0, z + 3);
      ctx.strokeStyle = `rgba(214, 222, 240, ${0.42 * fade(z) * near(z)})`;
      ctx.lineWidth = Math.min(2.4 * unit, Math.max(0.6, (0.12 * focal) / z));
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
  });
  [[-7.4, 'rgba(214, 222, 240, 0.32)'], [7.4, 'rgba(214, 222, 240, 0.32)'], [-0.25, 'rgba(255, 196, 92, 0.42)'], [0.25, 'rgba(255, 196, 92, 0.42)']].forEach(([x, color]) => {
    const [ax, ay] = project(x, 0, nearZ);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2 * unit;
    ctx.beginPath();
    ctx.moveTo(vx, vy);
    ctx.lineTo(ax, ay);
    ctx.stroke();
  });

  // Streetlights on both shoulders, with pools of sodium light on the road.
  const poleGap = 26;
  const poleOffset = freeway.travelled % poleGap;
  const poles = [];
  for (let z = poleGap - poleOffset + nearZ - 1; z < 170; z += poleGap) {
    poles.push(z);
  }
  poles.forEach((z) => {
    [-10, 10].forEach((x) => {
      const [bx, by] = project(x, 0, z);
      const [tx, ty] = project(x, 9, z);
      const [lx, ly] = project(x * 0.8, 9.2, z);
      const w = Math.max(0.8, (0.22 * focal) / z);
      ctx.strokeStyle = `rgba(14, 17, 26, ${0.5 + fade(z) * 0.5})`;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(tx, ty);
      ctx.lineTo(lx, ly);
      ctx.stroke();
      // On load the lamps power up one after another down the road, with a sodium flicker.
      const warm = reduceMotion ? 1 : clamp((time - 250 - z * 14) / 420, 0, 1);
      const power = warm < 1 ? warm * (0.55 + 0.45 * Math.abs(Math.sin(time * 0.05 + z))) : 1;
      if (power <= 0) return;
      ctx.globalCompositeOperation = 'lighter';
      const glowR = Math.max(3 * unit, (1.6 * focal) / z);
      const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, glowR);
      glow.addColorStop(0, `rgba(255, 214, 150, ${0.95 * fade(z) * power})`);
      glow.addColorStop(0.18, `rgba(255, 170, 70, ${0.5 * fade(z) * power})`);
      glow.addColorStop(1, 'rgba(255, 150, 60, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(lx - glowR, ly - glowR, glowR * 2, glowR * 2);
      ctx.globalCompositeOperation = 'source-over';
    });
  });

  // Traffic as long-exposure streaks.
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  freeway.cars.forEach((car) => {
    // Oncoming cars close fast; cars ahead drift slowly relative to us.
    const relative = car.oncoming ? -(1 + car.speed) : car.speed - 0.85;
    car.z += relative * speed * dt;
    if (car.z < nearZ) car.z += 170;
    if (car.z > 175) car.z -= 170;

    const head = car.z;
    const tail = car.oncoming ? car.z + car.trail * (1 + progress) : car.z - car.trail * 0.55;
    if (tail < nearZ && !car.oncoming) return;
    const color = car.oncoming ? [236, 242, 255] : [255, 58, 72];
    [-0.42, 0.42].forEach((dx) => {
      const [ax, ay] = project(car.x + dx, 0.7, Math.max(nearZ, head));
      const [bx, by] = project(car.x + dx, 0.7, Math.max(nearZ, tail));
      const a = fade(head) * near(head);
      const streak = ctx.createLinearGradient(ax, ay, bx, by);
      streak.addColorStop(0, `rgba(${color}, ${0.95 * a})`);
      streak.addColorStop(1, `rgba(${color}, 0)`);
      ctx.strokeStyle = streak;
      ctx.lineWidth = Math.min(2.6 * unit, Math.max(0.8, (0.16 * focal) / head));
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      if (car.oncoming && head < 60) {
        const flareR = Math.min(26 * unit, (0.9 * focal) / head);
        const flare = ctx.createRadialGradient(ax, ay, 0, ax, ay, flareR);
        flare.addColorStop(0, `rgba(230, 238, 255, ${0.35 * a})`);
        flare.addColorStop(1, 'rgba(230, 238, 255, 0)');
        ctx.fillStyle = flare;
        ctx.fillRect(ax - flareR, ay - flareR, flareR * 2, flareR * 2);
      }
    });
  });
  ctx.globalCompositeOperation = 'source-over';

  // Settle the bottom edge into the page.
  const floor = ctx.createLinearGradient(0, height * 0.82, 0, height);
  floor.addColorStop(0, 'rgba(7, 16, 29, 0)');
  floor.addColorStop(1, 'rgba(7, 16, 29, 0.9)');
  ctx.fillStyle = floor;
  ctx.fillRect(0, height * 0.82, width, height * 0.18);
}

function updateHeroStory() {
  if (!heroStory || !heroStoryCanvas) return;
  const progress = heroScrollProgress();
  heroStoryState.progress = progress;
  heroStory.style.setProperty('--hero-progress', progress.toFixed(4));
  const phaseIndex = Math.min(heroPhases.length - 1, Math.floor(progress * heroPhases.length));
  if (heroPhase) heroPhase.textContent = heroPhases[phaseIndex][0];
  if (heroPhaseName) heroPhaseName.textContent = heroPhases[phaseIndex][1];
  if (heroProgressLabel) heroProgressLabel.textContent = `${Math.round(progress * 100)}%`;
  const labels = [progress < 0.38, progress >= 0.28 && progress < 0.76, progress > 0.58];
  heroStoryLabels.forEach((label, index) => {
    label.style.opacity = labels[index] ? '0.72' : '0.2';
  });
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
  const boxWidth = Math.round(heroStoryCanvas.clientWidth * ratio);
  const boxHeight = Math.round(heroStoryCanvas.clientHeight * ratio);
  if (boxWidth && (heroStoryCanvas.width !== boxWidth || heroStoryCanvas.height !== boxHeight)) {
    heroStoryCanvas.width = boxWidth;
    heroStoryCanvas.height = boxHeight;
  }
  const ctx = heroStoryCanvas.getContext('2d');
  if (ctx) drawHeroSignal(ctx, heroStoryCanvas.width, heroStoryCanvas.height, progress, heroStoryState.time);
}

function animateHeroStory(now) {
  if (!heroStoryState.visible || reduceMotion) return;
  const delta = Math.min(48, now - heroStoryState.lastTime);
  heroStoryState.lastTime = now;
  heroStoryState.delta = delta;
  heroStoryState.time += delta;
  updateHeroStory();
  window.requestAnimationFrame(animateHeroStory);
}

if (heroStory && heroStoryCanvas) {
  if (reduceMotion) {
    updateHeroStory();
  } else if ('IntersectionObserver' in window) {
    const heroStoryObserver = new IntersectionObserver(
      (entries) => {
        heroStoryState.visible = entries.some((entry) => entry.isIntersecting);
        if (!heroStoryState.visible) {
          heroStoryState.running = false;
          return;
        }
        if (!heroStoryState.running) {
          heroStoryState.running = true;
          heroStoryState.lastTime = performance.now();
          window.requestAnimationFrame(animateHeroStory);
        }
      },
      { threshold: 0.01 },
    );
    heroStoryObserver.observe(heroStory);
  }

  heroStory.addEventListener('pointermove', (event) => {
    const bounds = heroStory.getBoundingClientRect();
    heroStoryState.pointerX = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
    heroStoryState.pointerY = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
    if (reduceMotion) updateHeroStory();
  });

  heroStory.addEventListener('pointerleave', () => {
    heroStoryState.pointerX = 0.5;
    heroStoryState.pointerY = 0.5;
    if (reduceMotion) updateHeroStory();
  });

  window.addEventListener('resize', updateHeroStory, { passive: true });
  updateHeroStory();
}

const sceneSections = [...document.querySelectorAll('[data-scene]')];

function setSceneProgress(section, ratio) {
  const progress = Math.max(0, Math.min(1, ratio * 1.7));
  section.style.setProperty('--scene-progress', progress.toFixed(3));
  section.classList.toggle('scene-active', progress > 0.08);
}

if ('IntersectionObserver' in window && sceneSections.length) {
  const sceneObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => setSceneProgress(entry.target, entry.intersectionRatio));
    },
    { threshold: [0, 0.08, 0.18, 0.32, 0.48, 0.64, 0.8, 1] },
  );
  sceneSections.forEach((section) => sceneObserver.observe(section));
}

if (window.matchMedia('(pointer: fine)').matches && !reduceMotion) {
  sceneSections.forEach((section) => {
    section.addEventListener('pointermove', (event) => {
      const bounds = section.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width) * 100;
      const y = ((event.clientY - bounds.top) / bounds.height) * 100;
      section.style.setProperty('--pointer-x', `${x}%`);
      section.style.setProperty('--pointer-y', `${y}%`);
    });

    section.addEventListener('pointerleave', () => {
      section.style.setProperty('--pointer-x', '50%');
      section.style.setProperty('--pointer-y', '50%');
    });
  });
}
