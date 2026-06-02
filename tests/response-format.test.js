const assert = require("node:assert");
const { formatResponseBody } = require("../response-format");

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

console.log("response format tests passed");
