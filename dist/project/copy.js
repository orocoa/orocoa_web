import { bindTranslations } from './language.js';

bindTranslations([
  { selector: 'meta[name="description"]', attribute: 'content', en: 'Selected projects across code, products, materials, moving image and research.', zh: '汇集代码、产品、材料、动态影像与研究实践的精选作品。' },
  { selector: '.project-skip', en: 'Skip to project index', zh: '跳到项目索引' },
  { selector: '.project-navigation', attribute: 'aria-label', en: 'Project navigation', zh: '项目导航' },
  { selector: '.project-tab-about span', en: 'About', zh: '关于' },
  { selector: '.project-tab-index span', en: 'Project', zh: '项目' },
  { selector: '#project-overview', attribute: 'aria-label', en: 'All work', zh: '全部作品' },
  { selector: '#project-canvas', attribute: 'aria-label', en: 'Project carousel. Use the project index or arrow buttons to select a work.', zh: '作品轮播。使用项目索引或箭头按钮选择作品。' },
  { selector: '#project-menu-toggle', attribute: 'aria-label', en: 'Choose a project', zh: '选择项目' },
  { selector: '#project-menu-dismiss', attribute: 'aria-label', en: 'Close project navigation', zh: '关闭项目导航' },
  { selector: '#project-list', attribute: 'aria-label', en: 'All projects', zh: '全部项目' },
  { selector: '#project-list > p', en: 'Loading projects…', zh: '正在载入项目…' },
  { selector: '[data-step="-1"]', attribute: 'aria-label', en: 'Previous project', zh: '上一个项目' },
  { selector: '[data-step="1"]', attribute: 'aria-label', en: 'Next project', zh: '下一个项目' },
  { selector: '#project-about', attribute: 'aria-label', en: 'About the selected project', zh: '当前项目详情' },
]);
