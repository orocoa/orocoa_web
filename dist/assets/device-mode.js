// Classify the available display, not the user agent: an unfolded, near-square
// foldable and a tablet retain the desktop experience. Re-evaluate on rotation.
export const phone = matchMedia('(max-width: 700px) and (max-aspect-ratio: 3/4), (max-height: 500px) and (min-aspect-ratio: 4/3) and (pointer: coarse)');
const sync = () => { document.documentElement.dataset.device = phone.matches ? 'phone' : 'desktop'; };
phone.addEventListener('change', sync);
sync();
