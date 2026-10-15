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

function monoFont(size, weight = 500) {
  return `${weight} ${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
}

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

function drawHeroSignal(ctx, width, height, progress, time) {
  const accent = '#86adff';
  const cyan = '#60e3d1';
  const pale = '#d8e5ff';
  const centerX = width * (0.67 + (heroStoryState.pointerX - 0.5) * 0.07);
  const centerY = height * (0.51 + (heroStoryState.pointerY - 0.5) * 0.07);
  const stage = progress * 3;
  const breath = 1 + Math.sin(time * 0.0014) * 0.025;
  const scale = (1.15 - progress * 0.42) * breath;
  const drift = Math.sin(time * 0.0007) * 12;

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#07101d');
  background.addColorStop(0.42, '#0c2440');
  background.addColorStop(0.74, '#123d75');
  background.addColorStop(1, '#07101d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, width * 0.42);
  glow.addColorStop(0, 'rgba(119, 164, 255, 0.28)');
  glow.addColorStop(0.42, 'rgba(45, 121, 255, 0.1)');
  glow.addColorStop(1, 'rgba(8, 15, 27, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(148, 183, 255, 0.09)';
  ctx.lineWidth = 1;
  const gridGap = 84;
  for (let x = 0; x < width; x += gridGap) {
    ctx.beginPath();
    ctx.moveTo(x + drift, 0);
    ctx.lineTo(x + drift, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridGap) {
    ctx.beginPath();
    ctx.moveTo(0, y - drift * 0.35);
    ctx.lineTo(width, y - drift * 0.35);
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((progress - 0.5) * 0.7 + Math.sin(time * 0.0005) * 0.05);
  ctx.scale(scale, scale);

  const rings = [250, 180, 110];
  rings.forEach((radius, index) => {
    ctx.beginPath();
    ctx.arc(0, 0, radius + Math.sin(time * 0.001 + index) * 5, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(123, 169, 255, ${0.08 + index * 0.03})`;
    ctx.stroke();
  });

  const spread = 1 - clamp(Math.abs(progress - 0.72) * 1.8, 0, 0.68);
  const points = [
    [-190 * spread, -68],
    [-70 * spread, -130 + stage * 6],
    [82 * spread, -82],
    [180 * spread, 42],
    [52 * spread, 128],
    [-96 * spread, 82],
  ];
  const routes = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [1, 5]];

  routes.forEach(([from, to], index) => {
    const start = points[from];
    const end = points[to];
    ctx.beginPath();
    ctx.moveTo(start[0], start[1]);
    ctx.quadraticCurveTo((start[0] + end[0]) * 0.5, (start[1] + end[1]) * 0.5 + (index % 2 ? 24 : -24), end[0], end[1]);
    ctx.strokeStyle = index % 3 === 0 ? 'rgba(96, 227, 209, 0.78)' : 'rgba(134, 173, 255, 0.78)';
    ctx.lineWidth = index % 3 === 0 ? 4 : 3;
    ctx.stroke();
  });

  points.forEach(([x, y], index) => {
    const pulse = 1 + Math.sin(time * 0.002 + index) * 0.22;
    ctx.beginPath();
    ctx.arc(x, y, 16 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = index % 3 === 0 ? 'rgba(96, 227, 209, 0.13)' : 'rgba(134, 173, 255, 0.13)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, index === 1 || index === 4 ? 8 : 6, 0, Math.PI * 2);
    ctx.fillStyle = index % 3 === 0 ? cyan : accent;
    ctx.fill();
  });

  if (progress > 0.22 && progress < 0.84) {
    const routeProgress = (progress - 0.22) / 0.62;
    const routeIndex = Math.min(routes.length - 1, Math.floor(routeProgress * routes.length));
    const localProgress = routeProgress * routes.length - routeIndex;
    const [from, to] = routes[routeIndex];
    const start = points[from];
    const end = points[to];
    const movingX = start[0] + (end[0] - start[0]) * localProgress;
    const movingY = start[1] + (end[1] - start[1]) * localProgress;
    ctx.beginPath();
    ctx.arc(movingX, movingY, 13, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(216, 229, 255, 0.22)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(movingX, movingY, 5, 0, Math.PI * 2);
    ctx.fillStyle = pale;
    ctx.fill();
  }

  ctx.restore();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = monoFont(18, 600);
  ctx.fillStyle = 'rgba(216, 229, 255, 0.68)';
  const sceneWord = progress < 0.25 ? 'QUESTION' : progress < 0.5 ? 'STRUCTURE' : progress < 0.75 ? 'ITERATE' : 'SHIP';
  ctx.fillText(sceneWord, centerX, centerY + height * 0.29);

  ctx.font = monoFont(12, 500);
  ctx.fillStyle = 'rgba(180, 202, 255, 0.52)';
  ctx.fillText('signal / path / result', centerX, centerY + height * 0.33);
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
  const ctx = heroStoryCanvas.getContext('2d');
  if (ctx) drawHeroSignal(ctx, heroStoryCanvas.width, heroStoryCanvas.height, progress, heroStoryState.time);
}

function animateHeroStory(now) {
  if (!heroStoryState.visible || reduceMotion) return;
  const delta = Math.min(48, now - heroStoryState.lastTime);
  heroStoryState.lastTime = now;
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
