const assert = require("node:assert");
const { createPageUpdateScript } = require("../page-update");

const getScript = createPageUpdateScript({
  method: "GET",
  url: "https://example.com/search?q=test",
  body: ""
});

assert.match(getScript, /window\.location\.href/);
assert.match(getScript, /https:\/\/example\.com\/search\?q=test/);

const postScript = createPageUpdateScript({
  method: "POST",
  url: "https://example.com/login",
  body: "user=admin&token=abc123"
});

assert.match(postScript, /document\.createElement\("form"\)/);
assert.match(postScript, /form\.method = "POST"/);
assert.match(postScript, /form\.action = "https:\/\/example\.com\/login"/);
assert.match(postScript, /nameInput\.name = name/);
assert.match(postScript, /nameInput\.value = value/);
assert.match(postScript, /form\.submit\(\)/);

const multilinePostScript = createPageUpdateScript({
  method: "POST",
  url: "https://example.com/login",
  body: "user=admin\ntoken=abc123"
});

assert.match(multilinePostScript, /new URLSearchParams\("user=admin&token=abc123"\)/);

console.log("page update tests passed");
