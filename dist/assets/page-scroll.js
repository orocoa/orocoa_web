import { createScroll } from './catalog/smooth-scroll.js';

// One driver owns wheel inertia, anchor navigation and restored positions.
// Lenis and the native scroll event can report the same position. Deliver it
// once, synchronously, so the camera and live chapters paint in the same frame.
let lastPosition;
// Preview URLs carry a version prefix. Diagnostics or another entry module can
// also import the canonical URL: ES modules then treat the same file as two
// modules. Keep one driver per document so two Lenis loops cannot alternately
// move the scroll position and make the device camera jump between them.
const driverKey = Symbol.for('kai-nex.pageScroll');
export const pageScroll = window[driverKey] ??= createScroll(() => {
  if (scrollY === lastPosition) return;
  lastPosition = scrollY;
  dispatchEvent(new Event('journey:scroll'));
}, { syncTouch: true });
