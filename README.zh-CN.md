# orocoaweb · orocoa_web

[English](README.md) · **简体中文**

[![CI](https://github.com/orocoa/orocoa_web/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/orocoa/orocoa_web/actions/workflows/ci.yml)

**orocoaweb**（仓库名 **orocoa_web**）是由 [orocoa](https://github.com/orocoa) 维护的开源交互式个人网站与静态模板。点云开场、设备转场、项目画廊和中英文内容连接在同一条浏览路径中，可以直接运行，也可以替换内容后自行部署。

[在线预览](https://webdemo.kai-nex.com/) · [页面截图](#页面截图) · [快速开始](#快速开始) · [问题反馈](https://github.com/orocoa/orocoa_web/issues)

![orocoa_web 首页：电脑点云与 Hello, I’m orocoa 问候文字](docs/preview-home.png)

## 项目简介

**orocoa_web**，也写作 **orocoaweb**，可以作为个人作品集的起点，也可以用来研究网页中的交互与动效。项目采用 HTML、CSS、JavaScript 模块、Three.js、GSAP 和 Lenis；浏览器端依赖与字体已随仓库提供，运行时无需安装依赖、数据库、账号或 API Key。

**在线 Demo：[webdemo.kai-nex.com](https://webdemo.kai-nex.com/)**

预览站运行这份公开网站模板，内容由 Demo 文案、展示封面和公开 GitHub 项目链接组成。本仓库提供网站本身的实现；链接到的其他应用在各自仓库中独立维护。

## 目录

- [功能概览](#功能概览)
- [页面截图](#页面截图)
- [快速开始](#快速开始)
- [目录结构](#目录结构)
- [修改内容](#修改内容)
- [开发与检查](#开发与检查)
- [部署](#部署)
- [贡献与支持](#贡献与支持)
- [公开内容与素材](#公开内容与素材)
- [许可与致谢](#许可与致谢)

## 功能概览

- **点云开场**：点随鼠标移动散开，停止后归位。
- **连续首页**：精选作品、设备转场与最后一页 Profile 共用一条滚动浏览路径。
- **项目浏览**：19 个封面条目、WebGL 轮播、项目选择、键盘导航与触摸交互。
- **项目详情**：封面放大、返回导航，以及对应 GitHub 仓库和 README 入口。
- **语言与布局**：中英文切换、手机布局，以及对减少动态效果偏好的支持。

精选作品顺序为 **TuneShape → ? / Shift → Reprise → Mac Setup**，All work 第一项也是 TuneShape。精选封面默认灰度、悬停显色；All work 与详情页封面保留原色。五个公开项目保留各自介绍，其余条目使用 Demo 文案。报告入口展示 GitHub 推荐，不加载原始 PDF。

## 页面截图

以下是当前公开模板在浏览器中的实际运行画面。点击图片可查看原尺寸大图。

| 精选作品 · Selected work | 全部作品 · All work |
| --- | --- |
| [![精选作品：四张灰度封面与项目介绍](docs/preview-selected.png)](docs/preview-selected.png) | [![All work：保留原色的项目封面轮播](docs/preview-all-work.png)](docs/preview-all-work.png) |
| **项目详情 · Project** | **最后一页 · Profile** |
| [![TuneShape 项目详情与 GitHub、README 入口](docs/preview-project.png)](docs/preview-project.png) | [![演示介绍与开源项目链接](docs/preview-profile.png)](docs/preview-profile.png) |

## 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) **22 或更新版本**。
- 克隆仓库时需要 Git；也可以从 GitHub 下载源码 ZIP 后解压。

### 本地运行

```sh
git clone https://github.com/orocoa/orocoa_web.git
cd orocoa_web
node scripts/serve.mjs
```

打开 **[http://127.0.0.1:4321/webdemo/](http://127.0.0.1:4321/webdemo/)**。

无需执行 `npm install`。预览服务会在内存中准备公开文件，并监听本机回环地址。**修改源文件后需要重启服务**，目前不提供热更新。

| 环境变量 | 默认值 | 用途 |
| --- | --- | --- |
| `PORT` | `4321` | 本地预览端口。 |
| `DEMO_BASE` | `/webdemo/` | 本地预览使用的部署前缀，支持 `/` 或单层小写目录，例如 `/webdemo/`。 |

## 目录结构

```text
.
├── dist/                     # 直接维护的网站源码与浏览器端依赖
│   ├── index.html            # 首页与精选作品结构
│   ├── home/                 # 开场点云与问候文字
│   ├── fields/               # 精选作品文案和交互
│   ├── profile/              # 最后一页与本地化文案
│   ├── project/              # All work 轮播与项目详情
│   ├── content/              # 项目目录与双语元数据
│   ├── assets/               # 共享模块与 GitHub 推荐
│   ├── media/                # 展示封面及衍生尺寸
│   └── vi/                   # 共享样式、字体与动效
├── scripts/                  # 预览、校验、测试与静态导出
├── docs/                     # README 预览截图
├── LICENSES/                 # 第三方许可文件
└── .github/workflows/ci.yml   # 源码检查与静态导出验证
```

本仓库直接维护 `dist/`。构建在 `output/releases/` 下生成快照，不会重新生成或覆盖 `dist/`；生成结果已被 Git 忽略。

## 修改内容

| 文件或目录 | 可修改内容 |
| --- | --- |
| `dist/index.html` | 问候文字、精选作品链接和图片，以及英文 Profile 文案。 |
| `dist/fields/fields.js` | 精选作品的双语描述。 |
| `dist/profile/copy.js` | 中文 Profile 文案与双语标签。 |
| `dist/content/projects.json` | 项目顺序、封面路径、尺寸与 All work 灰度标记。 |
| `dist/content/display.json` | 双语项目名称、分类与年份。 |
| `dist/content/tuneshape.json` | TuneShape 封面、介绍与目标链接。 |
| `dist/project/data.js` | 项目详情内容与目录适配。 |
| `dist/assets/recommendations.js` | 公开 GitHub 项目推荐。 |
| `dist/media/` | 你自己有权使用的封面素材。 |
| `dist/vi/` | 共享样式、字体与动效。 |

用你有权公开的文案、链接和图片替换演示内容，保持首页与项目目录中的封面路径一致，再检查中英文和手机布局。修改中文后，可能需要更新内置字体子集，具体见 [PREPARE-RELEASE.md](PREPARE-RELEASE.md)（英文）。

## 开发与检查

运行与 CI 相同的检查：

```sh
node scripts/check.mjs
node --test scripts/*.test.mjs
node scripts/release-ready.mjs
```

检查覆盖源码语法、运行依赖、项目记录、图片元数据、导航与部署路径。CI 还会在 Node.js 22 上验证根路径静态导出。涉及视觉修改时，需要在浏览器中检查受影响的桌面和手机交互；自动检查不能替代视觉核对。

## 部署

部署到域名根路径时：

```sh
node scripts/build-demo.mjs --base=/
```

部署到子路径时：

```sh
node scripts/build-demo.mjs --base=/webdemo/
```

部署到自己的域名时，请显式设置 HTTPS 站点源，让标准网址、结构化标记、分享标签、robots.txt 和 sitemap.xml 指向自己的部署：

```sh
node scripts/build-demo.mjs --base=/ --site-url=https://portfolio.example.com/
```

默认站点源为 orocoaweb 官方 Demo，也可以通过环境变量 `SITE_URL` 设置。站点地图包含首页与 All work；只有封面和演示文案的详情页使用 `noindex, follow`，避免将占位内容当成独立作品收录。中英文在同一页面网址切换，因此不声明独立语言网址。搜索与分享设置见 [SEARCH.md](SEARCH.md)。

命令会输出 **`output/releases/<hash>/site/`** 的实际位置。只将这个目录发布到静态托管服务。使用子路径时，保留导出的目录结构，并让托管服务在对应前缀下提供文件。

导出包含适用于 EdgeOne Makers 的响应头配置 `edgeone.json`。其他托管平台需要设置等效响应头，并让不存在的文件返回真实 404。GitHub Actions 只校验源码和导出，**不会自动部署在线 Demo**。完整流程见 [PREPARE-RELEASE.md](PREPARE-RELEASE.md) 和 [SECURITY.md](SECURITY.md)（英文）。

## 贡献与支持

欢迎提交问题和范围明确的改进。通过 [Issues](https://github.com/orocoa/orocoa_web/issues) 提供复现步骤、预期与实际表现，以及浏览器和屏幕尺寸。视觉问题可以附上适当的截图。

提交 Pull Request 前，请阅读 [CONTRIBUTING.md](CONTRIBUTING.md#简体中文)，并运行上述检查。不要在 Issue 或贡献中包含私人记录、凭据或其他项目代码。安全与公开发布注意事项见 [SECURITY.md](SECURITY.md)（英文）。

## 公开内容与素材

公开模板包含 Demo 文案、公开项目名称、GitHub 链接与展示封面；不包含原始报告和 PDF、私有相册、联系方式、云凭据、生产环境绑定或原站 Git 历史。

网站不需要 GitHub Token，不添加追踪像素，也不会自动为仓库点 Star。访问者自行决定是否打开项目链接、在 GitHub 上给项目 Star。

**代码许可证不授予作品封面、照片、商标或全部几何模型的使用权。** 将模板用于自己的作品集前，请替换展示素材。素材边界见 [ASSETS.md](ASSETS.md)，各项许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)（英文）。

## 许可与致谢

- 原创网站代码与文档使用 [MIT License](LICENSE)。
- 第三方代码、字体与设备几何模型保留各自许可，详见 [LICENSES/](LICENSES/) 和 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。GSAP 使用 GSAP Standard License，不属于本项目 MIT 许可的覆盖范围。
- 作品图片、照片、品牌与电脑点云遵循 [ASSETS.md](ASSETS.md) 中单独说明的素材边界。

项目轮播改编自 [Yousuf-developer/Viscose-carousel](https://github.com/Yousuf-developer/Viscose-carousel)。Three.js、Lenis、GSAP、字体与设备几何模型的来源均在第三方说明中列出，原有版权和许可声明保留。

项目由 [orocoa](https://github.com/orocoa) 维护。如果这份模板对你有帮助，欢迎给 **orocoa_web** 一个 Star。
