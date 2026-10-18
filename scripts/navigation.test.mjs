import test from 'node:test';
import assert from 'node:assert/strict';
import { basePath, siteURL, normalizeProjectId } from '../dist/assets/site.js';
import { traverseOrigin } from '../dist/project/navigation.js';

test('private or invalid history falls back; validated local entries traverse', async () => {
  const assignments=[];
  globalThis.location=Object.assign(new URL('https://demo.example'+basePath+'project/'), {
    assign:href=>assignments.push(href),
  });
  let traversed=0;
  const entry={key:'home',index:0,url:'https://demo.example'+siteURL('#fields')};
  globalThis.window={navigation:{entries:()=>[entry],currentEntry:{index:1},
    traverseTo:()=>{traversed++;return {finished:Promise.resolve()};}}};
  const origin={type:'fields',key:'home',href:'https://untrusted.example/'};
  for(const hidden of [null,undefined,'','not a URL']) {
    entry.url=hidden;
    assert.equal(traverseOrigin(origin),false);
  }
  for(const wrong of ['https://untrusted.example/#fields','https://demo.example'+siteURL('project/'),
    'https://demo.example'+siteURL('#profile')]) {
    entry.url=wrong;
    assert.equal(traverseOrigin(origin),false);
  }
  assert.equal(traversed,0);
  entry.url='https://demo.example'+siteURL('#fields');
  assert.equal(traverseOrigin(origin),true);
  assert.equal(traversed,1);
  window.navigation.traverseTo=()=>{throw new Error('entry disposed');};
  assert.equal(traverseOrigin(origin),false);
  window.navigation.traverseTo=()=>({finished:Promise.reject(new Error('navigation aborted'))});
  assert.equal(traverseOrigin(origin),true);
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(assignments,[siteURL('#fields')]);
  delete globalThis.window;
  delete globalThis.location;
});

test('return context keeps the selected project and list position without trusting destinations', async () => {
  const {sanitizeVisit,saveVisit,detailURL}=await import('../dist/project/navigation.js');
  globalThis.location=new URL('https://demo.example'+basePath+'project/');
  const visit=sanitizeVisit({project:'project-02',view:'about',entry:{type:'project',project:'project-02',key:'list',
    href:'https://untrusted.example/',listScroll:364,listX:28},listScroll:364,listX:28});
  assert.equal(visit.project,'reprise');
  assert.equal(visit.entry.href,siteURL('project/?project=reprise'));
  assert.equal(visit.entry.listScroll,364);
  assert.equal(visit.entry.listX,28);
  let written;
  globalThis.history={state:{scrollRestoration:{y:120}},replaceState:(state,_,url)=>written={state,url}};
  saveVisit(visit,detailURL('project-02'));
  assert.deepEqual(written.state.scrollRestoration,{y:120});
  assert.equal(written.state.projectVisit.project,'reprise');
  assert.equal(written.url,'https://demo.example'+siteURL('project/about/?project=reprise'));
  assert.throws(()=>saveVisit(visit,'https://untrusted.example/project/'));
  delete globalThis.history;delete globalThis.location;
});


test('only known project identifiers and legacy aliases resolve', async () => {
  const {detailURL}=await import('../dist/project/navigation.js');
  assert.equal(normalizeProjectId('reprise'),'reprise');
  assert.equal(normalizeProjectId('project-02'),'reprise');
  for(const id of ['__proto__','constructor','toString','prototype','unknown',null,undefined,{},[],18]) {
    assert.equal(normalizeProjectId(id),null);
    assert.equal(detailURL(id),siteURL('project/about/?project=tuneshape'));
  }
});
