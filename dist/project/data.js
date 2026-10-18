import { getLanguage, text } from './language.js';
import { siteURL, projectIds } from '../assets/site.js';
import { githubProfile, recommendedProject } from '../assets/recommendations.js';
export const groups = [
 {id:'code',label:'Code',labelZh:'产品与技术'},
 {id:'design',label:'Design',labelZh:'设计与空间'},
 {id:'practice',label:'Creative Practice',labelZh:'研究与创作实践'},
];
let catalog;
function validateCatalog({rows,display}) {
 const keys=['id','group','cover','width','height','monochrome'].sort().join(',');
 if(!Array.isArray(rows)||rows.length!==projectIds.length)throw Error('Invalid cover catalog');
 for(const language of ['en','zh']) {
  if(!Array.isArray(display[language])||display[language].length!==projectIds.length)throw Error('Invalid display copy');
  display[language].forEach((item,index)=>{
   if(item.id!==projectIds[index]||!['cover','contain'].includes(item.carouselFit)||
    !['title','category','year'].every(key=>typeof item[key]==='string'&&item[key].length<200))throw Error('Invalid project display metadata');
  });
 }
 return {display,rows:rows.map((row,index)=>{
  if(!row||typeof row!=='object'||Object.keys(row).sort().join(',')!==keys)throw Error('Unexpected catalog fields');
  if(row.id!==projectIds[index]||!groups.some(group=>group.id===row.group)||
    !row.cover.startsWith(siteURL('media/'))||!/\/(?:project-\d{2}(?:-[a-z0-9-]+)?\.webp|tuneshape-(?:placeholder|[a-z0-9-]+)\.(?:svg|webp))$/.test(row.cover)||typeof row.monochrome!=='boolean'||
    ![row.width,row.height].every(value=>Number.isInteger(value)&&value>0&&value<=4096))throw Error('Invalid cover record');
  return {...row};
 })};
}
function validateTuneShape(tuneshape,rows) {
 const row=rows.find(item=>item.id==='tuneshape');
 if(!tuneshape||!['pending','ready'].includes(tuneshape.status)||!row||row.cover!==tuneshape.cover||
  row.width!==tuneshape.width||row.height!==tuneshape.height)throw Error('Invalid TuneShape preview');
 const repo=/^https:\/\/github\.com\/orocoa\/[A-Za-z0-9_.-]+$/.test(tuneshape.repository||'');
 const website=tuneshape.website==='https://kai-nex.com/tuneshape/';
 if(tuneshape.repository!==null&&!repo||tuneshape.website!=null&&!website||tuneshape.status==='ready'&&!repo&&!website)throw Error('Invalid TuneShape public links');
 for(const language of ['en','zh']) {
  if(typeof tuneshape.summary?.[language]!=='string'||!Array.isArray(tuneshape.description?.[language])||
   !tuneshape.description[language].every(paragraph=>typeof paragraph==='string'))throw Error('Invalid TuneShape copy');
 }
 return tuneshape;
}
async function json(path) {
 const response=await fetch(siteURL(path),{cache:'no-cache'});
 if(!response.ok)throw Error('Project catalog unavailable');
 return response.json();
}
export async function loadProjects() {
 const {rows,display,tuneshape}=await (catalog??=Promise.all([json('content/projects.json'),json('content/display.json'),json('content/tuneshape.json')])
  .then(([rows,display,tuneshape])=>({...validateCatalog({rows,display}),tuneshape:validateTuneShape(tuneshape,rows)})).catch(error=>{catalog=undefined;throw error;}));
 return rows.map((item,index)=>{
  const metadata=display[getLanguage()][index];
  const recommendation=recommendedProject(item.id);
  const matching=['ariadne','reprise','aix-origin','mac-setup'].includes(item.id);
  const introduction=text('Explore '+recommendation.name+' on GitHub.','到 GitHub 了解 '+recommendation.name+'。');
  const project = {...item,...metadata,name:metadata.title,overviewCover:item.cover,overviewMonochrome:item.monochrome,
   gallery:[item.cover],summary:text('On GitHub: ','GitHub 推荐：')+recommendation.name,
   description:[introduction,text(recommendation.detailEn,recommendation.detailZh),
    text('Start with the README, try the project, and give it a Star if it helps you.',
     '可以从 README 开始，试着用一用；如果对你有帮助，欢迎给它一个 Star。')],
   facts:[[text('GitHub project','GitHub 项目'),recommendation.name],
    [text('Focus','方向'),text(recommendation.focusEn,recommendation.focusZh)],
    [text('Workflow','使用路径'),text(recommendation.workflowEn,recommendation.workflowZh)],
    [text('Start here','从这里开始'),'README']],
   media:{[item.cover]:{width:item.width,height:item.height,note:metadata.title}},
   resources:[{href:recommendation.url,label:text('Open ','前往 ')+recommendation.name},
    {href:recommendation.url+'#readme',label:text('Read the README','阅读 README')},
    {kind:'report-notice',label:text('More GitHub projects','更多 GitHub 项目')}],
  };
  if (item.id === 'tuneshape') {
   const language=getLanguage();
   const repo=tuneshape.status==='ready'&&/^https:\/\/github\.com\/orocoa\/[A-Za-z0-9_.-]+$/.test(tuneshape.repository||'')?tuneshape.repository:null;
   const website=tuneshape.status==='ready'&&tuneshape.website==='https://kai-nex.com/tuneshape/'?tuneshape.website:null;
   const ready=tuneshape.status==='ready';
   return {...project,summary:tuneshape.summary[language],description:tuneshape.description[language],
    facts:ready?[[text('Focus','方向'),text('UI motion playground','UI 动效实验台')],
     [text('Workflow','使用路径'),text('Explore → tune → export','浏览 → 调节 → 导出')],
     [text('Access','体验'),website?text('Live demo','在线演示'):'GitHub'],
     [text('Source','源码'),repo?'GitHub':text('Explore other GitHub projects','查看其他 GitHub 项目')]]:
     [[text('Status','状态'),text('Awaiting project sync','等待项目同步')],
      [text('Repository','仓库'),text('Not linked yet','待补齐')],
      [text('Content','内容'),text('Preview placeholder','预留占位')],
      [text('Start here','从这里开始'),'README']],
    resources:[...(website?[{href:website,label:text('Try TuneShape','体验 TuneShape')}]:[]),
     {href:repo||githubProfile,label:repo?text('TuneShape on GitHub','TuneShape GitHub 仓库'):text('Explore my GitHub','查看我的 GitHub')},
     {href:repo?repo+'#readme':recommendedProject('reprise').url+'#readme',label:repo?text('Read the README','阅读 README'):text('Read a project README','阅读推荐项目 README')},
     {kind:'report-notice',label:text('More GitHub projects','更多 GitHub 项目')}],
   };
  }
  if (matching) return project;
  return {...project,
   summary:text('Interactive website demo','交互网站演示'),
   description:[
    text('This is sample content for a website demo. The title and description are placeholders, not a record of a real project.',
     '这是网站演示中的示例内容。名称和介绍均为占位文案，不代表真实项目或个人经历。'),
    text('The retained artwork is an illustrative cover. Try the image viewer, project navigation and language switch to explore the original interactions.',
     '保留的图片仅作为演示封面。可以体验图片放大、项目切换和语言切换，查看原有的页面交互。'),
    text('For a real project, explore '+recommendation.name+' on GitHub. Read the README, try it, and give it a Star if it helps you.',
     '想了解真实项目，可以到 GitHub 查看 '+recommendation.name+'，从 README 开始；如果对你有帮助，欢迎给它一个 Star。'),
   ],
   facts:[[text('Content','内容'),text('Demo placeholder','演示占位')],
    [text('Cover','封面'),text('Retained artwork','保留的展示图片')],
    [text('Try','体验'),text('Navigate · zoom · switch language','切换 · 放大 · 双语')],
    [text('GitHub recommendation','GitHub 推荐'),recommendation.name]],
  };
 });
}
