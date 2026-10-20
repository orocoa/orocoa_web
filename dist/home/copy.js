import { bindTranslations, onLanguageChange, text } from '../assets/language.js';
bindTranslations([
  {selector: 'title', en: 'orocoaweb (orocoa_web) — Open-source interactive portfolio', zh: 'orocoaweb（orocoa_web）— 开源交互作品集模板'},
  {selector: '.journey-skip', en: 'Skip to selected work', zh: '跳到精选项目'},
  {selector: '.homepage', attribute: 'aria-label', en: 'orocoa homepage', zh: 'orocoa 首页'},
  {selector: '.languages', attribute: 'aria-label', en: 'Language', zh: '语言'},
  {selector: '#device-story', attribute: 'aria-label', en: 'Work to About', zh: '从项目到演示介绍'},
  {selector: '#home-loader', attribute: 'aria-label', en: 'Loading homepage', zh: '正在加载首页'},
  {selector: '.loader-error p', en: 'Unable to finish loading. Please try again.', zh: '加载未完成，请重试。'},
  {selector: '.loader-error button', en: 'Retry', zh: '重新加载'},
  {selector: 'meta[name="description"]', attribute: 'content', en: 'orocoaweb, also known as orocoa_web: an open-source portfolio website template by orocoa, with Three.js point-cloud motion, a project gallery and English / Chinese content.', zh: 'orocoa_web（orocoaweb）— orocoa 的开源交互作品集，包含点云动效、项目轮播与双语演示内容。'},
]);

// Preserve the current loading/error state when the language changes.
onLanguageChange(() => {
  const status = document.querySelector('#status');
  const messages = [
    ['Loading…', '正在加载…'],
    ['The graphics context was interrupted. Please refresh the page.', '图形上下文已中断，请刷新页面。'],
    ['The point cloud could not be loaded. Please refresh to try again.', '点云加载失败，请刷新重试。'],
  ];
  const message = messages.find(pair => pair.includes(status?.textContent));
  if (message) status.textContent = text(...message);
});
