const cursorSystem = document.querySelector('.cursor-system');
const pointerFine = window.matchMedia('(pointer: fine)').matches;
const motionOkay = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (cursorSystem && pointerFine && motionOkay) {
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
    if (target.matches('.pj-stage')) return 'inspect';
    if (target.matches('.lab-stage')) return 'explore';
    if (target.matches('.lab-tab, .pj-tab, .cap-chip')) return 'change';
    if (target.matches('.footer-email, [href^="mailto:"]')) return 'contact';
    if (target.matches('.button, [href$=".pdf"]')) return 'open';
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

  const orb = cursorSystem.querySelector('.cursor-orb');
  const trailing = [...cursorSystem.querySelectorAll('.cursor-glow, .cursor-ring, .cursor-cross, .cursor-label')];
  const targetSelector = 'a, button, .pj-stage, .lab-stage, .resume-scene';
  let lastTime = 0;
  let lastEvent = null;
  let pendingTarget = false;

  // One writer, once per frame. The orb sits exactly on the pointer; the rest trail it.
  // Position goes through the individual `translate` property so CSS transitions on
  // `transform` / `scale` never restart while the cursor moves.
  const tick = (now) => {
    const dt = Math.min(now - (lastTime || now), 64);
    lastTime = now;
    const ease = 1 - Math.pow(0.78, dt / 16.67);
    x += (nextX - x) * ease;
    y += (nextY - y) * ease;
    orb.style.translate = `${nextX}px ${nextY}px`;
    const pos = `${x}px ${y}px`;
    for (const el of trailing) el.style.translate = pos;

    if (pendingTarget && lastEvent) {
      pendingTarget = false;
      const target = lastEvent.target.closest?.(targetSelector) || null;
      if (target !== activeTarget) activateTarget(target, lastEvent);
      else if (target) setTargetSpot(target, lastEvent);
    }

    const moving = Math.abs(nextX - x) + Math.abs(nextY - y) > 0.3;
    frame = moving || pendingTarget ? requestAnimationFrame(tick) : 0;
    if (!frame) lastTime = 0;
  };

  document.addEventListener('pointermove', (event) => {
    if (!body.classList.contains('cursor-active')) {
      x = nextX = event.clientX;
      y = nextY = event.clientY;
      body.classList.add('cursor-active');
    }
    nextX = event.clientX;
    nextY = event.clientY;
    lastEvent = event;
    pendingTarget = true;
    if (!frame) frame = requestAnimationFrame(tick);
  }, { passive: true });

  document.addEventListener('pointerover', (event) => {
    const target = event.target.closest?.('a, button, .pj-stage, .lab-stage, .resume-scene');
    if (target) activateTarget(target, event);
  });

  document.addEventListener('pointerout', (event) => {
    const target = event.target.closest?.('a, button, .pj-stage, .lab-stage, .resume-scene');
    if (!target || target.contains(event.relatedTarget)) return;
    target.classList.remove('cursor-target');
    if (activeTarget === target) activateTarget(null, event);
  });

  document.addEventListener('pointerdown', () => body.classList.add('cursor-press'));
  document.addEventListener('pointerup', () => body.classList.remove('cursor-press'));
  document.addEventListener('pointerleave', () => body.classList.remove('cursor-active'));
}
