import { siteURL, routePath, normalizeProjectId } from '../assets/site.js';
export const ENTRY_KEY='orocoa-webdemo-project-entry';
const projectId=id=>normalizeProjectId(id)||'tuneshape';
const position=value=>Math.max(0,Math.min(100000,Number(value)||0));
export const detailURL=id=>siteURL('project/about/?project='+encodeURIComponent(projectId(id)));
export const indexURL=id=>siteURL('project/?project='+encodeURIComponent(projectId(id)));
function cleanOrigin(origin) {
 if(!origin||typeof origin!=='object')return null;
 if(origin.type==='fields')return {type:'fields',href:siteURL('#fields'),key:typeof origin.key==='string'?origin.key:undefined,project:projectId(origin.project)};
 if(origin.type==='project')return {type:'project',href:indexURL(origin.project),key:typeof origin.key==='string'?origin.key:undefined,project:projectId(origin.project),listScroll:position(origin.listScroll),listX:position(origin.listX)};
 return null;
}
export function sanitizeVisit(visit) {
 return {project:projectId(visit?.project),view:visit?.view==='about'?'about':'project',
  fields:cleanOrigin(visit?.fields),entry:cleanOrigin(visit?.entry),
  listScroll:position(visit?.listScroll),listX:position(visit?.listX)};
}
export function saveVisit(visit,url=location.href,push=false) {
 const target=new URL(url,location.href),route=routePath(target);
 if(!['project/','project/about/'].includes(route))throw Error('Invalid project navigation');
 history[push?'pushState':'replaceState']({...history.state,projectVisit:sanitizeVisit(visit)},'',target.href);
}
export function initialVisit(id,view) {
 if(history.state?.projectVisit)return sanitizeVisit(history.state.projectVisit);
 let pending;
 try{pending=JSON.parse(sessionStorage.getItem(ENTRY_KEY));sessionStorage.removeItem(ENTRY_KEY);}catch{}
 const valid=pending&&pending.destination===location.pathname+location.search&&
  Number.isFinite(pending.createdAt)&&Date.now()-pending.createdAt>=0&&Date.now()-pending.createdAt<30000;
 const fields=valid&&pending.origin?.type==='fields'?cleanOrigin(pending.origin):null;
 return {project:projectId(id),view,fields,entry:view==='about'?fields:null,listScroll:0,listX:0};
}
export function traverseOrigin(origin) {
 const safe=cleanOrigin(origin),navigation=window.navigation;
 if(!safe?.key||!navigation?.traverseTo)return false;
 const entry=navigation.entries().find(item=>item.key===safe.key);
 if(!entry||entry.index>=navigation.currentEntry.index)return false;
 // Older history entries can have opaque URLs. Use the visible safe route then.
 if(typeof entry.url!=='string'||!entry.url)return false;
 let url;
 try{url=new URL(entry.url);}catch{return false;}
 const route=routePath(url);
 if(safe.type==='fields'?(route!==''||url.hash!=='#fields'):route!=='project/')return false;
 try{navigation.traverseTo(entry.key).finished.catch(()=>location.assign(safe.href));}
 catch{return false;}
 return true;
}
