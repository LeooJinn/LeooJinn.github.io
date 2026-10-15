// Projects showcase: select a project to open its details and swap the preview stage.
// It advances on its own until you touch it, tilts with the cursor, counts its numbers up,
// and the Rocket preview is a live autopilot landing drawn by the same code as the lab.
(() => {
  'use strict';

  const root = document.querySelector('[data-pj]');
  if (!root) return;

  const items = [...root.querySelectorAll('.pj-item')];
  const tabs = items.map((item) => item.querySelector('.pj-tab'));
  const views = [...root.querySelectorAll('.pj-view')];
  const stage = root.querySelector('[data-pj-stage]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const INTERVAL = 8000;
  root.style.setProperty('--pj-interval', `${INTERVAL}ms`);

  let index = 0;
  let stopped = reduceMotion; // autoplay never starts with reduced motion, and stops for good after any touch
  let hovering = false;
  let visible = false;

  // ------------------------------------------------------------------ numbers
  function countUp(item) {
    if (reduceMotion) return;
    item.querySelectorAll('[data-pj-count]').forEach((el) => {
      const target = parseFloat(el.dataset.value);
      const decimals = Number(el.dataset.decimals || 0);
      const commas = el.dataset.commas === '1';
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const finalText = el.dataset.final || el.textContent;
      el.dataset.final = finalText;
      const started = performance.now();
      const tick = (now) => {
        const t = clamp((now - started) / 1200, 0, 1);
        const eased = 1 - Math.pow(1 - t, 4);
        let text = (target * eased).toFixed(decimals);
        if (commas) text = Number(text).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
        el.textContent = t < 1 ? `${prefix}${text}${suffix}` : finalText;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  // ------------------------------------------------------------------ live rocket preview
  const rocket = (() => {
    const canvas = root.querySelector('[data-pj-rocket]');
    const Sim = window.RocketSim;
    if (!canvas || !Sim) return { setActive() {} };
    const ctx = canvas.getContext('2d');
    let sim = Sim.create();
    let trail = [];
    let particles = [];
    let active = false;
    let rafId = 0;
    let last = 0;
    let acc = 0;
    let tick = 0;
    let resetAt = 0;
    let scale = 1;
    let offsetY = 0;

    function fit() {
      const box = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(box.width * ratio));
      canvas.height = Math.max(1, Math.round(box.height * ratio));
      // cover the frame, keeping the ground in view
      scale = Math.max(canvas.width / Sim.W, canvas.height / Sim.H);
      offsetY = canvas.height - Sim.H * scale;
    }
    new ResizeObserver(() => {
      fit();
      paint(performance.now());
    }).observe(canvas);

    function paint(now) {
      if (!canvas.width) return;
      ctx.setTransform(scale, 0, 0, scale, 0, offsetY);
      Sim.render(ctx, sim, { now, trail, particles });
    }

    function frame(now) {
      rafId = 0;
      if (!active || !visible || document.hidden) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      if (sim.status === 'flying') {
        acc += dt;
        while (acc >= 1 / 120 && sim.status === 'flying') {
          Sim.step(sim, Sim.autopilot(sim), 1 / 120);
          tick += 1;
          if (tick % 5 === 0) {
            trail.push([sim.x, sim.y]);
            if (trail.length > 90) trail.shift();
          }
          acc -= 1 / 120;
        }
        if (sim.status !== 'flying') {
          resetAt = now + 1700;
          for (let i = 0; i < 24; i += 1) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (0.4 + Math.random()) * 60;
            particles.push({ x: sim.x, y: sim.y + 14, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 24, r: 1.4 + Math.random() * 2.4, life: 1, color: '#67e2d1' });
          }
        }
      } else if (now > resetAt) {
        sim = Sim.create();
        trail = [];
        particles = [];
        acc = 0;
        tick = 0;
      }
      particles = particles.filter((particle) => {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vy += 120 * dt;
        particle.life -= dt * 0.9;
        return particle.life > 0;
      });
      paint(now);
      rafId = requestAnimationFrame(frame);
    }

    function wake() {
      if (rafId || !active || !visible) return;
      last = performance.now();
      rafId = requestAnimationFrame(frame);
    }

    fit();
    paint(performance.now());
    return {
      setActive(value) {
        active = value;
        if (value) wake();
      },
      wake,
    };
  })();

  // ------------------------------------------------------------------ selection + autoplay
  function restartProgress() {
    root.classList.remove('is-auto');
    if (stopped) return;
    void root.offsetWidth; // restart the CSS animation
    root.classList.add('is-auto');
  }

  function select(next, byUser = false) {
    if (byUser) {
      stopped = true;
      root.classList.remove('is-auto');
    }
    index = (next + items.length) % items.length;
    items.forEach((item, i) => {
      const on = i === index;
      item.classList.toggle('is-active', on);
      tabs[i].setAttribute('aria-selected', String(on));
      tabs[i].tabIndex = on ? 0 : -1;
    });
    views.forEach((view, i) => view.classList.toggle('is-active', i === index));
    const color = getComputedStyle(items[index]).getPropertyValue('--pc').trim();
    if (color) stage.style.setProperty('--pj-c', color);
    countUp(items[index]);
    rocket.setActive(items[index].dataset.project === 'rocket');
    restartProgress();
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i, true));
    tab.addEventListener('keydown', (event) => {
      const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
      if (step) {
        event.preventDefault();
        select(i + step, true);
        tabs[index].focus();
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        select(event.key === 'Home' ? 0 : items.length - 1, true);
        tabs[index].focus();
      }
    });
  });

  // advance when the active row's progress bar completes
  root.addEventListener('animationend', (event) => {
    if (event.animationName === 'pj-progress' && !stopped) select(index + 1);
  });

  const syncPause = () => root.classList.toggle('is-paused', hovering || !visible);
  root.addEventListener('pointerenter', () => {
    hovering = true;
    syncPause();
  });
  root.addEventListener('pointerleave', () => {
    hovering = false;
    syncPause();
  });
  root.addEventListener('focusin', () => {
    hovering = true;
    syncPause();
  });
  root.addEventListener('focusout', () => {
    hovering = false;
    syncPause();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        syncPause();
        if (visible) rocket.wake && rocket.wake();
      },
      { threshold: 0.25 }
    ).observe(root);
  } else {
    visible = true;
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && rocket.wake) rocket.wake();
  });

  // ------------------------------------------------------------------ stage tilt
  if (fine && !reduceMotion) {
    const state = { rx: 0, ry: 0, tx: 0, ty: 0, mx: 0, my: 0, tmx: 0, tmy: 0 };
    let rafId = 0;
    const apply = () => {
      rafId = 0;
      state.rx += (state.tx - state.rx) * 0.1;
      state.ry += (state.ty - state.ry) * 0.1;
      state.mx += (state.tmx - state.mx) * 0.1;
      state.my += (state.tmy - state.my) * 0.1;
      stage.style.setProperty('--rx', `${state.rx.toFixed(2)}deg`);
      stage.style.setProperty('--ry', `${state.ry.toFixed(2)}deg`);
      stage.style.setProperty('--mx', state.mx.toFixed(3));
      stage.style.setProperty('--my', state.my.toFixed(3));
      const settled = Math.abs(state.rx - state.tx) < 0.02 && Math.abs(state.ry - state.ty) < 0.02 && Math.abs(state.mx - state.tmx) < 0.002;
      if (!settled) rafId = requestAnimationFrame(apply);
    };
    const wakeTilt = () => {
      if (!rafId) rafId = requestAnimationFrame(apply);
    };
    stage.addEventListener('pointermove', (event) => {
      const box = stage.getBoundingClientRect();
      const nx = clamp((event.clientX - box.left) / box.width - 0.5, -0.5, 0.5);
      const ny = clamp((event.clientY - box.top) / box.height - 0.5, -0.5, 0.5);
      state.ty = nx * 9;
      state.tx = -ny * 7;
      state.tmx = nx * 2;
      state.tmy = ny * 2;
      wakeTilt();
    });
    stage.addEventListener('pointerleave', () => {
      state.tx = state.ty = state.tmx = state.tmy = 0;
      wakeTilt();
    });
  }

  // ------------------------------------------------------------------ links into the lab
  root.querySelectorAll('[data-pj-lab]').forEach((button) => {
    button.addEventListener('click', () => {
      const lab = document.getElementById('lab');
      const tab = document.getElementById(`lab-tab-${button.dataset.pjLab}`);
      if (tab) tab.click();
      if (lab) lab.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
  });

  select(0);
})();
