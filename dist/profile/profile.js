import { phone as compact } from '../assets/device-mode.js';
import { getLanguage, onLanguageChange } from '../assets/language.js';
import { chineseStatements } from './copy.js';
import { pageScroll as scroll } from '../assets/page-scroll.js';

const scene = document.querySelector('#profile');
const stage = scene.querySelector('.profile-stage');
const columns = [...scene.querySelectorAll('.profile-column')];
const columnGroup = scene.querySelector('.profile-columns');
const headings = columns.map(column => column.querySelector('.profile-heading-label'));
const details = columns.map(column => column.querySelector('.profile-details'));
const dots = [...scene.querySelectorAll('.profile-dot')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = value => Math.min(1, Math.max(0, value));
const range = (value, start, end) => clamp((value - start) / (end - start));
const ease = value => 1 - (1 - clamp(value)) ** 3;
let frame = 0;
let metrics;
let lastRenderKey;
const reading = scene.querySelector('.profile-statements');

// Rebuild only the text masks; the existing reversible scroll timeline stays intact.
const statementSources = [...scene.querySelectorAll('.profile-statement')].map(paragraph => ({paragraph, en: paragraph.innerHTML.trim()}));
let statementLanguage;
let statements = [];
function statementTokens(source, language) {
  const template = document.createElement('template');
  template.innerHTML = source;
  const tokens = [];
  const split = text => language === 'zh'
    ? text.match(/[（【《「『“‘]*[\u3400-\u9fff][，。！？；：、）】》」』”’]*|[^\u3400-\u9fff\s]+|\s+/gu) || []
    : text.split(/([ \t\r\n]+)/);
  function visit(node, emphasized = false) {
    if (node.nodeType === Node.TEXT_NODE) {
      split(node.textContent).forEach(text => { if (text) tokens.push({text, emphasized}); });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
    const nextEmphasis = emphasized || (node.nodeType === Node.ELEMENT_NODE && node.matches('strong, b, em'));
    node.childNodes.forEach(child => visit(child, nextEmphasis));
  }
  visit(template.content);
  return tokens;
}
function translateStatements(language) {
  if (language === statementLanguage) return;
  statementLanguage = language;
  statements = statementSources.map(({paragraph, en}, index) => {
    const source = language === 'zh' ? chineseStatements[index] : en;
    const tokens = statementTokens(source, language);
    paragraph.setAttribute('aria-label', tokens.map(({text}) => text).join('').trim());
    const fragment = document.createDocumentFragment();
    const words = [];
    // Keep Chinese punctuation attached so animated masks respect line-break rules.
    for (const {text, emphasized} of tokens) {
      if (!text) continue;
      if (/^\s+$/.test(text)) { fragment.append(text); continue; }
      const mask = document.createElement('span');
      mask.className = 'profile-word-mask';
      mask.setAttribute('aria-hidden', 'true');
      const word = document.createElement('span');
      word.className = 'profile-word';
      if (emphasized) word.classList.add('is-emphasized');
      word.textContent = text;
      mask.append(word); fragment.append(mask); words.push(word);
    }
    paragraph.replaceChildren(fragment);
    return {paragraph, words};
  });
}
translateStatements(getLanguage());

function measure() {
  lastRenderKey = undefined;
  const rect = scene.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const groupRect = columnGroup.getBoundingClientRect();
  const heading = columns[0].querySelector('.profile-heading');
  const positions = columns.map(column => {
    const r = column.getBoundingClientRect();
    const transform = new DOMMatrixReadOnly(getComputedStyle(column).transform);
    const heading = column.querySelector('.profile-heading');
    return { left: r.left - stageRect.left - transform.m41, top: r.top - stageRect.top - transform.m42, pointY: r.top - stageRect.top - transform.m42 + heading.offsetTop + heading.offsetHeight / 2 - 3.5 };
  });
  metrics = {
    top: rect.top + scrollY,
    distance: Math.max(1, scene.offsetHeight - stage.offsetHeight),
    width: stage.offsetWidth,
    height: stage.offsetHeight,
    sceneHeight: scene.offsetHeight,
    pointY: groupRect.top - stageRect.top + heading.offsetTop + heading.getBoundingClientRect().height / 2 - 3.5,
    openingHeight: scene.querySelector('.profile-opening').offsetHeight,
    readingInset: parseFloat(getComputedStyle(statements[0].paragraph).top) || 0,
    pointXs: positions.map(position => position.left),
    pointYs: positions.map(position => position.pointY),
    columnTops: positions.map(position => position.top),
    readingTop: reading.getBoundingClientRect().top + scrollY,
    readingHeight: reading.offsetHeight,
    statementHeights: statements.map(({paragraph}) => paragraph.offsetHeight),
    // The opening stays symmetric independently of the three reading widths.
    splitXs: [0, 1, 2].map(index => groupRect.left - stageRect.left + groupRect.width * (index + .5) / 3 - 3.5),
  };
  scene.style.setProperty('--profile-seed-y', `${compact.matches ? metrics.openingHeight / 2 : Math.min(metrics.height * .49, metrics.pointY - 48)}px`);
  statements.forEach(statement => { statement.lastEnter = undefined; });
  schedule();
}

function revealWords(words, progress, exit = 0) {
  words.forEach((word, index) => {
    const delay = index / Math.max(1, words.length - 1) * .68;
    const enter = ease(range(progress, delay, delay + .32));
    const leave = range(exit, delay, delay + .32) ** 3;
    word.style.transform = `translateY(${((enter - 1 + leave) * 115).toFixed(2)}%)`;
  });
}

// Adjacent windows overlap: the next paragraph starts while the previous exits.
function revealStatements(progress, windows) {
  statements.forEach((statement, index) => {
    const { paragraph, words } = statement;
    const [start, end, exitStart, exitEnd] = windows[index];
    const enter = range(progress, start, end);
    const exit = range(progress, exitStart, exitEnd);
    const visible = enter > 0 && exit < 1;
    if (enter !== statement.lastEnter || exit !== statement.lastExit) {
      revealWords(words, enter, exit);
      statement.lastEnter = enter; statement.lastExit = exit;
    }
    if (compact.matches) {
      // A shared mobile reading area needs vertical separation during handoff.
      const incoming = index ? (1 - ease(range(progress, start, windows[index - 1][3]))) * (metrics.statementHeights[index - 1] + 32) : 0;
      const outgoing = index < statements.length - 1 ? ease(range(progress, windows[index + 1][0], exitEnd)) * (metrics.statementHeights[index] + 32) : 0;
      paragraph.style.transform = `translateY(${incoming - outgoing}px)`;
    } else paragraph.style.removeProperty('transform');
    paragraph.style.visibility = visible ? 'visible' : 'hidden';
    if (visible) paragraph.removeAttribute('aria-hidden');
    else paragraph.setAttribute('aria-hidden', 'true');
  });
}

function render() {
  frame = 0;
  if (!metrics) return;
  const position = scrollY < metrics.top - innerHeight ? 'before' : scrollY > metrics.top + metrics.sceneHeight ? 'after' : scrollY;
  const key = `${position}:${compact.matches}:${reduced.matches}:${document.documentElement.dataset.intro || ''}`;
  if (key === lastRenderKey) return;
  lastRenderKey = key;
  if (reduced.matches) {
    columns.forEach(column => column.inert = false);
    statements.forEach(({ paragraph }) => {
      paragraph.removeAttribute('aria-hidden');
      paragraph.style.visibility = 'visible';
    });
    return;
  }
  const { top, distance, width, height, openingHeight } = metrics;
  const ready = !document.documentElement.dataset.intro;
  const progress = clamp((scrollY - top) / (compact.matches ? openingHeight : distance));
  // The shared scroll driver already provides inertia. Keep the dots and type
  // on that same position so direction changes do not acquire another delay.
  const motionProgress = ready ? progress : 0;
  // Position, split and merge share one reversible scroll timeline. Pausing the
  // scroll pauses the split; returning to the chapter start restores one seed.
  const split = compact.matches ? range(motionProgress, .03, .38) : range(motionProgress, .006, .075);
  const spring = split === 0 || split === 1 ? split : 1 + 2.1 * (split - 1) ** 3 + 1.1 * (split - 1) ** 2;
  const seedOpacity = ready ? ease(range(scrollY - top, -innerHeight * .2, 0)) : 0;
  function drawPoint(index, targetX, y, opacity = 1) {
    const seed = index === 1;
    const reveal = seed ? seedOpacity : ease(range(split, 0, .12));
    const scale = seed ? 1 + .25 * Math.sin(Math.PI * split) : .45 + .55 * spring;
    const originX = width / 2 - 3.5;
    dots[index].style.transform = `translate3d(${originX + (targetX - originX) * spring}px, ${y}px, 0) scale(${scale})`;
    dots[index].style.opacity = ready ? reveal * opacity : 0;
  }

  if (compact.matches) {
    // The two visible sections receive the actual split points. Both points
    // move from the same seed into their heading anchors before copy appears.
    // Document-space anchors make reverse scrolling trace precisely the same path.
    const travel = ease(range(motionProgress, .03, .72));
    const originX = width / 2 - 3.5;
    const originY = openingHeight / 2;
    dots.forEach((dot, index) => {
      if (index > 1) { dot.style.opacity = '0'; return; }
      const x = originX + (metrics.pointXs[index] - originX) * travel;
      const y = originY + (metrics.pointYs[index] - originY) * travel;
      dot.style.transform = `translate3d(${x}px,${y}px,0)`;
      dot.style.opacity = ready ? seedOpacity : 0;
    });
    const revealed = ease(range(motionProgress, .72, 1));
    columns.forEach((column, index) => {
      column.style.removeProperty('--profile-column-y');
      column.style.removeProperty('--profile-column-x');
      const position = top + metrics.columnTops[index] - scrollY;
      const show = ready ? revealed * ease(range(innerHeight - position, innerHeight * .1, innerHeight * .4)) : 0;
      // Recognition remains part of the same content and gets its inline dot
      // when it enters the viewport; only the opening split has two points.
      column.style.setProperty('--profile-heading-opacity', index < 2 ? 0 : show);
      headings[index].style.cssText = `opacity:${show};transform:translateY(${(show - 1) * 12}px)`;
      details[index].style.cssText = `opacity:${show};transform:translateY(${(show - 1) * 20}px)`;
      column.inert = show < .95;
    });
    const readingProgress = ready && motionProgress >= .9 ? clamp((metrics.readingInset - metrics.readingTop + scrollY) / Math.max(1, metrics.readingHeight - innerHeight + metrics.readingInset)) : 0;
    revealStatements(readingProgress, [[0, .20, .26, .40], [.29, .53, .60, .74], [.63, .90, 1.1, 1.2]]);
    return;
  }

  const travel = range(motionProgress, .08, .23);
  const descend = travel * travel * (3 - 2 * travel);
  const lowerY = metrics.pointY;
  // Settle the centred row beside the distributed headings. Both coordinates
  // are shared by the information groups so their points stay attached.
  const openingY = Math.min(height * .49, lowerY - 48);
  const pointY = openingY + (lowerY - openingY) * descend;
  columns.forEach((column, index) => {
    const pointX = metrics.splitXs[index] + (metrics.pointXs[index] - metrics.splitXs[index]) * descend;
    drawPoint(index, pointX, pointY);
    column.style.setProperty('--profile-column-x', `${pointX - metrics.pointXs[index]}px`);
    column.style.setProperty('--profile-column-y', `${pointY - lowerY}px`);
    const heading = ease(range(motionProgress, .17 + index * .009, .245 + index * .009));
    const detailReveal = ease(range(motionProgress, .235 + index * .009, .325 + index * .009));
    headings[index].style.cssText = `opacity:${heading};clip-path:inset(0 0 ${(1 - heading) * 100}% 0);transform:translateY(${(heading - 1) * 12}px)`;
    details[index].style.cssText = `opacity:${detailReveal};transform:translateY(${(detailReveal - 1) * 18}px)`;
    column.inert = detailReveal < .97;
  });
  revealStatements(motionProgress, [[.35, .47, .515, .625], [.535, .685, .735, .845], [.755, .93, 1.1, 1.2]]);
}

function schedule() { if (!frame) frame = requestAnimationFrame(render); }

scene.classList.add('profile-enhanced');
addEventListener('journey:scroll', () => { cancelAnimationFrame(frame); render(); });
const clock = document.querySelector('#beijing-time');
const timeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});
function updateClock() {
  const now = new Date();
  clock.textContent = timeFormat.format(now);
  clock.dateTime = now.toISOString();
  setTimeout(updateClock, 1000 - now.getMilliseconds() + 10);
}
updateClock();

function goProfile(focus = false) {
  scroll.to(scene, { onComplete: focus ? () => scene.focus({ preventScroll: true }) : undefined });
}
document.querySelectorAll('a[href="#profile"]').forEach(link => link.addEventListener('click', event => {
  event.preventDefault();
  history.replaceState({}, '', '#profile');
  goProfile(event.detail === 0);
}));
addEventListener('hashchange', () => { if (location.hash === '#profile') goProfile(); });
addEventListener('pageshow', () => {
  measure();
  if (location.hash === '#profile' && !document.documentElement.dataset.intro) scroll.to(scene, { immediate: true });
});
const observer = new ResizeObserver(() => { measure(); scroll.refresh(); });
observer.observe(stage);
columns.forEach(column => observer.observe(column));
reduced.addEventListener('change', measure);
compact.addEventListener('change', () => { measure(); scroll.refresh(); });
addEventListener('resize', measure, { passive: true });
addEventListener('journey:layout', () => { measure(); scroll.refresh(); });
measure();

const dialog = document.querySelector('#wechat-dialog');
const wechatButton = document.querySelector('#open-wechat');
wechatButton.addEventListener('click', () => { dialog.showModal(); scroll.stop(); });
dialog.querySelector('.wechat-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
});
dialog.addEventListener('close', () => { scroll.start(); wechatButton.focus({ preventScroll: true }); });

onLanguageChange(language => { translateStatements(language); measure(); scroll.refresh(); });
