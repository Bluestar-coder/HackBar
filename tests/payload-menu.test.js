const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const panelHtml = fs.readFileSync(path.join(__dirname, "..", "panel.html"), "utf8");

[
  "MySQL version",
  "Postgres version",
  "MSSQL delay",
  "Oracle delay",
  "Union 3 columns",
  "Error extractvalue",
  "Stacked query",
  "Body onload",
  "Details ontoggle",
  "MathML href",
  "HTML entity script",
  "Template breakout",
  "SSRF localhost",
  "SSRF metadata",
  "Open redirect",
  "CRLF header",
  "Log4Shell probe",
  "XXE parameter",
  "SSTI Freemarker",
  "SSTI Velocity"
].forEach((label) => {
  assert.ok(panelHtml.includes(`>${label}</button>`), `Missing payload label: ${label}`);
});

[
  "' UNION SELECT NULL,NULL,NULL-- ",
  "WAITFOR DELAY '0:0:5'-- ",
  "DBMS_PIPE.RECEIVE_MESSAGE",
  "&lt;script&gt;alert(1)&lt;/script&gt;",
  "%0d%0aX-Test: test",
  "${jndi:ldap://127.0.0.1/a}"
].forEach((payload) => {
  assert.ok(panelHtml.includes(payload), `Missing payload value: ${payload}`);
});

console.log("payload menu tests passed");
