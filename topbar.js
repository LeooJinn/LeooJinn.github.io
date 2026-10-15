// Floating top bar behaviour: the dock magnifies the icon nearest your cursor, a glowing pill
// slides to the section you are in, and the glass firms up once you scroll.
(() => {
  'use strict';

  const bar = document.querySelector('.topbar');
  const dock = document.querySelector('.dock');
  if (!bar || !dock) return;

  const items = [...dock.querySelectorAll('.dock-item')];
  const pill = dock.querySelector('.dock-pill');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const phone = () => window.matchMedia('(max-width: 760px)').matches;

  // ---- firm up the glass after the first scroll
  const onScroll = () => bar.classList.toggle('is-scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---- active section + sliding pill
  const byId = new Map(items.filter((item) => item.dataset.nav).map((item) => [item.dataset.nav, item]));
  const sections = [...byId.keys()].map((id) => document.getElementById(id)).filter(Boolean);
  let active = null;

  function placePill(item) {
    if (!item) {
      pill.classList.remove('is-on');
      return;
    }
    const base = parseFloat(getComputedStyle(pill).left) || 0;
    pill.style.setProperty('--px', `${item.offsetLeft - base}px`);
    pill.classList.add('is-on');
  }

  function setActive(id) {
    if (id === active) return;
    active = id;
    items.forEach((item) => {
      const on = item.dataset.nav === id;
      item.classList.toggle('is-active', on);
      if (on) item.setAttribute('aria-current', 'location');
      else item.removeAttribute('aria-current');
    });
    placePill(byId.get(id));
  }

  if ('IntersectionObserver' in window && sections.length) {
    const inView = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) inView.add(entry.target.id);
          else inView.delete(entry.target.id);
        });
        const current = sections.filter((section) => inView.has(section.id)).pop();
        setActive(current ? current.id : null);
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    sections.forEach((section) => observer.observe(section));
  }
  window.addEventListener('resize', () => placePill(byId.get(active)));

  // ---- dock magnification (mouse only, not on the phone dock)
  if (!fine || reduceMotion) return;

  const state = items.map((item) => ({ item, s: 1, ty: 0 }));
  const pointer = { x: 0, y: 0, near: false };
  let rafId = 0;

  function frame() {
    rafId = 0;
    let busy = false;
    state.forEach((entry) => {
      let targetScale = 1;
      let targetLift = 0;
      if (pointer.near && !phone()) {
        const rect = entry.item.getBoundingClientRect();
        // scaling is about the centre, so the item's centre does not move as it grows
        const distance = pointer.x - (rect.left + rect.width / 2);
        targetScale = 1 + 0.46 * Math.exp(-(distance * distance) / (2 * 46 * 46));
        targetLift = (targetScale - 1) * 9;
      }
      entry.s += (targetScale - entry.s) * 0.22;
      entry.ty += (targetLift - entry.ty) * 0.22;
      if (Math.abs(targetScale - entry.s) > 0.002 || Math.abs(targetLift - entry.ty) > 0.02) busy = true;
      entry.item.style.setProperty('--s', entry.s.toFixed(3));
      entry.item.style.setProperty('--ty', `${entry.ty.toFixed(2)}px`);
    });
    if (busy || pointer.near) rafId = requestAnimationFrame(frame);
  }

  const wake = () => {
    if (!rafId) rafId = requestAnimationFrame(frame);
  };

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    const box = dock.getBoundingClientRect();
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    const near = event.clientX > box.left - 30 && event.clientX < box.right + 30 && event.clientY > box.top - 36 && event.clientY < box.bottom + 36;
    if (near !== pointer.near || near) {
      pointer.near = near;
      wake();
    }
  });
  document.addEventListener('pointerleave', () => {
    pointer.near = false;
    wake();
  });
})();
