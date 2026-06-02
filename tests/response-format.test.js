const assert = require("node:assert");
const { formatResponseBody, highlightResponseBody } = require("../response-format");

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

const highlightedText = highlightResponseBody("a < b", "text");
assert.strictEqual(highlightedText, "a &lt; b");

console.log("response format tests passed");
