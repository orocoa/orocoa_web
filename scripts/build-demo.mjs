import {readdir,readFile,mkdir,writeFile,lstat} from 'node:fs/promises';
import {resolve,relative,dirname,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {securityHeaders} from './security-policy.mjs';
const projectRoot=resolve(import.meta.dirname,'..');
const sourceRoot=resolve(projectRoot,'dist');
const hash=data=>createHash('sha256').update(data).digest('hex');
export function validateBase(base) {
 if(base!=='/'&&!/^\/[a-z][a-z0-9-]*\/$/.test(base))throw Error('Base must be / or one lowercase directory such as /webdemo/');
 return base;
}
export function validateSiteOrigin(value) {
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('Site URL must be an HTTPS origin without a path, credentials, query or fragment');
 return url.origin;
}
export function rewriteSearchURLs(source,base,origin) {
 return source.replaceAll('https://webdemo.kai-nex.com/',origin+base);
}
export function rewritePublicPaths(source,base) {
 if(base==='/')return source;
 let out=source.replace(/(["'])(\/(?:assets|home|fields|vi|media|project|profile|transition|content|code|design|creative-practice|photography|macsetup|shift|about|404\.html)(?:\/|(?=["']))[^"'\s<>]*)/g,
  (_,quote,path)=>quote+base+path.slice(1));
 out=out.replace(/srcset=(["'])([^"']*)\1/g,(_,quote,value)=>'srcset='+quote+value.split(',').map(entry=>{const trimmed=entry.trim();return trimmed.startsWith('/')&&!trimmed.startsWith(base)?base+trimmed.slice(1):trimmed;}).join(', ')+quote);
 out=out.replace(/((?:href|src)=["'])\/(?=[#?"'])/g,(_,prefix)=>prefix+base);
 out=out.replace(/url=\/([^"'<> ]*)/g,(_,suffix)=>'url='+base+suffix);
 return out;
}
async function sources() {
 const files=[];
 async function walk(dir) {
  for(const item of await readdir(dir,{withFileTypes:true})){
   const path=resolve(dir,item.name);
   if((await lstat(path)).isSymbolicLink())throw Error('Refusing a symlink in public source');
   if(item.isDirectory())await walk(path);
   else {
    const name=relative(sourceRoot,path).replaceAll('\\','/');
    const allowed=['.html','.js','.css','.json','.svg','.webp','.png','.woff2','.bin'];
    if(['robots.txt','sitemap.xml'].includes(name)){files.push({path:name,bytes:await readFile(path)});continue;}
    if(name.split('/').some(part=>part.startsWith('.'))||!allowed.includes(extname(name)))throw Error('Unapproved public file: '+name);
    if(extname(name)==='.bin'&&!['home/assets/pc-final10.points.bin','transition/assets/refined-devices.bin'].includes(name))throw Error('Unapproved binary asset');
    files.push({path:name,bytes:await readFile(path)});
   }
  }
 }
 await walk(sourceRoot);
 return files.sort((a,b)=>a.path.localeCompare(b.path));
}
export async function prepareDemo({base='/webdemo/',siteOrigin=process.env.SITE_URL||'https://webdemo.kai-nex.com/'}={}) {
 validateBase(base);
 const origin=validateSiteOrigin(siteOrigin);
 const source=await sources(),inputHash=hash(Buffer.concat([
  Buffer.from(base+origin+JSON.stringify(securityHeaders)+await readFile(import.meta.filename,'utf8')),
  ...source.flatMap(file=>[Buffer.from(file.path),file.bytes]),
 ]));
 const releaseRoot=resolve(projectRoot,'output/releases',inputHash.slice(0,16));
 const siteRoot=resolve(releaseRoot,'site');
 const records=[],bytesByPath=new Map();
 for(const file of source) {
  // The full OFL font is a development source; the reviewed subset is served.
  if(file.path==='vi/fonts/SourceHanSansCN-VF.woff2') {
   const css=source.find(item=>item.path==='vi/fonts.css').bytes.toString();
   if(!css.includes('SourceHanSansCN-VF.woff2'))continue;
  }
  const text=['.html','.js','.css','.json','.svg','.txt','.xml'].includes(extname(file.path));
  let publicText=text?rewriteSearchURLs(rewritePublicPaths(file.bytes.toString(),base),base,origin):null;
  // One version for every script/style import prevents mixed modules after an update.
  if(publicText!==null)publicText=publicText.replace(/(["'])((?:\/|\.\.?\/)[^"'\s]+\.(?:js|css))(["'])/g,
    (_,open,path,close)=>open+path+'?v='+inputHash.slice(0,16)+close);
  const bytes=text?Buffer.from(publicText):file.bytes;
  const url=base+file.path,path=url.slice(1),dest=resolve(siteRoot,path);
  await mkdir(dirname(dest),{recursive:true});
  await writeFile(dest,bytes);
  records.push({path,url,sha256:hash(bytes),bytes:bytes.length});
  bytesByPath.set(url,bytes);
 }
 const cache='public, max-age=300, must-revalidate';
 const headers=Object.entries({...securityHeaders,'Cache-Control':cache}).map(([key,value])=>({key,value}));
 const config={headers:[{source:base+'*',headers}],redirects:base==='/'?[]:[{source:base.slice(0,-1),destination:base,statusCode:308}]};
 await mkdir(siteRoot,{recursive:true});
 await writeFile(resolve(siteRoot,'edgeone.json'),JSON.stringify(config,null,2)+'\n');
 const metadata={schemaVersion:1,base,siteOrigin:origin,sourceSha256:inputHash,files:records,totalBytes:records.reduce((sum,file)=>sum+file.bytes,0)};
 await writeFile(resolve(releaseRoot,'manifest.json'),JSON.stringify(metadata,null,2)+'\n');
 return {releaseRoot,siteRoot,metadata,bytesByPath};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url) {
 const base=process.argv.find(arg=>arg.startsWith('--base='))?.slice(7)||'/webdemo/';
 const siteOrigin=process.argv.find(arg=>arg.startsWith('--site-url='))?.slice(11)||process.env.SITE_URL||'https://webdemo.kai-nex.com/';
 const result=await prepareDemo({base,siteOrigin});
 console.log('Prepared '+result.metadata.files.length+' static files at '+result.siteRoot);
 console.log('Entry: '+result.metadata.base+'; no upload or deployment performed.');
}
