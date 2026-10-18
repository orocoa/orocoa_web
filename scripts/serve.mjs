import {createServer} from 'node:http';
import {extname} from 'node:path';
import {createHash} from 'node:crypto';
import {prepareDemo,validateBase} from './build-demo.mjs';
import {securityHeaders} from './security-policy.mjs';

export async function startPreview({port=Number(process.env.PORT||4321),base=process.env.DEMO_BASE||'/webdemo/'}={}) {
 validateBase(base);
 if(!Number.isInteger(port)||port<0||port>65535)throw Error('Invalid PORT');
 const release=await prepareDemo({base});
 const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.bin':'application/octet-stream'};
 const page404=release.bytesByPath.get(base+'404.html');
 const cache='public, max-age=300, must-revalidate';
 const server=createServer((request,response)=>{
  const headers={...securityHeaders};
  const send=(status,data=Buffer.alloc(0),extra={})=>{
   response.writeHead(status,{...headers,'Cache-Control':status===200?cache:'no-store',...extra,'Content-Length':data.length});
   response.end(request.method==='HEAD'?undefined:data);
  };
  if(!['GET','HEAD'].includes(request.method)){send(405,Buffer.alloc(0),{Allow:'GET, HEAD'});return;}
  const raw=(request.url||'').split('?')[0];
  // Reject ambiguous encodings before URL normalization can hide traversal.
  if(/%(?:2e|2f|5c|00|25)/i.test(raw)||/[\\\u0000-\u001f\u007f]/.test(raw)||raw.split('/').some(part=>part==='.'||part==='..')){
   send(404,page404,{'Content-Type':types['.html']});return;
  }
  let path;try{path=decodeURIComponent(raw);}catch{send(400);return;}
  if((path==='/'&&base!=='/')||(base!=='/'&&path===base.slice(0,-1))){
   const query=request.url.includes('?')?'?'+request.url.split('?').slice(1).join('?'):'';
   send(308,Buffer.alloc(0),{Location:base+query});return;
  }
  if(!path.startsWith(base)){send(404,page404,{'Content-Type':types['.html']});return;}
  let key=path.endsWith('/')?path+'index.html':path;
  if(!release.bytesByPath.has(key)&&release.bytesByPath.has(path+'/index.html')){
   send(308,Buffer.alloc(0),{Location:path+'/'});return;
  }
  const bytes=release.bytesByPath.get(key);
  if(!bytes){send(404,page404,{'Content-Type':types['.html']});return;}
  const etag='"'+createHash('sha256').update(bytes).digest('hex')+'"';
  if(request.headers['if-none-match']===etag){response.writeHead(304,{...headers,'Cache-Control':cache,ETag:etag});response.end();return;}
  send(200,bytes,{'Content-Type':types[extname(key)],ETag:etag});
 });
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
 return {server,release,url:'http://127.0.0.1:'+server.address().port+base};
}
const invoked=process.argv[1]?.replaceAll('\\','/').endsWith('/scripts/serve.mjs')||process.argv[1]==='scripts/serve.mjs';
if(invoked) {
 const result=await startPreview();
 console.log('Public edition preview: '+result.url);
}
