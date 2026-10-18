import { onLanguageChange, text } from '../assets/language.js';

// Both languages and the device projection share one live DOM.
const fields = document.querySelector('#fields');
const links = [...fields.querySelectorAll('.field,.all-work')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let active = null;
const englishCopy = [...fields.querySelectorAll('.field')].map(field => ({
  title: field.querySelector('.field-title').textContent,
  lines: [...field.querySelectorAll('.field-copy-line')].map(line => line.textContent),
}));
const chineseCopy = [
  {
    "title": "TuneShape",
    "lines": [
      "体验、调节并导出 UI 动效。"
    ]
  },
  {
    "title": "?",
    "lines": [
      "查看项目演示与页面交互。"
    ]
  },
  {
    "title": "倒带",
    "lines": [
      "查看与管理 Git 版本。"
    ]
  },
  {
    "title": "Mac设置推荐",
    "lines": [
      "中英双语 Mac 设置指南。"
    ]
  }
];

// Reuse the original title's staggered glyphs for every text element while
// preserving authored copy lines and natural word wraps.
function prepareText(element) {
  const lines = [...element.querySelectorAll('.field-copy-line')];
  const labels = lines.length ? lines.map(line => line.textContent.trim()) : [element.textContent.trim()];
  element.setAttribute('aria-label', labels.join(' '));
  const visual = document.createElement('span');
  visual.setAttribute('aria-hidden', 'true');
  let characterIndex = 0;
  labels.forEach((label, lineIndex) => {
    const line = lines.length ? document.createElement('span') : visual;
    if (lines.length) line.className = 'field-copy-line';
    if (lineIndex) characterIndex++;
    // Chinese can wrap between characters; Latin words keep their word masks.
    for (const part of label.split(/(\s+|[（「“《【]?[\u3400-\u9fff][，。、；：？！）」”》】]*)/u).filter(Boolean)) {
      if (/^\s+$/.test(part)) {
        line.append(document.createTextNode(part));
        characterIndex += part.length;
        continue;
      }
      const word = document.createElement('span');
      word.className = 'work-word';
      for (const character of part) {
        const glyph = document.createElement('span');
        glyph.className = 'work-glyph';
        glyph.style.setProperty('--char', characterIndex++);
        for (const layer of ['base', 'accent']) {
          const letter = document.createElement('span');
          letter.className = `work-letter work-letter-${layer}`;
          letter.textContent = character;
          glyph.append(letter);
        }
        word.append(glyph);
      }
      line.append(word);
    }
    if (lines.length) visual.append(line);
  });
  element.replaceChildren(visual);
  return characterIndex;
}

// Images and the arrow use that same motion primitive as a single visual unit.
// Both image layers keep exactly the same source and crop.
function prepareReel(element) {
  const base = document.createElement('span');
  base.className = 'work-letter work-letter-base';
  base.append(...element.childNodes);
  const accent = base.cloneNode(true);
  accent.className = 'work-letter work-letter-accent';
  accent.setAttribute('aria-hidden', 'true');
  element.classList.add('work-reel');
  element.replaceChildren(base, accent);
}
fields.querySelectorAll('.field-number').forEach(number => {
  number.dataset.number = number.textContent.trim();
});
const timing = getComputedStyle(fields);
const duration = parseFloat(timing.getPropertyValue('--work-duration'));
const stagger = parseFloat(timing.getPropertyValue('--work-stagger'));
fields.querySelectorAll('.field-number').forEach(prepareText);
fields.querySelectorAll('.field-image').forEach(prepareReel);
// The label needs the same local line mask as the existing word/glyph layers.
const selectedLabel = fields.querySelector('.selected-work-label');
const selectedLabelInner = document.createElement('span');
selectedLabelInner.className = 'work-label-inner';
selectedLabelInner.append(...selectedLabel.childNodes);
selectedLabel.append(selectedLabelInner);
const icon = fields.querySelector('.all-work > .vi-icon');
const arrow = document.createElement('span');
arrow.className = 'work-arrow';
arrow.setAttribute('aria-hidden', 'true');
icon.replaceWith(arrow);
arrow.append(icon);
prepareReel(arrow);

function setLines(element, lines) {
  element.replaceChildren(...lines.map(copy => {
    const line = document.createElement('span');
    line.className = 'field-copy-line';
    line.textContent = copy;
    return line;
  }));
}
onLanguageChange(language => {
  resetFieldPreviews();
  fields.lang = language === 'zh' ? 'zh-CN' : 'en';
  const prompt = fields.querySelector('#fields-title');
  const promptLines = language === 'zh' ? ['形式，', '从问题中生长。'] : ['Form follows', 'the question.'];
  prompt.setAttribute('aria-label', promptLines.join(language === 'zh' ? '' : ' '));
  prompt.replaceChildren(...promptLines.map(copy => {
    const line = document.createElement('span');
    line.className = 'fields-prompt-line';
    line.setAttribute('aria-hidden', 'true');
    for (const character of copy) {
      const mask = document.createElement('span');
      mask.className = 'fields-prompt-mask';
      const glyph = document.createElement('span');
      glyph.className = 'fields-prompt-char';
      glyph.textContent = character === ' ' ? '\u00a0' : character;
      mask.append(glyph); line.append(mask);
    }
    return line;
  }));
  selectedLabelInner.textContent = text('Selected work', '精选作品');
  fields.querySelector('.field-grid').setAttribute('aria-label', text('Selected work', '精选作品'));
  fields.querySelectorAll('.field').forEach((field, index) => {
    const copy = (language === 'zh' ? chineseCopy : englishCopy)[index];
    const title = field.querySelector('.field-title');
    const description = field.querySelector('.field-description');
    title.textContent = copy.title;
    setLines(description, copy.lines);
    const titleLength = prepareText(title), copyLength = prepareText(description);
    description.style.setProperty('--work-tempo', Math.min(1,
      (duration + Math.max(0, titleLength - 1) * stagger) / (duration + Math.max(0, copyLength - 1) * stagger)));
    field.setAttribute('aria-label', text(`${copy.title} — View project`, `${copy.title} — 查看项目`));
  });
  const label = fields.querySelector('.all-work-label');
  label.textContent = text('All work', '全部作品');
  fields.querySelector('.all-work').setAttribute('aria-label', label.textContent);
  arrow.style.setProperty('--char', prepareText(label));
});

function activate(link) {
  if (fields.inert || document.querySelector('main').inert) return;
  if (active && active !== link) active.classList.remove('is-active');
  active = link;
  link.classList.add('is-active');
}
function deactivate(link) {
  link.classList.remove('is-active');
  if (active === link) active = null;
}
for (const link of links) {
  link.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'touch') activate(link);
  });
  link.addEventListener('pointerleave', event => {
    if (event.pointerType !== 'touch' && !link.matches(':focus-visible')) deactivate(link);
  });
  link.addEventListener('focus', () => {
    if (link.matches(':focus-visible')) activate(link);
  });
  link.addEventListener('blur', () => {
    if (!link.matches(':hover')) deactivate(link);
  });
}
export function resetFieldPreviews() {
  if (active) deactivate(active);
}
export function revealFields() { fields.classList.add('is-revealed'); }
fields.addEventListener('keydown', event => {
  if (event.key === 'Escape') resetFieldPreviews();
});
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('#fields a')) resetFieldPreviews();
}, { passive: true });
reduced.addEventListener('change', () => { if (reduced.matches) revealFields(); });
