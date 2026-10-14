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

const heroProjects = {
  sonder: {
    image: 'assets/sonder-welcome.jpg',
    alt: 'Sonder vehicle passport welcome screen',
    kicker: 'Sonder',
    title: 'A transferable history for every car.',
    status: 'deployed',
    href: 'https://www.imsonder.com',
    label: 'Visit Sonder',
  },
  search: {
    image: 'assets/search-ui-result.jpg',
    alt: 'C++ search engine result view',
    kicker: 'C++ Search Engine',
    title: 'Search paths you can inspect.',
    status: 'complete',
    href: 'https://github.com/LeooJinn/cpp-search-engine',
    label: 'Open search engine',
  },
};

const heroImage = document.querySelector('[data-hero-image]');
const heroKicker = document.querySelector('[data-hero-kicker]');
const heroTitle = document.querySelector('[data-hero-title]');
const heroStatus = document.querySelector('[data-hero-status]');
const heroLink = document.querySelector('[data-hero-link]');
const heroSwitches = document.querySelectorAll('[data-hero-project]');

function updateHeroProject(projectName) {
  const project = heroProjects[projectName];
  if (!project || !heroImage || !heroKicker || !heroTitle || !heroStatus || !heroLink) return;

  heroSwitches.forEach((switcher) => {
    const isActive = switcher.dataset.heroProject === projectName;
    switcher.classList.toggle('is-active', isActive);
    switcher.setAttribute('aria-selected', String(isActive));
  });

  const applyProject = () => {
    heroImage.src = project.image;
    heroImage.alt = project.alt;
    heroKicker.textContent = project.kicker;
    heroTitle.textContent = project.title;
    heroStatus.textContent = project.status;
    heroLink.href = project.href;
    heroLink.setAttribute('aria-label', project.label);
    heroImage.dataset.switching = 'false';
  };

  if (reduceMotion) {
    applyProject();
    return;
  }

  heroImage.dataset.switching = 'true';
  window.setTimeout(applyProject, 160);
}

heroSwitches.forEach((switcher) => {
  switcher.addEventListener('click', () => updateHeroProject(switcher.dataset.heroProject));
});

const heroVisual = document.querySelector('.hero-visual');
const visualFrame = document.querySelector('.visual-frame');
if (heroVisual && visualFrame && !reduceMotion && window.matchMedia('(pointer: fine)').matches) {
  let frame;
  let pointerX = 0;
  let pointerY = 0;

  heroVisual.addEventListener('pointermove', (event) => {
    const bounds = heroVisual.getBoundingClientRect();
    pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    pointerY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;

    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      visualFrame.style.setProperty('--tilt-x', `${pointerY * -1.5}deg`);
      visualFrame.style.setProperty('--tilt-y', `${pointerX * 2}deg`);
      frame = undefined;
    });
  });

  heroVisual.addEventListener('pointerleave', () => {
    visualFrame.style.setProperty('--tilt-x', '0deg');
    visualFrame.style.setProperty('--tilt-y', '0deg');
  });
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

const projectFilters = document.querySelectorAll('[data-filter]');
const projectCards = document.querySelectorAll('[data-category]');
const filterStatus = document.querySelector('.filter-status');

projectFilters.forEach((filter) => {
  filter.addEventListener('click', () => {
    const category = filter.dataset.filter;
    let visibleCount = 0;

    projectFilters.forEach((button) => {
      const isActive = button === filter;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    projectCards.forEach((card) => {
      const isDimmed = category !== 'all' && card.dataset.category !== category;
      card.dataset.filtered = String(isDimmed);
      if (isDimmed) {
        window.setTimeout(() => {
          if (card.dataset.filtered === 'true') card.hidden = true;
        }, reduceMotion ? 0 : 280);
      } else {
        card.hidden = false;
      }
      if (!isDimmed) visibleCount += 1;
    });

    if (filterStatus) {
      filterStatus.textContent = `Showing ${visibleCount} project${visibleCount === 1 ? '' : 's'}`;
    }
  });
});

const timeline = document.querySelector('.timeline');
const timelineItems = [...document.querySelectorAll('.timeline-item')];
const timelineProgress = document.querySelector('.timeline-progress');

function setCurrentTimelineItem(item) {
  const index = timelineItems.indexOf(item);
  if (index < 0) return;
  timelineItems.forEach((timelineItem) => timelineItem.classList.toggle('is-current', timelineItem === item));
  if (timeline && timelineProgress) {
    timelineProgress.style.height = `${item.offsetTop + item.querySelector('.timeline-marker').offsetTop + 5}px`;
  }
}

if (timelineItems.length) {
  setCurrentTimelineItem(timelineItems[0]);
  if ('IntersectionObserver' in window) {
    const timelineObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setCurrentTimelineItem(visible[0].target);
      },
      { rootMargin: '-42% 0px -42% 0px', threshold: [0.1, 0.5, 0.9] },
    );
    timelineItems.forEach((item) => timelineObserver.observe(item));
  }
}

const details = document.querySelectorAll('.project-details');

const sceneCanvas = document.querySelector('#scene-canvas');
const sceneStage = document.querySelector('.scene-stage');
const sceneTabs = document.querySelectorAll('[data-scene]');
const sceneSteps = [...document.querySelectorAll('[data-stage]')];
const sceneLabel = document.querySelector('[data-scene-label]');
const sceneStageLabel = document.querySelector('[data-scene-stage]');
const sceneHint = document.querySelector('[data-scene-hint]');
const sceneMotionToggle = document.querySelector('.scene-motion-toggle');
const sceneStageTitles = [...document.querySelectorAll('[data-stage-title]')];
const sceneStageCopies = [...document.querySelectorAll('[data-stage-copy]')];

const sceneContent = {
  sonder: {
    label: 'Sonder / vehicle history',
    hint: 'Move across the history',
    stages: [
      ['Start with the vehicle', 'One car, one history, ready to be carried forward.'],
      ['Make the path visible', 'Mods, service, and ownership become a timeline.'],
      ['Leave a useful record', 'The story stays with the car after the sale.'],
    ],
  },
  search: {
    label: 'C++ search engine / indexed path',
    hint: 'Trace the query path',
    stages: [
      ['Start with documents', 'A corpus enters through a path that is easy to inspect.'],
      ['Build the index', 'Terms become postings, ready for fast intersection.'],
      ['Return the evidence', 'A result opens with the matching document in view.'],
    ],
  },
  rocket: {
    label: 'Rocket Landing RL / learned control',
    hint: 'Guide the landing',
    stages: [
      ['Start with the state', 'Position, velocity, tilt, and fuel define the next move.'],
      ['Shape the reward', 'The policy learns which corrections make a safer approach.'],
      ['Land with evidence', 'Evaluation separates a lucky landing from a learned one.'],
    ],
  },
};

const sceneState = {
  activeScene: 'sonder',
  activeStage: 0,
  paused: reduceMotion,
  visible: false,
  pointerX: 0.5,
  pointerY: 0.5,
  lastTime: 0,
  elapsed: 0,
};

function cssColor(name, fallback) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(125, 156, 255, ${alpha})`;
  const red = Number.parseInt(clean.slice(0, 2), 16);
  const green = Number.parseInt(clean.slice(2, 4), 16);
  const blue = Number.parseInt(clean.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

const sceneColors = {
  page: cssColor('--page-raised', '#24292d'),
  ink: cssColor('--ink', '#f0f0eb'),
  soft: cssColor('--ink-soft', '#b8c0c2'),
  faint: cssColor('--ink-faint', '#869096'),
  line: cssColor('--line', '#384147'),
  accent: cssColor('--accent', '#7d9cff'),
  accentDeep: cssColor('--accent-deep', '#adc0ff'),
};

function sceneFont(size, weight = 500) {
  return `${weight} ${size}px "Avenir Next", Avenir, "Segoe UI", sans-serif`;
}

function monoFont(size, weight = 500) {
  return `${weight} ${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
}

function sceneText(ctx, text, x, y, size = 14, color = sceneColors.soft, align = 'left', mono = false) {
  ctx.font = mono ? monoFont(size) : sceneFont(size);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function sceneLine(ctx, x1, y1, x2, y2, color, width = 1, dash = []) {
  ctx.beginPath();
  ctx.setLineDash(dash);
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.setLineDash([]);
}

function sceneDot(ctx, x, y, radius, color, glow = false) {
  if (glow) {
    ctx.beginPath();
    ctx.arc(x, y, radius * 3.2, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(color, 0.13);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawSceneGrid(ctx, width, height) {
  const gap = 48;
  ctx.strokeStyle = hexToRgba(sceneColors.line, 0.42);
  ctx.lineWidth = 1;
  for (let x = 24; x < width; x += gap) sceneLine(ctx, x, 0, x, height, ctx.strokeStyle);
  for (let y = 24; y < height; y += gap) sceneLine(ctx, 0, y, width, y, ctx.strokeStyle);
  ctx.fillStyle = hexToRgba(sceneColors.accent, 0.04);
  ctx.fillRect(0, 0, width, height);
}

function drawSonderScene(ctx, width, height, stage, time) {
  const centerX = width * 0.5 + (sceneState.pointerX - 0.5) * 28;
  const centerY = height * 0.48 + (sceneState.pointerY - 0.5) * 20;
  const pulse = 0.5 + Math.sin(time * 0.0012) * 0.5;
  drawSceneGrid(ctx, width, height);

  if (stage === 0) {
    for (let ring = 1; ring <= 3; ring += 1) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, ring * 64 + pulse * 8, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba(sceneColors.accent, 0.12 + ring * 0.025);
      ctx.stroke();
    }
    sceneDot(ctx, centerX, centerY, 25, sceneColors.accent, true);
    sceneText(ctx, 'VIN', centerX, centerY - 4, 10, sceneColors.page, 'center', true);
    sceneText(ctx, 'one vehicle / many chapters', centerX, centerY + 48, 13, sceneColors.soft, 'center');
    sceneText(ctx, 'START', centerX, centerY - 62, 10, sceneColors.accentDeep, 'center', true);
    sceneLine(ctx, centerX - 180, centerY + 116, centerX + 180, centerY + 116, hexToRgba(sceneColors.line, 0.9));
    [0, 1, 2, 3].forEach((index) => {
      const x = centerX - 150 + index * 100;
      sceneDot(ctx, x, centerY + 116, index === 0 ? 6 : 4, index === 0 ? sceneColors.accent : sceneColors.faint, index === 0);
    });
  } else if (stage === 1) {
    const points = [
      [width * 0.16, height * 0.66],
      [width * 0.36, height * 0.42],
      [width * 0.57, height * 0.59],
      [width * 0.82, height * 0.32],
    ];
    sceneLine(ctx, points[0][0], points[0][1], points[1][0], points[1][1], hexToRgba(sceneColors.accent, 0.55), 2);
    sceneLine(ctx, points[1][0], points[1][1], points[2][0], points[2][1], hexToRgba(sceneColors.accent, 0.55), 2);
    sceneLine(ctx, points[2][0], points[2][1], points[3][0], points[3][1], hexToRgba(sceneColors.accent, 0.55), 2);
    points.forEach(([x, y], index) => {
      sceneDot(ctx, x, y, index === 0 ? 10 : 7, index === 0 ? sceneColors.accent : sceneColors.accentDeep, index === 0);
      sceneText(ctx, ['origin', 'service', 'owner 02', 'now'][index], x, y + 25, 10, sceneColors.faint, 'center', true);
    });
    const moving = (time * 0.00018) % 1;
    const segment = Math.min(2, Math.floor(moving * 3));
    const local = moving * 3 - segment;
    const start = points[segment];
    const end = points[segment + 1];
    sceneDot(ctx, start[0] + (end[0] - start[0]) * local, start[1] + (end[1] - start[1]) * local, 5, sceneColors.accent, true);
    sceneText(ctx, 'history / readable at a glance', width * 0.5, height * 0.16, 14, sceneColors.soft, 'center');
  } else {
    const baseY = height * 0.63;
    sceneLine(ctx, width * 0.14, baseY, width * 0.86, baseY, hexToRgba(sceneColors.line, 0.9), 2);
    const owners = ['first build', 'your chapter', 'next owner'];
    owners.forEach((owner, index) => {
      const x = width * 0.2 + index * width * 0.3;
      sceneDot(ctx, x, baseY, 10, index === 1 ? sceneColors.accent : sceneColors.accentDeep, index === 1);
      sceneText(ctx, owner, x, baseY + 31, 11, sceneColors.soft, 'center', true);
      sceneText(ctx, index === 1 ? 'credited to you' : 'still readable', x, baseY + 51, 11, sceneColors.faint, 'center');
    });
    ctx.strokeStyle = hexToRgba(sceneColors.accent, 0.28);
    ctx.lineWidth = 1;
    ctx.strokeRect(width * 0.29, height * 0.22, width * 0.42, height * 0.16);
    sceneText(ctx, 'THE RECORD STAYS WITH THE CAR', width * 0.5, height * 0.3, 12, sceneColors.accentDeep, 'center', true);
    sceneText(ctx, 'ownership changes / history does not disappear', width * 0.5, height * 0.42, 14, sceneColors.soft, 'center');
  }
}

function drawSearchScene(ctx, width, height, stage, time) {
  drawSceneGrid(ctx, width, height);
  if (stage === 0) {
    const nodes = [
      [width * 0.25, height * 0.33, 'notes.txt'],
      [width * 0.5, height * 0.53, 'articles/'],
      [width * 0.72, height * 0.3, 'resume.pdf'],
      [width * 0.67, height * 0.74, 'docs/'],
    ];
    nodes.forEach(([x, y, label], index) => {
      sceneLine(ctx, x, y, width * 0.5, height * 0.53, hexToRgba(sceneColors.accent, 0.2));
      sceneDot(ctx, x, y, 9, index === 1 ? sceneColors.accent : sceneColors.accentDeep, index === 1);
      sceneText(ctx, label, x, y + 25, 11, sceneColors.soft, 'center', true);
    });
    sceneDot(ctx, width * 0.5, height * 0.53, 15, sceneColors.accent, true);
    sceneText(ctx, 'CORPUS', width * 0.5, height * 0.53, 9, sceneColors.page, 'center', true);
    sceneText(ctx, 'ingest / normalize / tokenize', width * 0.5, height * 0.18, 14, sceneColors.soft, 'center');
  } else if (stage === 1) {
    const left = width * 0.2;
    const right = width * 0.78;
    sceneText(ctx, 'TERM', left, height * 0.19, 10, sceneColors.faint, 'center', true);
    sceneText(ctx, 'POSTINGS', right, height * 0.19, 10, sceneColors.faint, 'center', true);
    const terms = ['index', 'search', 'query', 'document'];
    terms.forEach((term, index) => {
      const y = height * 0.3 + index * 66;
      sceneText(ctx, term, left, y, 14, index === 1 ? sceneColors.accentDeep : sceneColors.soft, 'center', true);
      sceneLine(ctx, left + 40, y, right - 55, y, hexToRgba(sceneColors.line, 0.9));
      [0, 1, 2].forEach((item) => {
        const x = right - 39 - item * 29;
        sceneDot(ctx, x, y, index === 1 ? 5 : 4, index === 1 ? sceneColors.accent : sceneColors.faint, index === 1 && item === 1);
      });
    });
    const progress = (time * 0.00015) % 1;
    sceneDot(ctx, left + 40 + (right - left - 95) * progress, height * 0.366, 4, sceneColors.accent, true);
    sceneText(ctx, 'term → candidate documents', width * 0.5, height * 0.87, 13, sceneColors.soft, 'center');
  } else {
    ctx.strokeStyle = hexToRgba(sceneColors.line, 0.9);
    ctx.strokeRect(width * 0.12, height * 0.21, width * 0.76, height * 0.54);
    ctx.fillStyle = hexToRgba(sceneColors.accent, 0.12);
    ctx.fillRect(width * 0.12, height * 0.21, width * 0.76, 44);
    sceneText(ctx, 'search index', width * 0.18, height * 0.245, 11, sceneColors.accentDeep, 'left', true);
    sceneText(ctx, '1 result', width * 0.82, height * 0.245, 11, sceneColors.faint, 'right', true);
    sceneText(ctx, 'database.txt', width * 0.22, height * 0.4, 17, sceneColors.ink, 'left', true);
    sceneText(ctx, 'matched query: search index', width * 0.22, height * 0.49, 12, sceneColors.accentDeep, 'left', true);
    sceneLine(ctx, width * 0.22, height * 0.56, width * 0.78, height * 0.56, hexToRgba(sceneColors.line, 0.9));
    sceneText(ctx, 'indexed result / document detail / inspectable path', width * 0.5, height * 0.66, 12, sceneColors.soft, 'center');
    sceneText(ctx, 'RETURN', width * 0.5, height * 0.84, 10, sceneColors.accentDeep, 'center', true);
  }
}

function drawRocketScene(ctx, width, height, stage, time) {
  drawSceneGrid(ctx, width, height);
  const padY = height * 0.76;
  const rocketX = width * 0.5 + Math.sin(time * 0.001) * (stage === 0 ? 18 : 5);
  const rocketY = stage === 0 ? height * 0.28 + Math.sin(time * 0.0016) * 15 : stage === 1 ? height * 0.48 : height * 0.64;
  sceneLine(ctx, width * 0.14, padY, width * 0.86, padY, hexToRgba(sceneColors.line, 0.95), 2);
  sceneLine(ctx, width * 0.38, padY + 1, width * 0.62, padY + 1, sceneColors.accent, 3);
  sceneText(ctx, 'SAFE LANDING ZONE', width * 0.5, padY + 30, 10, sceneColors.accentDeep, 'center', true);

  if (stage > 0) {
    ctx.beginPath();
    ctx.moveTo(width * 0.26, padY);
    ctx.quadraticCurveTo(width * 0.28, height * 0.38, rocketX, rocketY);
    ctx.strokeStyle = hexToRgba(sceneColors.accent, 0.6);
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.save();
  ctx.translate(rocketX, rocketY);
  ctx.rotate(stage === 0 ? (sceneState.pointerX - 0.5) * 0.18 : 0);
  ctx.beginPath();
  ctx.moveTo(0, -31);
  ctx.lineTo(14, 19);
  ctx.lineTo(0, 14);
  ctx.lineTo(-14, 19);
  ctx.closePath();
  ctx.fillStyle = sceneColors.accentDeep;
  ctx.fill();
  ctx.strokeStyle = sceneColors.ink;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -9, 4, 0, Math.PI * 2);
  ctx.fillStyle = sceneColors.page;
  ctx.fill();
  if (stage > 0 && !sceneState.paused) {
    ctx.beginPath();
    ctx.moveTo(-7, 20);
    ctx.lineTo(0, 44 + Math.sin(time * 0.012) * 8);
    ctx.lineTo(7, 20);
    ctx.closePath();
    ctx.fillStyle = hexToRgba(sceneColors.accent, 0.75);
    ctx.fill();
  }
  ctx.restore();

  const metric = stage === 0 ? 'STATE / OBSERVE' : stage === 1 ? 'REWARD / CORRECT' : 'EVAL / LANDED';
  sceneText(ctx, metric, width * 0.5, height * 0.16, 13, sceneColors.soft, 'center', true);
  sceneText(ctx, stage === 2 ? 'speed / tilt / pad position within bounds' : 'position / velocity / fuel / tilt', width * 0.5, height * 0.23, 12, sceneColors.faint, 'center');
}

function drawScene(time = 0) {
  if (!sceneCanvas) return;
  const ctx = sceneCanvas.getContext('2d');
  if (!ctx) return;
  const width = sceneCanvas.width;
  const height = sceneCanvas.height;
  ctx.clearRect(0, 0, width, height);
  if (sceneState.activeScene === 'sonder') drawSonderScene(ctx, width, height, sceneState.activeStage, time);
  if (sceneState.activeScene === 'search') drawSearchScene(ctx, width, height, sceneState.activeStage, time);
  if (sceneState.activeScene === 'rocket') drawRocketScene(ctx, width, height, sceneState.activeStage, time);
}

function updateSceneCopy() {
  const content = sceneContent[sceneState.activeScene];
  if (!content) return;
  sceneTabs.forEach((tab) => {
    const active = tab.dataset.scene === sceneState.activeScene;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  sceneSteps.forEach((step, index) => {
    const active = index === sceneState.activeStage;
    step.classList.toggle('is-active', active);
    step.setAttribute('aria-current', active ? 'step' : 'false');
    const [title, copy] = content.stages[index];
    if (sceneStageTitles[index]) sceneStageTitles[index].textContent = title;
    if (sceneStageCopies[index]) sceneStageCopies[index].textContent = copy;
  });
  if (sceneLabel) sceneLabel.textContent = content.label;
  if (sceneHint) sceneHint.textContent = content.hint;
  if (sceneStageLabel) sceneStageLabel.textContent = `0${sceneState.activeStage + 1} / 03`;
  drawScene(sceneState.elapsed);
}

function setScene(sceneName) {
  if (!sceneContent[sceneName]) return;
  sceneState.activeScene = sceneName;
  sceneState.activeStage = 0;
  updateSceneCopy();
}

function setSceneStage(stage) {
  const nextStage = Math.max(0, Math.min(2, Number(stage)));
  sceneState.activeStage = nextStage;
  updateSceneCopy();
}

sceneTabs.forEach((tab) => tab.addEventListener('click', () => setScene(tab.dataset.scene)));
sceneSteps.forEach((step) => step.addEventListener('click', () => setSceneStage(step.dataset.stage)));

if (sceneMotionToggle) {
  if (reduceMotion) {
    sceneMotionToggle.disabled = true;
    sceneMotionToggle.setAttribute('aria-label', 'Motion reduced by system preference');
    sceneMotionToggle.querySelector('span:last-child').textContent = 'Motion reduced';
  } else {
    sceneMotionToggle.addEventListener('click', () => {
      sceneState.paused = !sceneState.paused;
      sceneMotionToggle.setAttribute('aria-pressed', String(sceneState.paused));
      sceneMotionToggle.querySelector('span:first-child').textContent = sceneState.paused ? '▶' : 'Ⅱ';
      sceneMotionToggle.querySelector('span:last-child').textContent = sceneState.paused ? 'Play scene' : 'Pause scene';
      drawScene(sceneState.elapsed);
    });
  }
}

if (sceneCanvas) {
  sceneCanvas.addEventListener('pointermove', (event) => {
    const bounds = sceneCanvas.getBoundingClientRect();
    sceneState.pointerX = (event.clientX - bounds.left) / bounds.width;
    sceneState.pointerY = (event.clientY - bounds.top) / bounds.height;
    if (sceneState.paused || reduceMotion) drawScene(sceneState.elapsed);
  });

  sceneCanvas.addEventListener('pointerleave', () => {
    sceneState.pointerX = 0.5;
    sceneState.pointerY = 0.5;
    if (sceneState.paused || reduceMotion) drawScene(sceneState.elapsed);
  });

  sceneCanvas.addEventListener('pointerup', (event) => {
    if (event.pointerType !== 'mouse') setSceneStage((sceneState.activeStage + 1) % 3);
  });

  updateSceneCopy();
}

if (sceneSteps.length && 'IntersectionObserver' in window) {
  const sceneStepObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0] && window.matchMedia('(max-width: 900px)').matches) setSceneStage(visible[0].target.dataset.stage);
    },
    { rootMargin: '-35% 0px -45% 0px', threshold: [0.45, 0.8] },
  );
  sceneSteps.forEach((step) => sceneStepObserver.observe(step));
}

if (sceneStage && sceneCanvas && !reduceMotion && 'IntersectionObserver' in window) {
  const sceneVisibilityObserver = new IntersectionObserver(
    (entries) => {
      sceneState.visible = entries.some((entry) => entry.isIntersecting);
      if (sceneState.visible && !sceneState.paused) {
        sceneState.lastTime = performance.now();
        window.requestAnimationFrame(animateScene);
      }
    },
    { threshold: 0.12 },
  );
  sceneVisibilityObserver.observe(sceneStage);
}

function animateScene(now) {
  if (!sceneState.visible || sceneState.paused || reduceMotion) return;
  const delta = Math.min(48, now - sceneState.lastTime);
  sceneState.lastTime = now;
  sceneState.elapsed += delta;
  drawScene(sceneState.elapsed);
  window.requestAnimationFrame(animateScene);
}
