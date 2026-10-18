// Capability gallery: pick a tool to read how it was used, or highlight every tool a project used.
// Replaces the old tile grid logic that lived in interaction-layer.js.
(() => {
  'use strict';

  const root = document.querySelector('.cap');
  if (!root) return;

  const $ = (selector, scope = root) => scope.querySelector(selector);
  const $$ = (selector, scope = root) => [...scope.querySelectorAll(selector)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hoverSelects = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const PROJECTS = {
    sonder: { name: 'Sonder', color: '#e0b457' },
    search: { name: 'C++ Search Engine', color: '#ff7b6b' },
    rocket: { name: 'Rocket Landing RL', color: '#5fe3d0' },
    site: { name: 'This site', color: '#9aa8ff' },
    course: { name: 'Coursework', color: '#c3cad8' },
  };

  const SKILLS = {
    cpp: { kicker: 'Language / systems', title: 'C++ makes the path inspectable.', copy: 'Used in the search engine for tokenization, indexing, persistent storage, and multithreaded builds.', tags: ['data structures', 'concurrency', 'benchmarks'], proof: 'Indexed 5,950 Wikipedia articles with a 0.026 ms p95 query time.' },
    python: { kicker: 'Language / learning', title: 'Python turns experiments into loops.', copy: 'Used for the Rocket Landing RL simulator, held-out evaluation, and PPO training.', tags: ['PyTorch', 'evaluation', 'simulation'], proof: 'The Rocket Landing RL simulator and evaluation.' },
    typescript: { kicker: 'Language / product', title: 'TypeScript keeps product edges clear.', copy: 'Used in Sonder to make mobile product behavior and backend contracts easier to reason about.', tags: ['React Native', 'Supabase'], proof: 'Sonder, built and deployed end to end.' },
    javascript: { kicker: 'Language / web', title: 'JavaScript makes the interface respond.', copy: 'Used here for scroll scenes, interactive demos, canvas systems, and the motion layer behind this portfolio.', tags: ['Canvas', 'browser APIs'], proof: 'Everything that moves on this site, including the demos in the lab.' },
    postgresql: { kicker: 'Data / product', title: 'PostgreSQL carries the ownership model.', copy: 'Sonder uses ownership periods to keep vehicle history transferable while authorship and access boundaries remain intact.', tags: ['RLS', 'data modeling'], proof: 'Row-level security with role-based permission tests.' },
    react: { kicker: 'Product / mobile', title: 'React Native turns models into moments.', copy: 'The mobile surface for Sonder connects VIN onboarding, history, and community workflows in one product.', tags: ['Expo', 'mobile UI'], proof: 'Sonder’s mobile app and VIN onboarding flow.' },
    expo: { kicker: 'Product / delivery', title: 'Expo keeps iteration close to users.', copy: 'Used as the delivery layer for a deployed React Native community application.', tags: ['React Native', 'deployment'], proof: 'The delivery layer for Sonder.' },
    supabase: { kicker: 'Product / platform', title: 'Supabase connects auth to real data.', copy: 'Used in Sonder for authentication, storage, PostgreSQL access, and public vehicle pages.', tags: ['PostgreSQL', 'auth'], proof: 'Authentication, storage, and public vehicle pages for Sonder.' },
    cmake: { kicker: 'Systems / build', title: 'CMake makes the build repeatable.', copy: 'The C++ Search Engine uses CMake to keep local builds, tests, and CI aligned across environments.', tags: ['C++17', 'CI'], proof: 'One build definition used locally and in CI.' },
    sqlite: { kicker: 'Systems / ingestion', title: 'SQLite keeps local data useful.', copy: 'Part of the search engine ingestion path and the persistent, inspectable data story around it.', tags: ['ingestion', 'persistence'], proof: 'A SQLite ingestion adapter in the search engine.' },
    curl: { kicker: 'Systems / network', title: 'libcurl brings the outside world in.', copy: 'Used for web ingestion so the search engine can work with more than a folder of local files.', tags: ['web ingestion', 'C++'], proof: 'The web ingestion adapter in the search engine.' },
    pytorch: { kicker: 'Learning / policy', title: 'PyTorch turns feedback into policy.', copy: 'The Rocket Landing RL project uses it to train a PPO agent from scratch, learning a landing controller from state, reward, and evaluation.', tags: ['RL', 'reward shaping'], proof: 'A from-scratch PPO agent for Rocket Landing RL.' },
    githubactions: { kicker: 'Infrastructure / quality', title: 'CI makes trust repeatable.', copy: 'GitHub Actions runs the C++ project across Ubuntu and macOS so changes are tested before they travel.', tags: ['automation', 'regression'], proof: 'CI on Ubuntu and macOS for the search engine.' },
    vercel: { kicker: 'Infrastructure / deploy', title: 'Vercel keeps the product reachable.', copy: 'Used to deploy Sonder while the data model, permissions, and public surface stay connected.', tags: ['deployment', 'production'], proof: 'Sonder’s production deployment.' },
  };

  const tiles = $$('.cap-tile');
  const chips = $$('.cap-chip');
  const detail = $('[data-cap-detail]');
  const parts = {
    icon: $('[data-cap-icon]'),
    kicker: $('[data-cap-kicker]'),
    title: $('[data-cap-title]'),
    copy: $('[data-cap-copy]'),
    used: $('[data-cap-used]'),
    proof: $('[data-cap-proof]'),
    tags: $('[data-cap-tags]'),
  };
  const usedBy = (tile) => tile.dataset.used.split(' ');

  let selected = 'cpp';
  let swapTimer = 0;

  function fillDetail(key) {
    const skill = SKILLS[key];
    const tile = tiles.find((item) => item.dataset.skill === key);
    if (!skill || !tile) return;
    parts.icon.src = `assets/skill-icons/${key}.svg`;
    parts.icon.alt = '';
    parts.kicker.textContent = skill.kicker;
    parts.title.textContent = skill.title;
    parts.copy.textContent = skill.copy;
    parts.proof.textContent = skill.proof;
    parts.tags.replaceChildren(
      ...skill.tags.map((tag) => {
        const span = document.createElement('span');
        span.textContent = tag;
        return span;
      })
    );
    parts.used.replaceChildren(
      ...usedBy(tile).map((id) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.style.setProperty('--pc', PROJECTS[id].color);
        button.setAttribute('aria-label', `Highlight everything used in ${PROJECTS[id].name}`);
        const dot = document.createElement('i');
        dot.setAttribute('aria-hidden', 'true');
        button.append(dot, document.createTextNode(PROJECTS[id].name));
        button.addEventListener('click', () => setProject(id));
        return button;
      })
    );
  }

  function select(key) {
    if (!SKILLS[key]) return;
    const changed = key !== selected;
    selected = key;
    tiles.forEach((tile) => {
      const on = tile.dataset.skill === key;
      tile.classList.toggle('is-active', on);
      tile.setAttribute('aria-pressed', String(on));
    });
    if (!changed && parts.title.textContent) return;
    if (reduceMotion) {
      fillDetail(key);
      return;
    }
    window.clearTimeout(swapTimer);
    detail.classList.add('is-swapping');
    swapTimer = window.setTimeout(() => {
      fillDetail(key);
      detail.classList.remove('is-swapping');
    }, 170);
  }

  function setProject(id) {
    chips.forEach((chip) => {
      const on = chip.dataset.project === id;
      chip.classList.toggle('is-active', on);
      chip.setAttribute('aria-pressed', String(on));
    });
    tiles.forEach((tile) => {
      const match = id === 'all' || usedBy(tile).includes(id);
      tile.classList.toggle('is-dim', !match);
      tile.classList.toggle('is-lit', id !== 'all' && match);
      if (id !== 'all') tile.style.setProperty('--hc', PROJECTS[id].color);
      else tile.style.removeProperty('--hc');
    });
    const current = tiles.find((tile) => tile.dataset.skill === selected);
    if (id !== 'all' && current && !usedBy(current).includes(id)) {
      const first = tiles.find((tile) => usedBy(tile).includes(id));
      if (first) select(first.dataset.skill);
    } else {
      // refresh the "used in" chips so the highlighted project reads as current
      fillDetail(selected);
    }
  }

  tiles.forEach((tile) => {
    tile.addEventListener('click', () => select(tile.dataset.skill));
    tile.addEventListener('focus', () => select(tile.dataset.skill));
    if (hoverSelects) tile.addEventListener('pointerenter', () => select(tile.dataset.skill));
  });
  chips.forEach((chip) => chip.addEventListener('click', () => setProject(chip.dataset.project)));

  fillDetail(selected);
  select(selected);
  setProject('all');
})();
