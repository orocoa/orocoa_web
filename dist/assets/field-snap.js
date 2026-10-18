// The completed Work arrival absorbs one gesture before continuing to the device.
// Keep the actual Lenis position as the single clock for every chapter's motion.
export function createFieldSnap(scroll, getStops, enabled) {
  const root = document.querySelector('#journey');
  const ease = t => 1 - (1 - t) ** 3;
  const bound = (value, limit) => Math.max(-limit, Math.min(limit, value));
  let active = null, lastInput = 0, lastMagnitude = 0;

  function reset() {
    active = null;
    lastInput = lastMagnitude = 0;
    delete root.dataset.snap;
    delete root.dataset.snapState;
  }
  function snap(stop, direction) {
    const pending = active = { direction, settledAt: 0 };
    root.dataset.snap = stop.name;
    root.dataset.snapState = 'moving';
    scroll.to(stop.y, {
      source: 'input', easing: ease,
      duration: Math.min(1.1, .28 + Math.abs(stop.y - scrollY) / innerHeight * .56),
      onComplete() {
        if (active !== pending) return;
        pending.settledAt = performance.now();
        root.dataset.snapState = 'settled';
      },
    });
  }
  function onInput(data) {
    const { event } = data;
    if (scroll.reduced || scroll.state.stopped || !enabled()) return;
    // Pinch zoom stays native. A new finger contact can interrupt a landing.
    if (event.touches?.length > 1) return false;
    if (event.type === 'touchstart') {
      if (active) { scroll.cancel(); reset(); }
      return;
    }
    if (!data.deltaY || Math.abs(data.deltaX || 0) > Math.abs(data.deltaY)) return;
    const now = performance.now();
    const direction = Math.sign(data.deltaY);
    const magnitude = Math.abs(data.deltaY);
    const quiet = now - lastInput > 140;
    // A continuing mouse wheel also releases after settling. Decaying trackpad
    // momentum stays at the landmark; no stale displacement is carried forward.
    const deliberate = active?.settledAt && now - active.settledAt > 220 &&
      magnitude >= 8 && magnitude >= lastMagnitude * .98 && event.type !== 'touchend';
    lastInput = now;
    lastMagnitude = magnitude;
    if (active) {
      if (direction !== active.direction || (active.settledAt && (quiet || deliberate))) {
        scroll.cancel();
        active = null;
        delete root.dataset.snap;
        delete root.dataset.snapState;
      } else {
        event.preventDefault();
        return false;
      }
    }

    const state = scroll.state;
    const base = Math.sign(state.target - state.y) === -direction ? state.y : state.target;
    const touchEnd = event.type === 'touchend';
    const delta = touchEnd ? direction * Math.min(innerHeight * .6, Math.abs(state.velocity) ** 1.5) : data.deltaY;
    const target = base + delta;
    const stops = getStops();
    const stop = (direction > 0 ? stops : [...stops].reverse()).find(stop =>
      direction * (stop.y - state.y) > 2);
    if (stop && Math.abs(stop.y - state.y) <= innerHeight * 1.5 &&
        direction * (target - stop.y) >= -innerHeight * .10) {
      event.preventDefault();
      snap(stop, direction);
      return false;
    }

    // Bound queued motion on the rest of the page so a fast wheel cannot leave
    // seconds of delayed movement behind the cursor or outrun the scroll visuals.
    const next = state.y + bound(target - state.y, innerHeight * .6);
    if (touchEnd || event.type === 'keydown') {
      event.preventDefault();
      scroll.to(next, { source: 'input', duration: touchEnd ? .55 : .42, easing: ease });
      return false;
    }
    data.deltaY = next - state.target;
  }
  scroll.setInputHandler({ onInput, reset });
  addEventListener('keydown', event => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || scroll.reduced || scroll.state.stopped || !enabled()) return;
    if (event.target.closest?.('input,textarea,select,button,[contenteditable="true"],[role="dialog"]')) return;
    if (event.key === 'Home' || event.key === 'End') { scroll.cancel(); reset(); return; }
    const deltaY = { ArrowDown: 60, ArrowUp: -60, PageDown: innerHeight * .85,
      PageUp: -innerHeight * .85, ' ': innerHeight * .85 * (event.shiftKey ? -1 : 1) }[event.key];
    if (deltaY) onInput({ event, deltaY });
  });
  return { reset };
}
