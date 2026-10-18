import { updateMediaMarkup } from '../assets/media-preservation.js';
import { detailURL, indexURL } from './navigation.js';
import { text } from './language.js';

// Project details reuse the shared catalog and preserve its media and resources.
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));
const safeURL = value => /^(?:https:\/\/|\/(?!\/))/.test(value || '') ? escape(value) : '';
const number = value => String(value + 1).padStart(2, '0');
const icon = '<span class="vi-icon" data-icon="arrow-up-right" aria-hidden="true"></span>';

function resourceMarkup(resource) {
 if (resource.kind === 'report-notice') return '<button type="button" data-report-notice>' + escape(resource.label) + icon + '</button>';
 const href = safeURL(resource.href);
 return href ? '<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + escape(resource.label) + icon + '</a>' : '';
}

function figure(frame, index) {
  const src = safeURL(frame.src);
  if (!src) return '';
  const dimensions = Number(frame.width) > 0 && Number(frame.height) > 0
    ? ` width="${Number(frame.width)}" height="${Number(frame.height)}"` : '';
  const content = '<button class="work-image-link" type="button" data-work-image="' + src + '" data-work-caption="' + escape(frame.label) + '" aria-label="' + text('Enlarge image: ', '放大图片：') + escape(frame.label) + '"><img src="' + src + '" alt="' + escape(frame.label) + '" data-monochrome="' + Boolean(frame.monochrome) + '" decoding="async" fetchpriority="high"' + dimensions + '></button>';
  return `<figure class="work-media">${content}<figcaption><span>${number(index)}</span><span>${escape(frame.label)}</span>${frame.duration ? `<span class="work-duration">${escape(frame.duration)}</span>` : ''}</figcaption></figure>`;
}

function factsMarkup(facts) {
  return facts.filter(([, value]) => value).map(([label, value]) => `<div class="work-fact"><dt>${escape(label)}</dt><dd>${escape(value).replaceAll('\n', '<br>')}</dd></div>`).join('');
}

function factColumns(facts) {
  return `<div class="work-facts"><dl class="work-facts-column">${factsMarkup(facts.filter((_, i) => i % 2 === 0))}</dl><dl class="work-facts-column">${factsMarkup(facts.filter((_, i) => i % 2 === 1))}</dl></div>`;
}

function descriptionMarkup(project) {
 return (Array.isArray(project.description)?project.description:[project.description]).map(paragraph=>'<p>'+escape(paragraph)+'</p>').join('');
}

let resizeObserver;
let layoutFrame;
let observedRoot;
function measureInformation() {
  const gallery = document.querySelector('#project-details .work-gallery');
  const panel = document.querySelector('#project-details .work-information');
  if (!gallery || !panel || !gallery.getClientRects().length || document.querySelector('#project-about')?.hidden) return;
  const layout = panel.closest('.work-layout');
  // Re-evaluate the fixed candidate at every size. Insufficient height keeps
  // two columns in document flow; CSS stacks only narrow widths.
  layout.removeAttribute('data-reading-flow');
  panel.style.removeProperty('--work-information-height');
  panel.style.removeProperty('--work-information-gap');
  if (getComputedStyle(panel).position !== 'fixed') {
    panel.style.removeProperty('--work-information-top');
    panel.style.removeProperty('--work-information-height');
    gallery.style.removeProperty('--work-footer-bottom');
    return;
  }
  // Layout coordinates exclude the route's animated translation. The right
  // column keeps the first image's original top while the gallery scrolls.
  let top = 0;
  for (let node = gallery; node; node = node.offsetParent) top += node.offsetTop;
  const value = `${top}px`;
  if (panel.style.getPropertyValue('--work-information-top') !== value) panel.style.setProperty('--work-information-top', value);
  // Align the edition information with the cover.
  // Links stay below the facts. Adjust only the gap above facts, keeping at
  // least one body line of separation. If it cannot fit, keep the prior layout.
  const media = gallery.querySelector('img, video');
  const mediaHeight = media?.getBoundingClientRect().height || 0;
  const available = Math.max(0, innerHeight - top - 24);
  let height = Math.min(mediaHeight, available);
  const facts = panel.querySelector('.work-facts');
  if (facts && mediaHeight) {
    const panelRect = panel.getBoundingClientRect();
    const factsBottom = facts.getBoundingClientRect().bottom - panelRect.top;
    const afterFacts = panelRect.height - factsBottom;
    const preferredGap = parseFloat(getComputedStyle(facts).paddingTop) || 0;
    const minimumGap = parseFloat(getComputedStyle(panel.querySelector('.work-description')).lineHeight) || 20;
    const requiredGap = preferredGap - Math.max(0, factsBottom - mediaHeight);
    const alignedHeight = mediaHeight + afterFacts;
    if (requiredGap >= minimumGap && alignedHeight <= available) {
      panel.style.setProperty('--work-information-gap', `${requiredGap}px`);
      height = alignedHeight;
    }
  }
  const heightValue = `${height}px`;
  if (panel.style.getPropertyValue('--work-information-height') !== heightValue) panel.style.setProperty('--work-information-height', heightValue);
  if (top + panel.offsetHeight > innerHeight - 23) {
    layout.setAttribute('data-reading-flow', '');
    panel.style.removeProperty('--work-information-top');
    panel.style.removeProperty('--work-information-height');
    panel.style.removeProperty('--work-information-gap');
    gallery.style.removeProperty('--work-footer-bottom');
    document.dispatchEvent(new Event('project:layout'));
    return;
  }
  // At the end of the left column, its navigation shares the fixed resource
  // row's baseline. Use layout height so the route reveal cannot shift it.
  const footerBottom = `${Math.max(24, innerHeight - top - panel.offsetHeight)}px`;
  if (gallery.style.getPropertyValue('--work-footer-bottom') !== footerBottom) gallery.style.setProperty('--work-footer-bottom', footerBottom);
  document.dispatchEvent(new Event('project:layout'));
}
function scheduleLayout() {
  if (layoutFrame) return;
  layoutFrame = requestAnimationFrame(() => {
    layoutFrame = 0;
    measureInformation();
  });
}
addEventListener('resize', scheduleLayout);
document.fonts.ready.then(scheduleLayout);

let viewer;
let zoomOrigin;
function ensureViewer(root) {
  if (!viewer) {
    viewer = document.createElement('dialog');
    viewer.className = 'work-zoom';
    viewer.setAttribute('aria-label', 'Project image');
    viewer.innerHTML = '<button class="work-zoom-close vi-icon-control" type="button" aria-label="Close image"><span class="vi-icon" data-icon="close" aria-hidden="true"></span></button><img class="work-zoom-image" alt=""><p class="work-zoom-caption"></p>';
    document.body.append(viewer);
    viewer.querySelector('button').addEventListener('click', () => viewer.close());
    viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
    viewer.addEventListener('close', () => {
      document.documentElement.classList.remove('work-zoom-open');
      if (zoomOrigin?.isConnected) zoomOrigin.focus({ preventScroll: true });
    });
    addEventListener('popstate', () => { if (viewer.open) viewer.close(); });
    // Keep the page's Escape-to-project handler out of this modal interaction.
    document.addEventListener('keydown', event => {
      if (!viewer.open || event.key !== 'Escape') return;
      event.stopImmediatePropagation();
      event.preventDefault(); viewer.close();
    }, true);
  }
  viewer.setAttribute('aria-label', text('Project image', '项目图片'));
  viewer.querySelector('button').setAttribute('aria-label', text('Close image', '关闭图片'));
  if (viewer.open) {
    const current = [...root.querySelectorAll('[data-work-image]')].find(button => button.dataset.workImage === zoomOrigin?.dataset.workImage);
    if (current) {
      zoomOrigin = current;
      const image = viewer.querySelector('img');
      if (image.getAttribute('src') !== current.dataset.workImage) image.src = current.dataset.workImage;
      viewer.querySelector('img').alt = current.dataset.workCaption;
      viewer.querySelector('.work-zoom-caption').textContent = current.dataset.workCaption;
    }
  }
  if (observedRoot === root) return;
  observedRoot = root;
  root.addEventListener('click', event => {
    const button = event.target.closest('[data-work-image]');
    if (!button) return;
    event.preventDefault();
    zoomOrigin = button;
    root.querySelectorAll('video').forEach(video => video.pause());
    const image = viewer.querySelector('img');
    image.src = button.dataset.workImage;
    image.alt = button.dataset.workCaption;
    viewer.querySelector('.work-zoom-caption').textContent = button.dataset.workCaption;
    document.documentElement.classList.add('work-zoom-open');
    viewer.showModal();
  });
}

export function renderProjectDetail({ project, index = 0, projects = [], preserveMedia = false }) {
  const root = document.querySelector('#project-details');
  const summary = project.summary;
  const category = project.category;
  const frames = [project.cover].map(src => ({
    ...(project.media[src] || {}), src, label: project.media[src]?.note || project.title,
    monochrome: ['tuneshape','aievent-web','reprise','mac-setup'].includes(project.id),
  }));
  const facts = project.facts || [];
  const next = projects.length > 1 ? projects[(index + 1) % projects.length] : null;
  updateMediaMarkup(root, `<div class="work-layout">
    <div class="work-left">
      <header class="work-heading"><h1 id="detail-title" tabindex="-1">${escape(project.title)}</h1>${summary ? `<p class="work-summary">${escape(summary)}</p>` : ''}<div class="work-kicker"><span>${escape(category)}</span>${project.year ? `<span>${escape(project.year)}</span>` : ''}</div></header>
      <div class="work-gallery" aria-label="${text('Project cover', '项目封面')}">${frames.map((frame, mediaIndex) => `${figure(frame, mediaIndex)}`).join('')}
        <nav class="work-next" aria-label="${text('More projects', '更多项目')}"><a href="${indexURL(project.id)}" data-surface="project">${text('All work', '全部作品')}</a>${next ? `<a href="${detailURL(next.id)}" data-next-project>${text('Next project', '下一个项目')} — ${escape(next.title)}</a>` : ''}</nav>
      </div>
    </div>
    <aside class="work-information" aria-label="${text('About this project', '关于这个项目')}"><div class="work-description">${descriptionMarkup(project)}</div>${factColumns(facts)}<nav class="work-resources" aria-label="${text('Project resources', '项目资料')}">${(project.resources || []).map(resourceMarkup).join('')}</nav></aside>
  </div>`, preserveMedia);
  ensureViewer(root);
  resizeObserver?.disconnect();
  resizeObserver = new ResizeObserver(scheduleLayout);
  resizeObserver.observe(root.querySelector('.work-heading'));
  resizeObserver.observe(root.querySelector('.work-information'));
  const firstMedia = root.querySelector('.work-gallery img, .work-gallery video');
  if (firstMedia) resizeObserver.observe(firstMedia);
  measureInformation();
  scheduleLayout();
}
