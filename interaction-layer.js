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

    const target = event.target.closest?.('a, button, .pj-stage, .lab-stage, .resume-scene');
    activateTarget(target, event);
  });

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
