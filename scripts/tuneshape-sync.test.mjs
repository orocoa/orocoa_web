import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile,copyFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..');
test('the explicit TuneShape sync rejects incomplete inputs and makes a complete isolated fixture release-ready',async()=>{
 const qa=resolve(root,'output/sync-qa');await mkdir(qa,{recursive:true});
 const fixture=await mkdtemp(resolve(qa,'run-'));
 for(const path of ['scripts/sync-tuneshape.mjs','scripts/release-ready.mjs','dist/content/tuneshape.json','dist/content/projects.json','dist/content/display.json','dist/index.html','dist/fields/fields.js']) {
  await mkdir(dirname(resolve(fixture,path)),{recursive:true});await copyFile(resolve(root,path),resolve(fixture,path));
 }
 const before=await readFile(resolve(fixture,'dist/content/tuneshape.json'),'utf8');
 await writeFile(resolve(fixture,'invalid.json'),'{}');
 assert.throws(()=>execFileSync(process.execPath,[resolve(fixture,'scripts/sync-tuneshape.mjs'),resolve(fixture,'invalid.json')],{stdio:'pipe'}));
 assert.equal(await readFile(resolve(fixture,'dist/content/tuneshape.json'),'utf8'),before);
 // This existing repository URL is a test fixture only; this test has no network access.
 const input={repository:'https://github.com/orocoa/Reprise',cover:'/media/tuneshape-fixture.svg',width:1440,height:960,category:{en:'TEST PROJECT',zh:'测试项目'},year:{en:'2026',zh:'2026'},summary:{en:'Approved fixture summary.',zh:'测试摘要。'},description:{en:['Approved fixture paragraph.'],zh:['测试介绍。']}};
 await mkdir(resolve(fixture,'dist/media'),{recursive:true});
 await writeFile(resolve(fixture,'dist'+input.cover),'<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="960"><rect width="1440" height="960" fill="white"/></svg>');
 await writeFile(resolve(fixture,'approved.json'),JSON.stringify(input));
 execFileSync(process.execPath,[resolve(fixture,'scripts/sync-tuneshape.mjs'),resolve(fixture,'approved.json')],{stdio:'pipe'});
 const stdout=execFileSync(process.execPath,[resolve(fixture,'scripts/release-ready.mjs')],{encoding:'utf8'});
 assert.match(stdout,/Ready for/);
 const config=JSON.parse(await readFile(resolve(fixture,'dist/content/tuneshape.json'),'utf8'));
 assert.equal(config.status,'ready');assert.equal(config.repository,input.repository);
 const html=await readFile(resolve(fixture,'dist/index.html'),'utf8');assert(html.includes(input.summary.en)&&html.includes('src="'+input.cover+'"'));
 const selectedSummary=html.match(/data-work="tuneshape"[\s\S]*?<p class="field-description">([\s\S]*?)<\/p>/)[1].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
 assert.equal(selectedSummary,input.summary.en,'A sync replaces all authored summary lines without leaving stale copy');
 const fields=await readFile(resolve(fixture,'dist/fields/fields.js'),'utf8');assert(fields.includes(input.summary.zh));
 const catalog=JSON.parse(await readFile(resolve(fixture,'dist/content/projects.json'),'utf8'));assert.equal(catalog[0].cover,input.cover);
 assert.deepEqual(catalog.slice(1),JSON.parse(await readFile(resolve(root,'dist/content/projects.json'),'utf8')).slice(1));
 const liveOnly={...input,repository:null,website:'https://kai-nex.com/tuneshape/'};
 await writeFile(resolve(fixture,'approved-live.json'),JSON.stringify(liveOnly));
 execFileSync(process.execPath,[resolve(fixture,'scripts/sync-tuneshape.mjs'),resolve(fixture,'approved-live.json')],{stdio:'pipe'});
 assert.match(execFileSync(process.execPath,[resolve(fixture,'scripts/release-ready.mjs')],{encoding:'utf8'}),/Ready for/);
 const liveConfig=JSON.parse(await readFile(resolve(fixture,'dist/content/tuneshape.json'),'utf8'));
 assert.equal(liveConfig.repository,null);assert.equal(liveConfig.website,liveOnly.website);
 await writeFile(resolve(fixture,'invalid-link.json'),JSON.stringify({...liveOnly,website:'https://untrusted.example/'}));
 assert.throws(()=>execFileSync(process.execPath,[resolve(fixture,'scripts/sync-tuneshape.mjs'),resolve(fixture,'invalid-link.json')],{stdio:'pipe'}));
});
