const assert = require("node:assert");
const { applyRequestTool } = require("../request-tools");

(async () => {
  assert.strictEqual(await applyRequestTool("html-encode", "<a b=\"c\">"), "&lt;a b=&quot;c&quot;&gt;");
  assert.strictEqual(await applyRequestTool("html-decode", "&lt;a&gt;&amp;"), "<a>&");
  assert.strictEqual(await applyRequestTool("hex-encode", "Hack"), "4861636b");
  assert.strictEqual(await applyRequestTool("hex-decode", "48 61 63 6b"), "Hack");
  assert.strictEqual(await applyRequestTool("unicode-encode", "A中"), "\\u0041\\u4e2d");
  assert.strictEqual(await applyRequestTool("unicode-decode", "\\u0041\\u4e2d"), "A中");
  assert.strictEqual(await applyRequestTool("url-encode", "a b&c"), "a%20b%26c");
  assert.strictEqual(await applyRequestTool("url-decode", "a%20b%26c"), "a b&c");
  assert.strictEqual(await applyRequestTool("base64-encode", "HackBar"), "SGFja0Jhcg==");
  assert.strictEqual(await applyRequestTool("base64-decode", "SGFja0Jhcg=="), "HackBar");
  assert.strictEqual(await applyRequestTool("md5", "HackBar"), "a0e7b01008e940a5d4a8c0834acd3f7b");
  assert.strictEqual(await applyRequestTool("sha1", "HackBar"), "5f5c088c14c37989ea0cf04493292341f7e45582");
  assert.strictEqual(await applyRequestTool("sha256", "HackBar"), "10760c18a90f2180ea5e62b64d85296ce79c8e2012cf1b2b40bdf53651c49668");

  await assert.rejects(() => applyRequestTool("hex-decode", "xx"), /valid hex/);
  await assert.rejects(() => applyRequestTool("unknown", "x"), /Unknown tool/);

  console.log("request tool tests passed");
})();
