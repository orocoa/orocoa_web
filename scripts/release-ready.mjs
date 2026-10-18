import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'..');
export async function releaseReadiness() {
 const read=async path=>JSON.parse(await readFile(resolve(root,'dist',path),'utf8'));
 const [tune,rows,display]=await Promise.all([read('content/tuneshape.json'),read('content/projects.json'),read('content/display.json')]);
 const missing=[];
 if(tune.status!=='ready')missing.push('TuneShape: mark the verified project sync ready.');
 const repo=/^https:\/\/github\.com\/orocoa\/[A-Za-z0-9_.-]+$/.test(tune.repository||'');
 const website=tune.website==='https://kai-nex.com/tuneshape/';
 if(!repo&&!website)missing.push('TuneShape: add the confirmed public GitHub repository or live demo URL.');
 if(tune.repository!==null&&!repo)missing.push('TuneShape: remove the unverified repository URL.');
 if(tune.website!=null&&!website)missing.push('TuneShape: use the verified live demo URL.');
 if(tune.cover.includes('placeholder')||!/^\/media\/tuneshape-[a-z0-9-]+\.(?:webp|svg)$/.test(tune.cover))missing.push('TuneShape: add the approved final cover.');
 for(const language of ['en','zh']) {
  const metadata=display[language]?.find(row=>row.id==='tuneshape');
  if(!tune.summary?.[language]?.trim()||!tune.description?.[language]?.length||
   /(?:placeholder|coming soon|awaiting|next sync|占位|待同步|同步后补齐|等待项目同步)/i.test([tune.summary?.[language],...(tune.description?.[language]||[]),metadata?.year].join(' ')))missing.push('TuneShape: replace the '+language+' preview text with the approved introduction.');
  if(metadata?.category!==tune.category?.[language])missing.push('TuneShape: synchronize the '+language+' display category.');
 }
 const item=rows.find(row=>row.id==='tuneshape');
 if(!item||item.cover!==tune.cover||item.width!==tune.width||item.height!==tune.height)missing.push('TuneShape: synchronize cover path and dimensions in the catalog.');
 try {await readFile(resolve(root,'dist','.'+tune.cover));}catch{missing.push('TuneShape: cover file is missing.');}
 const home=await readFile(resolve(root,'dist/index.html'),'utf8');
 const selected=[...home.matchAll(/class="field" data-work="([^"]+)"/g)].map(m=>m[1]);
 if(selected.join(',')!=='tuneshape,aievent-web,reprise,mac-setup')missing.push('Selected work: restore TuneShape / ? / Reprise / Mac Setup order.');
 if(rows[0]?.id!=='tuneshape'||['en','zh'].some(language=>display[language]?.[0]?.id!=='tuneshape'))missing.push('All work: keep TuneShape first in both languages.');
 if(item&&!home.includes('src="'+tune.cover+'"'))missing.push('TuneShape: synchronize the selected-work cover.');
 return {ready:missing.length===0,missing};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url) {
 const result=await releaseReadiness();
 console.log(result.ready?'Ready for the final source and hosting review.':'Preview ready; publication is waiting for TuneShape:');
 for(const item of result.missing)console.log('- '+item);
 process.exitCode=result.ready?0:2;
}
