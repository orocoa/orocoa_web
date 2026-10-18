// Adapted from Viscose-carousel ring/meta.js (MIT). See ../../../SOURCE.md.
import gsap from "../../gsap/index.js";

/**
 * The two lockups of type either side of the ring: [number . name] on the
 * left, [type . year] on the right. Both read whatever card is facing front.
 *
 * Changing card melts one set of words into the next. Two copies are stacked,
 * one blurred out as the other blurs in, and the pair run through an alpha
 * threshold that forces every pixel above a cut solid and drops the rest. Two
 * soft edges drifting past each other cross that cut as one shape, which is
 * what makes the words run together and pull apart instead of crossfading.
 * None of it is per-glyph.
 *
 * A word that is not actually changing — the same year twice running — is
 * held instead of melted. Holding it in place is not enough on its own: the
 * threshold has to span both layers for them to fuse, so anything inside it
 * gets thresholded whether it moves or not and a held word visibly thickens.
 * So each group carries a third row outside the filtered subtree and paints
 * carried-over words from there.
 *
 * All three rows always hold both words, painted or not. The row is what
 * positions the other word, and a missing one would move it.
 */

const SLOTS = 2;

const slotsOf = (row) => row?.firstElementChild?.children;

// One word's share of a morph. f = 1 present, 0 gone. Opacity falls away far
// slower than the blur climbs, so the word still carries alpha well into its
// smear — without that there is nothing for the threshold to weld the other
// one to. Applied per word, not per row, so a held word can be left alone.
function fade(el, f, blur) {
  if (!el) return;
  if (f >= 1) {
    el.style.filter = "none";
    el.style.opacity = "1";
  } else if (f <= 0) {
    // Cleared as well as hidden, so a spent word is not left holding a 100px
    // blur the compositor has to keep around.
    el.style.filter = "none";
    el.style.opacity = "0";
  } else {
    el.style.filter = `blur(${Math.min(blur / f - blur, 100)}px)`;
    el.style.opacity = `${Math.pow(f, 0.4)}`;
  }
}

function createGroup(side, groups, params) {
  const m = { t: 1 };
  // What is on screen, and which of it the morph in flight is moving. Both
  // rows are rewritten on every change rather than trading places: a word can
  // move between the filtered rows and the steady one from change to change,
  // and alternating would leave whichever row it left holding something stale.
  let prev = ["", ""];
  let moving = [false, false];

  const draw = () => {
    const g = groups[side];
    if (!g) return;
    const out = slotsOf(g.layers[0]);
    const into = slotsOf(g.layers[1]);
    const held = slotsOf(g.plain);
    const t = m.t;

    for (let j = 0; j < SLOTS; j++) {
      if (moving[j]) {
        fade(out?.[j], 1 - t, params.nameBlur);
        fade(into?.[j], t, params.nameBlur);
        if (held?.[j]) held[j].style.opacity = "0";
      } else {
        if (out?.[j]) out[j].style.opacity = "0";
        if (into?.[j]) into[j].style.opacity = "0";
        if (held?.[j]) held[j].style.opacity = "1";
      }
    }

    // Only worth its cost while two words are in play. At rest the threshold
    // hardens glyph edges, and at this size that is the difference between
    // type that is set and type that is stamped.
    if (g.goo) {
      g.goo.style.filter =
        t >= 1 ? "none" : `url(#name-goo) blur(${params.nameSoften}px)`;
    }
  };

  // parts[0] is the leading slot, parts[1] the trailing one. Which of those is
  // the big half depends on the side and is decided in style() below.
  const set = (parts, immediate = false) => {
    const g = groups[side];
    if (!g?.layers[0] || !g.layers[1] || !g.plain) return;
    gsap.killTweensOf(m);

    // A change landing mid-morph finishes the one in flight first, so the next
    // pair has something settled to melt out of. Also what makes the
    // comparison below honest: it is against what is actually on screen.
    m.t = 1;
    draw();

    const next = [parts[0] ?? "", parts[1] ?? ""];
    moving = [next[0] !== prev[0], next[1] !== prev[1]];

    const out = slotsOf(g.layers[0]);
    const into = slotsOf(g.layers[1]);
    const held = slotsOf(g.plain);
    for (let j = 0; j < SLOTS; j++) {
      if (out?.[j]) out[j].textContent = prev[j];
      if (into?.[j]) into[j].textContent = next[j];
      if (held?.[j]) held[j].textContent = next[j];
    }
    prev = next;

    // Card changed but this group did not. Nothing to melt, and no reason to
    // switch the threshold on.
    if (immediate || (!moving[0] && !moving[1])) {
      m.t = 1;
      draw();
      return;
    }

    m.t = 0;
    draw();
    gsap.to(m, {
      t: 1,
      duration: params.nameMorphTime,
      ease: params.nameEase,
      onUpdate: draw,
    });
  };

  return { m, set };
}

/** Site adapter: title on the left, category/year below it.
 * Layout belongs to project.css; fade, threshold and tween are upstream.
 */
export function createMeta({ groups, cut }, params) {
  const number = createGroup("number", groups, params);
  const left = createGroup("left", groups, params);
  const right = createGroup("right", groups, params);
  cut?.setAttribute("values", `1 0 0 0 0
    0 1 0 0 0
    0 0 1 0 0
    0 0 0 ${params.nameEdge} ${-params.nameEdge * params.nameCut}`);
  let current;
  const show = (project, immediate = false, index = "") => {
    current = { project, index };
    number.set([index, ""], immediate);
    left.set([project.title, ""], immediate);
    right.set([project.category, project.year], immediate);
  };
  return {
    show,
    finish: () => { if (current) show(current.project, true, current.index); },
    getState: () => ({ number: number.m.t, title: left.m.t, context: right.m.t }),
    dispose() { gsap.killTweensOf(number.m); gsap.killTweensOf(left.m); gsap.killTweensOf(right.m); },
  };
}
