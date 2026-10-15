const cursorSystem = document.querySelector('.cursor-system');
const pointerFine = window.matchMedia('(pointer: fine)').matches;
const motionOkay = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (cursorSystem && pointerFine && motionOkay) {
  const root = document.documentElement;
  const body = document.body;
  let frame = 0;
  let x = -100;
  let y = -100;
  let nextX = -100;
  let nextY = -100;
  let activeTarget = null;

  const setTargetSpot = (target, event) => {
    if (!target) return;
    const bounds = target.getBoundingClientRect();
    const spotX = ((event.clientX - bounds.left) / bounds.width) * 100;
    const spotY = ((event.clientY - bounds.top) / bounds.height) * 100;
    target.style.setProperty('--spot-x', `${spotX}%`);
    target.style.setProperty('--spot-y', `${spotY}%`);
  };

  const targetLabel = (target) => {
    if (target.dataset.cursorLabel) return target.dataset.cursorLabel;
    if (target.matches('.project-card')) return 'inspect';
    if (target.matches('.scene-stage, #scene-canvas')) return 'explore';
    if (target.matches('.project-filter, .scene-tab, .scene-step')) return 'change';
    if (target.matches('.footer-email, [href^="mailto:"]')) return 'contact';
    if (target.matches('.button, .nav-resume, [href$=".pdf"]')) return 'open';
    if (target.matches('a')) return 'navigate';
    return 'move';
  };

  const activateTarget = (target, event) => {
    if (activeTarget && activeTarget !== target) activeTarget.classList.remove('cursor-target');
    activeTarget = target;
    if (!target) {
      body.classList.remove('cursor-hover', 'cursor-label-visible');
      return;
    }
    target.classList.add('cursor-target');
    body.classList.add('cursor-hover', 'cursor-label-visible');
    const label = document.querySelector('.cursor-label');
    if (label) label.textContent = targetLabel(target);
    setTargetSpot(target, event);
  };

  const tick = () => {
    x += (nextX - x) * 0.22;
    y += (nextY - y) * 0.22;
    root.style.setProperty('--cursor-x', `${x}px`);
    root.style.setProperty('--cursor-y', `${y}px`);
    frame = Math.abs(nextX - x) + Math.abs(nextY - y) > 0.4 ? requestAnimationFrame(tick) : 0;
  };

  document.addEventListener('pointermove', (event) => {
    nextX = event.clientX;
    nextY = event.clientY;
    root.style.setProperty('--cursor-x', `${nextX}px`);
    root.style.setProperty('--cursor-y', `${nextY}px`);
    body.classList.add('cursor-active');
    if (!frame) frame = requestAnimationFrame(tick);

    const target = event.target.closest?.('a, button, .project-card, .scene-stage, #scene-canvas, .resume-scene');
    activateTarget(target, event);
  });

  document.addEventListener('pointerover', (event) => {
    const target = event.target.closest?.('a, button, .project-card, .scene-stage, #scene-canvas, .resume-scene');
    if (target) activateTarget(target, event);
  });

  document.addEventListener('pointerout', (event) => {
    const target = event.target.closest?.('a, button, .project-card, .scene-stage, #scene-canvas, .resume-scene');
    if (!target || target.contains(event.relatedTarget)) return;
    target.classList.remove('cursor-target');
    if (activeTarget === target) activateTarget(null, event);
  });

  document.addEventListener('pointerdown', () => body.classList.add('cursor-press'));
  document.addEventListener('pointerup', () => body.classList.remove('cursor-press'));
  document.addEventListener('pointerleave', () => body.classList.remove('cursor-active'));

  const sceneSections = [...document.querySelectorAll('[data-scene]')];
  if ('IntersectionObserver' in window && sceneSections.length) {
    const sceneObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) document.body.dataset.scene = entry.target.dataset.scene;
        });
      },
      { rootMargin: '-38% 0px -45% 0px', threshold: 0.08 },
    );
    sceneSections.forEach((section) => sceneObserver.observe(section));
  }
}

const deckControls = [...document.querySelectorAll('[data-deck-target]')];
const deckCards = [...document.querySelectorAll('[data-deck-index]')];
const deckCurrent = document.querySelector('[data-deck-current]');

function setDeckTarget(targetIndex) {
  const index = String(targetIndex);
  deckControls.forEach((control) => {
    const active = control.dataset.deckTarget === index;
    control.classList.toggle('is-active', active);
    control.setAttribute('aria-pressed', String(active));
  });
  deckCards.forEach((card) => {
    const active = card.dataset.deckIndex === index;
    card.classList.toggle('deck-focus', active);
    card.classList.toggle('deck-muted', !active);
  });
  if (deckCurrent) deckCurrent.textContent = String(Number(index) + 1).padStart(2, '0');
}

deckControls.forEach((control) => control.addEventListener('click', () => setDeckTarget(control.dataset.deckTarget)));
if (deckControls.length) setDeckTarget(0);

const telemetry = {
  sonder: ['ownership periods', 'history transfer', 'public passport'],
  search: ['inverted index', 'query path', '0.026 ms p95'],
  rocket: ['learned control', 'reward shaping', 'held-out eval'],
};
const telemetryMode = document.querySelector('[data-telemetry-mode]');
const telemetrySignal = document.querySelector('[data-telemetry-signal]');
const telemetryOutput = document.querySelector('[data-telemetry-output]');
const sceneTabButtons = [...document.querySelectorAll('[data-scene]')].filter((element) => element.classList.contains('scene-tab'));

sceneTabButtons.forEach((tab) => {
  tab.addEventListener('click', () => {
    const values = telemetry[tab.dataset.scene];
    if (!values) return;
    [telemetryMode, telemetrySignal, telemetryOutput].forEach((element, index) => {
      if (element) element.textContent = values[index];
    });
  });
});

const skills = {
  cpp: { family: 'language', kicker: 'Language / systems', title: 'C++ makes the path inspectable.', copy: 'Used in the search engine for tokenization, indexing, persistent storage, and multithreaded builds.', tags: ['data structures', 'concurrency', 'benchmarks'], icon: 'cpp' },
  python: { family: 'language', kicker: 'Language / learning', title: 'Python turns experiments into loops.', copy: 'Used for the Rocket Landing RL environment, evaluation, and the training path around it.', tags: ['PyTorch', 'evaluation', 'simulation'], icon: 'python' },
  java: { family: 'language', kicker: 'Language / foundations', title: 'Java reinforces object thinking.', copy: 'Part of the coursework foundation behind object-oriented programming and software design.', tags: ['OOP', 'coursework'], icon: 'java' },
  typescript: { family: 'language', kicker: 'Language / product', title: 'TypeScript keeps product edges clear.', copy: 'Used in Sonder to make mobile product behavior and backend contracts easier to reason about.', tags: ['React Native', 'Supabase'], icon: 'typescript' },
  javascript: { family: 'language', kicker: 'Language / web', title: 'JavaScript makes the interface respond.', copy: 'Used here for scroll scenes, canvas systems, focus states, and the interaction layer behind this portfolio.', tags: ['Canvas', 'browser APIs'], icon: 'javascript' },
  postgresql: { family: 'product', kicker: 'Data / product', title: 'PostgreSQL carries the ownership model.', copy: 'Sonder uses ownership periods to keep vehicle history transferable while authorship and access boundaries remain intact.', tags: ['RLS', 'data modeling'], icon: 'postgresql' },
  react: { family: 'product', kicker: 'Product / mobile', title: 'React Native turns models into moments.', copy: 'The mobile surface for Sonder connects VIN onboarding, history, and community workflows in one product.', tags: ['Expo', 'mobile UI'], icon: 'react' },
  expo: { family: 'product', kicker: 'Product / delivery', title: 'Expo keeps iteration close to users.', copy: 'Used as the delivery layer for a deployed React Native community application.', tags: ['React Native', 'deployment'], icon: 'expo' },
  supabase: { family: 'product', kicker: 'Product / platform', title: 'Supabase connects auth to real data.', copy: 'Used in Sonder for authentication, storage, PostgreSQL access, and public vehicle pages.', tags: ['PostgreSQL', 'auth'], icon: 'supabase' },
  cmake: { family: 'systems', kicker: 'Systems / build', title: 'CMake makes the build repeatable.', copy: 'The C++ Search Engine uses CMake to keep local builds, tests, and CI aligned across environments.', tags: ['C++17', 'CI'], icon: 'cmake' },
  sqlite: { family: 'systems', kicker: 'Systems / ingestion', title: 'SQLite keeps local data useful.', copy: 'Part of the search engine ingestion path and the persistent, inspectable data story around it.', tags: ['ingestion', 'persistence'], icon: 'sqlite' },
  curl: { family: 'systems', kicker: 'Systems / network', title: 'libcurl brings the outside world in.', copy: 'Used for web ingestion so the search engine can work with more than a folder of local files.', tags: ['web ingestion', 'C++'], icon: 'curl' },
  pytorch: { family: 'systems', kicker: 'Learning / policy', title: 'PyTorch turns feedback into policy.', copy: 'The Rocket Landing RL project uses it to explore how a controller can learn from state, reward, and evaluation.', tags: ['RL', 'reward shaping'], icon: 'pytorch' },
  githubactions: { family: 'infra', kicker: 'Infrastructure / quality', title: 'CI makes trust repeatable.', copy: 'GitHub Actions runs the C++ project across Ubuntu and macOS so changes are tested before they travel.', tags: ['automation', 'regression'], icon: 'githubactions' },
  vercel: { family: 'infra', kicker: 'Infrastructure / deploy', title: 'Vercel keeps the product reachable.', copy: 'Used to deploy Sonder while the data model, permissions, and public surface stay connected.', tags: ['deployment', 'production'], icon: 'vercel' },
};
const skillTiles = [...document.querySelectorAll('.skill-tile[data-skill]')];
const skillFilters = [...document.querySelectorAll('[data-skill-filter]')];
const skillKicker = document.querySelector('[data-skill-kicker]');
const skillTitle = document.querySelector('[data-skill-title]');
const skillCopy = document.querySelector('[data-skill-copy]');
const skillTags = document.querySelector('[data-skill-tags]');
const skillIcon = document.querySelector('[data-skill-detail-icon]');
const skillCount = document.querySelector('[data-skill-count]');

function setSkill(skillName) {
  const skill = skills[skillName];
  if (!skill) return;
  skillTiles.forEach((tile) => {
    const active = tile.dataset.skill === skillName;
    tile.classList.toggle('is-active', active);
    tile.setAttribute('aria-pressed', String(active));
  });
  if (skillKicker) skillKicker.textContent = skill.kicker;
  if (skillTitle) skillTitle.textContent = skill.title;
  if (skillCopy) skillCopy.textContent = skill.copy;
  if (skillTags) skillTags.innerHTML = skill.tags.map((tag) => `<span>${tag}</span>`).join('');
  if (skillIcon) {
    skillIcon.src = `assets/skill-icons/${skill.icon}.svg`;
    skillIcon.alt = `${skillName} technology mark`;
  }
}

function filterSkills(filterName) {
  skillFilters.forEach((filter) => {
    const active = filter.dataset.skillFilter === filterName;
    filter.classList.toggle('is-active', active);
    filter.setAttribute('aria-selected', String(active));
  });
  let count = 0;
  skillTiles.forEach((tile) => {
    const visible = filterName === 'all' || tile.dataset.skillFamily === filterName;
    tile.hidden = !visible;
    if (visible) count += 1;
  });
  if (skillCount) skillCount.textContent = `${count} ${count === 1 ? 'technology' : 'technologies'}`;
  const activeTile = skillTiles.find((tile) => !tile.hidden && tile.dataset.skill === skillTiles.find((item) => item.classList.contains('is-active'))?.dataset.skill) || skillTiles.find((tile) => !tile.hidden);
  if (activeTile) setSkill(activeTile.dataset.skill);
}

skillTiles.forEach((tile) => tile.addEventListener('click', () => setSkill(tile.dataset.skill)));
skillFilters.forEach((filter) => filter.addEventListener('click', () => filterSkills(filter.dataset.skillFilter)));
if (skillTiles.length) setSkill('cpp');
if (skillFilters.length) filterSkills('all');
