import { routePath, siteURL } from '../assets/site.js';
import { ENTRY_KEY } from './navigation.js';
import { leavePage } from '../vi/page-motion.js';

let stylesPrepared = false, entryPending = false, loader;
function prepareStyles() {
  if (stylesPrepared) return;
  stylesPrepared = true;
  for (const href of ['/assets/document-preview.css', '/project/project.css']) {
    const preload = document.createElement('link');
    preload.rel = 'preload'; preload.as = 'style'; preload.href = href;
    document.head.append(preload);
  }
}

function showLoader() {
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'project-entry-loader'; loader.setAttribute('aria-hidden', 'true');
    const counter = document.createElement('span');
    counter.textContent = '000'; loader.append(counter); document.body.append(loader);
  }
  loader.hidden = false;
}
function resetEntry() { entryPending = false; if (loader) loader.hidden = true; }
// The homepage can return from BFCache. Release its transient loading surface.
addEventListener('pagehide', () => { entryPending = false; });
addEventListener('pageshow', event => { if (event.persisted) resetEntry(); });

// Warm the module graph on intent without running a hidden page or renderer.
let overviewPrepared = false;
function prepareOverview(event) {
  const link = event.target.closest('#fields a[href]');
  if (overviewPrepared || !link || navigator.connection?.saveData) return;
  const url = new URL(link.href);
  if (url.origin !== location.origin || routePath(url) !== 'project/') return;
  overviewPrepared = true;
  prepareStyles();
  for (const href of ['/project/app.js', '/project/carousel.js', '/project/vendor/viscose/ring/meta.js']) {
    const preload = document.createElement('link');
    preload.rel = 'modulepreload'; preload.href = href;
    document.head.append(preload);
  }
}
for (const type of ['pointerover', 'focusin', 'touchstart']) {
  document.addEventListener(type, prepareOverview, { passive: true });
}

// Capture only an ordinary, same-tab departure from Selected work. Modified
// clicks and copied links retain the standalone detail's Project fallback.
document.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest('#fields a[href]');
  if (!link || link.target || link.hasAttribute('download')) return;
  const url = new URL(link.href);
  if (url.origin !== location.origin || !/^project\/(?:about\/)?$/.test(routePath(url) || '')) return;
  history.replaceState(history.state, '', siteURL('#fields'));
  const origin = {
    type: 'fields', href: siteURL('#fields'), key: window.navigation?.currentEntry?.key,
    project: link.dataset.work, scrollY,
  };
  try {
    sessionStorage.setItem(ENTRY_KEY, JSON.stringify({
      destination: url.pathname + url.search, origin, createdAt: Date.now(),
    }));
  } catch {}
  if (routePath(url) === 'project/') {
    event.preventDefault();
    if (entryPending) return;
    entryPending = true;
    prepareStyles(); showLoader();
    // Paint the existing 000 surface before requesting another document.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (entryPending) leavePage(() => location.assign(url.href), { waitForExit: false, onReset: resetEntry });
    }));
  }
}, { capture: true });
