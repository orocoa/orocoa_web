import { siteURL } from './site.js';
import { finishReveals } from '../home/rise.js';
import { revealFields, resetFieldPreviews } from '../fields/fields.js';
import { onLanguageChange } from './language.js';
import { createHomeZoom } from '../home/zoom.js';
import { pointcloudReady, setPointcloudVisible } from '../home/pointcloud.js';
import { greetingReady } from '../home/greeting.js';
import { pageScroll } from './page-scroll.js';
import { createFieldSnap } from './field-snap.js';
import { createScreenTransition } from '../transition/scene.js';
import { enterPage } from '../vi/page-motion.js';
import { phone } from './device-mode.js';

if (new URLSearchParams(location.hash.slice(1)).has('project')) location.replace(siteURL('project/about/?project=') + encodeURIComponent(new URLSearchParams(location.hash.slice(1)).get('project')));
const track = document.querySelector('.journey-track');
const home = document.querySelector('.homepage');
const fields = document.querySelector('#fields');
const journey = document.querySelector('#journey');
const viewport = document.querySelector('.journey-viewport');
const story = document.querySelector('#device-story');
const profile = document.querySelector('#profile');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const zoom = createHomeZoom(home);
const clamp = value => Math.min(1, Math.max(0, value));
const range = (value, start, end) => clamp((value - start) / (end - start));
const smooth = value => value * value * (3 - 2 * value);
let current = 0, frame = 0, assetsReady = false, metrics, renderedY = scrollY;

function measure() {
  const style = getComputedStyle(journey);
  const travel = parseFloat(style.getPropertyValue('--zoom-travel'));
  const fieldsScroll = parseFloat(style.getPropertyValue('--fields-scroll'));
  const end = Math.max(1, Math.floor(journey.getBoundingClientRect().height - viewport.offsetHeight));
  const arrival = Math.round(end * travel / (travel + fieldsScroll));
  const device = !story.hidden && document.documentElement.classList.contains('is-3d');
  const profileTop = profile.getBoundingClientRect().top + scrollY;
  // A shorter phone reveal fits one ordinary swipe. Keep chapter positions
  // fixed so the extra distance becomes readable time before the device.
  const revealAfterArrival = phone.matches ? .12 : .576;
  metrics = { arrival, end, revealEnd: Math.round(arrival + viewport.offsetHeight * revealAfterArrival),
    landing: end, bottom: journey.offsetHeight, device, profileTop,
    width: viewport.clientWidth, height: viewport.offsetHeight, phone: phone.matches,
    deviceEnd: device ? story.getBoundingClientRect().top + scrollY + story.getBoundingClientRect().height - story.querySelector('.story-stage').offsetHeight : profileTop,
    profileTravel: Math.max(1, document.documentElement.scrollHeight - innerHeight - profileTop) };
}
function prepareLines() {
  fields.querySelectorAll('[data-rise-pending]').forEach(element => element.removeAttribute('data-rise-pending'));
  revealFields();
}
measure();
prepareLines();
const snap = createFieldSnap(pageScroll, () => [
  // One landing for the completed work; the short hold then flows into the
  // device without a second stop requiring another gesture to release it.
  { name: 'home', y: 0 }, { name: 'arrival', y: metrics.revealEnd },
], () => assetsReady && !document.documentElement.dataset.intro);

function render() {
  frame = 0;
  renderedY = scrollY;
  // Lenis already smooths the actual document position. A second lag filter
  // made direction changes feel sticky and let chapter movement outrun the type.
  current = clamp(scrollY / metrics.arrival);
  // Seven independent groups share one scroll clock. Each text line rises
  // through its own mask after the white ink fills the viewport; no fading.
  // Desktop uses 69.6vh; phones use 24vh from the same white-screen start.
  const entry = smooth(range(scrollY, metrics.arrival - metrics.height * .12, metrics.revealEnd));
  const zoomVisible = zoom.render(current * .84, reduced.matches);
  const homeOpacity = reduced.matches ? 1 - smooth(range(current, .08, .7)) : current === 0 ? 1 : 0;
  home.style.opacity = homeOpacity;
  setPointcloudVisible(zoomVisible || homeOpacity > 0);
  home.inert = current > .002;
  fields.style.setProperty('--fields-entry', entry);
  fields.classList.toggle('is-reveal-complete', entry === 1);
  fields.inert = entry < .999 || (metrics.device ? scrollY > metrics.end : scrollY >= metrics.bottom);
  if (fields.inert) resetFieldPreviews();
  document.body.dataset.page = scrollY >= metrics.profileTop ? 'profile' : metrics.device && scrollY > metrics.end ? 'device-transition' : current >= .999 ? 'fields' : current < .002 ? 'home' : 'transition';
  track.dataset.phase = current === 0 ? 'home' : current < .76 / .84 ? 'zoom' : current < .999 ? 'white' : 'fields';
}
function onScroll() {
  if (document.documentElement.dataset.intro) return;
  // Resize may change native scrollY before its resize event is delivered.
  // Remap the last rendered chapter position, not that adjusted position.
  if (viewport.clientWidth !== metrics.width || viewport.offsetHeight !== metrics.height) { resizeJourney(); return; }
  // A direct #fields landing is usable immediately. Keep the hidden homepage
  // offscreen until its resources are warm, even on a slow first connection.
  if (!assetsReady && window.__homeIntroBoot?.skip && scrollY < metrics.landing - 1) {
    pageScroll.to(metrics.landing, { immediate: true });
    return;
  }
  cancelAnimationFrame(frame);
  render();
}
let restoreFrame = 0, restoreTicket = 0;
async function restoreFields({ animate = true, reveal = false } = {}) {
  const ticket = ++restoreTicket;
  // The homepage canvas is black. Keep a white backing under the entire
  // restore/fade, including after data-entry is removed to reveal main.
  document.documentElement.setAttribute('data-fields-restore', '');
  // A cached document is already painted. Never hide it again on pageshow.
  if (animate) document.documentElement.dataset.entry = 'fields';
  cancelAnimationFrame(frame); frame = 0;
  cancelAnimationFrame(restoreFrame);
  history.scrollRestoration = 'manual';
  fields.classList.add('is-restoring');
  finishReveals();
  prepareLines();
  resetFieldPreviews();
  // A return or deep link starts on the completed second-screen hold.
  pageScroll.to(metrics.landing, { immediate: true });
  render();
  // The two-line glyph structure is already in HTML; wait for final font
  // metrics before revealing it over the white restoration surface.
  if (animate) await document.fonts.ready;
  if (ticket !== restoreTicket) return;
  measure();
  pageScroll.refresh();
  pageScroll.to(metrics.landing, { immediate: true });
  render();
  document.documentElement.removeAttribute('data-entry');
  if (animate || reveal) {
    await enterPage([document.querySelector('main')]);
    if (ticket !== restoreTicket) return;
  }
  // main is fully opaque now, so the normal chapter background cannot flash.
  document.documentElement.removeAttribute('data-fields-restore');
  // Commit title and hover resets while transitions are disabled, including
  // when pagehide freezes this document before another frame can run.
  fields.getBoundingClientRect();
  restoreFrame = requestAnimationFrame(() => {
    restoreFrame = requestAnimationFrame(() => fields.classList.remove('is-restoring'));
  });
}
function goFields(focus = false) {
  pageScroll.to(metrics.revealEnd, { onComplete: focus ? () => {
    // Reduced motion jumps immediately; enable the destination before focusing.
    cancelAnimationFrame(frame);
    render();
    fields.querySelector('a.field').focus({ preventScroll: true });
  } : undefined });
}
function goHome() { pageScroll.to(0); }

fields.addEventListener('click', event => {
  const link = event.target.closest('#fields a[href]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  history.scrollRestoration = 'manual';
  history.replaceState(history.state, '', '#fields');
});
for (const link of document.querySelectorAll('a[href="#fields"],a[href="#home"]')) {
  link.addEventListener('click', event => {
    event.preventDefault();
    if (link.hash === '#fields') { history.replaceState({}, '', '#fields'); goFields(event.detail === 0); }
    else { history.replaceState({}, '', location.pathname); goHome(); }
  });
}
addEventListener('journey:scroll', onScroll);
function resizeJourney() {
  const previous = metrics;
  const previousY = renderedY;
  const inJourney = renderedY <= metrics.end;
  const inFields = renderedY >= metrics.arrival;
  const fraction = inFields ? (renderedY - metrics.arrival) / (metrics.end - metrics.arrival) : renderedY / metrics.arrival;
  const inDevice = metrics.device && renderedY > metrics.end && renderedY < metrics.deviceEnd;
  const deviceFraction = (renderedY - metrics.end) / (metrics.deviceEnd - metrics.end);
  const inProfile = renderedY >= metrics.profileTop;
  const profileFraction = (renderedY - metrics.profileTop) / metrics.profileTravel;
  snap.reset();
  measure();
  zoom.invalidate();
  if (assetsReady) zoom.prepare();
  pageScroll.refresh();
  if (inJourney) {
    let target = inFields ? metrics.arrival + fraction * (metrics.end - metrics.arrival) : fraction * metrics.arrival;
    // Unfolding a phone must not hide work that was already revealed. Map the
    // reveal and readable hold separately only when the device class changes.
    if (previous.phone !== metrics.phone && previousY >= previous.arrival - previous.height * .12) {
      const revealing = previousY < previous.revealEnd;
      const from = revealing ? [previous.arrival - previous.height * .12, previous.revealEnd] : [previous.revealEnd, previous.end];
      const to = revealing ? [metrics.arrival - metrics.height * .12, metrics.revealEnd] : [metrics.revealEnd, metrics.end];
      target = to[0] + clamp((previousY - from[0]) / (from[1] - from[0])) * (to[1] - to[0]);
    }
    pageScroll.to(target, { immediate: true });
  }
  else if (inDevice) pageScroll.to(metrics.device ? metrics.end + deviceFraction * (metrics.deviceEnd - metrics.end) : deviceFraction < .5 ? metrics.end : metrics.profileTop, { immediate: true });
  else if (inProfile) pageScroll.to(metrics.profileTop + profileFraction * metrics.profileTravel, { immediate: true });
  onScroll();
}
addEventListener('resize', resizeJourney, { passive: true });
addEventListener('journey:layout', resizeJourney);
addEventListener('hashchange', () => {
  if (new URLSearchParams(location.hash.slice(1)).has('project')) { location.replace(siteURL('project/about/?project=') + encodeURIComponent(new URLSearchParams(location.hash.slice(1)).get('project'))); return; }
  if (location.hash === '#profile') return;
  location.hash === '#fields' ? goFields() : goHome();
});
addEventListener('pagehide', () => {
  // Store a completed, neutral second screen in BFCache, not a half-hovered
  // title or an unfinished entry fade that would resume on return.
  if (location.hash === '#fields' && !document.documentElement.dataset.intro) {
    restoreFields({ animate: false });
  }
});
addEventListener('pageshow', event => {
  if (document.documentElement.dataset.intro) return;
  // The initial deep-link restore is owned by module initialization below.
  // load/pageshow may arrive much later; replaying it causes a second flash.
  if (!event.persisted) return;
  measure();
  location.hash === '#fields' ? restoreFields({ animate: false, reveal: true }) : onScroll();
});
addEventListener('home:intro-complete', () => { zoom.prepare(); onScroll(); });
onLanguageChange(() => {
  prepareLines();
  zoom.invalidate();
  if (assetsReady) zoom.prepare();
  onScroll();
});
reduced.addEventListener('change', resizeJourney);

// Decode the second screen's pictures and warm the complete zoom before the
// opening unlocks input. All subsequent forward/reverse passes reuse these data.
const deviceReady = createScreenTransition({ story, fields, profile, integrated: true });
export const journeyReady = Promise.all([
  pointcloudReady, greetingReady, document.fonts.ready,
  deviceReady,
  // Keep successful images decoded before the existing entrance completes.
  // A damaged secondary preview must not hide the usable homepage forever.
  ...[...fields.querySelectorAll('img')].map(image => image.decode().catch(() => {})),
]).then(() => {
  zoom.prepare();
  assetsReady = true;
  onScroll();
});
journeyReady.catch(() => {});
if (window.__homeIntroBoot?.skip) restoreFields(); else onScroll();
