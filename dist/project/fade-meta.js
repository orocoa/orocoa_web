// A single real text layer on phones: no duplicate raster layers or SVG blur.
export function createFadeMeta({ groups }) {
  const animations = new Map();
  const finish = () => { animations.forEach(animation => animation.cancel()); animations.clear(); };
  Object.values(groups).forEach(group => {
    group.goo.hidden = true;
    [...group.plain.firstElementChild.children].forEach(slot => { slot.style.opacity = '1'; });
  });
  return {
    show(project, immediate = false, index = '') {
      finish();
      const values = { number: [index, ''], left: [project.title, ''], right: [project.category, project.year] };
      for (const [side, group] of Object.entries(groups)) {
        [...group.plain.firstElementChild.children].forEach((slot, i) => {
          const next = String(values[side][i] ?? '');
          if (slot.textContent === next) return;
          slot.textContent = next;
          if (immediate) return;
          const animation = slot.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 280, easing: 'ease-out' });
          animations.set(slot, animation);
          animation.finished.catch(() => {}).finally(() => { if (animations.get(slot) === animation) animations.delete(slot); });
        });
      }
    },
    finish,
    getState: () => ({ effect: 'fade', running: animations.size }),
    dispose() { finish(); Object.values(groups).forEach(group => { group.goo.hidden = false; }); },
  };
}
