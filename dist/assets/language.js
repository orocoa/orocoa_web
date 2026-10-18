// One language preference is shared by the homepage and every local route.
const storageKey = 'orocoa-webdemo-language';
const listeners = new Set();
function savedLanguage() {
  try { return sessionStorage.getItem(storageKey) === 'zh' ? 'zh' : 'en'; }
  catch { return 'en'; }
}
let language = savedLanguage();
function updateDocument() {
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  document.documentElement.dataset.language = language;
}
updateDocument();
export const getLanguage = () => language;
export const text = (en, zh) => language === 'zh' ? zh : en;
export function onLanguageChange(callback) {
  listeners.add(callback);
  callback(language);
  return () => listeners.delete(callback);
}
// Static, locally authored copy only. Omitted languages retain the source HTML.
export function bindTranslations(entries, root = document) {
  const records = entries.flatMap(({ selector, en, zh, attribute = 'html' }) =>
    [...root.querySelectorAll(selector)].map(element => {
      const original = attribute === 'html' ? element.innerHTML : attribute === 'text' ? element.textContent : element.getAttribute(attribute);
      return { element, attribute, en: en ?? original, zh: zh ?? original };
    }));
  return onLanguageChange(language => {
    for (const { element, attribute, ...copy } of records) {
      const value = copy[language];
      if (attribute === 'html') { if (element.innerHTML !== value) element.innerHTML = value; }
      else if (attribute === 'text') { if (element.textContent !== value) element.textContent = value; }
      else element.setAttribute(attribute, value);
    }
  });
}
export function setLanguage(value, persist = true) {
  if (value !== 'en' && value !== 'zh') return;
  if (persist) { try { sessionStorage.setItem(storageKey, value); } catch {} }
  if (value === language) return;
  language = value;
  updateDocument();
  for (const callback of listeners) callback(language);
}
addEventListener('storage', event => {
  if (event.key === storageKey || event.key === null) setLanguage(savedLanguage(), false);
});
addEventListener('pageshow', () => setLanguage(savedLanguage(), false));
