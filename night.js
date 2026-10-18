// Night drive behaviour: the trip meter in the top bar, the "Off the clock" chapter
// (log entries, odometer, passing streetlights) and the car club crowd.
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const TRIP_MILES = 450;
  const MPH = 70;

  const tripMiles = document.querySelector('[data-trip-miles]');
  const tripClock = document.querySelector('[data-trip-clock]');
  const drive = document.querySelector('[data-drive]');
  const driveSticky = drive?.querySelector('.drive-sticky');
  const logItems = drive ? [...drive.querySelectorAll('.drive-log li')] : [];
  const reels = drive ? [...drive.querySelectorAll('.odo-reel')] : [];

  const pad = (value) => String(value).padStart(3, '0');

  // Section rail as a route: a car marker moves continuously between the exits.
  const railList = document.querySelector('.section-rail ol');
  const railItems = railList ? [...railList.children] : [];
  const railTargets = railItems.map((li) => document.getElementById(li.querySelector('a')?.dataset.sectionLink));
  const trip = document.querySelector('.trip');
  const tripRoute = document.querySelector('.trip-route b');
  if (railList) {
    const car = document.createElement('span');
    car.className = 'rail-car';
    car.setAttribute('aria-hidden', 'true');
    railList.append(car);
  }

  function updateRoute() {
    if (!railList || railTargets.some((target) => !target)) return;
    const probe = window.scrollY + window.innerHeight * 0.4;
    const tops = railTargets.map((target) => target.getBoundingClientRect().top + window.scrollY);
    let index = 0;
    while (index < tops.length - 1 && probe >= tops[index + 1]) index += 1;
    const next = tops[index + 1];
    const fraction = next === undefined ? 0 : clamp((probe - tops[index]) / (next - tops[index]), 0, 1);
    const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    const route = atEnd ? 1 : (index + fraction) / (tops.length - 1);
    railList.style.setProperty('--route', route.toFixed(4));
    railItems.forEach((li, i) => li.classList.toggle('is-passed', i <= index || atEnd));
  }

  // Streetlight sweep: one pass across the screen for every ~1.1 screens scrolled.
  const sweep = document.createElement('div');
  sweep.className = 'sweep';
  sweep.setAttribute('aria-hidden', 'true');
  document.body.append(sweep);

  // Out-of-focus city lights behind the manifesto, as if seen through the windshield.
  const bokeh = document.querySelector('[data-bokeh]');
  if (bokeh) {
    const colors = ['255, 177, 78', '255, 177, 78', '255, 214, 160', '255, 58, 72', '150, 180, 255', '236, 242, 255'];
    let seed = 5;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 26; i += 1) {
      const light = document.createElement('span');
      const size = 30 + rand() ** 2 * 170;
      light.style.cssText = [
        `width:${size}px`,
        `height:${size}px`,
        `left:${(rand() * 100).toFixed(1)}%`,
        `top:${(rand() * 100).toFixed(1)}%`,
        `--c:rgba(${colors[Math.floor(rand() * colors.length)]}, 0.55)`,
        `--o:${(0.15 + rand() * 0.35).toFixed(2)}`,
        `--b:${(1 + rand() * 4).toFixed(1)}px`,
        `--drift:${Math.round(40 + size * 0.8)}`,
      ].join(';');
      bokeh.append(light);
    }
  }

  // 2:00 AM plus the time it takes to cover the miles at a steady 70 mph.
  function clockAt(miles) {
    const minutes = 120 + (miles / MPH) * 60;
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    return `${h}:${String(m).padStart(2, '0')} AM`;
  }

  function setOdometer(miles) {
    const digits = pad(miles).split('');
    reels.forEach((reel, index) => reel.style.setProperty('--d', digits[index]));
  }

  function driveProgress() {
    if (!drive) return 0;
    const box = drive.getBoundingClientRect();
    const travel = Math.max(1, drive.offsetHeight - window.innerHeight);
    return clamp(-box.top / travel, 0, 1);
  }

  let ticking = false;
  function update() {
    ticking = false;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const pageMiles = Math.round(clamp(window.scrollY / max, 0, 1) * TRIP_MILES);
    if (tripMiles) tripMiles.textContent = pad(pageMiles);
    if (tripClock) tripClock.textContent = clockAt(pageMiles);
    const arrived = pageMiles >= TRIP_MILES;
    trip?.classList.toggle('is-arrived', arrived);
    if (tripRoute) tripRoute.textContent = arrived ? 'ARRIVED' : 'SD → BAY';
    updateRoute();
    if (!reduceMotion) sweep.style.setProperty('--sweep', ((window.scrollY / (window.innerHeight * 1.1)) % 1).toFixed(4));

    if (!drive) return;
    // The chapter is pinned on wide screens; on narrow ones it scrolls normally and shows everything.
    const pinned = getComputedStyle(driveSticky).position === 'sticky';
    const progress = pinned ? driveProgress() : 1;
    logItems.forEach((item) => item.classList.toggle('is-lit', progress >= Number(item.dataset.at || 0)));
    setOdometer(Math.round(clamp(progress / 0.86, 0, 1) * TRIP_MILES));
    // A streetlight passes overhead every eighth of the chapter.
    const lamp = (progress * 8) % 1;
    driveSticky.style.setProperty('--lamp-x', `${(120 - lamp * 140).toFixed(1)}%`);
  }

  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  update();

  // ---- car club: one dot per member, filled in when the section comes into view
  const crowd = document.querySelector('[data-crowd]');
  const crowdLabel = document.querySelector('[data-crowd-label]');
  const count = document.querySelector('[data-club-count]');
  if (!crowd) return;

  const TOTAL = 1000;
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < TOTAL; i += 1) {
    const dot = document.createElement('i');
    dot.style.setProperty('--glow', (0.35 + ((i * 7919) % 101) / 160).toFixed(2));
    fragment.append(dot);
  }
  crowd.append(fragment);
  const dots = [...crowd.children];

  // Fill order spreads out from a few "meets" instead of left to right.
  const columns = () => getComputedStyle(crowd).gridTemplateColumns.split(' ').length || 40;
  function fillOrder() {
    const cols = columns();
    const rows = Math.ceil(TOTAL / cols);
    const seeds = [[0.2, 0.3], [0.7, 0.6], [0.45, 0.85], [0.85, 0.15]];
    return dots
      .map((dot, i) => {
        const x = (i % cols) / cols;
        const y = Math.floor(i / cols) / rows;
        const d = Math.min(...seeds.map(([sx, sy]) => Math.hypot(x - sx, (y - sy) * 0.8)));
        return [d + ((i * 7919) % 97) / 900, dot];
      })
      .sort((a, b) => a[0] - b[0])
      .map(([, dot]) => dot);
  }

  function showAll() {
    dots.forEach((dot) => dot.classList.add('on'));
    if (crowdLabel) crowdLabel.textContent = '1,000+';
    if (count) count.textContent = '1,000';
  }

  if (reduceMotion || !('IntersectionObserver' in window)) {
    showAll();
    return;
  }

  if (count) count.textContent = '0';
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      const order = fillOrder();
      const duration = 2200;
      const start = performance.now();
      let lit = 0;
      const step = (now) => {
        const t = clamp((now - start) / duration, 0, 1);
        const eased = 1 - (1 - t) ** 3;
        const target = Math.round(eased * TOTAL);
        for (; lit < target; lit += 1) order[lit].classList.add('on');
        const shown = target.toLocaleString('en-US');
        if (count) count.textContent = shown;
        if (crowdLabel) crowdLabel.textContent = t < 1 ? shown : '1,000+';
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    { threshold: 0.25 },
  );
  observer.observe(crowd.closest('.club') || crowd);
})();
