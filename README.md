# HackBar

HackBar 是一个基于 Chrome Extension Manifest V3 的 DevTools 面板扩展，目标是复刻经典 HackBar 的请求编辑和测试体验。

## 本地加载

1. 打开 `chrome://extensions`。
2. 开启右上角的“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择当前项目目录。
5. 打开任意网页。
6. 打开 Chrome DevTools，切换到 `HackBar` 面板。

## 当前功能

- 在 DevTools 中提供 `HackBar` 面板。
- 一键加载当前 inspected page 的 URL。
- 经典布局：顶部工具菜单、左侧 `Load URL` / `Split URL` / `Execute` 操作按钮。
- 支持 HTTP Method：`GET`、`POST`、`PUT`、`PATCH`、`DELETE`、`HEAD`、`OPTIONS`。
- 默认 GET 模式，只显示 URL 输入框；选择 POST、PUT、PATCH、DELETE 后显示 body 编辑框。
- `Split URL` 会根据当前 Method 拆分参数：
  - GET、HEAD、OPTIONS：参数在 URL 框内分行展示。
  - POST、PUT、PATCH、DELETE：URL 保留基础路径，参数移动到 body 框。
- 支持 Content-Type 快捷选择：Form、JSON、Text、XML、File upload。
- 选择 Content-Type 时会自动整理 body：JSON 自动缩进，Form 转为标准 `application/x-www-form-urlencoded` 格式；空 body 选择 Form/XML/File upload 会插入基础模板。
- 支持可选 Referer、User Agent、Cookies 输入区。
- 支持 `Update page`：Execute 成功后让当前 inspected page 跟随请求变化。
  - GET：当前页面跳转到 URL。
  - POST：在当前页面创建表单并提交，适合 `a=b&c=d` 这类表单数据。
- 支持高级 Headers 编辑区。
- 支持键盘操作：`Ctrl/Cmd+Z` 撤销、`Ctrl/Cmd+Y` 或 `Ctrl/Cmd+Shift+Z` 重做、`Ctrl/Cmd+Enter` 执行请求。
- 请求通过 MV3 background service worker 代理发送。
- 默认使用 `credentials: "include"`，尽量携带浏览器管理的登录态 Cookie。
- 显示响应状态、耗时、大小、完整 Raw 响应、响应 Body 和响应 Headers。
- Raw 响应包含状态行、响应头、空行和响应体。
- Response Body 会根据内容类型自动格式化：
  - JSON：自动缩进。
  - HTML/XML：自动分行和缩进。
  - 普通文本：保持原样。
- Response Body 和 Response Headers 支持语法高亮展示。
- Response 区支持 `Body` / `Headers` 标签切换和折叠展开。
- 根据 DevTools 停靠形态自适应布局：
  - 底部停靠时默认折叠 Response。
  - 右侧停靠时 Response 占满下方剩余空间。
- 支持常用 Encryption/Encoding 工具：MD5、SHA-1、SHA-256、SHA-384、SHA-512、URL、Form URL、Base64、Base64URL、HTML、HTML Decimal/Hex Entity、Hex、Binary、Unicode、Char Code、JSON Escape/Unescape、ROT13。
- 菜单支持 SQL、XSS、Other 常用 payload 插入。

## 已知限制

- Chrome Fetch API 对部分请求头有限制，`User-Agent`、`Cookie` 等 header 可能被浏览器拒绝或忽略。
- Cookie 的主要生效方式是浏览器管理的登录态和 `credentials: "include"`。
- Raw 响应由 Fetch API 可见的状态、响应头和响应体重建，不是浏览器网络栈的原始 TCP 报文；`Set-Cookie` 等受限响应头可能不可见。
- `Update page` 的 POST 模式适合传统表单提交，不适合任意 JSON body 或复杂自定义 Header。
- 当前版本没有自动化漏洞测试、payload 字典管理、请求历史记录、cURL 导入导出。
- 当前版本不预览二进制响应。

## 项目结构

- `manifest.json`：扩展清单文件。
- `devtools.html` / `devtools.js`：注册 DevTools 面板。
- `panel.html` / `panel.css` / `panel.js`：HackBar 面板界面与交互逻辑。
- `request-tools.js`：请求编辑区的编码、摘要和 body 格式化工具。
- `editor-history.js`：请求编辑区撤销/重做历史。
- `page-update.js`：生成 inspected page 跳转或表单提交脚本。
- `response-format.js`：响应内容格式化。
- `response-tree.js`：JSON/HTML 响应树视图渲染。
- `background.js`：请求代理和响应处理。
- `tests/`：Node 自动化测试。
- `docs/superpowers/specs/`：设计规格文档。
- `docs/superpowers/plans/`：实现计划文档。
