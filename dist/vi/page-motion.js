import { routePath } from '../assets/site.js';
import { phone } from '../assets/device-mode.js';

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const entries = new Set();
let departing = false, departure, departureTicket = 0, recovery, previousInert, returnFocus, onDepartureReset;

// Timing lives in the VI manifest. Module-specific image bridges and opening
// sequences keep ownership of their own surfaces; do not wrap them twice.
export function pageMotion() {
  const style = getComputedStyle(root);
  const value = name => style.getPropertyValue(`--vi-motion-${name}`).trim();
  return {
    exit: parseFloat(value(phone.matches ? 'exit-phone' : 'exit')),
    enter: parseFloat(value(phone.matches ? 'enter-phone' : 'enter')),
    ease: value('ease'), exitEase: value('exit-ease'),
    distance: phone.matches ? 0 : parseFloat(value('distance')),
  };
}

export async function enterPage(elements = [document.body], { lift = false } = {}) {
  if (reduced.matches || departing) return;
  const motion = pageMotion();
  const start = document.timeline.currentTime;
  const group = [...elements].filter(Boolean).map(element => {
    for (const animation of entries) {
      if (animation.effect.target === element) { animation.cancel(); entries.delete(animation); }
    }
    const frames = lift
      ? [{ opacity: 0, translate: `0 ${motion.distance}px` }, { opacity: 1, translate: '0 0' }]
      : [{ opacity: 0 }, { opacity: 1 }];
    const animation = element.animate(frames, { duration: motion.enter, easing: motion.ease, fill: 'both' });
    animation.id = 'vi-page-enter';
    animation.startTime = start;
    entries.add(animation);
    return animation;
  });
  try { await Promise.all(group.map(animation => animation.finished.catch(() => {}))); }
  finally { group.forEach(animation => { animation.cancel(); entries.delete(animation); }); }
}

function resetDeparture() {
  ++departureTicket;
  clearTimeout(recovery);
  departure?.cancel(); departure = null;
  if (departing && document.body) document.body.inert = previousInert;
  departing = false;
  delete root.dataset.pageLeaving;
  onDepartureReset?.(); onDepartureReset = null;
}

export async function leavePage(navigate, { waitForExit = true, onReset } = {}) {
  if (departing) return;
  const ticket = ++departureTicket;
  departing = true;
  onDepartureReset = onReset;
  previousInert = document.body.inert;
  returnFocus = document.activeElement;
  // Preserve the visible opacity if a user leaves during an entry animation.
  const opacity = getComputedStyle(document.body).opacity;
  entries.forEach(animation => animation.cancel()); entries.clear();
  document.body.inert = true;
  root.dataset.pageLeaving = routePath(location) === '' && location.hash === '#fields' ? 'fields' : 'page';
  if (!reduced.matches && waitForExit) {
    const motion = pageMotion();
    departure = document.body.animate([{ opacity }, { opacity: 0 }], {
      duration: motion.exit, easing: motion.exitEase, fill: 'both',
    });
    departure.id = 'vi-page-exit';
    await departure.finished.catch(() => {});
  }
  if (ticket !== departureTicket) return;
  // A failed/aborted navigation must not leave the current page invisible.
  recovery = setTimeout(resetDeparture, 4000);
  try { navigate(); } catch (error) { resetDeparture(); throw error; }
}

addEventListener('pagehide', () => {
  // Keep the outgoing opacity and backing surface through the document swap.
  // Cancelling the exit here repainted the old page at full opacity for a
  // frame. A cached document releases that state only when it is shown again.
  clearTimeout(recovery);
});
addEventListener('pageshow', event => {
  if (!event.persisted) return;
  entries.forEach(animation => animation.cancel()); entries.clear();
  resetDeparture();
  // Home restores its chapter position before revealing. Other cached routes
  // are already laid out and only need one opacity transition, no intro replay.
  if (routePath(location) !== '') enterPage();
  queueMicrotask(() => {
    if (returnFocus?.isConnected && returnFocus !== document.body) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  });
});
reduced.addEventListener('change', () => {
  if (!reduced.matches) return;
  entries.forEach(animation => animation.finish());
  departure?.finish();
});

// Run after document-level routers. They retain their existing surface/image
// transitions; only ordinary, unhandled same-tab page links reach this fallback.
addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest('a[href]');
  if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;
  const url = new URL(link.href);
  const route = routePath(url);
  if (route === null || !/^(?:$|(?:project|code|design|creative-practice)(?:\/(?:about|focus))?\/$|(?:about|photography|vi)\/$)/.test(route)) return;
  if (url.pathname === location.pathname && url.search === location.search) return;
  event.preventDefault();
  // All work owns its loading/seed entry; don't put another wait before it.
  const allWork = routePath(url) === 'project/' && link.closest('#fields');
  leavePage(() => location.assign(url.href), { waitForExit: !allWork });
});

// These static shells have no module-specific opening sequence.
if (routePath(location) === 'vi/' || routePath(location) === '404.html') {
  const reveal = () => enterPage();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', reveal, { once: true });
  else reveal();
}
