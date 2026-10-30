const ads = [
  {
    id: '01',
    title: 'Jelly Orbit',
    category: 'match-3',
    exportSize: '494 KiB',
    description: 'Match jellies, turn gravity, and hatch a little cosmic friend.',
    preview: 'assets/jelly-orbit.jpg',
    playableUrl: 'playables/jelly-orbit/index.html',
    technology: 'TypeScript, Canvas 2D. Packaged with Vite.',
    implementation: 'Match rules and cascades are separate from rendering. Each successful move turns gravity; swipe, tap, and keyboard controls share the same board logic.',
    interaction: 'An opening hint shows a valid swap. Matches build energy toward the final hatch, with a reduced-motion option.',
    credit: 'Raster artwork generated with OpenAI image tools.'
  },
  {
    id: '02',
    title: 'Tiki Treats',
    category: 'serving',
    exportSize: '702 KiB',
    description: 'Match the pastries to your guests\' orders. Keep the island café moving.',
    preview: 'assets/tiki-treats.jpg',
    playableUrl: 'playables/tiki-treats/index.html',
    technology: 'JavaScript, HTML and CSS, with a sprite atlas.',
    implementation: 'Order matching and guest feedback run in a scaled portrait layout. Artwork is packed into a sprite atlas and embedded in the export.',
    interaction: 'Tap a pastry to serve it. Orders give the player a clear target and an immediate response.'
  },
  {
    id: '03',
    title: 'Paper Boat Parade',
    category: 'puzzle',
    exportSize: '532 KiB',
    description: 'Find a clear route for each paper boat through three ponds.',
    preview: 'assets/paper-boat-parade.jpg',
    playableUrl: 'playables/paper-boat-parade/index.html',
    technology: 'JavaScript, HTML and CSS, with a separate puzzle engine.',
    implementation: 'The puzzle engine checks boat routes while the interface handles selection, movement, and feedback. The portrait layout accounts for screen safe areas.',
    interaction: 'An opening cue introduces the controls. Clear the boats to move on to the next pond.'
  }
];

const grid = document.querySelector('#gallery-grid');
const modal = document.querySelector('#preview-modal');
const modalContent = document.querySelector('#modal-content');
const modalStage = document.querySelector('.modal-stage');
const modalClose = document.querySelector('#modal-close');
const modalRestart = document.querySelector('#modal-restart');
const modalStatus = document.querySelector('#modal-status');
let lastFocus = null;
let activeAd = null;

function renderCards() {
  grid.innerHTML = ads.map((ad) => `
    <article class="playable-card">
      <button class="card-art ${ad.category}" type="button" data-open-ad="${ad.id}" aria-label="Play ${ad.title}">
        <span class="card-phone"><img loading="lazy" src="${ad.preview}" alt="${ad.title} gameplay" /></span>
        <span class="art-stamp">Play now ↗</span>
      </button>
      <div class="card-details">
        <h3 class="card-title"><button type="button" data-open-ad="${ad.id}">${ad.title}</button></h3>
        <p class="card-desc">${ad.description}</p>
        <button class="card-action" type="button" data-open-ad="${ad.id}" aria-label="Play ${ad.title}">Play game <span aria-hidden="true">↗</span></button>
      </div>
    </article>
  `).join('');
}

function renderModalMedia(ad) {
  modalContent.replaceChildren();
  modalStatus.textContent = 'Loading game…';
  const frame = document.createElement('iframe');
  frame.src = ad.playableUrl;
  frame.title = `${ad.title} playable demo`;
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  frame.setAttribute('allow', 'autoplay');
  frame.addEventListener('load', () => {
    if (!frame.isConnected) return;
    modalStatus.textContent = 'Ready to play. Tap or click the game.';
    // The trusted standalone exports share the gallery's origin.
    frame.contentDocument.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeAd();
      }
    }, true);
  });
  modalContent.append(frame);
}

function openAd(id) {
  const ad = ads.find((item) => item.id === id);
  if (!ad) return;
  activeAd = ad;
  lastFocus = document.activeElement;
  modalStage.dataset.theme = ad.category;
  document.querySelector('#modal-title').textContent = ad.title;
  document.querySelector('#modal-description').textContent = ad.description;
  document.querySelector('#modal-direct').href = ad.playableUrl;
  document.querySelector('.project-breakdown').open = false;
  document.querySelector('#modal-breakdown').innerHTML = `
    <dl>
      <dt>Technology</dt><dd>${ad.technology}</dd>
      <dt>Implementation</dt><dd>${ad.implementation}</dd>
      <dt>Player experience</dt><dd>${ad.interaction}</dd>
      <dt>Export</dt><dd>${ad.exportSize}. One HTML file with embedded assets, loaded on demand.</dd>
    </dl>
    <p>Personal browser demo. Advertising SDK integration and network validation are separate from this build.</p>
    ${ad.credit ? `<p>${ad.credit}</p>` : ''}
  `;
  modal.hidden = false;
  modal.showModal();
  document.body.classList.add('modal-open');
  renderModalMedia(ad);
  modalClose.focus();
}

function closeAd() {
  modal.close();
  modal.hidden = true;
  modalContent.replaceChildren();
  document.body.classList.remove('modal-open');
  activeAd = null;
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
}

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-open-ad]');
  if (trigger) openAd(trigger.dataset.openAd);
});
modalClose.addEventListener('click', closeAd);
modalRestart.addEventListener('click', () => { if (activeAd) renderModalMedia(activeAd); });
modal.addEventListener('click', (event) => { if (event.target === modal) closeAd(); });
modal.addEventListener('cancel', (event) => { event.preventDefault(); closeAd(); });

const menuToggle = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('.mobile-nav');
function closeMenu() {
  mobileNav.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open menu');
}
menuToggle.addEventListener('click', () => {
  const nextOpen = mobileNav.hidden;
  mobileNav.hidden = !nextOpen;
  menuToggle.setAttribute('aria-expanded', String(nextOpen));
  menuToggle.setAttribute('aria-label', nextOpen ? 'Close menu' : 'Open menu');
});
mobileNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !mobileNav.hidden) { closeMenu(); menuToggle.focus(); }
});
document.querySelector('#copyright-year').textContent = new Date().getFullYear();
renderCards();
