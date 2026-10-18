import Lenis from './vendor/lenis.js';

// Native document scrolling is the only source of position. Fixed UI stays outside it.
export function createScroll(onScroll, { syncTouch = false } = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let lenis, inputHandler, frame = 0, previous = 0, clock = 0;
  function cancelFrame() {
    cancelAnimationFrame(frame);
    frame = previous = 0;
  }
  function tick(now) {
    frame = 0;
    // Keep Lenis's animation clock continuous across idle periods, without
    // advancing its physics by the time spent parked or in a background tab.
    clock += previous ? now - previous : 1000 / 60;
    previous = now;
    lenis.raf(clock);
    if (lenis.isScrolling === 'smooth') wake();
    else previous = 0;
  }
  function wake() {
    if (lenis && !frame && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function configure() {
    cancelFrame();
    clock = 0;
    lenis?.destroy();
    inputHandler?.reset();
    lenis = reduced.matches ? null : new Lenis({
      lerp: .085, smoothWheel: true, syncTouch,
      virtualScroll(data) {
        // Leave dialogs, nested scrollers, zoom gestures and opening locks alone.
        const { event } = data;
        if (event.defaultPrevented || event.ctrlKey || lenis?.isStopped || lenis?.isLocked) return;
        if (event.composedPath().some(node => node.hasAttribute?.('data-lenis-prevent'))) return;
        return inputHandler?.onInput(data);
      },
    });
    lenis?.on('scroll', onScroll);
    lenis?.on('virtual-scroll', wake);
    onScroll();
  }
  addEventListener('scroll', onScroll, { passive: true });
  reduced.addEventListener('change', configure);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelFrame();
    else if (lenis?.isScrolling === 'smooth') wake();
  });
  addEventListener('pagehide', cancelFrame);
  addEventListener('pageshow', () => { if (lenis?.isScrolling === 'smooth') wake(); });
  configure();
  return {
    get reduced() { return reduced.matches; },
    get state() { return { engine: lenis ? 'Lenis 1.3.26' : 'native', y: scrollY, target: lenis?.targetScroll ?? scrollY, velocity: lenis?.velocity ?? 0, stopped: lenis?.isStopped ?? false }; },
    setInputHandler(handler) { inputHandler = handler; },
    cancel() { lenis?.reset(); cancelFrame(); },
    refresh() { lenis?.resize(); },
    stop() { inputHandler?.reset(); lenis?.stop(); cancelFrame(); },
    start() { lenis?.start(); },
    to(target, { immediate = false, offset = 0, duration = 1.05, easing, onComplete, source } = {}) {
      if (source !== 'input') inputHandler?.reset();
      // Resolve a numeric document position once: recent Lenis versions also apply
      // CSS scroll-margin to elements, which would subtract our reading line twice.
      const top = typeof target === 'number' ? target : target.getBoundingClientRect().top + scrollY;
      if (lenis) {
        lenis.scrollTo(top, { immediate, offset, duration, easing, lerp: 0, force: true, onComplete });
        if (lenis.isScrolling === 'smooth') wake();
      }
      else {
        scrollTo({ top: top + offset, behavior: 'instant' });
        onScroll(); onComplete?.();
      }
    },
  };
}
