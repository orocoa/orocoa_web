const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const active = new Set();
const RISE_SPEED = .7;

// Measured overlays preserve kerning, wrapping and the accessible original text.
export function revealCharacters(element, { delay = 0, stagger = 23, duration = 650 } = {}) {
  element.removeAttribute('data-rise-pending');
  if (reducedMotion.matches) return Promise.resolve();
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode: node => node.textContent.trim() && !node.parentElement.closest('[aria-hidden="true"]')
      ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  const sources = nodes.map(node => {
    const span = document.createElement('rise-source');
    node.replaceWith(span); span.append(node); span.className = 'rise-source';
    return span;
  });
  const previousPosition = element.style.position;
  const needsPosition = getComputedStyle(element).position === 'static';
  if (needsPosition) element.style.position = 'relative';
  element.classList.add('is-rising');
  const base = element.getBoundingClientRect();
  const overlay = document.createElement('rise-layer');
  overlay.className = 'rise-overlay'; overlay.setAttribute('aria-hidden', 'true');
  const animations = [];
  let index = 0;
  for (const source of sources) {
    const node = source.firstChild;
    const style = getComputedStyle(source);
    let offset = 0;
    for (const char of Array.from(node.textContent)) {
      const range = document.createRange();
      range.setStart(node, offset); offset += char.length; range.setEnd(node, offset);
      if (/\s/u.test(char)) continue;
      const box = range.getBoundingClientRect();
      const mask = document.createElement('rise-mask');
      mask.className = 'rise-mask';
      Object.assign(mask.style, {
        left: `${box.left - base.left}px`, top: `${box.top - base.top}px`,
        width: `${box.width + parseFloat(style.fontSize) * .2}px`, height: `${box.height}px`,
      });
      const glyph = document.createElement('rise-glyph');
      glyph.className = 'rise-glyph'; glyph.textContent = char;
      Object.assign(glyph.style, {
        font: style.font, lineHeight: `${box.height}px`, color: style.color,
        letterSpacing: style.letterSpacing, textTransform: style.textTransform,
      });
      mask.append(glyph); overlay.append(mask);
      animations.push(glyph.animate([
        { transform: 'translateY(105%)' }, { transform: 'translateY(0)' },
      ], { duration: duration / RISE_SPEED, delay: (delay + index++ * stagger) / RISE_SPEED, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' }));
    }
  }
  element.append(overlay);
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    for (const animation of animations) animation.cancel();
    for (const source of sources) source.replaceWith(...source.childNodes);
    overlay.remove(); element.classList.remove('is-rising'); active.delete(finish);
    if (needsPosition) element.style.position = previousPosition;
  };
  const finish = () => { for (const animation of animations) animation.finish(); cleanup(); };
  active.add(finish);
  return Promise.all(animations.map(animation => animation.finished.catch(() => {}))).then(cleanup);
}

export function finishReveals() { for (const finish of [...active]) finish(); }
addEventListener('resize', finishReveals, { passive: true });
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) finishReveals(); });
