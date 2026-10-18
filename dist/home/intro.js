import './copy.js';
import { pointcloudReady, revealFromNumber } from './pointcloud.js';
import { greetingReady } from './greeting.js';
import { revealCharacters } from './rise.js';
import { journeyReady } from '../assets/journey.js';

const root = document.documentElement;
const loader = document.querySelector('#home-loader');
const number = loader.querySelector('.loader-number');
loader.querySelector('button').addEventListener('click', () => location.reload());
const main = document.querySelector('main');
const boot = window.__homeIntroBoot;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const state = { phase: boot.skip ? 'complete' : 'loading', progress: boot.skip ? 100 : 0, assetsReady: false, fontsReady: false, error: null };
window.__homeIntro = { getState: () => ({ ...state }) };
main.inert = !boot.skip;
if (!boot.skip) main.setAttribute('aria-busy', 'true');
else loader.hidden = true;
// Includes wheel events handled by a smooth-scroll driver on the shared page.
const lockScroll = event => { event.preventDefault(); event.stopImmediatePropagation(); };
const lockKeys = event => { if (['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key)) event.preventDefault(); };
if (!boot.skip) addEventListener('wheel', lockScroll, { passive: false, capture: true });
if (!boot.skip) addEventListener('touchmove', lockScroll, { passive: false, capture: true });
if (!boot.skip) addEventListener('keydown', lockKeys, { capture: true });
const pinTop = () => { if (root.dataset.intro && scrollY) scrollTo({top:0,behavior:'instant'}); };
if (!boot.skip) addEventListener('scroll', pinTop, { passive: true });
pinTop();

document.fonts.ready.then(() => { state.fontsReady = true; });
Promise.all([pointcloudReady, greetingReady, document.fonts.ready, journeyReady]).then(() => {
  if (state.phase === 'error') return;
  state.assetsReady = true;
  clearTimeout(boot.watchdog);
}).catch(error => {
  if (!boot.skip) state.phase = 'error';
  state.error = String(error);
  clearTimeout(boot.watchdog); boot.fail();
});

const homeText = ['.hello','.name','#lang-en','#lang-zh','#explore-label'].map(selector => document.querySelector(selector));
let previous = performance.now();
let textReveal = Promise.resolve();
function revealText() {
  root.dataset.intro = 'revealing'; state.phase = 'revealing';
  textReveal = Promise.all(homeText.map((element,index) => revealCharacters(element, {
    delay: index < 2 ? index*125 : 210 + index*40,
    stagger: index < 2 ? 27 : 16,
    duration: 660,
  })));
}
async function enter() {
  // Keep 100 legible for a beat, then sample these exact digits into the cloud.
  await new Promise(resolve => setTimeout(resolve,reduced.matches ? 0 : 180));
  state.phase = 'morphing';
  const morph = revealFromNumber(number,revealText);
  if (!reduced.matches) root.dataset.intro = 'morphing';
  await morph;
  await textReveal;
  clearTimeout(boot.watchdog);
  root.removeAttribute('data-intro'); loader.hidden = true;
  main.inert = false; main.removeAttribute('aria-busy');
  state.phase = 'complete';
  removeEventListener('wheel',lockScroll,{capture:true});
  removeEventListener('touchmove',lockScroll,{capture:true});
  removeEventListener('keydown',lockKeys,{capture:true});
  removeEventListener('scroll',pinTop);
  dispatchEvent(new Event('home:intro-complete'));
  // Honor deep links after the entrance, including the independent profile.
  if (location.hash) dispatchEvent(new HashChangeEvent('hashchange'));
}
function tick(now) {
  if (state.phase !== 'loading' || root.dataset.intro === 'error') return;
  const dt = Math.max(0,now-previous); previous=now;
  const resourceProgress = .05 + window.__pointcloud.getState().loadingProgress*.85 + (state.fontsReady ? .10 : 0);
  const elapsed = now-boot.startedAt;
  const presentationLimit = reduced.matches ? 100 : Math.min(100,elapsed/1700*100);
  const target = Math.min(state.assetsReady?100:99,resourceProgress*100,presentationLimit);
  state.progress = Math.max(state.progress,state.progress+(target-state.progress)*(1-Math.exp(-dt/110)));
  const finished = state.assetsReady && presentationLimit === 100 && state.progress >= 99.4;
  const value = finished ? 100 : Math.min(99,Math.floor(state.progress));
  number.textContent = String(value).padStart(2,'0');
  loader.setAttribute('aria-valuenow',String(value));
  // The entire number travels downward; the reduced-motion path stays put.
  const margin = innerHeight*(innerWidth<=600?.07:.055);
  const travel = Math.max(0,innerHeight-margin*2-number.offsetHeight);
  number.style.top = `${margin+(reduced.matches?0:value/100*travel)}px`;
  if (finished) { state.progress=100; state.phase='loaded'; enter().catch(error=>{
    state.phase='error';state.error=String(error);boot.fail();
  }); }
  else if (!boot.skip) requestAnimationFrame(tick);
}
if (!boot.skip) requestAnimationFrame(tick);
