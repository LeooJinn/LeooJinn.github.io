// Hero name interactions: letters react to the cursor, spread as you scroll,
// and ripple when you click or tap the name. Vanilla JS, no dependencies.
(() => {
  const title = document.querySelector('[data-hero-name]');
  const hero = document.querySelector('.hero-story');
  if (!title || !hero) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  // Split each line into words and letters. The readable name stays in .sr-only.
  const letters = [];
  title.querySelectorAll('[data-name-line]').forEach((line) => {
    const words = line.textContent.trim().split(/\s+/);
    line.textContent = '';
    words.forEach((word, wordIndex) => {
      if (wordIndex > 0) {
        const gap = document.createElement('i');
        gap.className = 'name-gap';
        line.append(gap);
      }
      const wordEl = document.createElement('i');
      wordEl.className = 'nw';
      [...word].forEach((char) => {
        const letter = document.createElement('b');
        letter.className = 'nc';
        letter.textContent = char;
        letter.style.setProperty('--i', letters.length);
        wordEl.append(letter);
        letters.push({ el: letter, tx: 0, ty: 0, s: 1, r: 0, k: 0 });
      });
      line.append(wordEl);
    });
  });

  // Intro plays via CSS; hand control to JS once the last letter has landed.
  const introMs = letters.length * 52 + 180 + 1000;
  window.setTimeout(() => {
    title.classList.add('is-ready');
    wave();
  }, introMs);

  function wave() {
    title.classList.remove('is-wave');
    // restart the animation
    void title.offsetWidth;
    title.classList.add('is-wave');
    window.setTimeout(() => title.classList.remove('is-wave'), letters.length * 38 + 900);
  }

  title.addEventListener('click', () => {
    if (title.classList.contains('is-ready')) wave();
  });

  const pointer = { x: 0, y: 0, active: false };
  let running = false;

  function scrollProgress() {
    const value = parseFloat(hero.style.getPropertyValue('--hero-progress'));
    return Number.isFinite(value) ? value : 0;
  }

  function frame() {
    const progress = scrollProgress();
    const fontSize = parseFloat(getComputedStyle(title).fontSize) || 120;
    const radius = fontSize * 1.05;
    let moving = false;

    letters.forEach((item, index) => {
      const rect = item.el.getBoundingClientRect();
      // Un-apply our own displacement so the measured centre doesn't feed back.
      const cx = rect.left + rect.width / 2 - item.tx;
      const cy = rect.top + rect.height / 2 - item.ty;

      let targetX = 0;
      let targetY = 0;
      let targetS = 1;
      let targetR = 0;
      let targetK = 0;

      if (pointer.active) {
        const dx = cx - pointer.x;
        const dy = cy - pointer.y;
        const distance = Math.hypot(dx, dy) || 1;
        const raw = clamp(1 - distance / radius, 0, 1);
        const pull = raw * raw * (3 - 2 * raw);
        // Push letters away from the cursor, lift them, and tint them.
        targetX = (dx / distance) * fontSize * 0.1 * pull;
        targetY = (dy / distance) * fontSize * 0.07 * pull - fontSize * 0.05 * pull;
        targetS = 1 + 0.12 * pull;
        targetR = (dx / radius) * -6 * pull;
        targetK = pull;
      }

      // As the hero scrolls, the name loosens and each letter drifts on its own line.
      const spread = (index - (letters.length - 1) / 2) * 0.012 * fontSize * progress;
      const drift = (index % 2 === 0 ? -1 : 1) * 0.06 * fontSize * progress;
      targetX += spread;
      targetY += drift;

      const ease = 0.16;
      item.tx += (targetX - item.tx) * ease;
      item.ty += (targetY - item.ty) * ease;
      item.s += (targetS - item.s) * ease;
      item.r += (targetR - item.r) * ease;
      item.k += (targetK - item.k) * ease;

      if (
        Math.abs(targetX - item.tx) > 0.05 ||
        Math.abs(targetY - item.ty) > 0.05 ||
        Math.abs(targetS - item.s) > 0.001 ||
        Math.abs(targetR - item.r) > 0.02 ||
        Math.abs(targetK - item.k) > 0.005
      ) {
        moving = true;
      }

      item.el.style.setProperty('--tx', `${item.tx.toFixed(2)}px`);
      item.el.style.setProperty('--ty', `${item.ty.toFixed(2)}px`);
      item.el.style.setProperty('--s', item.s.toFixed(4));
      item.el.style.setProperty('--r', `${item.r.toFixed(2)}deg`);
      item.el.style.setProperty('--k', item.k.toFixed(3));
    });

    if (moving || pointer.active) {
      requestAnimationFrame(frame);
    } else {
      running = false;
    }
  }

  function start() {
    if (running) return;
    running = true;
    requestAnimationFrame(frame);
  }

  hero.addEventListener('pointermove', (event) => {
    const box = hero.getBoundingClientRect();
    hero.style.setProperty('--mx', `${event.clientX - box.left}px`);
    hero.style.setProperty('--my', `${event.clientY - box.top}px`);
    if (event.pointerType === 'touch') return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
    hero.classList.add('is-pointer-in');
    start();
  });

  hero.addEventListener('pointerleave', () => {
    pointer.active = false;
    hero.classList.remove('is-pointer-in');
    start();
  });

  // Scrolling changes the spread, so keep the loop alive while the hero is on screen.
  let heroVisible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      heroVisible = entries.some((entry) => entry.isIntersecting);
    }).observe(hero);
  }
  window.addEventListener(
    'scroll',
    () => {
      if (heroVisible) start();
    },
    { passive: true }
  );
})();
