# Search and sharing · 搜索与分享

**orocoaweb** is the public project name; **orocoa_web** is the GitHub repository name. Both names refer to this interactive portfolio website template by [orocoa](https://github.com/orocoa).

- [Source and bilingual README](https://github.com/orocoa/orocoa_web)
- [Interactive live demo](https://webdemo.kai-nex.com/)
- [Sitemap](https://webdemo.kai-nex.com/sitemap.xml)
- [Crawler policy](https://webdemo.kai-nex.com/robots.txt)

## What is included

The home page supplies a descriptive title, summary, canonical URL, WebSite microdata with the alternate name, and Open Graph / Twitter sharing metadata. The public project name also appears in the visible Profile section. Existing artwork, motion and navigation are retained.

The sitemap lists the homepage and All work. Both return useful HTML before JavaScript: homepage text and project links, plus the 19-entry All work index. The interactive project controls progressively replace the initial links. Cover-only detail pages use `noindex, follow`; they are not promoted as 19 separate substantive applications. They remain available to visitors, and their GitHub / README links work normally.

Both languages use the same page URL and session language preference. No separate language URLs, fabricated reviews, usage counts, keyword pages or automatic Star actions are added. Microdata keeps the existing strict script policy; there are no new inline scripts or tracking requests. The social preview points to the already public homepage screenshot in this repository.

## Use your own domain

```sh
node scripts/build-demo.mjs --base=/ --site-url=https://portfolio.example.com/
```

`SITE_URL` is the equivalent environment variable. It accepts an HTTPS origin, without a path, credentials, query or fragment; use `--base=/portfolio/` for a path prefix. Replace the project identity, repository links and social screenshot when reusing the template. For a subpath, merge the Sitemap line into the host's root robots.txt without overriding its existing rules.

## Discovery and verification

GitHub repository search and web-search indexing are separate. A matching repository result does not prove Google, Bing or Baidu have indexed the demo. Titles, canonical URLs, a sitemap and real links make the pages discoverable; they do not guarantee indexing, a chosen snippet or a ranking.

Site owners can submit the sitemap and inspect the homepage in an authorized Google Search Console or Bing Webmaster Tools property. Ownership verification requires the owner's account; do not invent verification tokens or submit using another person's property. Check actual platform results after submission. Keep dated checks outside the public source rather than adding private console records here.

## 中文说明

**orocoaweb** 是公开项目名称，**orocoa_web** 是 GitHub 仓库名称，两者指向同一份开源交互作品集模板。网页标题、摘要、可见 Profile 文字、标准网址、站点名称结构化标记和分享预览使用一致的身份；README 保留中英文入口、运行方法和实际截图。

站点地图仅列出有完整内容的首页与 All work。项目列表在原始 HTML 中提供 19 个真实链接，JavaScript 就绪后增强为原交互；封面演示详情不单独作为完整项目收录。已有动效、封面和导航保留，不堆砌关键词或生成重复推广页，也不加入统计脚本和自动 Star。

部署到自己的域名时请设置上述 `--site-url`／`SITE_URL`，子路径另用 `--base`；同时替换身份、仓库与分享截图。网站已准备好的抓取入口不代表搜索引擎已收录。站长可在自己有权限的 Search Console／Bing Webmaster Tools 中提交 sitemap 和检查首页；具体收录与排序由搜索平台决定。

If this template helps you, a [Star on GitHub](https://github.com/orocoa/orocoa_web) is welcome. 如果对你有帮助，欢迎给项目一个 Star。
