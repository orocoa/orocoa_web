import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),dist=resolve(root,'dist');
const argument=process.argv[2];
if(!argument)throw Error('Usage: node scripts/sync-tuneshape.mjs /path/to/approved-tuneshape.json');
const tune=JSON.parse(await readFile(resolve(argument),'utf8'));
const required=['repository','cover','width','height','category','year','summary','description'];
if(!tune||typeof tune!=='object'||!required.every(key=>Object.hasOwn(tune,key))||Object.keys(tune).some(key=>![...required,'website'].includes(key)))throw Error('Use only the fields in tuneshape-input.example.json.');
if(tune.repository!==null&&!/^https:\/\/github\.com\/orocoa\/[A-Za-z0-9_.-]+$/.test(tune.repository||''))throw Error('Use a confirmed public repository URL or null.');
if(tune.website!=null&&tune.website!=='https://kai-nex.com/tuneshape/')throw Error('Use the verified TuneShape demo URL.');
if(!tune.repository&&!tune.website)throw Error('A confirmed public repository or live demo URL is required.');
if(!/^\/media\/tuneshape-(?!placeholder)[a-z0-9-]+\.(?:webp|svg)$/.test(tune.cover||'')||![tune.width,tune.height].every(n=>Number.isInteger(n)&&n>0&&n<=4096))throw Error('Add the final cover inside dist/media/ with its real dimensions.');
for(const language of ['en','zh']) {
 if(!['summary','category','year','description'].every(key=>tune[key]&&Object.keys(tune[key]).sort().join(',')==='en,zh'))throw Error('Bilingual fields must contain en and zh only.');
 if(!['summary','category','year'].every(key=>typeof tune[key]?.[language]==='string'&&tune[key][language].trim())||
  !Array.isArray(tune.description?.[language])||!tune.description[language].length||
  !tune.description[language].every(p=>typeof p==='string'&&p.trim()))throw Error('Approved bilingual summary, category, year and description are required.');
 if(/(?:placeholder|coming soon|awaiting|next sync|占位|待同步|同步后补齐|等待项目同步)/i.test([tune.summary[language],tune.year[language],...tune.description[language]].join(' ')))throw Error('Replace the preview text before synchronizing.');
}
await readFile(resolve(dist,'.'+tune.cover));
const read=async path=>JSON.parse(await readFile(resolve(dist,path),'utf8'));
const rows=await read('content/projects.json'),display=await read('content/display.json');
const row=rows.find(p=>p.id==='tuneshape');Object.assign(row,{cover:tune.cover,width:tune.width,height:tune.height});
for(const lang of ['en','zh'])Object.assign(display[lang].find(p=>p.id==='tuneshape'),{category:tune.category[lang],year:tune.year[lang],layoutReference:{title:'TuneShape',category:tune.category.en,year:tune.year.en}});
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let home=await readFile(resolve(dist,'index.html'),'utf8');
home=home.replace(/(<a class="field" data-work="tuneshape"[\s\S]*?<p class="field-description">)[\s\S]*?(<\/p>)/,(_,a,b)=>a+'<span class="field-copy-line">'+escape(tune.summary.en)+'</span>'+b);
home=home.replace(/(<a class="field" data-work="tuneshape"[\s\S]*?<img )[^>]*(>)/,(_,a,b)=>a+'src="'+tune.cover+'" alt="" width="240" height="144" decoding="async"'+b);
let fields=await readFile(resolve(dist,'fields/fields.js'),'utf8');
fields=fields.replace(/(const chineseCopy = )([\s\S]*?)(;\n)/,(_,prefix,json,suffix)=>{const copy=JSON.parse(json);copy[0]={title:'TuneShape',lines:[tune.summary.zh]};return prefix+JSON.stringify(copy,null,2)+suffix;});
// All inputs are checked before the explicit edit. Builds never run this script.
for(const [path,value] of [['content/projects.json',rows],['content/display.json',display],['content/tuneshape.json',{...tune,status:'ready'}]])await writeFile(resolve(dist,path),JSON.stringify(value,null,2)+'\n');
await writeFile(resolve(dist,'index.html'),home);await writeFile(resolve(dist,'fields/fields.js'),fields);
console.log('TuneShape synced locally. Regenerate the Chinese font, run checks and review the exact archive before publishing. No network or deployment was performed.');
