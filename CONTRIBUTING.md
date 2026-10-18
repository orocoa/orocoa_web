# Contributing

[English](#english) · [简体中文](#简体中文)

## English

Thank you for helping improve **orocoa_web**. Bug reports, documentation fixes, and focused improvements are welcome.

### Report an issue

Use [GitHub Issues](https://github.com/orocoa/orocoa_web/issues). Include:

- Steps to reproduce the issue and the page where it occurs.
- The expected behavior and what actually happened.
- Your browser and screen size; add a screenshot for a visual issue when useful.

Keep credentials, personal records, and private screenshots out of public reports. Read [SECURITY.md](SECURITY.md) for security and publication considerations.

### Make a change

1. Fork the repository and create a branch for one focused change.
2. Follow the [quick start](README.md#quick-start) with Node.js 22 or newer. Edit the maintained `dist/` files directly; restart the preview after editing.
3. Preserve English / Chinese copy, keyboard navigation, phone layouts, reduced-motion behavior, and return navigation.
4. Run the checks below. For a visual change, also check the affected desktop and phone flows in a browser.
5. Open a pull request that explains the problem, resulting behavior, and validation. Include appropriate screenshots for visual changes.

```sh
node scripts/check.mjs
node --test scripts/*.test.mjs
node scripts/release-ready.mjs
node scripts/build-demo.mjs --base=/
```

Add a regression test when it protects meaningful behavior. A documentation-only correction does not need a new runtime test.

### Content and licensing

Contribute only code and assets you are entitled to distribute. Do not include credentials, private media, personal records, local evidence, unrelated project implementations, or unrelated Git history. Retain applicable copyright and license notices; see [ASSETS.md](ASSETS.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Generated previews and local environments belong under the ignored `output/` directory. Do not commit them. Static hosting uses only the reviewed `site/` export, not the complete repository.

## 简体中文

感谢你帮助改进 **orocoa_web**。欢迎提交问题、修正文档，以及范围明确的改进。

### 报告问题

通过 [GitHub Issues](https://github.com/orocoa/orocoa_web/issues) 提供：

- 复现步骤与出现问题的页面。
- 预期行为与实际表现。
- 浏览器及屏幕尺寸；视觉问题可以附上有帮助的截图。

不要在公开报告中包含凭据、私人记录或私密截图。安全与公开发布注意事项见 [SECURITY.md](SECURITY.md)（英文）。

### 修改与提交

1. Fork 仓库，为一个范围明确的改动创建分支。
2. 使用 Node.js 22 或更新版本，按[快速开始](README.zh-CN.md#快速开始)运行项目。直接编辑 `dist/` 中维护的文件，修改后重启预览。
3. 保持中英文内容、键盘导航、手机布局、减少动态效果偏好与返回导航正常。
4. 运行下列检查；视觉修改还需在浏览器中检查受影响的桌面和手机交互。
5. 提交 Pull Request，说明问题、修改后的行为与验证结果；视觉改动附上适当截图。

```sh
node scripts/check.mjs
node --test scripts/*.test.mjs
node scripts/release-ready.mjs
node scripts/build-demo.mjs --base=/
```

当测试能保护实际行为时，再增加回归测试。仅修正文档时，无需新增运行时测试。

### 内容与许可

只提交你有权分发的代码和素材。不要包含凭据、私有媒体、个人记录、本地检查证据、其他项目的实现代码或无关 Git 历史。保留适用的版权与许可声明，详见 [ASSETS.md](ASSETS.md) 和 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)（英文）。

生成的预览与本地环境保留在已被 Git 忽略的 `output/` 中，不要提交。静态托管只使用审核后的 `site/` 导出目录，不上传整个仓库。
