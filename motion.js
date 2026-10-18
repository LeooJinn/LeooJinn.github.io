// Site-wide motion layer. Extends the hero's interactions to every section:
// cursor-reactive headings, scroll-scrubbed text, tilt + glare cards, magnetic buttons,
// count-up numbers, a scroll-driven marquee, parallax, and an ambient background that
// shifts with the section you are in. Vanilla JS, one shared frame loop that sleeps when idle.
(() => {
  'use strict';

  const root = document.documentElement;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  root.dataset.motion = 'on';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (from, to, t) => from + (to - from) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 4);
  const safely = (fn) => {
    try {
      fn();
    } catch (error) {
      console.warn('[motion]', error);
    }
  };

  // ------------------------------------------------------------------ shared state + loop
  const scroll = { y: window.scrollY, last: window.scrollY, velocity: 0, vh: window.innerHeight, vw: window.innerWidth };
  const pointer = { x: scroll.vw / 2, y: scroll.vh / 2, nx: 0.5, ny: 0.5, active: false };
  const frames = [];
  let rafId = 0;
  let lastTime = 0;

  function loop(now) {
    const dt = Math.min(64, now - lastTime);
    lastTime = now;
    scroll.y = window.scrollY;
    const delta = scroll.y - scroll.last;
    scroll.last = scroll.y;
    scroll.velocity = lerp(scroll.velocity, delta, 0.18);
    let busy = false;
    for (const frame of frames) if (frame(dt, now)) busy = true;
    rafId = busy ? requestAnimationFrame(loop) : 0;
  }

  function wake() {
    if (rafId) return;
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('resize', () => {
    scroll.vh = window.innerHeight;
    scroll.vw = window.innerWidth;
    onResize.forEach((fn) => fn());
    wake();
  });
  const onResize = [];

  if (fine) {
    window.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.nx = event.clientX / scroll.vw;
      pointer.ny = event.clientY / scroll.vh;
      pointer.active = true;
      wake();
    });
    document.addEventListener('pointerleave', () => {
      pointer.active = false;
      wake();
    });
  }

  // ------------------------------------------------------------------ ambient layers
  const ambient = document.createElement('div');
  ambient.className = 'ambient';
  ambient.setAttribute('aria-hidden', 'true');
  ambient.innerHTML = '<i class="amb-a"></i><i class="amb-b"></i>';
  document.body.prepend(ambient);

  const progressBar = document.createElement('div');
  progressBar.className = 'scroll-progress';
  progressBar.setAttribute('aria-hidden', 'true');
  document.body.append(progressBar);

  const glow = document.createElement('div');
  glow.className = 'page-glow';
  glow.setAttribute('aria-hidden', 'true');
  if (fine) document.body.append(glow);

  const hero = $('.hero-story');
  const smooth = { px: 0.5, py: 0.5, gx: pointer.x, gy: pointer.y, sp: -1 };

  frames.push(() => {
    const max = Math.max(1, document.documentElement.scrollHeight - scroll.vh);
    const sp = clamp(scroll.y / max, 0, 1);
    if (Math.abs(sp - smooth.sp) > 0.0005) {
      smooth.sp = sp;
      ambient.style.setProperty('--sp', sp.toFixed(4));
      progressBar.style.setProperty('--sp', sp.toFixed(4));
    }
    smooth.px = lerp(smooth.px, pointer.nx, 0.05);
    smooth.py = lerp(smooth.py, pointer.ny, 0.05);
    const moving = Math.abs(smooth.px - pointer.nx) > 0.002 || Math.abs(smooth.py - pointer.ny) > 0.002;
    if (moving) {
      ambient.style.setProperty('--px', smooth.px.toFixed(4));
      ambient.style.setProperty('--py', smooth.py.toFixed(4));
    }
    if (fine) {
      smooth.gx = lerp(smooth.gx, pointer.x, 0.12);
      smooth.gy = lerp(smooth.gy, pointer.y, 0.12);
      glow.style.transform = `translate3d(${smooth.gx.toFixed(1)}px, ${smooth.gy.toFixed(1)}px, 0)`;
      const heroInView = hero ? hero.getBoundingClientRect().bottom > scroll.vh * 0.55 : false;
      glow.classList.toggle('is-on', pointer.active && !heroInView);
      if (Math.abs(smooth.gx - pointer.x) > 0.5 || Math.abs(smooth.gy - pointer.y) > 0.5) return true;
    }
    return moving;
  });

  // The ambient colours drift as you move from section to section.
  safely(() => {
    const tints = {
      top: ['#16306e', '#ff9a3c'],
      manifesto: ['#1b2a66', '#ff9a3c'],
      work: ['#16306e', '#ffb14e'],
      lab: ['#122a5e', '#ff9a3c'],
      experience: ['#1b2a66', '#ffb14e'],
      about: ['#16306e', '#ff7a3c'],
      drive: ['#0d1430', '#ff3a48'],
      resume: ['#1b2a66', '#ffb14e'],
      contact: ['#3a2a5e', '#ff9a5c'],
    };
    const targets = $$('main > section[id], footer[id]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const tint = tints[entry.target.id];
          if (!tint) return;
          ambient.style.setProperty('--amb-a', tint[0]);
          ambient.style.setProperty('--amb-b', tint[1]);
        });
      },
      { rootMargin: '-45% 0px -45% 0px' }
    );
    targets.forEach((target) => observer.observe(target));
  });

  // ------------------------------------------------------------------ split text + letter field
  function splitLetters(node, letters) {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const fragment = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((token) => {
          if (!token) return;
          if (/^\s+$/.test(token)) {
            fragment.append(document.createTextNode(' '));
            return;
          }
          const word = document.createElement('i');
          word.className = 'sw';
          [...token].forEach((char) => {
            const letter = document.createElement('b');
            letter.className = 'sc';
            letter.textContent = char;
            letter.style.setProperty('--i', letters.length);
            word.append(letter);
            letters.push({ el: letter, tx: 0, ty: 0, s: 1, r: 0, k: 0, idle: true });
          });
          fragment.append(word);
        });
        child.replaceWith(fragment);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
        splitLetters(child, letters);
      }
    });
  }

  const fields = [];

  class LetterField {
    constructor(el) {
      this.el = el;
      this.letters = [];
      this.visible = false;
      this.ready = false;
      this.radius = parseFloat(el.dataset.radius || '1');
      if (el.dataset.hot) el.style.setProperty('--sc-hot', el.dataset.hot);

      const label = el.textContent.replace(/\s+/g, ' ').trim();
      const reader = document.createElement('span');
      reader.className = 'sr-only';
      reader.textContent = label;
      const wrap = document.createElement('b');
      wrap.className = 'split-wrap';
      wrap.setAttribute('aria-hidden', 'true');
      while (el.firstChild) wrap.append(el.firstChild);
      el.append(reader, wrap);
      splitLetters(wrap, this.letters);
      this.measure();
    }

    measure() {
      this.fontSize = parseFloat(getComputedStyle(this.el).fontSize) || 80;
    }

    update() {
      const box = this.el.getBoundingClientRect();
      const margin = this.fontSize * 1.3;
      const near =
        pointer.active &&
        pointer.x > box.left - margin &&
        pointer.x < box.right + margin &&
        pointer.y > box.top - margin &&
        pointer.y < box.bottom + margin;
      const radius = this.fontSize * 1.05 * this.radius;
      let moving = false;

      for (const item of this.letters) {
        if (!near && item.idle) continue;
        let tx = 0;
        let ty = 0;
        let ts = 1;
        let tr = 0;
        let tk = 0;
        if (near) {
          const rect = item.el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2 - item.tx;
          const cy = rect.top + rect.height / 2 - item.ty;
          const dx = cx - pointer.x;
          const dy = cy - pointer.y;
          const distance = Math.hypot(dx, dy) || 1;
          const raw = clamp(1 - distance / radius, 0, 1);
          const pull = raw * raw * (3 - 2 * raw);
          tx = (dx / distance) * this.fontSize * 0.1 * pull;
          ty = (dy / distance) * this.fontSize * 0.07 * pull - this.fontSize * 0.05 * pull;
          ts = 1 + 0.12 * pull;
          tr = (dx / radius) * -6 * pull;
          tk = pull;
        }
        item.tx = lerp(item.tx, tx, 0.16);
        item.ty = lerp(item.ty, ty, 0.16);
        item.s = lerp(item.s, ts, 0.16);
        item.r = lerp(item.r, tr, 0.16);
        item.k = lerp(item.k, tk, 0.16);
        const settled =
          Math.abs(tx - item.tx) < 0.05 &&
          Math.abs(ty - item.ty) < 0.05 &&
          Math.abs(ts - item.s) < 0.001 &&
          Math.abs(tr - item.r) < 0.02 &&
          Math.abs(tk - item.k) < 0.005;
        item.idle = !near && settled;
        if (item.idle) {
          item.tx = item.ty = item.r = item.k = 0;
          item.s = 1;
        } else {
          moving = true;
        }
        const style = item.el.style;
        style.setProperty('--tx', `${item.tx.toFixed(2)}px`);
        style.setProperty('--ty', `${item.ty.toFixed(2)}px`);
        style.setProperty('--s', item.s.toFixed(4));
        style.setProperty('--r', `${item.r.toFixed(2)}deg`);
        style.setProperty('--k', item.k.toFixed(3));
      }
      return moving || near;
    }
  }

  safely(() => {
    $$('main h2, .footer-heading h2, [data-split]').forEach((el) => {
      if (el.dataset.splitDone) return;
      el.dataset.splitDone = '1';
      el.setAttribute('data-split', '');
      fields.push(new LetterField(el));
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const field = fields.find((item) => item.el === entry.target);
          if (!field) return;
          field.visible = entry.isIntersecting;
          if (entry.isIntersecting && !field.el.classList.contains('is-in')) {
            field.el.classList.add('is-in');
            window.setTimeout(() => {
              field.ready = true;
              wake();
            }, field.letters.length * 24 + 1100);
          }
        });
        wake();
      },
      { threshold: 0.2 }
    );
    fields.forEach((field) => observer.observe(field.el));
    onResize.push(() => fields.forEach((field) => field.measure()));

    if (fine) {
      frames.push(() => {
        let busy = false;
        for (const field of fields) {
          if (!field.visible || !field.ready) continue;
          if (field.update()) busy = true;
        }
        return busy;
      });
    }
  });

  // ------------------------------------------------------------------ scroll-scrubbed text
  const scrubs = [];
  safely(() => {
    $$('[data-scrub]').forEach((el) => {
      const words = [];
      const walk = (node) => {
        [...node.childNodes].forEach((child) => {
          if (child.nodeType === Node.TEXT_NODE) {
            const fragment = document.createDocumentFragment();
            child.textContent.split(/(\s+)/).forEach((token) => {
              if (!token) return;
              if (/^\s+$/.test(token)) {
                fragment.append(document.createTextNode(' '));
                return;
              }
              const word = document.createElement('i');
              word.className = 'scrub-word';
              word.textContent = token;
              word.style.setProperty('--on', '0');
              words.push({ el: word, on: 0 });
              fragment.append(word);
            });
            child.replaceWith(fragment);
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            walk(child);
          }
        });
      };
      walk(el);
      scrubs.push({ el, words });
    });
  });

  frames.push(() => {
    for (const scrub of scrubs) {
      const rect = scrub.el.getBoundingClientRect();
      if (rect.bottom < -50 || rect.top > scroll.vh + 50) continue;
      const start = scroll.vh * 0.88;
      const end = scroll.vh * 0.4;
      const progress = clamp((start - rect.top) / (start - end + rect.height), 0, 1);
      const count = scrub.words.length;
      scrub.words.forEach((word, index) => {
        const on = clamp(progress * (count + 4) - index, 0, 1);
        if (Math.abs(on - word.on) > 0.01) {
          word.on = on;
          word.el.style.setProperty('--on', on.toFixed(2));
        }
      });
    }
    return false;
  });

  // ------------------------------------------------------------------ staggered entrances
  safely(() => {
    // project and experience cards: stagger the existing reveal
    [['.exp-cards', '.exp-card']].forEach(([parent, child]) => {
      $$(parent).forEach((group) => $$(child, group).forEach((item, index) => item.style.setProperty('--rd', `${index * 110}ms`)));
    });

    // grids of small tiles pop in as a wave
    const groups = [
      ['.exp-stats', 2],
      ['.cap-tiles', 5],
      ['.cap-filters', 6],
      ['.lab-tabs', 1],
      ['.lab-try ol', 1],
      ['.footer-nav-grid', 2],
    ];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          entry.target.classList.add('is-in');
          const count = entry.target.children.length;
          window.setTimeout(() => {
            entry.target.classList.remove('pop-group', 'is-in');
            [...entry.target.children].forEach((child) => child.classList.remove('pop-item'));
          }, count * 70 + 1500);
        });
      },
      { threshold: 0.15 }
    );
    groups.forEach(([selector, columns]) => {
      $$(selector).forEach((group) => {
        group.classList.add('pop-group');
        [...group.children].forEach((child, index) => {
          child.classList.add('pop-item');
          const wave = Math.floor(index / columns) + (index % columns);
          child.style.setProperty('--pd', `${wave * 75}ms`);
        });
        observer.observe(group);
      });
    });
  });

  // ------------------------------------------------------------------ count-up numbers
  safely(() => {
    const numbers = $$('.exp-stats strong:not(.exp-text-stat), [data-count]').filter((el) =>
      /^[^0-9]*[0-9][0-9,]*\.?[0-9]*/.test(el.textContent.trim()) && !/^[A-Za-z]+ \d{4}$/.test(el.textContent.trim())
    );
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          const el = entry.target;
          const original = el.textContent.trim();
          const match = original.match(/^([^0-9]*)([0-9][0-9,]*\.?[0-9]*)(.*)$/);
          if (!match) return;
          const [, prefix, digits, suffix] = match;
          const decimals = digits.includes('.') ? digits.split('.')[1].length : 0;
          const useCommas = digits.includes(',');
          const target = parseFloat(digits.replace(/,/g, ''));
          const started = performance.now();
          const duration = 1500;
          const tick = (now) => {
            const t = clamp((now - started) / duration, 0, 1);
            const value = target * easeOut(t);
            let text = value.toFixed(decimals);
            if (useCommas) text = Number(text).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
            el.textContent = t < 1 ? `${prefix}${text}${suffix}` : original;
            if (t < 1) requestAnimationFrame(tick);
          };
          el.setAttribute('aria-label', original);
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.6 }
    );
    numbers.forEach((el) => {
      el.setAttribute('data-count', '');
      observer.observe(el);
    });
  });

  // ------------------------------------------------------------------ tilt + glare
  const tilts = [];
  if (fine) {
    safely(() => {
      const defs = [
        ['.cap-tile', 6],
        ['.exp-card', 2.2],
      ];
      defs.forEach(([selector, max]) => {
        $$(selector).forEach((el) => {
          el.setAttribute('data-tilt', '');
          const glare = document.createElement('span');
          glare.className = 'tilt-glare';
          glare.setAttribute('aria-hidden', 'true');
          el.append(glare);
          const state = { el, glare, max, rx: 0, ry: 0, rxT: 0, ryT: 0, ga: 0, tga: 0, hover: false, active: false };
          el.addEventListener('pointerenter', (event) => {
            if (event.pointerType === 'touch') return;
            state.hover = true;
          });
          el.addEventListener('pointermove', (event) => {
            if (event.pointerType === 'touch') return;
            const box = el.getBoundingClientRect();
            const px = clamp((event.clientX - box.left) / box.width, 0, 1);
            const py = clamp((event.clientY - box.top) / box.height, 0, 1);
            state.ryT = (px - 0.5) * 2 * max;
            state.rxT = -(py - 0.5) * 2 * max;
            state.tga = 1;
            el.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
            el.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
            state.active = true;
            wake();
          });
          el.addEventListener('pointerleave', () => {
            state.hover = false;
            state.rxT = 0;
            state.ryT = 0;
            state.tga = 0;
            wake();
          });
          tilts.push(state);
        });
      });

      frames.push(() => {
        let busy = false;
        for (const state of tilts) {
          if (!state.active) continue;
          state.rx = lerp(state.rx, state.rxT, 0.14);
          state.ry = lerp(state.ry, state.ryT, 0.14);
          state.ga = lerp(state.ga, state.tga, 0.14);
          const settled = Math.abs(state.rx - state.rxT) < 0.01 && Math.abs(state.ry - state.ryT) < 0.01 && Math.abs(state.ga - state.tga) < 0.01;
          if (settled && !state.hover) {
            state.el.style.transform = '';
            state.el.style.setProperty('--ga', '0');
            state.active = false;
            continue;
          }
          state.el.style.transform = `perspective(1000px) rotateX(${state.rx.toFixed(2)}deg) rotateY(${state.ry.toFixed(2)}deg)`;
          state.el.style.setProperty('--ga', state.ga.toFixed(3));
          busy = true;
        }
        return busy;
      });
    });
  }

  // ------------------------------------------------------------------ magnetic buttons
  const magnets = [];
  if (fine) {
    safely(() => {
      $$('.button, .footer-email, .lab-tab, .pj-lab').forEach((el) => {
        magnets.push({ el, x: 0, y: 0, active: false });
      });
      frames.push(() => {
        let busy = false;
        for (const magnet of magnets) {
          const rect = magnet.el.getBoundingClientRect();
          if (rect.bottom < 0 || rect.top > scroll.vh) continue;
          const cx = rect.left + rect.width / 2 - magnet.x;
          const cy = rect.top + rect.height / 2 - magnet.y;
          const dx = pointer.x - cx;
          const dy = pointer.y - cy;
          // distance from the element's edge, so wide links don't react from across the page
          const edgeX = Math.max(rect.left - pointer.x, 0, pointer.x - rect.right);
          const edgeY = Math.max(rect.top - pointer.y, 0, pointer.y - rect.bottom);
          const inside = pointer.active && Math.hypot(edgeX, edgeY) < 56;
          const limit = Math.min(16, Math.min(rect.width, rect.height) * 0.4);
          const tx = inside ? clamp(dx * 0.28, -limit, limit) : 0;
          const ty = inside ? clamp(dy * 0.28, -limit, limit) : 0;
          if (!inside && !magnet.active) continue;
          magnet.x = lerp(magnet.x, tx, 0.18);
          magnet.y = lerp(magnet.y, ty, 0.18);
          const settled = !inside && Math.abs(magnet.x) < 0.05 && Math.abs(magnet.y) < 0.05;
          if (settled) {
            magnet.el.style.translate = '';
            magnet.x = magnet.y = 0;
            magnet.active = false;
          } else {
            magnet.el.style.translate = `${magnet.x.toFixed(2)}px ${magnet.y.toFixed(2)}px`;
            magnet.active = true;
            busy = true;
          }
        }
        return busy;
      });
    });
  }

  // ------------------------------------------------------------------ marquee
  const marquees = [];
  safely(() => {
    $$('.marquee').forEach((el) => {
      const track = $('.marquee-track', el);
      const set = $('.marquee-set', el);
      if (!track || !set) return;
      const state = { el, track, set, offset: 0, width: 0, dir: el.dataset.dir === 'right' ? 1 : -1, speed: parseFloat(el.dataset.speed || '38'), visible: false };
      const build = () => {
        [...track.children].slice(1).forEach((node) => node.remove());
        state.width = set.getBoundingClientRect().width || 1;
        const copies = Math.ceil((scroll.vw * 2) / state.width) + 1;
        for (let i = 0; i < copies; i += 1) {
          const clone = set.cloneNode(true);
          clone.setAttribute('aria-hidden', 'true');
          track.append(clone);
        }
      };
      build();
      onResize.push(build);
      new IntersectionObserver((entries) => {
        state.visible = entries.some((entry) => entry.isIntersecting);
        wake();
      }).observe(el);
      marquees.push(state);
    });
  });

  frames.push((dt) => {
    let busy = false;
    for (const m of marquees) {
      if (!m.visible) continue;
      // scrolling pushes the band along with the page; the two rows run in opposite directions
      const sign = m.dir === -1 ? 1 : -1;
      m.offset += sign * ((m.speed * dt) / 1000 + scroll.velocity * 0.6);
      const wrapped = ((m.offset % m.width) + m.width) % m.width;
      const skew = clamp(scroll.velocity * -0.18, -9, 9);
      m.track.style.transform = `translate3d(${(-wrapped).toFixed(2)}px, 0, 0) skewX(${skew.toFixed(2)}deg)`;
      busy = true;
    }
    return busy;
  });

  // ------------------------------------------------------------------ parallax + image zoom + ring spin
  const parallax = [];
  safely(() => {
    [
      ['.manifesto-constellation', 'y', 0.12],
      ['.work-atmosphere', 'y', -0.08],
      ['.about-signal', 'y', 0.14],
      ['.resume-ring', 'rotate', 0.22],
    ].forEach(([selector, mode, factor]) => $$(selector).forEach((el) => parallax.push({ el, mode, factor })));
  });

  frames.push(() => {
    for (const item of parallax) {
      const rect = (item.mode === 'zoom' ? item.el.parentElement : item.el).getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > scroll.vh + 200) continue;
      const center = rect.top + rect.height / 2 - scroll.vh / 2;
      if (item.mode === 'y') item.el.style.translate = `0 ${(center * -item.factor).toFixed(1)}px`;
      else if (item.mode === 'rotate') item.el.style.rotate = `${(center * item.factor).toFixed(1)}deg`;
      else {
        const p = clamp((rect.top + rect.height / 2 - scroll.vh * 0.45) / (scroll.vh * 0.55), 0, 1);
        item.el.style.scale = (1 + item.factor * p).toFixed(3);
      }
    }
    return false;
  });

  wake();
})();
