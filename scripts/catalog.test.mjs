import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {projectIds,normalizeProjectId} from '../dist/assets/site.js';
import {githubProjects,githubProfile,recommendedProject} from '../dist/assets/recommendations.js';
import {releaseReadiness} from './release-ready.mjs';
const read=async name=>JSON.parse(await readFile(new URL('../dist/content/'+name,import.meta.url),'utf8'));
async function load(language,base='/') {
 const rows=await read('projects.json'),display=await read('display.json'),tuneshape=await read('tuneshape.json');
 const context=vm.createContext({projectIds,githubProfile,recommendedProject,siteURL:s=>base+s,getLanguage:()=>language,text:(en,zh)=>language==='en'?en:zh,
  fetch:async path=>({ok:true,json:async()=>path.endsWith('/projects.json')?rows.map(row=>({...row,cover:base+row.cover.slice(1)})):path.endsWith('/display.json')?display:{...tuneshape,cover:base+tuneshape.cover.slice(1)}})});
 const source=await readFile(new URL('../dist/project/data.js',import.meta.url),'utf8');
 vm.runInContext(source.replace(/^import .*;\n/gm,'').replace(/export /g,''),context);
 return JSON.parse(JSON.stringify(await context.loadProjects()));
}
test('featured order and every previous numeric link retain their identities',()=>{
 assert.deepEqual(projectIds.slice(0,6),['tuneshape','aievent-web','reprise','mac-setup','ariadne','aix-origin']);
 const legacy=['ariadne','reprise','aievent-web','aix-origin','mac-setup','design-01','design-02','design-03','design-04','design-05','design-06','design-07','design-08','design-09','story-catchers','homegrow-plastic','photography','mupahkc'];
 legacy.forEach((id,i)=>assert.equal(normalizeProjectId('project-'+String(i+1).padStart(2,'0')),id));
});
test('TuneShape owns its GitHub and README links without changing existing recommendations',async()=>{
 const tune=await read('tuneshape.json');
 assert.equal(githubProjects[0].name,'TuneShape');
 assert.equal(recommendedProject('tuneshape').url,tune.repository);
 for(const [id,name]of [['ariadne','Ariadne'],['reprise','Reprise'],['aix-origin','Spark'],['mac-setup','Mac Setup']])assert.equal(recommendedProject(id).name,name);
 for(const language of ['en','zh']){
  const rows=await load(language);assert.equal(rows[0].id,'tuneshape');
  assert(rows[0].resources.some(r=>r.href===tune.repository));
  assert(rows[0].resources.some(r=>r.href===tune.repository+'#readme'));
 }
 const home=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
 assert(home.includes('data-recommendation="TuneShape"'));
 assert.deepEqual([...home.matchAll(/data-recommendation="([^"]+)"/g)].map(match=>match[1]),['TuneShape','Ariadne','Reprise','Mac Setup','More projects']);
 assert(home.match(/class="profile-repositories"[^]*?href="https:\/\/github.com\/orocoa\/TuneShape"/));
});
test('reordering keeps covers and GitHub destinations attached to their projects in both languages and paths',async()=>{
 for(const base of ['/','/webdemo/'])for(const lang of ['en','zh']) {
  const rows=await load(lang,base);assert.equal(rows.length,19);assert(rows.every(p=>p.gallery.length===1));
  assert.equal(rows.find(p=>p.id==='aievent-web').cover,base+'media/project-03-selected-red-20261018.webp');
  assert.equal(rows.find(p=>p.id==='reprise').cover,base+'media/project-02-selected-green-20261018.webp');
  assert.equal(rows.find(p=>p.id==='mac-setup').cover,base+'media/project-05-selected-purple-20261018.webp');
  assert(rows.every(p=>p.overviewMonochrome===false),'All work covers retain their original colors');
  for(const [id,name] of [['ariadne','Ariadne'],['reprise','Reprise'],['aix-origin','Spark'],['mac-setup','Mac Setup']]){
   const project=rows.find(p=>p.id===id),repo=githubProjects.find(p=>p.name===name);
   assert.equal(project.resources[0].href,repo.url);assert.equal(project.description[1],lang==='en'?repo.detailEn:repo.detailZh);
  }
  const tune=rows[0],config=await read('tuneshape.json');
  if(config.status==='pending') {
   assert.equal(tune.resources[0].href,githubProfile);assert(tune.description.join(' ').includes(lang==='en'?'placeholder':'占位'));
  } else {
   if(config.website)assert.equal(tune.resources[0].href,config.website);
   if(config.repository){assert(tune.resources.some(r=>r.href===config.repository));assert(tune.resources.some(r=>r.href===config.repository+'#readme'));}
   else {assert(tune.resources.some(r=>r.href===githubProfile));assert(!tune.resources.some(r=>r.href?.includes('/TuneShape')));}
  }
  assert(rows.filter(p=>!['tuneshape','ariadne','reprise','aix-origin','mac-setup'].includes(p.id)).every(p=>p.description[0].includes(lang==='en'?'placeholders':'占位')));
 }
});
test('the unpublished TuneShape placeholder is explicitly blocked from release',async()=>{
 const tune=await read('tuneshape.json');
 const result=await releaseReadiness();
 if(tune.status==='pending'){assert.equal(result.ready,false);assert(result.missing.some(s=>s.includes('repository')));assert(result.missing.some(s=>s.includes('cover')));}
 else assert.equal(result.ready,true,result.missing.join('\n'));
});
