const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { formatResponseBody, formatHttpResponse, highlightResponseBody, wrapLongLines } = require("../response-format");

const panelHtml = fs.readFileSync(path.join(__dirname, "..", "panel.html"), "utf8");

const json = formatResponseBody('{"name":"HackBar","items":[1,2]}', {
  "content-type": "application/json"
});

assert.strictEqual(json.type, "json");
assert.strictEqual(json.body, '{\n  "name": "HackBar",\n  "items": [\n    1,\n    2\n  ]\n}');

const html = formatResponseBody("<!DOCTYPE html><html><body><h1>Hello</h1><p>World</p></body></html>", {
  "content-type": "text/html"
});

assert.strictEqual(html.type, "html");
assert.match(html.body, /<!DOCTYPE html>\n<html>\n  <body>\n    <h1>Hello<\/h1>/);
assert.match(html.body, /    <p>World<\/p>\n  <\/body>\n<\/html>/);

const text = formatResponseBody("plain text", {
  "content-type": "text/plain"
});

assert.strictEqual(text.type, "text");
assert.strictEqual(text.body, "plain text");

const highlightedJson = highlightResponseBody('{\n  "name": "HackBar",\n  "enabled": true,\n  "count": 2\n}', "json");
assert.match(highlightedJson, /<span class="syntax-key">&quot;name&quot;<\/span>/);
assert.match(highlightedJson, /<span class="syntax-string">&quot;HackBar&quot;<\/span>/);
assert.match(highlightedJson, /<span class="syntax-boolean">true<\/span>/);
assert.match(highlightedJson, /<span class="syntax-number">2<\/span>/);

const highlightedHtml = highlightResponseBody('<script>alert("x")</script>', "html");
assert.match(highlightedHtml, /&lt;<span class="syntax-tag">script<\/span>&gt;/);
assert.match(highlightedHtml, /&lt;\/<span class="syntax-tag">script<\/span>&gt;/);
assert.doesNotMatch(highlightedHtml, /<script>/);

const htmlWithEmbeddedData = formatResponseBody('<html><body><script type="speculationrules">{"prefetch":[{"urls":["https://example.test/a","https://example.test/b"],"requires":["anonymous-client-ip-when-cross-origin"]}]}</script><script>const enabled=true;window.x=["a","b"];</script></body></html>', {
  "content-type": "text/html"
});
assert.match(htmlWithEmbeddedData.body, /<script type="speculationrules">\n\s+\{\n\s+"prefetch": \[/);
assert.match(htmlWithEmbeddedData.body, /\n\s+const enabled=true;/);
assert.match(htmlWithEmbeddedData.body, /\n\s+window\.x=/);

const highlightedLink = highlightResponseBody('<a href="https://example.test/?a=1&b=2">link</a>', "html");
assert.match(highlightedLink, /<span class="syntax-attr">href<\/span>=<span class="syntax-string">&quot;https:\/\/example\.test\/\?a=1&amp;b=2&quot;<\/span>/);
assert.match(highlightedLink, /&lt;<span class="syntax-tag">a<\/span>/);

const highlightedScript = highlightResponseBody('  const enabled=true;\n  window.x=[\n    "a"\n  ];', "html");
assert.match(highlightedScript, /<span class="syntax-keyword">const<\/span>/);
assert.match(highlightedScript, /<span class="syntax-boolean">true<\/span>/);
assert.match(highlightedScript, /<span class="syntax-string">&quot;a&quot;<\/span>/);

const wrapped = wrapLongLines(`  <script>${"a".repeat(700)}</script>`, 120);
assert.ok(wrapped.split("\n").length > 1);
assert.ok(Math.max(...wrapped.split("\n").map((line) => line.length)) <= 140);

const highlightedText = highlightResponseBody("a < b", "text");
assert.strictEqual(highlightedText, "a &lt; b");

const httpResponse = formatHttpResponse({
  status: 200,
  statusText: "OK",
  headers: {
    "server": "nginx/1.26.2",
    "content-type": "application/json",
    "x-frame-options": "DENY"
  },
  body: '{"success":true}'
});
assert.strictEqual(
  httpResponse,
  [
    "HTTP/1.1 200 OK",
    "server: nginx/1.26.2",
    "content-type: application/json",
    "x-frame-options: DENY",
    "",
    '{"success":true}'
  ].join("\n")
);

assert.ok(panelHtml.includes('data-response-tab="raw"'), "Raw response tab is required");
assert.ok(panelHtml.includes('id="responseRaw"'), "Raw response textarea is required");

console.log("response format tests passed");
