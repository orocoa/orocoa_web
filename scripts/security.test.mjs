import test from 'node:test';
import assert from 'node:assert/strict';
import {request} from 'node:http';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {startPreview} from './serve.mjs';
import {projectIds} from '../dist/assets/site.js';
import {validateBase} from './build-demo.mjs';

function rawRequest(port,path,method='GET',headers={}) {
 return new Promise((resolve,reject)=>{
  const req=request({hostname:'127.0.0.1',port,path,method,headers},response=>{
   const chunks=[];response.on('data',chunk=>chunks.push(chunk));response.on('end',()=>resolve({status:response.statusCode,headers:response.headers,bytes:Buffer.concat(chunks)}));
  });req.on('error',reject);req.end();
 });
}
test('Only explicit local deployment prefixes are accepted',()=>{
 for(const base of ['https://example.com/','//evil.example/','/webdemo/../','/private/path/','/<script>/','/WEBDEMO/'])assert.throws(()=>validateBase(base));
 assert.equal(validateBase('/webdemo/'),'/webdemo/');
 assert.equal(validateBase('/'),'/');
});
for(const base of ['/webdemo/','/'])test('Public export stays self-contained at '+base,async t=>{
 const {server,release}=await startPreview({port:0,base});
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const port=server.address().port;
 for(const file of release.metadata.files) {
  const response=await rawRequest(port,file.url);
  assert.equal(response.status,200,file.url);
  assert.equal(createHash('sha256').update(response.bytes).digest('hex'),file.sha256,file.url);
  assert.equal(response.headers['x-content-type-options'],'nosniff');
  assert.equal(response.headers['referrer-policy'],'strict-origin-when-cross-origin');
  assert.equal(response.headers['x-frame-options'],'DENY');
  assert(!response.headers['set-cookie']);
  const csp=response.headers['content-security-policy'];
  assert(csp.includes("script-src 'self'")&&!/script-src[^;]*unsafe-inline|unsafe-eval/.test(csp));
  assert(csp.includes("worker-src 'none'")&&csp.includes("form-action 'none'"));
  if(/\.(html|css|json|js)$/.test(file.path)){
   const source=response.bytes.toString();
   for(const [,path] of source.matchAll(/["']((?:\/|\.\.?\/)[^"'\s]+\.(?:js|css)(?:\?[^"'\s]*)?)["']/g))assert(path.endsWith('?v='+release.metadata.sourceSha256.slice(0,16)),'Mixed module version: '+path);
   if(base!=='/'){
    assert(!/["']\/(?:assets|home|fields|vi|media|project|profile|transition|content)\//.test(source),'Root path escaped deployment prefix: '+file.path);
   }
   if(file.path.endsWith('.html')&&base!=='/'){
    for(const [,value] of source.matchAll(/srcset=["']([^"']*)["']/g))for(const entry of value.split(','))assert(entry.trim().split(/\s/)[0].startsWith(base),'srcset escaped prefix');
    for(const match of source.matchAll(/(?:href|src)=["'](\/[^"']*)["']/g))assert(match[1].startsWith(base),'HTML resource/navigation escaped prefix: '+match[1]);
   }
   if(file.path.endsWith('.html')){
    assert(!/<script(?:\s[^>]*)?>(?!\s*<\/script>)[\s\S]*?<\/script>/i.test(source),'Inline JavaScript');
    assert(!/\son[a-z]+\s*=/i.test(source),'Inline event handler');
   }
  }
 }
 const entry=await rawRequest(port,base);
 assert.equal(entry.status,200);
 const head=await rawRequest(port,base,'HEAD');
 assert.equal(head.status,200);assert.equal(head.bytes.length,0);assert.equal(Number(head.headers['content-length']),entry.bytes.length);
 const cached=await rawRequest(port,base,'GET',{'If-None-Match':entry.headers.etag});
 assert.equal(cached.status,304);assert.equal(cached.bytes.length,0);
 for(const method of ['POST','PUT','PATCH','DELETE','OPTIONS'])assert.equal((await rawRequest(port,base,method)).status,405);
 const rejected=[
  base+'.env',base+'.git/config',base+'private.pdf',base+'design/works/03/project.pdf',
  base+'design/document-previews.json',base+'creative-practice/document-previews.json',
  base+'design/preview-session',base+'photography/photos.json',
  base+'../README.md',base+'%2e%2e/README.md',base+'%252e%252e/README.md',
  base+'%2f..%2fREADME.md',base+'%5c..%5cREADME.md',base+'%00index.html',
  base+'node_modules/private.js',base+'scripts/serve.mjs',base+'edgeone.json',
 ];
 for(const path of rejected)assert.equal((await rawRequest(port,path)).status,404,path);
 if(base!=='/'){
  for(const path of ['/project/','/assets/language.js','/content/projects.json','/design/preview-session','/README.md'])assert.equal((await rawRequest(port,path)).status,404,path);
  const redirect=await rawRequest(port,base.slice(0,-1)+'?demo=1');
  assert.equal(redirect.status,308);assert.equal(redirect.headers.location,base+'?demo=1');
 }
 const malicious=await rawRequest(port,base+'project/about/?project=%3Cimg%20src%3Dx%20onerror%3Dalert%281%29%3E');
 assert.equal(malicious.status,200);assert(!malicious.bytes.toString().includes('onerror='));
 const catalog=JSON.parse((await rawRequest(port,base+'content/projects.json')).bytes.toString());
 assert.equal(catalog.length,projectIds.length);
 assert(catalog.every((row,index)=>row.id===projectIds[index]&&row.cover.startsWith(base+'media/')));
 const sourceCatalog=JSON.parse(await readFile(new URL('../dist/content/projects.json',import.meta.url),'utf8'));
 assert.deepEqual(catalog.map(row=>({...row,cover:row.cover.slice(base.length)})),sourceCatalog.map(row=>({...row,cover:row.cover.slice(1)})));
 const config=JSON.parse(await readFile(release.siteRoot+'/edgeone.json','utf8'));
 assert.equal(config.headers[0].source,base+'*');
 assert(!JSON.stringify(config).includes('Functions'));
});
