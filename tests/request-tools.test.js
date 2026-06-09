const assert = require("node:assert");
const { applyRequestTool, formatBodyForContentType } = require("../request-tools");

(async () => {
  assert.strictEqual(await applyRequestTool("html-encode", "<a b=\"c\">"), "&lt;a b=&quot;c&quot;&gt;");
  assert.strictEqual(await applyRequestTool("html-decode", "&lt;a&gt;&amp;"), "<a>&");
  assert.strictEqual(await applyRequestTool("hex-encode", "Hack"), "4861636b");
  assert.strictEqual(await applyRequestTool("hex-decode", "48 61 63 6b"), "Hack");
  assert.strictEqual(await applyRequestTool("unicode-encode", "A中"), "\\u0041\\u4e2d");
  assert.strictEqual(await applyRequestTool("unicode-decode", "\\u0041\\u4e2d"), "A中");
  assert.strictEqual(await applyRequestTool("url-encode", "a b&c"), "a%20b%26c");
  assert.strictEqual(await applyRequestTool("url-decode", "a%20b%26c"), "a b&c");
  assert.strictEqual(await applyRequestTool("url-encode-all", "A 中"), "%41%20%E4%B8%AD");
  assert.strictEqual(await applyRequestTool("url-decode-plus", "a+b%26c"), "a b&c");
  assert.strictEqual(await applyRequestTool("base64-encode", "HackBar"), "SGFja0Jhcg==");
  assert.strictEqual(await applyRequestTool("base64-decode", "SGFja0Jhcg=="), "HackBar");
  assert.strictEqual(await applyRequestTool("base64url-encode", "a+b/c?"), "YStiL2M_");
  assert.strictEqual(await applyRequestTool("base64url-decode", "YStiL2M_"), "a+b/c?");
  assert.strictEqual(await applyRequestTool("html-decimal-encode", "<A中>"), "&#60;&#65;&#20013;&#62;");
  assert.strictEqual(await applyRequestTool("html-hex-encode", "<A中>"), "&#x3c;&#x41;&#x4e2d;&#x3e;");
  assert.strictEqual(await applyRequestTool("binary-encode", "A中"), "01000001 11100100 10111000 10101101");
  assert.strictEqual(await applyRequestTool("binary-decode", "01000001 11100100 10111000 10101101"), "A中");
  assert.strictEqual(await applyRequestTool("charcode-encode", "Az中"), "65 122 20013");
  assert.strictEqual(await applyRequestTool("charcode-decode", "65 122 20013"), "Az中");
  assert.strictEqual(await applyRequestTool("rot13", "Attack at dawn!"), "Nggnpx ng qnja!");
  assert.strictEqual(await applyRequestTool("json-escape", "a\"b\n中"), "a\\\"b\\n中");
  assert.strictEqual(await applyRequestTool("json-unescape", "a\\\"b\\n中"), "a\"b\n中");
  assert.strictEqual(await applyRequestTool("md5", "HackBar"), "a0e7b01008e940a5d4a8c0834acd3f7b");
  assert.strictEqual(await applyRequestTool("sha1", "HackBar"), "5f5c088c14c37989ea0cf04493292341f7e45582");
  assert.strictEqual(await applyRequestTool("sha256", "HackBar"), "10760c18a90f2180ea5e62b64d85296ce79c8e2012cf1b2b40bdf53651c49668");
  assert.strictEqual(await applyRequestTool("sha384", "HackBar"), "327c1c71e7eb6f53b44baa65efc6236f9dae4ef3370348ebd19774454ff9dab93c577ca55bdf79146051e761c58e1493");
  assert.strictEqual(await applyRequestTool("sha512", "HackBar"), "1a5570cdd346c4034b465575426e07aa68e8b09b61209142c795d5e8590899b7345c5e6fcdf39ddefc2aca9ebc156ed15785eb3a7db2532202f672679b9372a5");

  await assert.rejects(() => applyRequestTool("hex-decode", "xx"), /valid hex/);
  await assert.rejects(() => applyRequestTool("binary-decode", "0102"), /valid binary/);
  await assert.rejects(() => applyRequestTool("charcode-decode", "abc"), /valid character code/);
  await assert.rejects(() => applyRequestTool("base64url-decode", "%%%"), /valid Base64URL/);
  await assert.rejects(() => applyRequestTool("json-unescape", "\\u"), /valid JSON string content/);
  await assert.rejects(() => applyRequestTool("unknown", "x"), /Unknown tool/);

  assert.strictEqual(
    formatBodyForContentType('{"name":"admin","roles":["user","ops"]}', "application/json").body,
    '{\n  "name": "admin",\n  "roles": [\n    "user",\n    "ops"\n  ]\n}'
  );
  assert.strictEqual(
    formatBodyForContentType("a=1\nb=two words", "application/x-www-form-urlencoded").body,
    "a=1&b=two+words"
  );
  assert.deepStrictEqual(formatBodyForContentType("", "application/x-www-form-urlencoded"), {
    body: "key=value&other=value",
    formatted: true,
    templated: true
  });
  assert.deepStrictEqual(formatBodyForContentType("", "application/xml"), {
    body: '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  <item>value</item>\n</root>',
    formatted: true,
    templated: true
  });
  assert.deepStrictEqual(formatBodyForContentType("key=value&other=value", "application/xml"), {
    body: '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  <item>value</item>\n</root>',
    formatted: true,
    templated: true
  });
  assert.deepStrictEqual(
    formatBodyForContentType('<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  <item>value</item>\n</root>', "application/x-www-form-urlencoded"),
    {
      body: "key=value&other=value",
      formatted: true,
      templated: true
    }
  );
  assert.deepStrictEqual(formatBodyForContentType("", "multipart/form-data; boundary=----HackBarBoundary"), {
    body: [
      "------HackBarBoundary",
      'Content-Disposition: form-data; name="file"; filename="example.txt"',
      "Content-Type: text/plain",
      "",
      "file content",
      "------HackBarBoundary",
      'Content-Disposition: form-data; name="name"',
      "",
      "value",
      "------HackBarBoundary--"
    ].join("\n"),
    formatted: true,
    templated: true
  });
  assert.deepStrictEqual(
    formatBodyForContentType("key=value&other=value", "multipart/form-data; boundary=----HackBarBoundary"),
    {
      body: [
        "------HackBarBoundary",
        'Content-Disposition: form-data; name="file"; filename="example.txt"',
        "Content-Type: text/plain",
        "",
        "file content",
        "------HackBarBoundary",
        'Content-Disposition: form-data; name="name"',
        "",
        "value",
        "------HackBarBoundary--"
      ].join("\n"),
      formatted: true,
      templated: true
    }
  );
  assert.strictEqual(
    formatBodyForContentType("plain", "text/plain").body,
    "plain"
  );
  assert.strictEqual(
    formatBodyForContentType("{", "application/json").formatted,
    false
  );

  console.log("request tool tests passed");
})();
