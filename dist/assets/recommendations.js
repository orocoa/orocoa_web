// Public repository descriptions verified against their READMEs. No API or tracking.
export const githubProfile = 'https://github.com/orocoa';
export const githubProjects = Object.freeze([
 {name:'TuneShape',url:'https://github.com/orocoa/TuneShape',
  en:'Explore, tune and export UI motion.',zh:'体验、调节并导出 UI 动效。',
  detailEn:'TuneShape is an interactive UI motion playground. Browse effects, compare before and after, adjust the parameters and try the interaction directly.',
  detailZh:'TuneShape 是一个可交互的 UI 动效实验台。按用途浏览动效，对比调整前后，修改参数后直接体验交互。',
  focusEn:'UI motion playground',focusZh:'UI 动效实验台',workflowEn:'Explore → tune → export',workflowZh:'浏览 → 调节 → 导出'},
 {name:'Ariadne',url:'https://github.com/orocoa/Ariadne',
  en:'A workspace for job applications.',zh:'求职资料与申请工作空间。',
  detailEn:'A source-grounded workspace for personal materials and job opportunities. Keep sources alongside notes, compare a role with your experience, and review the result before saving it.',
  detailZh:'把个人材料和职位资料放进同一个工作空间，保留原始来源，结合经历分析职位；生成结果经过人工检查后，再明确保存。',
  focusEn:'Career workspace',focusZh:'求职工作空间',workflowEn:'Sources → review → save',workflowZh:'来源 → 检查 → 保存'},
 {name:'Reprise',url:'https://github.com/orocoa/Reprise',
  en:'Explore and manage Git versions.',zh:'查看与管理 Git 版本。',
  detailEn:'A local Git workspace for browsing project versions, opening reproducible previews, and keeping evidence beside the work. Explore a project’s history through a visual interface.',
  detailZh:'在本地浏览 Git 项目版本，打开可复现的预览，并把证据留在工作旁边；通过可视化界面查看项目历史。',
  focusEn:'Local Git workspace',focusZh:'本地 Git 工作台',workflowEn:'History → preview → evidence',workflowZh:'历史 → 预览 → 证据'},
 {name:'Spark',url:'https://github.com/orocoa/Spark',
  en:'Explore brand collaboration ideas.',zh:'探索品牌合作的可能性。',
  detailEn:'An interactive brand collaboration discovery demo. Explore brands through Gravity, try random combinations, and use capability avatars and Memory Blocks as prompts for further research.',
  detailZh:'一个交互式品牌合作探索演示：通过 Gravity 查看品牌，尝试随机组合，用能力角色与 Memory Block 作为继续研究的线索。',
  focusEn:'Brand collaboration demo',focusZh:'品牌合作探索演示',workflowEn:'Explore → combine → research',workflowZh:'探索 → 组合 → 研究'},
 {name:'Mac Setup',url:'https://github.com/orocoa/macbook-setup-recommendations',
  en:'A bilingual guide to Mac settings.',zh:'中英双语 Mac 设置指南。',
  detailEn:'A bilingual visual guide to practical MacBook settings. Browse interactive examples and read the recommendations in English or Chinese.',
  detailZh:'一份中英双语的 MacBook 实用设置指南，通过可视化交互示例浏览设置建议。',
  focusEn:'Interactive Mac settings guide',focusZh:'Mac 交互设置指南',workflowEn:'Browse → compare → configure',workflowZh:'浏览 → 对照 → 设置'},
].map(project=>Object.freeze(project)));
export function recommendedProject(id) {
 // Stable names keep existing destinations intact when a project is added.
 const choices={tuneshape:'TuneShape',ariadne:'Ariadne',reprise:'Reprise','aievent-web':'Ariadne','aix-origin':'Spark','mac-setup':'Mac Setup',
  'design-01':'Spark','design-02':'Mac Setup','design-03':'Reprise','design-04':'Spark','design-05':'Mac Setup',
  'design-06':'Ariadne','design-07':'Reprise','design-08':'Spark','design-09':'Mac Setup','story-catchers':'Ariadne',
  'homegrow-plastic':'Reprise',photography:'Mac Setup',mupahkc:'Spark'};
 return githubProjects.find(project=>project.name===(choices[id] ?? 'Reprise'));
}
