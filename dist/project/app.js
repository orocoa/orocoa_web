import { routePath, siteURL, normalizeProjectId } from '../assets/site.js';
import { renderProjectDetail } from './detail.js';
import './copy.js';
import { loadProjects, groups } from './data.js';
import { detailURL, indexURL, saveVisit, initialVisit, traverseOrigin, sanitizeVisit } from './navigation.js';
import { text, getLanguage, onLanguageChange } from './language.js';
import { createDocumentPreview } from './report-notice.js';
import { phone } from '../assets/device-mode.js';
import { createFadeMeta } from './fade-meta.js';
import { createCaptionLayout } from './caption-layout.js';
import { createReadingNavigation } from './reading-nav.js';
import { defaultParams } from './vendor/viscose/ring/params.js';
import { leavePage } from '../vi/page-motion.js';

const $ = selector => document.querySelector(selector);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
// Fetch alongside metadata/data preparation; direct details keep a light entry.
const overviewModule = routePath(location)?.startsWith('project/about') ? null : import('./carousel.js').catch(() => null);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = value => String(value + 1).padStart(2,'0');
const mod = (value,count) => ((value % count) + count) % count;
let projects = [], active = 0, scene, mode = 'project', busy = false, queuedRoute = false, fallback = false;
let detailScroll = new Map(), trigger, visit, scenePromise, queuedAction, skipIntro = false;
let sceneReady = false;
const homeOrigin = () => visit?.fields || { type: 'fields', href: siteURL('#fields') };
const animations = new Set();
const readingNavigation = createReadingNavigation({ navigation: $('.project-navigation'), phone, getView: () => mode });
function setEntering(entering) {
  const reveal = document.body.dataset.entering === 'true' && !entering &&
    document.body.dataset.ready && mode === 'project' && !busy && !reduced.matches;
  document.body.dataset.entering = String(entering);
  if (!reveal) return;
  // Upstream reveals its project list during the ring spread. The site's
  // caption and navigation follow only once that same entry has landed.
  readingNavigation.routeTarget({ duration: 1000 });
  const start = document.timeline.currentTime;
  for (const element of document.querySelectorAll('.project-header,#project-overview > .project-caption,.project-controls,#project-menu-toggle')) {
    const animation = element.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 1000, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'both',
    });
    animation.startTime = start;
    animations.add(animation);
    animation.finished.catch(() => {}).finally(() => {
      animation.cancel(); animations.delete(animation);
    });
  }
}
const metaElements = {
  groups: Object.fromEntries(['number', 'left', 'right'].map(side => {
    const box = $(`[data-meta="${side}"]`);
    const goo = box.querySelector(':scope > .project-meta-goo');
    return [side, { box, goo,
      layers: [...goo.children], plain: box.querySelector(':scope > .project-meta-plain') }];
  })),
  cut: $('#name-goo feColorMatrix'),
};
let desktopMeta;
async function makeMetadata(overview = true) {
  if (phone.matches || !overview) return createFadeMeta(metaElements);
  desktopMeta ??= await import('./vendor/viscose/ring/meta.js');
  return desktopMeta.createMeta(metaElements, defaultParams(0));
}
let metadataStyle = phone.matches || routePath(location)?.startsWith('project/about') ? 'fade' : 'desktop';
let metadata = await makeMetadata(metadataStyle === 'desktop');
const captionLayout = createCaptionLayout($('.project-caption'), $('#project-overview'), $('.project-controls'), phone);
// The caption includes title, category and year. Reserve its full height below
// the mobile canvas, including wrapping and font/language changes.
const captionSize = new ResizeObserver(entries => {
  let resized = false;
  for (const entry of entries) {
    if (entry.contentRect.height <= 0) continue;
    captionLayout.update(projects[active]);
    resized = true;
  }
  if (resized && phone.matches && !$('#project-overview').hidden) scene?.refresh();
});
captionSize.observe($('.project-caption'));
const pauseVideos = () => $('#project-details').querySelectorAll('video').forEach(video => video.pause());
const reportNotice = createDocumentPreview({onOpen:pauseVideos});
const readers = {code:reportNotice,design:reportNotice,practice:reportNotice};
function setActive(index, write = false) {
  active = mod(index,projects.length);
  const p = projects[active];
  $('#project-count').textContent = `${pad(active)} / ${String(projects.length).padStart(2,'0')}`;
  metadata.show(p, reduced.matches || busy || mode !== 'project' || !document.body.dataset.ready, pad(active));
  captionLayout.update(p);
  if (write) $('#project-status').textContent = `${p.title}. ${p.category}. ${p.year}`;
  for (const link of document.querySelectorAll('.project-fallback,[data-surface="about"]')) link.href = detailURL(p.id);
  $('[data-surface="project"]').href = indexURL(p.id);
  if (fallback) {
    const image = $('.project-fallback img');
    image.src = p.overviewCover; image.style.objectFit = p.carouselFit;
    image.dataset.monochrome = String(p.overviewMonochrome);
  }
  for (const button of document.querySelectorAll('.project-choice')) button.setAttribute('aria-current', String(Number(button.dataset.select) === active));
  updateBack();
  if (write && mode === 'project' && !busy) {
    visit = { ...visit, project: p.id, view: mode, listScroll: $('#project-list').scrollTop };
    saveVisit(visit, indexURL(p.id));
  }
}
function select(index) {
  if (busy || mode !== 'project') return;
  skipIntro = true;
  if (scene) scene.select(index); else setActive(index,true);
}
function step(direction) { skipIntro = true; if (scene) scene.step(direction); else setActive(active+direction,true); }
function renderDetail(p, preserveMedia = false) {
  renderProjectDetail({ project: p, index: active, projects, preserveMedia });
  readers[p.group]?.refreshLanguage(p.title);
}

function visibleParts() {
  const selectors = mode==='project'?'.project-stage,.project-caption,.project-list,.project-controls':'.work-heading,.work-gallery > *,.work-information';
  return [...document.querySelectorAll(selectors)].filter(element=>{const r=element.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight;});
}
async function animateParts(leaving, { includeHeader = false, duration = 750 } = {}) {
  if (!leaving) {
    document.body.dataset.navView = mode;
    readingNavigation.routeTarget({ duration });
  }
  if (reduced.matches) { delete document.body.dataset.switching; return; }
  // Ordinary fades use the midpoint speed. The first overview exit explicitly
  // keeps its one-second clock and header fade before selection changes.
  const parts = [...visibleParts(), ...(includeHeader ? [$('.project-header')] : [])];
  const group = parts.map(element => {
    const animation = element.animate(leaving ? [{opacity:1},{opacity:0}] : [{opacity:0},{opacity:1}], {
      duration, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both',
    });
    animations.add(animation);
    return animation;
  });
  const start = document.timeline.currentTime;
  group.forEach(animation => { animation.startTime = start; });
  delete document.body.dataset.switching;
  await Promise.all(group.map(animation => animation.finished.catch(() => {})));
  group.forEach(animation => { animation.cancel(); animations.delete(animation); });
}
function updateBack() {
  const origin = mode === 'about' ? visit?.entry : homeOrigin();
  const toFields = mode === 'project' || origin?.type === 'fields';
  const back = $('.project-home');
  back.href = toFields ? siteURL('#fields') : indexURL(projects[active].id);
  back.setAttribute('aria-label', toFields ? text('Back to selected work', '返回精选作品') : text('Back to Project', '返回作品总览'));
}
function saveOverview() {
  visit = { ...visit, view: 'project', project: projects[active].id,
    listScroll: $('#project-list').scrollTop, listX: $('#project-list').scrollLeft };
  saveVisit(visit, indexURL(projects[active].id));
}
function projectOrigin() {
  saveOverview();
  return { type: 'project', href: indexURL(projects[active].id),
    key: window.navigation?.currentEntry?.key, project: projects[active].id,
    listScroll: visit.listScroll, listX: visit.listX };
}
function updateTitle() {
  document.title = mode === 'about' ? `${projects[active].title} — ${text('About','关于')} — orocoaweb` : text('All work — orocoaweb','全部项目 — orocoaweb');
  const canonical=document.querySelector('link[rel="canonical"]');
  if(canonical)canonical.href=canonical.dataset.siteRoot+(mode==='about'?'project/about/?project='+projects[active].id:'project/');
  const robots=document.querySelector('meta[name="robots"]');
  if(robots)robots.content=mode==='about'?'noindex, follow':'index, follow, max-image-preview:large';
  const description=mode==='about'?projects[active].summary:text('Explore the 19-cover orocoaweb project gallery, starting with TuneShape, ? / Shift, Reprise and Mac Setup. View demo details and public GitHub repositories.','浏览 orocoaweb 的 19 个项目封面、演示详情和公开 GitHub 项目。');
  for(const selector of ['meta[name="description"]','meta[property="og:description"]','meta[name="twitter:description"]']){const tag=document.querySelector(selector);if(tag)tag.content=description;}
  for(const selector of ['meta[property="og:title"]','meta[name="twitter:title"]']){const tag=document.querySelector(selector);if(tag)tag.content=document.title;}
  const socialURL=document.querySelector('meta[property="og:url"]');if(socialURL&&canonical)socialURL.content=canonical.href;
}
function commit(next, index) {
  if (mode === 'about') { detailScroll.set(projects[active].id, scrollY); pauseVideos(); }
  setMenu(false);
  mode = next;
  setActive(index);
  if (next === 'about') renderDetail(projects[active]);
  document.body.dataset.view = next;
  $('#project-overview').hidden = next !== 'project';
  $('#project-about').hidden = next !== 'about';
  document.querySelectorAll('.project-tab').forEach(link =>
    link.dataset.surface === next ? link.setAttribute('aria-current', 'page') : link.removeAttribute('aria-current'));
  updateTitle();
  window.scrollTo({ top: next === 'about' ? (detailScroll.get(projects[active].id) || 0) : 0, behavior: 'instant' });
  if (next === 'project') {
    $('#project-list').scrollTop = visit.listScroll || 0;
    $('#project-list').scrollLeft = visit.listX || 0;
    scene?.select(active, true);
  }
  scene?.pause(next !== 'project' || document.hidden);
}
async function navigate(next, index = active, { push = true, initial = false, restore = null } = {}) {
  if (busy) { if (!push) queuedRoute = true; else queuedAction = () => navigate(next, index, { push }); return; }
  if (!initial && mode === next && index === active) return;
  busy = true;
  readingNavigation.beginRoute();
  // A navigation during the final reveal owns the opacity from this point.
  animations.forEach(animation => animation.cancel());
  animations.clear();
  metadata.finish();
  document.body.setAttribute('aria-busy', 'true');
  scene?.finishIntro();
  // A direct detail has no renderer yet. Its first explicit Project visit
  // gets the same loading/seed/ring entry as All work; history restores skip it.
  const playIntro = next === 'project' && !scenePromise && !fallback &&
    !reduced.matches && (initial ? !skipIntro : push);
  try {
    if (push) {
      const entry = next === 'about' ? (mode === 'project' ? projectOrigin() : visit.entry) : null;
      visit = { ...visit, view: next, project: projects[index].id, entry };
      saveVisit(visit, next === 'about' ? detailURL(projects[index].id) : indexURL(projects[index].id), true);
    } else if (restore) {
      visit = restore;
    }
    if (!initial) await animateParts(true, { includeHeader: playIntro, duration: playIntro ? 1000 : 750 });
    if (!initial) document.body.dataset.switching = 'true';
    if (playIntro) setEntering(true);
    commit(next, index);
    if (initial) {
      document.body.dataset.navView = next;
      readingNavigation.routeTarget();
    }
    if (next === 'project') {
      await refreshMetadata();
      if (playIntro) {
        document.body.dataset.navView = next;
        readingNavigation.routeTarget({ defer: !initial });
        delete document.body.dataset.switching;
      }
      await ensureScene({ intro: playIntro });
    }
    if (!initial && (!playIntro || fallback)) await animateParts(false);
    scene?.refresh();
    if (!initial && next === 'about') $('#detail-title')?.focus({ preventScroll: true });
    if (!initial && next === 'project') {
      const choice = document.querySelector(`.project-choice[data-select="${active}"]`);
      (trigger?.isConnected && !trigger.closest('[hidden]') ? trigger : (phone.matches ? $('#project-menu-toggle') : choice) || $('[data-surface="about"]'))?.focus({ preventScroll: true });
    }
  } finally {
    busy = false;
    readingNavigation.endRoute();
    document.body.removeAttribute('aria-busy');
    if (queuedRoute) { queuedRoute = false; queuedAction = null; route(); }
    else if (queuedAction) { const action = queuedAction; queuedAction = null; action(); }
  }
}
function route(initial = false) {
  if (busy) { queuedRoute = true; return; }
  const rawId = new URLSearchParams(location.search).get('project');
  const id = normalizeProjectId(rawId) || rawId;
  const index = projects.findIndex(p => p.id === id);
  if (id && index < 0) $('#project-status').textContent = text('Project not found. Showing the first project.', '未找到该项目，显示首个作品。');
  const next = routePath(location)?.startsWith('project/about') ? 'about' : 'project';
  const restored = sanitizeVisit(history.state?.projectVisit || { project: projects[Math.max(0, index)].id, view: next, fields: null, entry: null });
  navigate(next, Math.max(0, index), { push: false, initial, restore: restored });
}
function returnToOrigin() {
  if (!projects.length) { location.assign(routePath(location)?.startsWith('project/about') ? siteURL('project/') : siteURL('#fields')); return; }
  if (busy) { queuedAction = returnToOrigin; return; }
  const origin = mode === 'about' ? visit.entry : homeOrigin();
  if (mode === 'project' || origin?.type === 'fields') {
    if (mode === 'project') saveOverview();
    leavePage(() => { if (!traverseOrigin(origin)) location.assign(siteURL('#fields')); });
  } else {
    if (!traverseOrigin(origin)) navigate('project');
  }
}
function useFallback(error) {
  const failed = scene; scene = null; failed?.destroy(); fallback = true; sceneReady = true;
  $('#project-canvas').hidden = true;
  $('.project-fallback').hidden = false;
  const image = $('.project-fallback img');
  image.src = projects[active].overviewCover; image.style.objectFit = projects[active].carouselFit;
  image.dataset.monochrome = String(projects[active].overviewMonochrome);
  document.body.dataset.renderer = 'fallback';
  setEntering(false);
  $('#project-status').textContent = text('Use the project index or arrow controls to explore.', '可使用作品索引或箭头按钮浏览。');
  if (error) console.warn('[Project] Static gallery enabled:', error.message);
}
function ensureScene({ intro = false } = {}) {
  if (scenePromise || fallback) return scenePromise;
  document.body.dataset.renderer = 'loading';
  // A full-size placeholder here flashed before the upstream seed appeared.
  $('.project-fallback').hidden = true;
  scenePromise = (async () => {
    try {
      const { createCarousel } = await overviewModule || await import('./carousel.js');
      // Create only when the overview is laid out. A direct detail does not
      // download the ring or allocate a hidden renderer.
      const playIntro = intro && mode === 'project' && !reduced.matches;
      scene = await createCarousel({ canvas: $('#project-canvas'), works: projects, reduced,
        playIntro, initialIndex: active,
        onChange: index => { if (mode === 'project') setActive(index, true); },
        onOpen: index => navigate('about', index), onHover: () => {}, onFailure: () => useFallback(),
        onIntro: setEntering,
      });
      scene.select(active, true);
      if (!playIntro) scene.finishIntro();
      scene.pause(mode !== 'project' || document.hidden);
      if (!playIntro) await scene.ready;
      document.body.dataset.renderer = 'webgl';
      $('.project-fallback').hidden = true;
      sceneReady = true;
    } catch (error) { useFallback(error); }
  })();
  return scenePromise;
}
function setMenu(open, restoreFocus = false) {
  const toggle = $('#project-menu-toggle');
  const expanded = phone.matches && open && mode === 'project';
  document.body.toggleAttribute('data-project-menu', expanded);
  toggle.setAttribute('aria-expanded', String(expanded));
  $('#project-list').inert = phone.matches && !expanded;
  if (expanded) {
    const current = $('#project-list .project-choice[aria-current="true"]');
    current?.scrollIntoView({ block: 'nearest' });
  }
  if (restoreFocus) toggle.focus({ preventScroll: true });
}
$('#project-menu-toggle').addEventListener('click', () => setMenu(!document.body.hasAttribute('data-project-menu')));
$('#project-menu-dismiss').addEventListener('click', () => setMenu(false, true));
let modeRevision = 0;
async function refreshMetadata() {
  const style = phone.matches || mode !== 'project' ? 'fade' : 'desktop';
  const revision = ++modeRevision;
  if (style === metadataStyle) return;
  if (style === 'desktop') desktopMeta ??= await import('./vendor/viscose/ring/meta.js');
  if (revision !== modeRevision) return;
  metadata.dispose();
  metadata = style === 'fade' ? createFadeMeta(metaElements) : desktopMeta.createMeta(metaElements, defaultParams(0));
  metadataStyle = style;
  if (projects.length) metadata.show(projects[active], true, pad(active));
}
phone.addEventListener('change', async () => {
  await refreshMetadata();
  setMenu(false);
  scene?.refresh();
});
function renderIndex() {
  $('#project-list').innerHTML = groups.map(group => `<div class="project-group" role="group" aria-label="${text(group.label, group.labelZh)}" data-group="${group.id}">${projects.flatMap((p, index) => p.group === group.id ? [`<button class="project-choice" type="button" data-select="${index}" data-project="${escape(p.id)}"><span>${pad(index)}</span><span>${escape(p.title)}</span></button>`] : []).join('')}</div>`).join('');
}
document.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (event.target.closest('.project-home')) { event.preventDefault(); returnToOrigin(); return; }
  const surface = event.target.closest('[data-surface],.project-fallback,[data-next-project]');
  if (surface) {
    event.preventDefault(); trigger = surface;
    const rawId = new URL(surface.href).searchParams.get('project');
    const id = normalizeProjectId(rawId) || rawId;
    const index = projects.findIndex(p => p.id === id);
    navigate(surface.dataset.surface === 'project' ? 'project' : 'about', index < 0 ? active : index);
    return;
  }
  const choice = event.target.closest('[data-select]');
  if (choice) { select(Number(choice.dataset.select)); setMenu(false, phone.matches); return; }
  const stepper = event.target.closest('[data-step]');
  if (stepper && !busy && mode === 'project') { step(Number(stepper.dataset.step)); return; }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.body.hasAttribute('data-project-menu')) { event.preventDefault(); setMenu(false, true); return; }
  if (busy || event.altKey || event.ctrlKey || event.metaKey || Object.values(readers).some(reader => reader.isOpen) || event.target.closest('input,textarea,select,[contenteditable=true]')) return;
  if (mode === 'about') { if (event.key === 'Escape') returnToOrigin(); return; }
  if (['ArrowDown','ArrowRight','ArrowUp','ArrowLeft','Home','End'].includes(event.key)) {
    event.preventDefault();
    if (event.key === 'Home') select(0);
    else if (event.key === 'End') select(projects.length - 1);
    else step(['ArrowDown','ArrowRight'].includes(event.key) ? 1 : -1);
  }
});
let fallbackWheel = 0, fallbackTouch;
$('.project-stage').addEventListener('wheel', event => {
  if (scene || mode !== 'project' || busy) return;
  event.preventDefault();
  if (performance.now() - fallbackWheel > 250) { step(Math.sign(event.deltaY)); fallbackWheel = performance.now(); }
}, { passive: false });
$('.project-fallback').addEventListener('touchstart', event => { fallbackTouch = event.touches[0]; }, { passive: true });
$('.project-fallback').addEventListener('touchend', event => {
  if (!fallbackTouch || scene) return;
  const delta = fallbackTouch.clientY - event.changedTouches[0].clientY;
  if (Math.abs(delta) > 35) { event.preventDefault(); step(Math.sign(delta)); }
  fallbackTouch = null;
});
addEventListener('popstate', () => route());
// Persist list position while this entry is active. Mutating browser history
// from pagehide aborts a pending traverseTo(), which then reloads the homepage
// through its fallback and flashes the just-restored second screen.
$('#project-list').addEventListener('scroll', () => {
  if (mode === 'project' && !busy && !document.body.inert) saveOverview();
}, { passive: true });
addEventListener('pagehide', () => { scene?.pause(true); pauseVideos(); });
addEventListener('pageshow', event => { if (event.persisted) { scene?.pause(mode !== 'project'); route(); } });
document.addEventListener('visibilitychange', () => { scene?.pause(document.hidden || mode !== 'project'); if (document.hidden) pauseVideos(); });
reduced.addEventListener('change', () => { animations.forEach(animation => animation.finish()); if (reduced.matches) { scene?.finishIntro(); metadata.finish(); } });
window.__projectPage = { getState: () => ({ ready: projects.length > 0, sceneReady, mode, active, project: projects[active]?.id, count: projects.length, busy, fallback, entry: visit?.entry, metadata: metadata.getState(), groups: groups.map(group => ({ id: group.id, count: projects.filter(p => p.group === group.id).length })), ...scene?.getState() }) };
try {
  projects = await loadProjects();
  let renderedLanguage = getLanguage();
  renderIndex();
  setMenu(false);
  const rawId = new URLSearchParams(location.search).get('project');
  const id = normalizeProjectId(rawId) || rawId;
  active = Math.max(0, projects.findIndex(p => p.id === id));
  const next = routePath(location)?.startsWith('project/about') ? 'about' : 'project';
  const restoring = !!history.state?.projectVisit;
  visit = initialVisit(projects[active].id, next);
  saveVisit(visit);
  skipIntro = restoring || next === 'about' || reduced.matches;
  await navigate(next, active, { push: false, initial: true });
  await document.fonts?.ready;
  if (next === 'about') {
    // Reveal a settled hero, with a bounded wait so a failed/slow image never
    // prevents reading or returning. Lazy gallery images stay lazy.
    let timer;
    await Promise.race([
      $('.work-gallery img')?.decode().catch(() => {}),
      new Promise(resolve => { timer = setTimeout(resolve, 1800); }),
    ]);
    clearTimeout(timer);
  }
  document.body.dataset.ready = 'true';
  if (next === 'about') {
    busy = true;
    readingNavigation.beginRoute();
    await animateParts(false, { includeHeader: true });
    busy = false;
    readingNavigation.endRoute();
    if (queuedRoute) { queuedRoute = false; queuedAction = null; route(); }
    else if (queuedAction) { const action = queuedAction; queuedAction = null; action(); }
  }
  let languageRevision = 0;
  onLanguageChange(async language => {
    if (language === renderedLanguage) return;
    renderedLanguage = language;
    const revision = ++languageRevision;
    const translated = await loadProjects();
    if (revision !== languageRevision) return;
    projects = translated;
    scene?.setTagText(text('View', '查看'));
    renderIndex(); setMenu(false); setActive(active); updateTitle(); readingNavigation.sync();
    if (mode === 'about') { const y = scrollY; renderDetail(projects[active], true); scrollTo(0, y); }
  });
} catch (error) {
  $('#project-status').className = 'project-error';
  $('#project-status').textContent = text('Projects could not load. Please reload this page.', '作品暂时无法载入，请刷新页面重试。');
  console.error('[Project]', error);
}
