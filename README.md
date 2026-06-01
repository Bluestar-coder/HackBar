# HackBar

HackBar 是一个基于 Chrome Extension Manifest V3 的 DevTools 面板扩展，目标是复刻经典 HackBar 的请求编辑和测试体验。

## 本地加载

1. 打开 `chrome://extensions`。
2. 开启右上角的“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择当前项目目录：`E:\Code\ChromeExt\hackbar`。
5. 打开任意网页。
6. 打开 Chrome DevTools，切换到 `HackBar` 面板。

## 当前功能

- 在 DevTools 中提供 `HackBar` 面板。
- 一键加载当前 inspected page 的 URL。
- 经典布局：顶部工具菜单、左侧 `Load URL` / `Split URL` / `Execute` 操作按钮。
- 默认 GET 模式，只显示 URL 输入框。
- 勾选 `Post data` 后显示 POST 数据编辑框，并以 POST 请求发送。
- `Split URL` 会根据 `Post data` 状态拆分参数：
  - 未勾选 `Post data`：参数在 URL 框内分行展示。
  - 勾选 `Post data`：URL 保留基础路径，参数移动到 Post data 框。
- 支持可选 Referer、User Agent、Cookies 输入区。
- 支持高级 Headers 编辑区。
- 请求通过 MV3 background service worker 代理发送。
- 默认使用 `credentials: "include"`，尽量携带浏览器管理的登录态 Cookie。
- 显示响应状态、耗时、大小、响应 Body 和响应 Headers。
- Response 区支持 `Body` / `Headers` 标签切换和折叠展开。
- 根据 DevTools 停靠形态自适应布局：
  - 底部停靠时默认折叠 Response。
  - 右侧停靠时 Response 占满下方剩余空间。
- 支持 URL encode/decode、Base64 encode/decode。
- 菜单支持 SQL、XSS、Other 常用 payload 插入。

## 已知限制

- Chrome Fetch API 对部分请求头有限制，`User-Agent`、`Cookie` 等 header 可能被浏览器拒绝或忽略。
- Cookie 的主要生效方式是浏览器管理的登录态和 `credentials: "include"`。
- 当前版本没有自动化漏洞测试、payload 字典管理、历史记录、cURL 导入导出。
- 当前版本不预览二进制响应。

## 项目结构

- `manifest.json`：扩展清单文件。
- `devtools.html` / `devtools.js`：注册 DevTools 面板。
- `panel.html` / `panel.css` / `panel.js`：HackBar 面板界面与交互逻辑。
- `background.js`：请求代理和响应处理。
- `docs/superpowers/specs/`：设计规格文档。
- `docs/superpowers/plans/`：实现计划文档。
