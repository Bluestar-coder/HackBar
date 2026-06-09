const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const panelHtml = fs.readFileSync(path.join(root, "panel.html"), "utf8");
const panelJs = fs.readFileSync(path.join(root, "panel.js"), "utf8");
const panelCss = fs.readFileSync(path.join(root, "panel.css"), "utf8");
const manifest = fs.readFileSync(path.join(root, "manifest.json"), "utf8");
const encryptionMenu = getMenuHtml("Encryption");
const encodingMenu = getMenuHtml("Encoding");

[
  '<script src="editor-history.js"></script>',
  'id="method"',
  'id="contentType"',
  'class="option-field content-type-field"',
  'value="multipart/form-data; boundary=----HackBarBoundary"',
  "File upload",
  'data-tool="md5"',
  'data-tool="sha256"',
  'data-tool="sha384"',
  'data-tool="sha512"',
  'data-tool="url-encode-all"',
  'data-tool="url-decode-plus"',
  'data-tool="base64-encode"',
  'data-tool="base64-decode"',
  'data-tool="base64url-encode"',
  'data-tool="base64url-decode"',
  'data-tool="html-decimal-encode"',
  'data-tool="html-hex-encode"',
  'data-tool="binary-encode"',
  'data-tool="binary-decode"',
  'data-tool="charcode-encode"',
  'data-tool="charcode-decode"',
  'data-tool="rot13"',
  'data-tool="json-escape"',
  'data-tool="json-unescape"'
].forEach((snippet) => {
  assert.ok(panelHtml.includes(snippet), `Missing retained request option: ${snippet}`);
});

[
  "applyContentTypeShortcut",
  "formatBodyForContentType",
  "shouldSendBody",
  "syncMethodState",
  "createEditorHistory",
  "handleKeyboardShortcut",
  "Ctrl/Cmd+Z",
  "Ctrl/Cmd+Y"
].forEach((snippet) => {
  assert.ok(panelJs.includes(snippet), `Missing retained request behavior: ${snippet}`);
});

[
  "#contentType",
  "min-width: 156px",
  ".option-row .option-field"
].forEach((snippet) => {
  assert.ok(panelCss.includes(snippet), `Missing stable request option layout: ${snippet}`);
});

[
  "workspace-tools",
  "Payload Search",
  "Favorites",
  "Custom Payloads",
  "Presets",
  "payloadSearch",
  "historyList",
  "presetList",
  "customPayloads",
  "app-state.js",
  'id="prettyJson"',
  'id="minifyJson"',
  "Pretty JSON",
  "Minify JSON",
  "formatRequestJson",
  "body-tools",
  'id="postData"',
  "Post data",
  "syncPostDataState"
].forEach((snippet) => {
  assert.ok(!panelHtml.includes(snippet), `Removed workspace feature is still present: ${snippet}`);
  assert.ok(!panelJs.includes(snippet), `Removed workspace behavior is still present: ${snippet}`);
});

assert.ok(!panelHtml.includes("History"), "Removed workspace History menu is still present");
[
  'data-tool="base64-encode"',
  'data-tool="base64-decode"',
  'data-tool="base64url-encode"',
  'data-tool="base64url-decode"'
].forEach((snippet) => {
  assert.ok(!encryptionMenu.includes(snippet), `Encoding tool should not be duplicated in Encryption: ${snippet}`);
  assert.ok(encodingMenu.includes(snippet), `Encoding menu is missing Base64 tool: ${snippet}`);
});
assert.ok(encryptionMenu.includes('data-tool="md5"'), "Encryption menu should retain hash tools");

assert.ok(!manifest.includes('"storage"'), "Storage permission should be removed with persisted workspace state");
assert.ok(!fs.existsSync(path.join(root, "app-state.js")), "app-state.js should be removed");

console.log("request option layout tests passed");

function getMenuHtml(summary) {
  const escapedSummary = summary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = panelHtml.match(new RegExp(`<details class="menu">\\s*<summary>${escapedSummary}</summary>([\\s\\S]*?)</details>`));
  assert.ok(match, `Missing ${summary} menu`);
  return match[1];
}
