import { bindTranslations } from '../assets/language.js';
import { githubProjects } from '../assets/recommendations.js';
bindTranslations([
 {selector:'#profile',attribute:'aria-label',zh:'关于 orocoa'},
 {selector:'#connect-title .profile-heading-label',zh:'联系'},
 {selector:'#background-title .profile-heading-label',zh:'背景'},
 {selector:'#recognition-title .profile-heading-label',zh:'开源推荐'},
 {selector:'.profile-role',zh:'交互网站演示'},
 {selector:'.profile-timezone',zh:'浏览公开项目。<br>如果对你有帮助，<br>欢迎给它一个 Star。'},
 {selector:'.profile-year',zh:'演示版本'},
 {selector:'#beijing-time',attribute:'aria-label',zh:'当前北京时间'},
 {selector:'.profile-education p:nth-child(1)',zh:'这里放置示例内容<span>可以替换成自己的故事。</span>'},
 {selector:'.profile-education p:nth-child(2)',zh:'体验页面与交互<span>真实项目请到 GitHub 查看。</span>'},
 {selector:'#open-wechat, #wechat-title',zh:'GitHub 项目'},
 {selector:'.wechat-close',attribute:'aria-label',zh:'关闭 GitHub 项目'},
 {selector:'.wechat-handle',zh:'发现有用的项目？欢迎给它一个 Star。'},
 {selector:'.profile-awards [data-recommendation="More projects"] strong',zh:'更多项目'},
 {selector:'.profile-statements',attribute:'aria-label',zh:'关于这个演示'},
 ...githubProjects.map(project=>({selector:'.profile-awards [data-recommendation="'+project.name+'"] span',zh:project.zh})),
]);
export const chineseStatements = [
  '<strong>这是一个让想法慢慢成形的交互网站。</strong>从首页的点云开始，沿着页面探索项目、图片与细节。这份开源演示保留了完整的浏览体验，也为你自己的故事留下一些空间。',
  '<strong>先想想你想分享什么，再把这里变成自己的样子。</strong>从几句话开始，换上自己的项目、图片和故事。布局、转场与交互已经准备好，你可以保留喜欢的部分，也可以尝试新的组合。让每一次滚动和点击，都带着读者更靠近你想表达的内容。',
  '<strong>如果某个项目让你好奇，不妨顺着链接继续探索。</strong>去 GitHub 阅读 README，看看代码，也亲手试一试。找到适合自己的部分，再把想法变成新的作品。如果这些内容对你有帮助，欢迎留下一颗 Star。<strong>接下来，试着做点什么？</strong>',
];
