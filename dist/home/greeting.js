import { onLanguageChange, setLanguage } from '../assets/language.js';
import { finishReveals } from './rise.js';
import { greetingAccents as accents } from './greeting-palette.js';
const greeting = document.querySelector('#greeting');
const heading = document.querySelector('#heading');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const buttons = { en: document.querySelector('#lang-en'), zh: document.querySelector('#lang-zh') };
const words = { en: ['Hello,', "I'm orocoa"], zh: ['你好，', '我是 orocoa'] };
const explore = document.querySelector('#explore-label');
const exploreWords = { en: 'SCROLL TO EXPLORE', zh: '滚动向下探索' };
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!<>-_/[{}]=+*^?#|';
const cjkAlphabet = '天地人山水日月木火风云光影空间';
const CHANGE_INTERVAL = 95;
const FADE_DURATION = 140;
const measureContext = document.createElement('canvas').getContext('2d');
let language, frame = 0, previousPointer = null;

// Source text remains selectable and accessible. The reference's local colored
// interference lives on a measured overlay and never reflows the title.
const lines = [...heading.children].map(element => {
  const source = document.createElement('span');
  source.className = 'scramble-source';
  source.textContent = element.textContent;
  const overlay = document.createElement('span');
  overlay.className = 'scramble-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  element.replaceChildren(source, overlay);
  return { element, source, overlay, glyphs: [], prepared: false };
});
// The line boxes share one left edge, but glyphs such as H, I, 你 and 我 have
// different built-in side bearings. Measure the first visible glyph at its
// rendered size and offset the second line so the actual ink edges coincide.
function alignVisibleLeftEdges() {
  greeting.style.removeProperty('--greeting-name-offset');
  const firstInset = leftInkInset(lines[0]);
  const secondInset = leftInkInset(lines[1]);
  greeting.style.setProperty('--greeting-name-offset', `${secondInset - firstInset}px`);
}

function leftInkInset(line) {
  const style = getComputedStyle(line.element);
  measureContext.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  measureContext.textAlign = 'start';
  measureContext.direction = 'ltr';
  const firstGlyph = Array.from(line.source.textContent.trim())[0] || '';
  return measureContext.measureText(firstGlyph).actualBoundingBoxLeft;
}

function settle(line) {
  line.element.classList.remove('is-scrambling');
  line.overlay.replaceChildren();
  line.glyphs = [];
  line.prepared = false;
}
function settleAll() {
  cancelAnimationFrame(frame);
  frame = 0;
  previousPointer = null;
  lines.forEach(settle);
}

function prepare(line) {
  const text = line.source.firstChild;
  const rect = line.element.getBoundingClientRect();
  const style = getComputedStyle(line.element);
  const fontSize = parseFloat(style.fontSize);
  measureContext.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const tracking = Math.abs(parseFloat(style.letterSpacing) || 0);
  let offset = 0;
  line.glyphs = Array.from(text.textContent).map((char, index) => {
    const range = document.createRange();
    range.setStart(text, offset); offset += char.length; range.setEnd(text, offset);
    const box = range.getBoundingClientRect();
    const glyph = document.createElement('span');
    glyph.className = 'scramble-glyph';
    glyph.textContent = char;
    glyph.style.left = `${box.left - rect.left}px`;
    glyph.style.width = `${box.width}px`;
    line.overlay.append(glyph);
    const pool = /[\u3400-\u9fff]/u.test(char) ? cjkAlphabet + alphabet : alphabet;
    const alternatives = [...pool].filter(c => c !== char && measureContext.measureText(c).width <= box.width + tracking + 1).join('') || '|';
    return { char, glyph, alternatives, index, fixed: /\s/u.test(char),
      // Use line height for the influence center, rather than the font's overshooting metrics.
      x: box.left + box.width / 2, y: rect.top + rect.height / 2,
      radius: Math.max(55, Math.min(170, fontSize * .8 + 40)),
      recoverAt: 0, nextChange: 0, noisy: false };
  });
  line.prepared = true;
}

function restoreGlyph(item) {
  item.noisy = false;
  item.glyph.textContent = item.char;
  item.glyph.classList.remove('is-noisy', 'is-framed', 'is-fading');
  item.glyph.style.removeProperty('--glyph-accent');
}

function tick(now) {
  if (document.hidden || document.querySelector('.homepage')?.inert) { settleAll(); return; }
  let running = false;
  for (const line of lines) {
    let active = false;
    for (const item of line.glyphs) {
      if (!item.noisy) continue;
      if (now >= item.recoverAt) { restoreGlyph(item); continue; }
      active = running = true;
      item.glyph.classList.toggle('is-fading', item.recoverAt - now < FADE_DURATION);
    }
    if (!active && line.element.classList.contains('is-scrambling')) settle(line);
  }
  frame = running ? requestAnimationFrame(tick) : 0;
}

function disturb(event) {
  if (event.pointerType === 'touch' || reducedMotion.matches || document.documentElement.dataset.intro || document.querySelector('.homepage')?.inert) return;
  if (previousPointer && Math.hypot(event.clientX - previousPointer.x, event.clientY - previousPointer.y) < .5) return;
  previousPointer = { x: event.clientX, y: event.clientY };
  const now = performance.now();
  let touched = false;
  for (const line of lines) {
    if (!line.prepared) prepare(line);
    for (const item of line.glyphs) {
      if (item.fixed) continue;
      const proximity = 1 - Math.hypot(event.clientX - item.x, event.clientY - item.y) / item.radius;
      if (proximity <= 0) continue;
      touched = true;
      line.element.classList.add('is-scrambling');
      if (!item.noisy || now >= item.nextChange) {
        item.glyph.textContent = item.alternatives[Math.floor(Math.random() * item.alternatives.length)];
        item.glyph.style.setProperty('--glyph-accent', accents[Math.floor(Math.random() * accents.length)]);
        item.glyph.classList.toggle('is-framed', Math.random() < .42);
        item.nextChange = now + CHANGE_INTERVAL;
      }
      item.noisy = true;
      item.glyph.classList.add('is-noisy');
      item.glyph.classList.remove('is-fading');
      // Staggered per-glyph release leaves a short trail as the pointer passes.
      item.recoverAt = now + 320 + Math.random() * 290 + proximity * 80;
    }
  }
  if (touched && !frame) frame = requestAnimationFrame(tick);
}

function translateGreeting(lang) {
  if (language === lang) return;
  finishReveals();
  settleAll();
  language = lang;
  lines.forEach((line, index) => { line.source.textContent = words[lang][index]; });
  explore.textContent = exploreWords[lang];
  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  greeting.dataset.language = lang;
  for (const [code, button] of Object.entries(buttons)) button.setAttribute('aria-pressed', String(code === lang));
  document.querySelector('#stage').setAttribute('aria-label', lang === 'en' ? 'A slowly rotating point cloud of my computer' : '持续缓慢旋转的电脑点云');
  document.querySelector('#cloud').setAttribute('aria-label', lang === 'en'
    ? 'Computer point cloud. Nearby points scatter only while the pointer moves, then return when it stops.'
    : '电脑点云。仅鼠标移动时局部散开，停住后自动回拢。');
  alignVisibleLeftEdges();
}

buttons.en.addEventListener('click', () => setLanguage('en'));
buttons.zh.addEventListener('click', () => setLanguage('zh'));
onLanguageChange(translateGreeting);
greeting.addEventListener('pointermove', disturb);
greeting.addEventListener('pointerenter', disturb);
greeting.addEventListener('pointerleave', () => { previousPointer = null; });
greeting.addEventListener('pointerdown', settleAll);
greeting.addEventListener('pointercancel', settleAll);
window.addEventListener('blur', settleAll);
window.addEventListener('resize', () => { settleAll(); alignVisibleLeftEdges(); }, { passive: true });
// A scrolling title moves relative to the pointer; discard its measured positions.
window.addEventListener('scroll', settleAll, { passive: true });
document.addEventListener('visibilitychange', () => { if (document.hidden) settleAll(); });
reducedMotion.addEventListener('change', settleAll);
export const greetingReady = document.fonts.ready.then(() => { settleAll(); alignVisibleLeftEdges(); });
alignVisibleLeftEdges();
