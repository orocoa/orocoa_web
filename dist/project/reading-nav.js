// Shared optical navigation. Font size and variable
// weight share the page's clock; geometry always follows real glyph metrics.
import { onLanguageChange } from './language.js';

export function createReadingNavigation({ navigation }) {
  const body = document.body;
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const context = document.createElement('canvas').getContext('2d');
  const links = [...navigation.querySelectorAll('.project-tab')];
  const running = new Set();
  let frame = 0;

  for (const link of links) {
    const label = link.querySelector('span').textContent;
    link.dataset.label = label;
    link.setAttribute('aria-label', label);
    const span = link.querySelector('span');
    span.style.fontSize = '16px';
    span.style.fontWeight = '400';
  }

  function sizes() {
    const style = getComputedStyle(root);
    return {
      active: parseFloat(style.getPropertyValue('--work-nav-active-size')),
      inactive: parseFloat(style.getPropertyValue('--work-nav-size')),
    };
  }
  function metrics(style, size = style.fontSize, weight = style.fontWeight, text) {
    context.font = `${weight} ${size} ${style.fontFamily}`;
    return context.measureText(text);
  }
  function sync() {
    const { active } = sizes();
    body.removeAttribute('data-nav-hidden');
    body.removeAttribute('data-nav-direction');
    navigation.style.removeProperty('--work-nav-top');
    for (const link of links) {
      const span = link.querySelector('span');
      const style = getComputedStyle(span);
      const ink = metrics(style, style.fontSize, style.fontWeight, span.textContent);
      const rightBearing = ink.width - ink.actualBoundingBoxRight;
      const shiftY = (ink.actualBoundingBoxAscent - ink.actualBoundingBoxDescent -
        ink.fontBoundingBoxAscent + ink.fontBoundingBoxDescent) / 2;
      span.style.setProperty('--work-ink-x', `${rightBearing}px`);
      span.style.setProperty('--work-ink-y', `${Number.isFinite(shiftY) ? shiftY : 0}px`);
      if (link.classList.contains('project-tab-index')) {
        // The index rail reserves the final selected glyph width. It does not
        // drift while Project grows to meet it; its t stays on the right grid.
        const selected = metrics(style, `${active}px`, '700', span.textContent);
        const width = `${selected.actualBoundingBoxLeft + selected.actualBoundingBoxRight}px`;
        if (root.style.getPropertyValue('--work-project-width') !== width) {
          root.style.setProperty('--work-project-width', width);
        }
      }
    }
  }
  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      sync();
      if (running.size) schedule();
    });
  }
  function routeTarget({ duration = 0, defer = false } = {}) {
    if (defer) { sync(); return; }
    const { active, inactive } = sizes();
    const view = body.dataset.navView;
    const before = links.map(link => {
      const style = getComputedStyle(link.querySelector('span'));
      return { fontSize: style.fontSize, fontWeight: style.fontWeight };
    });
    for (const animation of running) animation.cancel();
    running.clear();
    const start = document.timeline.currentTime;
    links.forEach((link, index) => {
      const span = link.querySelector('span');
      const selected = link.dataset.surface === view;
      const target = { fontSize: `${selected ? active : inactive}px`, fontWeight: selected ? '700' : '400' };
      Object.assign(span.style, target);
      if (!duration || reduced.matches || (before[index].fontSize === target.fontSize && before[index].fontWeight === target.fontWeight)) return;
      const animation = span.animate([before[index], target], {
        duration, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both',
      });
      animation.startTime = start;
      running.add(animation);
      animation.finished.catch(() => {}).finally(() => {
        running.delete(animation);
        animation.cancel();
        schedule();
      });
    });
    sync();
    schedule();
  }

  addEventListener('resize', schedule);
  onLanguageChange(() => {
    for (const link of links) {
      const label = link.querySelector('span').textContent;
      link.dataset.label = label;
      link.setAttribute('aria-label', label);
    }
    schedule();
  });
  addEventListener('pageshow', schedule);
  document.addEventListener('project:layout', schedule);
  new ResizeObserver(schedule).observe(navigation);
  document.fonts.ready.then(schedule);
  reduced.addEventListener('change', () => {
    if (reduced.matches) for (const animation of running) animation.finish();
  });
  return { sync, beginRoute: sync, routeTarget, endRoute: sync };
}
