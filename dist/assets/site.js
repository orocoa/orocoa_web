// This module's location defines the deployment root, including a subdirectory.
export const basePath = new URL('../', import.meta.url).pathname;
export const siteURL = path => basePath + String(path || '').replace(/^\/+/, '');
export function routePath(value = location) {
 const url = new URL(value.href || value, location.href);
 if (url.origin !== location.origin || !url.pathname.startsWith(basePath)) return null;
 return url.pathname.slice(basePath.length);
}
// Display order is independent of media names and legacy numeric links.
export const projectIds = Object.freeze(["tuneshape", "aievent-web", "reprise", "mac-setup", "ariadne", "aix-origin", "design-01", "design-02", "design-03", "design-04", "design-05", "design-06", "design-07", "design-08", "design-09", "story-catchers", "homegrow-plastic", "photography", "mupahkc"]);
const legacyProjectIds = ["ariadne", "reprise", "aievent-web", "aix-origin", "mac-setup", "design-01", "design-02", "design-03", "design-04", "design-05", "design-06", "design-07", "design-08", "design-09", "story-catchers", "homegrow-plastic", "photography", "mupahkc"];
const aliases = Object.fromEntries(legacyProjectIds.map((id,index)=>['project-'+String(index+1).padStart(2,'0'),id]));
export const normalizeProjectId = id => typeof id !== 'string' ? null : projectIds.includes(id) ? id : Object.hasOwn(aliases,id) ? aliases[id] : null;
export const isProjectId = id => normalizeProjectId(id) !== null;
