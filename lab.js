// Build Lab: three small interactive demos, one per project.
//   Sonder         - a car's ownership timeline: scrub it, sell the car, view it as different people.
//   Search engine  - a query becomes tokens, postings, and ranked results.
//   Rocket landing - the physics environment, flown by you or a hand-written autopilot.
// Each demo is a small, honest model of the idea. The notes under the stage say what is real.
(() => {
  'use strict';

  const root = document.querySelector('#lab');
  if (!root) return;

  const $ = (selector, scope = root) => scope.querySelector(selector);
  const $$ = (selector, scope = root) => [...scope.querySelectorAll(selector)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  // =====================================================================================
  // Sonder: ownership passport
  // =====================================================================================
  function createSonder() {
    const panel = $('[data-panel="sonder"]');
    const track = $('[data-sd-track]', panel);
    const list = $('[data-sd-entries]', panel);
    const odo = $('[data-sd-odo]', panel);
    const yearOut = $('[data-sd-year]', panel);
    const perm = $('[data-sd-perm]', panel);
    const scrub = $('.sd-scrub', panel);
    const addButton = $('[data-sd-add]', panel);
    const sellButton = $('[data-sd-sell]', panel);
    const viewerButtons = $$('[data-viewer]', panel);
    const NOW = 2026;

    const seedOwners = () => [
      { id: 'maya', name: 'Maya', from: 2016, to: 2019, color: '#e0b457' },
      { id: 'dev', name: 'Dev', from: 2019, to: 2022, color: '#67e2d1' },
      { id: 'ari', name: 'Ari', from: 2022, to: NOW, color: '#83aaff' },
    ];
    const seedEntries = () => [
      { y: 2016, o: 'maya', t: 'Bought new', d: 'Delivery photos and window sticker', pub: true, mi: 12 },
      { y: 2017, o: 'maya', t: 'Intake and tune', d: 'Stage 1 with the dyno sheet attached', pub: true, mi: 9400 },
      { y: 2018, o: 'maya', t: 'Timing belt service', d: 'Receipts for parts and labor', pub: false, mi: 27800 },
      { y: 2019, o: 'dev', t: 'Bought from Maya', d: 'The passport moved with the car', pub: true, mi: 31200 },
      { y: 2020, o: 'dev', t: 'Coilovers installed', d: 'Ride height and alignment specs', pub: true, mi: 36900 },
      { y: 2021, o: 'dev', t: 'Brake overhaul', d: 'Rotors, pads, and fluid', pub: false, mi: 44100 },
      { y: 2022, o: 'ari', t: 'Bought from Dev', d: 'Mods and service history inherited', pub: true, mi: 48200 },
      { y: 2023, o: 'ari', t: 'Clutch replaced', d: 'Parts list and torque specs', pub: true, mi: 53400 },
      { y: 2025, o: 'ari', t: 'Oil and filters', d: 'Interval log', pub: false, mi: 59800 },
    ];
    const extras = [
      ['New tires', 'Set of four, alignment done'],
      ['Detail and ceramic coat', 'Before and after photos'],
      ['Brake fluid flush', 'Noted for the next owner'],
    ];

    let owners;
    let entries;
    let nodes;
    let state;

    const ownerOf = (id) => owners.find((owner) => owner.id === id);
    const current = () => owners[owners.length - 1];
    const previous = () => owners[owners.length - 2];

    const canSee = (entry) => {
      if (entry.y > state.year) return false;
      if (state.viewer === 'owner') return true;
      if (state.viewer === 'public') return entry.pub;
      return entry.pub || entry.o === previous().id;
    };
    const canEdit = (entry) => state.viewer === 'owner' && entry.o === current().id;

    function bandUnits() {
      return owners.map((owner) => Math.max((owner.to ?? NOW) - owner.from, 0.9));
    }

    function buildTrack() {
      track.replaceChildren();
      const units = bandUnits();
      owners.forEach((owner, index) => {
        const band = make('div', 'sd-band');
        band.style.setProperty('--oc', owner.color);
        band.style.flex = `${units[index]} 1 0`;
        band.dataset.owner = owner.id;
        band.append(make('strong', '', owner.name), make('small', '', `${owner.from}–${owner.to === NOW && owner === current() ? 'now' : owner.to}`));
        track.append(band);
      });
      const marker = make('div', 'sd-marker');
      marker.dataset.marker = '';
      track.append(marker);
    }

    function updateTrack() {
      const units = bandUnits();
      const total = units.reduce((sum, unit) => sum + unit, 0);
      let activeIndex = 0;
      owners.forEach((owner, index) => {
        if (owner.from <= state.year) activeIndex = index;
      });
      let before = 0;
      for (let i = 0; i < activeIndex; i += 1) before += units[i];
      const owner = owners[activeIndex];
      const length = (owner.to ?? NOW) - owner.from;
      const fraction = length > 0 ? clamp((state.year - owner.from) / length, 0, 1) : 0;
      const left = ((before + fraction * units[activeIndex]) / total) * 100;
      owners.forEach((item, index) => {
        track.children[index].classList.toggle('is-current', index === activeIndex);
        track.children[index].classList.toggle('is-future', item.from > state.year);
      });
      const marker = track.querySelector('[data-marker]');
      if (marker) marker.style.left = `calc(${left}% - 1px)`;
    }

    function buildEntry(entry) {
      const item = make('li', 'sd-entry');
      const card = make('div', 'sd-card');
      const top = make('div', 'sd-card-top');
      top.append(make('strong', '', entry.t));
      card.append(top, make('p', '', entry.d), make('div', 'sd-tags'));
      item.append(make('span', 'sd-year', String(entry.y)), card);
      nodes.set(entry, item);
      return item;
    }

    function paintEntry(entry) {
      const item = nodes.get(entry);
      const owner = ownerOf(entry.o);
      const visible = canSee(entry);
      item.hidden = !visible;
      if (!visible) return;
      const card = item.querySelector('.sd-card');
      card.style.setProperty('--oc', owner.color);
      const tags = card.querySelector('.sd-tags');
      tags.replaceChildren();
      const tag = (text, kind) => {
        const node = make('span', 'sd-tag', text);
        node.dataset.kind = kind;
        node.style.setProperty('--oc', owner.color);
        tags.append(node);
      };
      tag(`by ${owner.name}`, 'author');
      if (!entry.pub) tag('private', 'plain');
      if (state.viewer === 'owner') tag(canEdit(entry) ? 'you can edit' : 'read-only', canEdit(entry) ? 'editable' : 'locked');
      if (state.viewer === 'previous' && entry.o === previous().id) tag('credit kept, no edit access', 'locked');
    }

    function render() {
      yearOut.textContent = String(state.year);
      scrub.value = String(state.year);
      const reached = entries.filter((entry) => entry.y <= state.year);
      const last = reached[reached.length - 1];
      odo.textContent = `${(last ? last.mi : 0).toLocaleString('en-US')} mi`;
      entries.forEach(paintEntry);
      updateTrack();

      viewerButtons.forEach((button) => {
        const active = button.dataset.viewer === state.viewer;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
        if (button.dataset.viewer === 'owner') button.textContent = `${current().name} (owner)`;
        if (button.dataset.viewer === 'previous') button.textContent = `${previous().name} (previous owner)`;
      });

      const seen = reached.filter(canSee).length;
      const editable = entries.filter((entry) => entry.y <= state.year && canEdit(entry)).length;
      if (state.viewer === 'owner') {
        perm.innerHTML = `Viewing as <b>${current().name}</b>, the current owner. Sees <b>${seen} of ${reached.length}</b> entries, can add new ones, and can edit the <b>${editable}</b> made during their ownership.`;
      } else if (state.viewer === 'previous') {
        perm.innerHTML = `Viewing as <b>${previous().name}</b>, a previous owner. Sees <b>${seen}</b> entries: their own plus the published ones. <b>Credit is kept, control is not.</b>`;
      } else {
        perm.innerHTML = `Viewing as <b>the public</b>. Sees only the <b>${seen}</b> published entries. Read-only.`;
      }
      addButton.disabled = state.viewer !== 'owner' || state.added >= extras.length;
      sellButton.textContent = state.sold ? 'Reset demo' : 'Sell this car';
    }

    function reset() {
      owners = seedOwners();
      entries = seedEntries();
      nodes = new Map();
      state = { year: NOW, viewer: 'owner', sold: false, added: 0 };
      list.replaceChildren(...entries.map(buildEntry));
      buildTrack();
      render();
    }

    function setViewer(viewer) {
      state.viewer = viewer;
      render();
    }

    function setYear(year) {
      state.year = clamp(Number(year), 2016, NOW);
      render();
    }

    function sell() {
      if (state.sold) {
        reset();
        return;
      }
      const seller = current();
      seller.to = NOW;
      owners.push({ id: 'sam', name: 'Sam', from: NOW, to: NOW, color: '#c79bff' });
      const reached = entries[entries.length - 1];
      const entry = { y: NOW, o: 'sam', t: 'Bought from ' + seller.name, d: 'The whole history arrives with the car', pub: true, mi: reached.mi + 900 };
      entries.push(entry);
      list.append(buildEntry(entry));
      state.sold = true;
      state.year = NOW;
      state.viewer = 'owner';
      buildTrack();
      render();
      list.scrollTo({ top: list.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    function add() {
      if (state.viewer !== 'owner' || state.added >= extras.length) return;
      const [title, detail] = extras[state.added];
      const last = entries[entries.length - 1];
      const entry = { y: NOW, o: current().id, t: title, d: detail, pub: false, mi: last.mi + 600 };
      entries.push(entry);
      list.append(buildEntry(entry));
      state.added += 1;
      state.year = NOW;
      render();
      list.scrollTo({ top: list.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    let timer = 0;
    function playScrub() {
      window.clearInterval(timer);
      state.viewer = 'owner';
      if (reduceMotion) {
        setYear(2019);
        return;
      }
      let year = 2016;
      setYear(year);
      timer = window.setInterval(() => {
        year += 1;
        setYear(year);
        if (year >= NOW) window.clearInterval(timer);
      }, 320);
    }

    scrub.addEventListener('input', () => {
      window.clearInterval(timer);
      setYear(scrub.value);
    });
    viewerButtons.forEach((button) => button.addEventListener('click', () => setViewer(button.dataset.viewer)));
    addButton.addEventListener('click', add);
    sellButton.addEventListener('click', sell);
    reset();

    return {
      title: 'Sonder · vehicle passport',
      kicker: 'Sonder / ownership periods',
      copy: 'A car’s history belongs to the car. Scrub through its life, then sell it to see who keeps credit and who keeps control.',
      facts: ['vehicles', 'ownerships', 'entries'],
      note: 'Illustrative data and simplified rules. The real model is vehicles → ownership periods → entries, with row-level security enforcing who can read and write.',
      tries: [
        { label: 'Scrub through the car’s life', run: playScrub },
        { label: 'See it through a previous owner’s eyes', run: () => setViewer('previous') },
        { label: 'Sell the car and watch the history travel', run: () => { if (state.sold) reset(); sell(); } },
      ],
      show() {},
      hide() {
        window.clearInterval(timer);
      },
    };
  }

  // =====================================================================================
  // Search engine: query path
  // =====================================================================================
  function createSearch() {
    const panel = $('[data-panel="search"]');
    const form = $('[data-sx-form]', panel);
    const input = $('#sx-query', panel);
    const fuzzyBox = $('[data-sx-fuzzy]', panel);
    const synBox = $('[data-sx-syn]', panel);
    const tokensEl = $('[data-sx-tokens]', panel);
    const postingsEl = $('[data-sx-postings]', panel);
    const resultsEl = $('[data-sx-results]', panel);
    const compareEl = $('[data-sx-compare]', panel);

    const DOCS = [
      ['databases.txt', 'Databases store structured data and support reliable queries. A search index can make repeated queries faster.'],
      ['indexes.txt', 'An inverted index maps each word to the documents that contain it, so a query can skip documents that cannot match.'],
      ['compilers.txt', 'Compilers translate source code into machine code and report errors before a program runs.'],
      ['threads.txt', 'Threads let a program build an index in parallel, but shared state needs careful locking.'],
      ['caches.txt', 'A cache keeps recent results close by so repeated queries return faster.'],
      ['networks.txt', 'Network protocols move data between machines, and a slow connection can dominate the cost of a query.'],
      ['sorting.txt', 'Sorting algorithms order data so searches can use binary search instead of scanning every item.'],
      ['security.txt', 'Access control decides who may read or change data, enforced close to the database.'],
      ['testing.txt', 'Automated tests catch regressions early, especially when a change touches an index format.'],
      ['storage.txt', 'Persistent storage writes an index to disk so it can be loaded again without rebuilding.'],
    ];
    const STOP = new Set('a an the to of so it is in and into by or that each but can be as for with when who may are from they this at on not than more'.split(' '));
    const GROUPS = [
      ['index', 'indexes', 'indices', 'indexing'],
      ['database', 'databases', 'db'],
      ['query', 'queries'],
      ['search', 'searches', 'searching'],
      ['cache', 'caches', 'caching'],
      ['thread', 'threads'],
      ['sort', 'sorting', 'sorts'],
      ['test', 'tests', 'testing'],
      ['document', 'documents', 'docs'],
    ];

    const tokenize = (text) => text.toLowerCase().match(/[a-z0-9]+/g) || [];
    const index = new Map(); // term -> Map(docIndex -> term frequency)
    DOCS.forEach(([, text], docIndex) => {
      tokenize(text).forEach((word) => {
        if (STOP.has(word)) return;
        if (!index.has(word)) index.set(word, new Map());
        const postings = index.get(word);
        postings.set(docIndex, (postings.get(docIndex) || 0) + 1);
      });
    });
    const vocabulary = [...index.keys()];

    function distance(a, b) {
      const previousRow = Array.from({ length: b.length + 1 }, (_, i) => i);
      for (let i = 1; i <= a.length; i += 1) {
        let diagonal = previousRow[0];
        previousRow[0] = i;
        for (let j = 1; j <= b.length; j += 1) {
          const above = previousRow[j];
          previousRow[j] = Math.min(previousRow[j] + 1, previousRow[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
          diagonal = above;
        }
      }
      return previousRow[b.length];
    }

    function expand(term, fuzzy, synonyms) {
      const found = [];
      const seen = new Set();
      const add = (word, via) => {
        if (!index.has(word) || seen.has(word)) return;
        seen.add(word);
        found.push({ word, via });
      };
      add(term, 'exact');
      if (synonyms) {
        const group = GROUPS.find((entry) => entry.includes(term));
        if (group) group.forEach((word) => word !== term && add(word, 'synonym'));
      }
      if (fuzzy && term.length >= 4) {
        vocabulary.forEach((word) => {
          if (!seen.has(word) && Math.abs(word.length - term.length) <= 1 && distance(term, word) === 1) add(word, 'fuzzy');
        });
      }
      return found;
    }

    function run(query, fuzzy, synonyms) {
      const terms = [...new Set(tokenize(query).filter((word) => !STOP.has(word)))];
      const expanded = terms.map((term) => ({ term, variants: expand(term, fuzzy, synonyms) }));
      const scores = new Map();
      let touched = 0;
      expanded.forEach(({ term, variants }) => {
        variants.forEach(({ word, via }) => {
          const postings = index.get(word);
          touched += postings.size;
          const weight = via === 'exact' ? 3 : via === 'synonym' ? 2 : 1.5;
          postings.forEach((frequency, docIndex) => {
            const entry = scores.get(docIndex) || { score: 0, terms: new Set(), words: new Set() };
            entry.score += weight * (1 + Math.log(frequency));
            entry.terms.add(term);
            entry.words.add(word);
            scores.set(docIndex, entry);
          });
        });
      });
      const ranked = [...scores.entries()]
        .map(([docIndex, entry]) => ({ docIndex, ...entry }))
        .sort((a, b) => b.terms.size - a.terms.size || b.score - a.score)
        .slice(0, 4);
      return { terms, expanded, ranked, touched };
    }

    function highlight(text, words) {
      const fragment = document.createDocumentFragment();
      (text.match(/[A-Za-z0-9]+|[^A-Za-z0-9]+/g) || []).forEach((piece) => {
        if (words.has(piece.toLowerCase())) fragment.append(make('mark', '', piece));
        else fragment.append(document.createTextNode(piece));
      });
      return fragment;
    }

    function render() {
      const { terms, expanded, ranked, touched } = run(input.value, fuzzyBox.checked, synBox.checked);

      tokensEl.replaceChildren();
      postingsEl.replaceChildren();
      resultsEl.replaceChildren();
      compareEl.replaceChildren();

      if (!terms.length) {
        tokensEl.append(make('p', 'sx-empty', 'Type a word to start. Stop words like “the” are dropped.'));
        return;
      }

      expanded.forEach(({ term, variants }) => {
        const chip = make('div', 'sx-chip');
        chip.append(make('b', '', term));
        if (!variants.length) chip.append(make('i', '', 'not in the index'));
        variants
          .filter((variant) => variant.word !== term)
          .forEach((variant) => chip.append(make('em', '', `→ ${variant.word} (${variant.via})`)));
        tokensEl.append(chip);
      });

      expanded.forEach(({ variants }) => {
        variants.forEach(({ word }) => {
          const row = make('div', 'sx-post');
          row.append(make('b', '', word));
          index.get(word).forEach((frequency, docIndex) => {
            row.append(make('span', '', `${DOCS[docIndex][0].replace('.txt', '')}${frequency > 1 ? ` ×${frequency}` : ''}`));
          });
          postingsEl.append(row);
        });
      });
      if (!postingsEl.children.length) postingsEl.append(make('p', 'sx-empty', 'No postings. Try fuzzy spelling or synonyms.'));

      if (!ranked.length) {
        resultsEl.append(make('p', 'sx-empty', 'No documents match yet.'));
      } else {
        const top = ranked[0].terms.size * 10 + ranked[0].score;
        ranked.forEach((hit) => {
          const row = make('div', 'sx-hit');
          const head = make('div', 'sx-hit-top');
          const score = make('span', 'sx-score');
          const fill = make('i');
          fill.style.width = `${clamp(((hit.terms.size * 10 + hit.score) / top) * 100, 8, 100)}%`;
          score.append(fill);
          head.append(make('b', '', DOCS[hit.docIndex][0]), score);
          const snippet = make('p');
          snippet.append(highlight(DOCS[hit.docIndex][1], hit.words));
          row.append(head, snippet);
          resultsEl.append(row);
        });
      }

      const bar = (kind, label, width, value) => {
        const row = make('div', 'sx-bar');
        row.dataset.kind = kind;
        const trackEl = make('span', 'sx-bar-track');
        const fill = make('i');
        fill.style.width = `${width}%`;
        trackEl.append(fill);
        row.append(make('span', '', label), trackEl, make('b', '', value));
        compareEl.append(row);
      };
      bar('linear', 'Linear scan', 100, `${DOCS.length} docs read`);
      bar('index', 'Inverted index', clamp((touched / DOCS.length) * 100, 6, 100), `${touched} postings`);
    }

    input.addEventListener('input', render);
    fuzzyBox.addEventListener('change', render);
    synBox.addEventListener('change', render);
    form.addEventListener('submit', (event) => event.preventDefault());
    render();

    const search = (value, fuzzy, synonyms) => {
      input.value = value;
      fuzzyBox.checked = fuzzy;
      synBox.checked = synonyms;
      render();
    };

    return {
      title: 'Search engine · query path',
      kicker: 'C++ search engine / inverted index',
      copy: 'Type a query and watch it become tokens, postings, and a ranked result. A small browser version of the idea behind the C++ engine.',
      facts: ['tokenize', 'index', 'rank'],
      note: 'A browser demo on 10 sample documents, not the C++ engine. The real engine searched 5,950 Wikipedia articles with a 0.026 ms p95 query time.',
      tries: [
        { label: 'Search for “search index”', run: () => search('search index', true, true) },
        { label: 'Misspell it: “serch indx”', run: () => search('serch indx', true, true) },
        { label: 'Try a synonym: “db”', run: () => search('db', false, true) },
      ],
      show() {},
      hide() {},
    };
  }

  // =====================================================================================
  // Rocket landing: reward loop
  // =====================================================================================
  function createRocket() {
    const panel = $('[data-panel="rocket"]');
    const Sim = window.RocketSim;
    const stub = { title: 'Rocket landing · reward loop', kicker: '', copy: '', facts: [], note: '', tries: [], show() {}, hide() {}, setInView() {} };
    if (!Sim) return stub;

    const canvas = $('[data-rk-canvas]', panel);
    const ctx = canvas.getContext('2d');
    const screen = $('[data-rk-screen]', panel);
    const overlay = $('[data-rk-overlay]', panel);
    const msg = $('[data-rk-msg]', panel);
    const sub = $('[data-rk-sub]', panel);
    const again = $('[data-rk-again]', panel);
    const modeButtons = $$('[data-rk-mode]', panel);
    const els = {
      alt: $('[data-rk-alt]', panel),
      speed: $('[data-rk-speed]', panel),
      tilt: $('[data-rk-tilt]', panel),
      fuel: $('[data-rk-fuel]', panel),
      reward: $('[data-rk-reward]', panel),
      parts: $('[data-rk-parts]', panel),
      history: $('[data-rk-history]', panel),
      score: $('[data-rk-score]', panel),
    };

    const STEP = 1 / 120;
    const partDefs = [
      ['near', 'Near the pad', 6],
      ['slow', 'Moving slowly', 6],
      ['upright', 'Staying upright', 6],
      ['fuel', 'Saving fuel', 6],
      ['terminal', 'Landing', 100],
    ];
    const partRows = {};
    partDefs.forEach(([key, label]) => {
      const row = make('div', 'rk-part');
      row.dataset.part = key;
      const bar = make('span', 'rk-part-track');
      const fill = make('i');
      bar.append(fill);
      const value = make('b', '', '0.0');
      row.append(make('span', '', label), bar, value);
      els.parts.append(row);
      partRows[key] = { fill, value };
    });

    let sim = Sim.create();
    let phase = 'ready'; // ready | flying | over
    let mode = 'manual';
    let accumulator = 0;
    let last = 0;
    let rafId = 0;
    let active = false;
    let inView = false;
    let tick = 0;
    let autoTimer = 0;
    let trail = [];
    let particles = [];
    const history = [];
    const keys = { thrust: false, left: false, right: false };
    const touch = { thrust: false, left: false, right: false };
    let scale = 1;

    function fit() {
      const box = screen.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(box.width * ratio);
      canvas.height = Math.round(box.height * ratio);
      scale = canvas.width / Sim.W;
    }
    new ResizeObserver(() => {
      fit();
      draw(performance.now());
    }).observe(screen);

    function draw(now) {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      Sim.render(ctx, sim, { now, trail, particles });
    }

    function burst(color, count, spread) {
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (0.4 + Math.random()) * spread;
        particles.push({ x: sim.x, y: sim.y + 14, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - spread * 0.4, r: 1.4 + Math.random() * 2.6, life: 1, color });
      }
    }

    function paintHud() {
      const altitude = Math.max(0, Sim.GROUND - Sim.HALF_HEIGHT - sim.y);
      els.alt.textContent = Math.round(altitude).toString();
      els.speed.textContent = Math.round(Math.hypot(sim.vx, sim.vy)).toString();
      els.tilt.textContent = `${Math.round((sim.a * 180) / Math.PI)}°`;
      els.fuel.style.transform = `scaleX(${clamp(sim.fuel / 100, 0, 1)})`;
      els.reward.textContent = sim.reward.toFixed(1);
      partDefs.forEach(([key, , range]) => {
        const value = sim.parts[key];
        const row = partRows[key];
        row.fill.style.width = `${clamp((Math.abs(value) / range) * 100, 0, 100)}%`;
        row.value.textContent = `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
      });
    }

    function paintHistory() {
      els.history.replaceChildren();
      for (let i = 0; i < 10; i += 1) {
        const dot = make('span', 'rk-dot');
        const entry = history[history.length - 10 + i];
        if (!entry) dot.classList.add('is-empty');
        else dot.dataset.ok = String(entry);
        els.history.append(dot);
      }
      const landed = history.filter(Boolean).length;
      els.score.textContent = history.length ? `${landed} / ${history.length} landed` : 'no flights yet';
    }

    function showOverlay(title, detail, tone, withButton) {
      msg.textContent = title;
      sub.textContent = detail;
      overlay.dataset.tone = tone;
      again.hidden = !withButton;
      again.textContent = phase === 'ready' ? 'Start' : 'Fly again';
      overlay.classList.add('is-on');
    }

    function hideOverlay() {
      overlay.classList.remove('is-on');
    }

    function newEpisode() {
      window.clearTimeout(autoTimer);
      sim = Sim.create();
      trail = [];
      particles = [];
      accumulator = 0;
      tick = 0;
      if (mode === 'auto') {
        phase = 'flying';
        hideOverlay();
      } else {
        phase = 'ready';
        showOverlay('Ready for launch', 'Press ↑ to start, then tilt with ← →', 'neutral', true);
      }
      paintHud();
    }

    function launch() {
      if (phase === 'ready') {
        phase = 'flying';
        hideOverlay();
        wake();
      }
    }

    function finish() {
      phase = 'over';
      const ok = sim.status === 'landed';
      history.push(ok);
      paintHistory();
      if (ok) {
        burst('#67e2d1', 26, 60);
        showOverlay('Soft landing', `+100 for landing · ${Math.round(sim.fuel)}% fuel left`, 'good', mode === 'manual');
      } else {
        burst('#ff9a6b', 44, 130);
        showOverlay('Crashed', `${sim.reason} · −100`, 'bad', mode === 'manual');
      }
      if (mode === 'auto' && !reduceMotion) autoTimer = window.setTimeout(() => { newEpisode(); wake(); }, 1900);
      else if (mode === 'auto') showOverlay(ok ? 'Soft landing' : 'Crashed', ok ? 'Autopilot landed it' : sim.reason, ok ? 'good' : 'bad', true);
    }

    function setMode(next) {
      mode = next;
      modeButtons.forEach((button) => {
        const on = button.dataset.rkMode === next;
        button.classList.toggle('is-active', on);
        button.setAttribute('aria-pressed', String(on));
      });
      newEpisode();
      if (next === 'manual') screen.focus({ preventScroll: true });
      wake();
    }

    function inputNow() {
      if (mode === 'auto') return Sim.autopilot(sim);
      return { thrust: keys.thrust || touch.thrust, left: keys.left || touch.left, right: keys.right || touch.right };
    }

    function frame(now) {
      rafId = 0;
      if (!active || !inView || document.hidden) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      if (phase === 'flying') {
        accumulator += dt;
        while (accumulator >= STEP && sim.status === 'flying') {
          Sim.step(sim, inputNow(), STEP);
          tick += 1;
          if (tick % 5 === 0) {
            trail.push([sim.x, sim.y]);
            if (trail.length > 90) trail.shift();
          }
          accumulator -= STEP;
        }
        if (sim.status !== 'flying') finish();
      }
      particles = particles.filter((particle) => {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vy += 120 * dt;
        particle.life -= dt * 0.9;
        return particle.life > 0;
      });
      draw(now);
      paintHud();
      rafId = requestAnimationFrame(frame);
    }

    function wake() {
      if (rafId || !active || !inView) return;
      last = performance.now();
      rafId = requestAnimationFrame(frame);
    }

    const keyMap = { ArrowUp: 'thrust', w: 'thrust', W: 'thrust', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
    screen.addEventListener('keydown', (event) => {
      const action = keyMap[event.key];
      if (action) {
        event.preventDefault();
        if (mode === 'auto') return;
        keys[action] = true;
        if (phase === 'ready') launch();
      } else if ((event.key === 'Enter' || event.key === ' ' || event.key === 'r') && phase !== 'flying') {
        event.preventDefault();
        if (phase === 'over') newEpisode();
        else launch();
        wake();
      }
    });
    screen.addEventListener('keyup', (event) => {
      const action = keyMap[event.key];
      if (action) keys[action] = false;
    });
    screen.addEventListener('blur', () => {
      keys.thrust = keys.left = keys.right = false;
    });
    screen.addEventListener('pointerdown', () => screen.focus({ preventScroll: true }));
    again.addEventListener('click', () => {
      if (phase === 'over') newEpisode();
      launch();
      wake();
    });
    modeButtons.forEach((button) => button.addEventListener('click', () => setMode(button.dataset.rkMode)));

    $$('[data-rk-touch]', panel).forEach((button) => {
      const action = button.dataset.rkTouch;
      const down = (event) => {
        event.preventDefault();
        if (mode === 'auto') setMode('manual');
        touch[action] = true;
        button.classList.add('is-down');
        if (phase === 'over') newEpisode();
        launch();
        wake();
      };
      const up = () => {
        touch[action] = false;
        button.classList.remove('is-down');
      };
      button.addEventListener('pointerdown', down);
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => button.addEventListener(type, up));
    });

    fit();
    newEpisode();
    paintHistory();
    draw(performance.now());

    return {
      title: 'Rocket landing · reward loop',
      kicker: 'Rocket landing RL / environment',
      copy: 'Gravity, thrust, fuel, and a reward for landing softly on the pad. Fly it yourself or let a hand-written autopilot try. A learning agent trains on exactly this kind of loop.',
      facts: ['state', 'action', 'reward'],
      note: 'This is the environment, flown by you or a hand-written controller. The PPO agent trained on it is replayed in the live demo on the project page.',
      tries: [
        { label: 'Fly it yourself with ↑ ← →', run: () => { setMode('manual'); } },
        { label: 'Let the autopilot land it', run: () => { setMode('auto'); } },
        {
          label: 'Crash on purpose and read the reward',
          run: () => {
            setMode('manual');
            launch();
          },
        },
      ],
      show() {
        active = true;
        draw(performance.now());
        wake();
      },
      hide() {
        active = false;
        keys.thrust = keys.left = keys.right = false;
      },
      setInView(value) {
        inView = value;
        if (value) wake();
      },
    };
  }

  // =====================================================================================
  // Controller: tabs, brief, "try this", visibility
  // =====================================================================================
  const demos = { sonder: createSonder(), search: createSearch(), rocket: createRocket() };
  const tabs = $$('.lab-tab');
  const panels = $$('.lab-panel');
  const kicker = $('[data-lab-kicker]');
  const copy = $('[data-lab-copy]');
  const facts = $('[data-lab-facts]');
  const tryList = $('[data-lab-try]');
  const note = $('[data-lab-note]');
  const stageTitle = $('[data-lab-title]');
  let currentName = null;

  function show(name, focusTab) {
    if (!demos[name]) return;
    if (currentName && demos[currentName]) demos[currentName].hide();
    currentName = name;
    const demo = demos[name];

    tabs.forEach((tab) => {
      const on = tab.dataset.demo === name;
      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      if (on && focusTab) tab.focus();
    });
    panels.forEach((panel) => {
      const on = panel.dataset.panel === name;
      panel.hidden = !on;
      panel.classList.toggle('is-entering', on);
      if (on) window.setTimeout(() => panel.classList.remove('is-entering'), 600);
    });

    kicker.textContent = demo.kicker;
    copy.textContent = demo.copy;
    facts.replaceChildren(...demo.facts.map((fact) => make('li', '', fact)));
    note.textContent = demo.note;
    stageTitle.textContent = demo.title;
    tryList.replaceChildren(
      ...demo.tries.map((item, index) => {
        const li = make('li');
        const button = make('button');
        button.type = 'button';
        button.append(make('span', '', String(index + 1).padStart(2, '0')), document.createTextNode(item.label), make('em', '', '→'));
        button.addEventListener('click', item.run);
        li.append(button);
        return li;
      })
    );
    demo.show();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => show(tab.dataset.demo));
    tab.addEventListener('keydown', (event) => {
      const keyStep = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
      if (keyStep) {
        event.preventDefault();
        show(tabs[(index + keyStep + tabs.length) % tabs.length].dataset.demo, true);
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        show(tabs[event.key === 'Home' ? 0 : tabs.length - 1].dataset.demo, true);
      }
    });
  });

  const stage = $('.lab-stage');
  let stageVisible = false;
  if (stage && 'IntersectionObserver' in window) {
    new IntersectionObserver(
      (entries) => {
        stageVisible = entries.some((entry) => entry.isIntersecting);
        Object.values(demos).forEach((demo) => demo.setInView && demo.setInView(stageVisible));
      },
      { threshold: 0.15 }
    ).observe(stage);
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && demos.rocket.setInView) demos.rocket.setInView(stageVisible);
  });

  show('sonder');
})();
