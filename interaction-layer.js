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
  systems: {
    kicker: 'Systems thinking',
    title: 'Trace the whole path.',
    copy: 'From input to output, I like understanding the contracts, failure modes, and decisions that make a system dependable.',
    tags: ['architecture', 'debugging'],
  },
  data: {
    kicker: 'Data and algorithms',
    title: 'Make the structure do the work.',
    copy: 'Indexes, schemas, queries, and models should make the next decision faster, clearer, and easier to test.',
    tags: ['C++', 'PostgreSQL'],
  },
  product: {
    kicker: 'Product engineering',
    title: 'Ship the useful slice.',
    copy: 'I connect user needs to concrete software, from VIN onboarding and public pages to browser tools for inspecting search results.',
    tags: ['React Native', 'TypeScript'],
  },
  infra: {
    kicker: 'Infrastructure support',
    title: 'Keep real systems moving.',
    copy: 'Supporting 100+ end users taught me to troubleshoot carefully, document the path, and finish the issue instead of guessing.',
    tags: ['Windows / macOS', 'Active Directory'],
  },
  quality: {
    kicker: 'Quality and evidence',
    title: 'Measure before claiming.',
    copy: 'Benchmarks, permission tests, CI, and reproducible reports turn a promising build into something other engineers can trust.',
    tags: ['GitHub Actions', 'automated testing'],
  },
};
const skillControls = [...document.querySelectorAll('[data-skill]')];
const skillKicker = document.querySelector('[data-skill-kicker]');
const skillTitle = document.querySelector('[data-skill-title]');
const skillCopy = document.querySelector('[data-skill-copy]');
const skillTags = document.querySelector('[data-skill-tags]');
const skillWheel = document.querySelector('.skill-wheel');

function setSkill(skillName) {
  const skill = skills[skillName];
  if (!skill) return;
  skillControls.forEach((control) => {
    const active = control.dataset.skill === skillName;
    control.classList.toggle('is-active', active);
    control.setAttribute('aria-selected', String(active));
  });
  if (skillKicker) skillKicker.textContent = skill.kicker;
  if (skillTitle) skillTitle.textContent = skill.title;
  if (skillCopy) skillCopy.textContent = skill.copy;
  if (skillTags) skillTags.innerHTML = skill.tags.map((tag) => `<span>${tag}</span>`).join('');
  if (skillWheel) skillWheel.dataset.skill = skillName;
}

skillControls.forEach((control) => control.addEventListener('click', () => setSkill(control.dataset.skill)));
if (skillControls.length) setSkill('systems');
