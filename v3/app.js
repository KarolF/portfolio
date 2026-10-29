/**
 * PLAYABLE CONFIGURATION
 * Standalone game exports live in playables/<game>/index.html.
 * See README.md for their source projects and refresh commands.
 */
const ads = [
  {
    id: '01',
    title: 'Jelly Orbit',
    category: 'match-3',
    categoryLabel: 'MATCH-3',
    description: 'Swap colorful jellies, make matches, and follow the shifting gravity.',
    preview: 'assets/jelly-orbit.jpg',
    playableUrl: 'playables/jelly-orbit/index.html'
  },
  {
    id: '02',
    title: 'Tiki Treats',
    category: 'serving',
    categoryLabel: 'SERVING',
    description: 'Tap tropical pastries to fill your island guests\' orders and serve every treat.',
    preview: 'assets/tiki-treats.jpg',
    playableUrl: 'playables/tiki-treats/index.html'
  },
  {
    id: '03',
    title: 'Paper Boat Parade',
    category: 'puzzle',
    categoryLabel: 'PUZZLE',
    description: 'Find a clear path for each paper boat and guide the parade through three ponds.',
    preview: 'assets/paper-boat-parade.jpg',
    playableUrl: 'playables/paper-boat-parade/index.html'
  }
];

const grid = document.querySelector('#gallery-grid');
const filterButtons = document.querySelectorAll('[data-filter]');
const visibleCount = document.querySelector('#visible-count');
const modal = document.querySelector('#preview-modal');
const modalContent = document.querySelector('#modal-content');
const modalStage = document.querySelector('.modal-stage');
const modalClose = document.querySelector('#modal-close');
const modalDone = document.querySelector('#modal-done');
const modalRestart = document.querySelector('#modal-restart');
let lastFocus = null;
let activeAd = null;

function renderCards(filter = 'all') {
  const items = ads.filter((ad) => filter === 'all' || ad.category === filter);
  visibleCount.textContent = String(items.length).padStart(2, '0');
  grid.innerHTML = items.map((ad) => `
    <article class="playable-card">
      <div class="card-art ${ad.category}">
        <span class="card-index">${ad.id}</span>
        <div class="card-phone"><img loading="lazy" src="${ad.preview}" alt="${ad.title} gameplay screenshot" /></div>
        <span class="art-stamp">${ad.playableUrl ? 'PLAY NOW ↗' : 'CONCEPT PREVIEW ↗'}</span>
      </div>
      <div class="card-details">
        <div class="card-category">${ad.categoryLabel} / PLAYABLE ${ad.id}</div>
        <h3 class="card-title">${ad.title}</h3>
        <p class="card-desc">${ad.description}</p>
        <button class="card-action" type="button" data-open-ad="${ad.id}" aria-label="Preview ${ad.title}">
          ${ad.playableUrl ? 'Play this ad' : 'View the concept'} <span aria-hidden="true">↗</span>
        </button>
      </div>
    </article>
  `).join('');
}

function renderModalMedia(ad) {
  modalContent.replaceChildren();
  if (ad.playableUrl) {
    const frame = document.createElement('iframe');
    frame.src = ad.playableUrl;
    frame.title = `${ad.title} interactive playable ad`;
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    frame.setAttribute('allow', 'autoplay');
    frame.addEventListener('load', () => {
      // These trusted local exports share the gallery's origin.
      frame.contentDocument.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeAd();
        }
      }, true);
    });
    modalContent.append(frame);
  } else {
    const img = document.createElement('img');
    img.src = ad.preview;
    img.alt = `${ad.title} sample game screenshot`;
    modalContent.append(img);
  }
}

function openAd(id) {
  const ad = ads.find((item) => item.id === id);
  if (!ad) return;
  activeAd = ad;
  lastFocus = document.activeElement;
  modalStage.dataset.theme = ad.category;
  document.querySelector('#modal-kicker').textContent = `${ad.categoryLabel} / PLAYABLE ${ad.id}`;
  document.querySelector('#modal-title').textContent = ad.title;
  document.querySelector('#modal-description').textContent = ad.description;
  document.querySelector('#modal-status').textContent = ad.playableUrl
    ? 'Live interactive HTML5 ad. Tap or click the screen to play.'
    : 'Visual placeholder. Add your HTML5 playable files to this slot to make it interactive.';
  modalRestart.hidden = !ad.playableUrl;
  modal.hidden = false;
  document.body.classList.add('modal-open');
  renderModalMedia(ad);
  modalClose.focus();
}

function closeAd() {
  modal.hidden = true;
  modalContent.replaceChildren();
  document.body.classList.remove('modal-open');
  activeAd = null;
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
}

grid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-open-ad]');
  if (button) openAd(button.dataset.openAd);
});
filterButtons.forEach((button) => button.addEventListener('click', () => {
  filterButtons.forEach((item) => {
    const selected = item === button;
    item.classList.toggle('active', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
  renderCards(button.dataset.filter);
}));
modalClose.addEventListener('click', closeAd);
modalDone.addEventListener('click', closeAd);
modalRestart.addEventListener('click', () => { if (activeAd) renderModalMedia(activeAd); });
modal.addEventListener('click', (event) => { if (event.target === modal) closeAd(); });
document.addEventListener('keydown', (event) => {
  if (modal.hidden) return;
  if (event.key === 'Escape') closeAd();
  if (event.key === 'Tab') {
    const controls = [...modal.querySelectorAll('button:not([hidden])')];
    if (event.shiftKey && document.activeElement === controls[0]) {
      event.preventDefault(); controls[controls.length - 1].focus();
    } else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) {
      event.preventDefault(); controls[0].focus();
    }
  }
});

const menuToggle = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('.mobile-nav');
menuToggle.addEventListener('click', () => {
  const nextOpen = mobileNav.hidden;
  mobileNav.hidden = !nextOpen;
  menuToggle.setAttribute('aria-expanded', String(nextOpen));
  menuToggle.setAttribute('aria-label', nextOpen ? 'Close menu' : 'Open menu');
});
mobileNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  mobileNav.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open menu');
}));
document.querySelector('#copyright-year').textContent = new Date().getFullYear();
renderCards();
