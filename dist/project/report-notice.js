import { text, onLanguageChange } from './language.js';
import { githubProjects, githubProfile } from '../assets/recommendations.js';
export function createDocumentPreview({onOpen=()=>{},onClose=()=>{}}={}) {
 const dialog=document.createElement('dialog');
 dialog.className='report-notice';
 dialog.setAttribute('aria-labelledby','report-notice-title');
 // All HTML here is constant. Project names, descriptions and links use DOM properties.
 dialog.innerHTML='<button class="report-notice-close vi-icon-control" type="button"><span class="vi-icon" data-icon="close" aria-hidden="true"></span></button><div class="report-notice-content"><p class="report-notice-label"></p><h2 id="report-notice-title"></h2><p class="report-notice-description"></p><ul class="github-projects"></ul><p class="report-notice-footnote"></p><a class="github-profile" target="_blank" rel="noopener noreferrer"></a></div>';
 const list=dialog.querySelector('ul');
 const links=githubProjects.map(project=>{
  const item=document.createElement('li'),link=document.createElement('a'),name=document.createElement('strong'),description=document.createElement('span');
  link.href=project.url;link.target='_blank';link.rel='noopener noreferrer';name.textContent=project.name+' ↗';
  link.append(name,description);item.append(link);list.append(item);
  return {project,description};
 });
 dialog.querySelector('.github-profile').href=githubProfile;
 document.body.append(dialog);
 const close=dialog.querySelector('button');let trigger;
 function translate() {
  close.setAttribute('aria-label',text('Close project recommendations','关闭项目推荐'));
  dialog.querySelector('.report-notice-label').textContent=text('OPEN SOURCE','开源项目');
  dialog.querySelector('h2').textContent=text('More projects on GitHub.','更多项目，在 GitHub。');
  dialog.querySelector('.report-notice-description').textContent=text('If a project helps you, a Star on GitHub is always welcome.','如果某个项目对你有帮助，欢迎到 GitHub 给它一个 Star。');
  links.forEach(({project,description})=>{description.textContent=text(project.en,project.zh);});
  dialog.querySelector('.report-notice-footnote').textContent=text('Full reports and original media are not included in this demo.','完整报告与原始媒体不包含在此演示中。');
  dialog.querySelector('.github-profile').textContent=text('All my GitHub projects ↗','查看全部 GitHub 项目 ↗');
 }
 translate();onLanguageChange(translate);
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-report-notice]');
  if(!button)return;
  trigger=button;onOpen();translate();document.documentElement.classList.add('report-notice-open');dialog.showModal();
 });
 close.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{
  if(event.target!==dialog)return;
  const rect=dialog.getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();
 });
 dialog.addEventListener('cancel',event=>event.stopPropagation());
 dialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
 dialog.addEventListener('close',()=>{document.documentElement.classList.remove('report-notice-open');onClose();if(trigger?.isConnected)trigger.focus({preventScroll:true});});
 return {refreshLanguage:translate,get isOpen(){return dialog.open;}};
}
