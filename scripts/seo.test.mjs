import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {prepareDemo,validateSiteOrigin} from './build-demo.mjs';
import {securityHeaders} from './security-policy.mjs';

test('deployment identity accepts an HTTPS origin and rejects credentials or extra URL components',()=>{
 assert.equal(validateSiteOrigin('https://portfolio.example.com/'),'https://portfolio.example.com');
 for(const value of ['http://example.com/','https://user:secret@example.com/','https://example.com/private/','https://example.com/?key=value','https://example.com/#id'])assert.throws(()=>validateSiteOrigin(value));
});
test('canonical, microdata, crawler discovery and sharing URLs agree on custom domains and prefixes',async()=>{
 for(const base of ['/','/portfolio/']){
  const release=await prepareDemo({base,siteOrigin:'https://portfolio.example.com/'});
  const text=path=>release.bytesByPath.get(base+path).toString();
  const root='https://portfolio.example.com'+base;
  const home=text('index.html'),list=text('project/index.html'),details=text('project/about/index.html');
  assert(home.includes('rel="canonical" href="'+root+'"'));
  assert(home.includes('itemprop="url" href="'+root+'"'));
  assert(home.includes('itemprop="name" content="orocoaweb"'));
  assert(home.includes('itemprop="alternateName" content="orocoa_web"'));
  assert(list.includes('rel="canonical" href="'+root+'project/"'));
  assert(details.includes('name="robots" content="noindex, follow"'));
  assert(text('404.html').includes('name="robots" content="noindex, follow"'));
  assert.equal(text('robots.txt'),'User-agent: *\nAllow: /\n\nSitemap: '+root+'sitemap.xml\n');
  const urls=[...text('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
  assert.deepEqual(urls,[root,root+'project/']);
  assert(![home,list,details,text('robots.txt'),text('sitemap.xml')].some(s=>s.includes('https://webdemo.kai-nex.com/')));
  const nav=list.match(/<nav class="project-list"[^>]*>([\s\S]*?)<\/nav>/)[1];
  assert.equal([...nav.matchAll(/<a /g)].length,19);
  assert(nav.includes('href="'+base+'project/about/?project=tuneshape"'));
  const config=JSON.parse(await readFile(release.siteRoot+'/edgeone.json','utf8'));
  for(const [key,value]of Object.entries(securityHeaders))assert(config.headers[0].headers.some(h=>h.key===key&&h.value===value));
 }
});
test('client-side detail to gallery navigation restores indexability and removes project query variants',async()=>{
 const source=await readFile(new URL('../dist/project/app.js',import.meta.url),'utf8');
 const fn=source.slice(source.indexOf('function updateTitle()'),source.indexOf('function commit('));
 const tags=new Map(['link[rel="canonical"]','meta[name="robots"]','meta[name="description"]','meta[property="og:description"]','meta[name="twitter:description"]','meta[property="og:title"]','meta[name="twitter:title"]','meta[property="og:url"]'].map(s=>[s,{dataset:{siteRoot:'https://portfolio.example.com/portfolio/'}}]));
 const document={title:'',querySelector:s=>tags.get(s)};
 const context=vm.createContext({document,mode:'about',active:0,projects:[{id:'tuneshape',title:'TuneShape',summary:'Explore interactive motion.'}],text:(en)=>en});
 vm.runInContext(fn+'updateTitle();',context);
 assert.equal(tags.get('meta[name="robots"]').content,'noindex, follow');
 assert.equal(tags.get('link[rel="canonical"]').href,'https://portfolio.example.com/portfolio/project/about/?project=tuneshape');
 context.mode='project';vm.runInContext('updateTitle()',context);
 assert.equal(tags.get('meta[name="robots"]').content,'index, follow, max-image-preview:large');
 assert.equal(tags.get('link[rel="canonical"]').href,'https://portfolio.example.com/portfolio/project/');
 assert.equal(document.title,'All work — orocoaweb');
});
