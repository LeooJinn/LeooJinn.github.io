const year = document.querySelector('#year');
if (year) {
  year.textContent = String(new Date().getFullYear());
}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const revealItems = document.querySelectorAll('.reveal');
if (reduceMotion || !('IntersectionObserver' in window)) {
  revealItems.forEach((item) => item.classList.add('is-visible'));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  );

  revealItems.forEach((item) => revealObserver.observe(item));
}

const heroProjects = {
  sonder: {
    image: 'assets/sonder-welcome.jpg',
    alt: 'Sonder vehicle passport welcome screen',
    kicker: 'Sonder',
    title: 'A transferable history for every car.',
    status: 'deployed',
    href: 'https://www.imsonder.com',
    label: 'Visit Sonder',
  },
  search: {
    image: 'assets/search-ui-result.jpg',
    alt: 'C++ search engine result view',
    kicker: 'C++ Search Engine',
    title: 'Search paths you can inspect.',
    status: 'complete',
    href: 'https://github.com/LeooJinn/cpp-search-engine',
    label: 'Open search engine',
  },
};

const heroImage = document.querySelector('[data-hero-image]');
const heroKicker = document.querySelector('[data-hero-kicker]');
const heroTitle = document.querySelector('[data-hero-title]');
const heroStatus = document.querySelector('[data-hero-status]');
const heroLink = document.querySelector('[data-hero-link]');
const heroSwitches = document.querySelectorAll('[data-hero-project]');

function updateHeroProject(projectName) {
  const project = heroProjects[projectName];
  if (!project || !heroImage || !heroKicker || !heroTitle || !heroStatus || !heroLink) return;

  heroSwitches.forEach((switcher) => {
    const isActive = switcher.dataset.heroProject === projectName;
    switcher.classList.toggle('is-active', isActive);
    switcher.setAttribute('aria-selected', String(isActive));
  });

  const applyProject = () => {
    heroImage.src = project.image;
    heroImage.alt = project.alt;
    heroKicker.textContent = project.kicker;
    heroTitle.textContent = project.title;
    heroStatus.textContent = project.status;
    heroLink.href = project.href;
    heroLink.setAttribute('aria-label', project.label);
    heroImage.dataset.switching = 'false';
  };

  if (reduceMotion) {
    applyProject();
    return;
  }

  heroImage.dataset.switching = 'true';
  window.setTimeout(applyProject, 160);
}

heroSwitches.forEach((switcher) => {
  switcher.addEventListener('click', () => updateHeroProject(switcher.dataset.heroProject));
});

const heroVisual = document.querySelector('.hero-visual');
const visualFrame = document.querySelector('.visual-frame');
if (heroVisual && visualFrame && !reduceMotion && window.matchMedia('(pointer: fine)').matches) {
  let frame;
  let pointerX = 0;
  let pointerY = 0;

  heroVisual.addEventListener('pointermove', (event) => {
    const bounds = heroVisual.getBoundingClientRect();
    pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    pointerY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;

    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      visualFrame.style.setProperty('--tilt-x', `${pointerY * -1.5}deg`);
      visualFrame.style.setProperty('--tilt-y', `${pointerX * 2}deg`);
      frame = undefined;
    });
  });

  heroVisual.addEventListener('pointerleave', () => {
    visualFrame.style.setProperty('--tilt-x', '0deg');
    visualFrame.style.setProperty('--tilt-y', '0deg');
  });
}

const sectionLinks = [...document.querySelectorAll('[data-section-link]')];
const sectionRailFill = document.querySelector('.section-rail-fill');
const sectionRailCurrent = document.querySelector('.section-rail-current');
const sections = sectionLinks
  .map((link) => document.getElementById(link.dataset.sectionLink))
  .filter(Boolean);

function setActiveSection(id) {
  const index = sections.findIndex((section) => section.id === id);
  if (index < 0) return;

  sectionLinks.forEach((link) => {
    if (link.dataset.sectionLink === id) {
      link.setAttribute('aria-current', 'location');
    } else {
      link.removeAttribute('aria-current');
    }
  });

  if (sectionRailFill) {
    const progress = sections.length > 1 ? index / (sections.length - 1) : 0;
    sectionRailFill.style.transform = `scaleY(${progress})`;
  }

  if (sectionRailCurrent) {
    sectionRailCurrent.textContent = sectionLinks[index]?.querySelector('strong')?.textContent || id;
  }
}

if ('IntersectionObserver' in window && sections.length) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]) setActiveSection(visible[0].target.id);
    },
    { rootMargin: '-20% 0px -50% 0px', threshold: [0.05, 0.2, 0.5] },
  );

  sections.forEach((section) => sectionObserver.observe(section));
  setActiveSection(window.location.hash ? window.location.hash.slice(1) : 'top');
}

sectionLinks.forEach((link) => {
  link.addEventListener('click', () => setActiveSection(link.dataset.sectionLink));
});

const projectFilters = document.querySelectorAll('[data-filter]');
const projectCards = document.querySelectorAll('[data-category]');
const filterStatus = document.querySelector('.filter-status');

projectFilters.forEach((filter) => {
  filter.addEventListener('click', () => {
    const category = filter.dataset.filter;
    let visibleCount = 0;

    projectFilters.forEach((button) => {
      const isActive = button === filter;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    projectCards.forEach((card) => {
      const isDimmed = category !== 'all' && card.dataset.category !== category;
      card.dataset.filtered = String(isDimmed);
      if (isDimmed) {
        window.setTimeout(() => {
          if (card.dataset.filtered === 'true') card.hidden = true;
        }, reduceMotion ? 0 : 280);
      } else {
        card.hidden = false;
      }
      if (!isDimmed) visibleCount += 1;
    });

    if (filterStatus) {
      filterStatus.textContent = `Showing ${visibleCount} project${visibleCount === 1 ? '' : 's'}`;
    }
  });
});

const timeline = document.querySelector('.timeline');
const timelineItems = [...document.querySelectorAll('.timeline-item')];
const timelineProgress = document.querySelector('.timeline-progress');

function setCurrentTimelineItem(item) {
  const index = timelineItems.indexOf(item);
  if (index < 0) return;
  timelineItems.forEach((timelineItem) => timelineItem.classList.toggle('is-current', timelineItem === item));
  if (timeline && timelineProgress) {
    timelineProgress.style.height = `${item.offsetTop + item.querySelector('.timeline-marker').offsetTop + 5}px`;
  }
}

if (timelineItems.length) {
  setCurrentTimelineItem(timelineItems[0]);
  if ('IntersectionObserver' in window) {
    const timelineObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setCurrentTimelineItem(visible[0].target);
      },
      { rootMargin: '-42% 0px -42% 0px', threshold: [0.1, 0.5, 0.9] },
    );
    timelineItems.forEach((item) => timelineObserver.observe(item));
  }
}

const details = document.querySelectorAll('.project-details');
details.forEach((detail) => {
  detail.addEventListener('toggle', () => {
    if (!detail.open || reduceMotion) return;
    detail.animate(
      [
        { opacity: 0, transform: 'translateY(-4px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 220, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    );
  });
});
