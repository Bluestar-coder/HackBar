# HackBar DevTools Panel MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Manifest V3 Chrome extension with a DevTools panel named `HackBar` that can edit and send authenticated HTTP requests and display responses.

**Architecture:** The extension is framework-free and directly loadable as an unpacked extension. `devtools.js` registers the panel, `panel.js` owns UI state and validation, and `background.js` performs network requests through a message-based request proxy.

**Tech Stack:** Chrome Extension Manifest V3, plain HTML, CSS, JavaScript, Chrome DevTools APIs, Chrome runtime messaging, Fetch API.

---

## File Structure

- Create `manifest.json`: MV3 extension metadata, DevTools page, background service worker, and host permissions.
- Create `devtools.html`: minimal document that loads `devtools.js`.
- Create `devtools.js`: registers the `HackBar` DevTools panel.
- Create `panel.html`: static UI for request editing, encoding tools, and response rendering.
- Create `panel.css`: dense tool-oriented styling for the DevTools panel.
- Create `panel.js`: inspected URL loading, form handling, header parsing, encode/decode tools, message calls, and response rendering.
- Create `background.js`: runtime message handler and `fetch` request proxy.
- Create `README.md`: local unpacked-extension run instructions and MVP capabilities.

This workspace is not currently a git repository. Do not run commit commands unless the user initializes git first.

---

### Task 1: Extension Shell

**Files:**
- Create: `manifest.json`
- Create: `devtools.html`
- Create: `devtools.js`
- Create: `README.md`

- [ ] **Step 1: Create the MV3 manifest**

Create `manifest.json` with exactly this content:

```json
{
  "manifest_version": 3,
  "name": "HackBar",
  "description": "A DevTools panel for editing and sending HTTP requests.",
  "version": "0.1.0",
  "devtools_page": "devtools.html",
  "background": {
    "service_worker": "background.js"
  },
  "host_permissions": [
    "<all_urls>"
  ]
}
```

- [ ] **Step 2: Create the DevTools page**

Create `devtools.html` with exactly this content:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>HackBar DevTools</title>
  </head>
  <body>
    <script src="devtools.js"></script>
  </body>
</html>
```

- [ ] **Step 3: Register the DevTools panel**

Create `devtools.js` with exactly this content:

```js
chrome.devtools.panels.create("HackBar", "", "panel.html");
```

- [ ] **Step 4: Create the README**

Create `README.md` with exactly this content:

```markdown
# HackBar

HackBar is a Manifest V3 Chrome extension that adds a `HackBar` panel to Chrome DevTools.

## Run Locally

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select this project directory.
5. Open any web page.
6. Open DevTools and select the `HackBar` panel.

## MVP Features

- Load the inspected page URL.
- Edit method, URL, headers, and body.
- Send requests through the extension background service worker.
- Include browser-managed credentials by default.
- Display status, elapsed time, response headers, response body, and errors.
- URL encode/decode and Base64 encode/decode selected text or the request body.
```

- [ ] **Step 5: Verify the shell files exist**

Run:

```powershell
Get-ChildItem -Name manifest.json,devtools.html,devtools.js,README.md
```

Expected output contains:

```text
manifest.json
devtools.html
devtools.js
README.md
```

---

### Task 2: Background Request Proxy

**Files:**
- Create: `background.js`

- [ ] **Step 1: Create the message handler and fetch proxy**

Create `background.js` with exactly this content:

```js
const MAX_BODY_CHARS = 1024 * 1024;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "SEND_REQUEST") {
    return false;
  }

  handleRequest(message.payload)
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error) => {
      sendResponse({
        ok: false,
        error: {
          name: error && error.name ? error.name : "Error",
          message: error && error.message ? error.message : String(error)
        }
      });
    });

  return true;
});

async function handleRequest(payload) {
  const method = String(payload.method || "GET").toUpperCase();
  const headers = payload.headers && typeof payload.headers === "object"
    ? payload.headers
    : {};
  const url = String(payload.url || "");
  const init = {
    method,
    headers,
    credentials: "include",
    redirect: "follow"
  };

  if (method !== "GET" && method !== "HEAD" && payload.body) {
    init.body = String(payload.body);
  }

  const started = performance.now();
  const response = await fetch(url, init);
  const elapsedMs = Math.round(performance.now() - started);
  const bodyText = await response.text();
  const truncated = bodyText.length > MAX_BODY_CHARS;
  const body = truncated ? bodyText.slice(0, MAX_BODY_CHARS) : bodyText;

  return {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    url: response.url,
    elapsedMs,
    headers: headersToObject(response.headers),
    body,
    truncated,
    displayedChars: body.length,
    totalChars: bodyText.length
  };
}

function headersToObject(headers) {
  const output = {};
  for (const [name, value] of headers.entries()) {
    output[name] = value;
  }
  return output;
}
```

- [ ] **Step 2: Check JavaScript syntax**

Run:

```powershell
node --check background.js
```

Expected output is empty and exit code is `0`.

---

### Task 3: Panel Markup and Styling

**Files:**
- Create: `panel.html`
- Create: `panel.css`

- [ ] **Step 1: Create panel markup**

Create `panel.html` with exactly this content:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>HackBar</title>
    <link rel="stylesheet" href="panel.css">
  </head>
  <body>
    <main class="app">
      <section class="toolbar" aria-label="Request toolbar">
        <button id="loadUrl" type="button">Load URL</button>
        <select id="method" aria-label="HTTP method">
          <option>GET</option>
          <option>POST</option>
          <option>PUT</option>
          <option>PATCH</option>
          <option>DELETE</option>
          <option>HEAD</option>
          <option>OPTIONS</option>
        </select>
        <button id="send" type="button" class="primary">Send</button>
        <span id="status" class="status" role="status">Ready</span>
      </section>

      <section class="request-grid" aria-label="Request editor">
        <label class="field url-field">
          <span>URL</span>
          <input id="url" type="url" spellcheck="false" autocomplete="off" placeholder="https://example.com/api">
        </label>

        <label class="field">
          <span>Headers</span>
          <textarea id="headers" spellcheck="false" placeholder="Accept: application/json"></textarea>
        </label>

        <label class="field">
          <span>Body</span>
          <textarea id="body" spellcheck="false" placeholder="{&quot;key&quot;:&quot;value&quot;}"></textarea>
        </label>
      </section>

      <section class="tools" aria-label="Encoding tools">
        <button type="button" data-tool="url-encode">URL Encode</button>
        <button type="button" data-tool="url-decode">URL Decode</button>
        <button type="button" data-tool="base64-encode">Base64 Encode</button>
        <button type="button" data-tool="base64-decode">Base64 Decode</button>
      </section>

      <section class="response" aria-label="Response viewer">
        <div class="response-meta">
          <span id="responseStatus">No response</span>
          <span id="responseTime"></span>
          <span id="responseSize"></span>
        </div>
        <label class="field">
          <span>Response Headers</span>
          <textarea id="responseHeaders" readonly spellcheck="false"></textarea>
        </label>
        <label class="field response-body">
          <span>Response Body</span>
          <textarea id="responseBody" readonly spellcheck="false"></textarea>
        </label>
      </section>
    </main>

    <script src="panel.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Create panel styling**

Create `panel.css` with exactly this content:

```css
:root {
  color-scheme: light dark;
  --bg: #f5f6f7;
  --panel: #ffffff;
  --text: #1f2328;
  --muted: #667085;
  --border: #cfd6dd;
  --accent: #0b6bcb;
  --accent-text: #ffffff;
  --error: #b42318;
  --ok: #067647;
  font-family: Arial, Helvetica, sans-serif;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1f2328;
    --panel: #252a31;
    --text: #f0f3f6;
    --muted: #aeb7c2;
    --border: #3d4652;
    --accent: #4ea1ff;
    --accent-text: #08111f;
    --error: #ffb4ab;
    --ok: #7ee2a8;
  }
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-size: 13px;
}

button,
select,
input,
textarea {
  font: inherit;
}

button,
select,
input,
textarea {
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--panel);
  color: var(--text);
}

button,
select {
  min-height: 30px;
  padding: 0 10px;
}

button {
  cursor: pointer;
}

button.primary {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--accent-text);
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.app {
  display: grid;
  grid-template-rows: auto auto auto 1fr;
  gap: 8px;
  min-height: 100vh;
  padding: 8px;
}

.toolbar,
.tools,
.response-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.status {
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status.is-error {
  color: var(--error);
}

.status.is-ok {
  color: var(--ok);
}

.request-grid,
.response {
  display: grid;
  gap: 8px;
}

.request-grid {
  grid-template-columns: minmax(0, 1fr) minmax(220px, 0.6fr);
}

.url-field {
  grid-column: 1 / -1;
}

.field {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.field span {
  color: var(--muted);
  font-size: 12px;
}

input,
textarea {
  width: 100%;
  padding: 8px;
  resize: vertical;
}

textarea {
  min-height: 96px;
  font-family: Consolas, "Courier New", monospace;
  line-height: 1.4;
}

.response {
  min-height: 0;
}

.response-body textarea {
  min-height: 220px;
}

.response-meta {
  color: var(--muted);
}

@media (max-width: 760px) {
  .request-grid {
    grid-template-columns: 1fr;
  }

  .toolbar,
  .tools,
  .response-meta {
    flex-wrap: wrap;
  }
}
```

- [ ] **Step 3: Verify markup references existing assets**

Run:

```powershell
Select-String -Path panel.html -Pattern 'panel.css|panel.js'
```

Expected output includes both `panel.css` and `panel.js`.

---

### Task 4: Panel Behavior

**Files:**
- Create: `panel.js`

- [ ] **Step 1: Create panel behavior**

Create `panel.js` with exactly this content:

```js
const elements = {
  loadUrl: document.querySelector("#loadUrl"),
  method: document.querySelector("#method"),
  send: document.querySelector("#send"),
  status: document.querySelector("#status"),
  url: document.querySelector("#url"),
  headers: document.querySelector("#headers"),
  body: document.querySelector("#body"),
  responseStatus: document.querySelector("#responseStatus"),
  responseTime: document.querySelector("#responseTime"),
  responseSize: document.querySelector("#responseSize"),
  responseHeaders: document.querySelector("#responseHeaders"),
  responseBody: document.querySelector("#responseBody"),
  tools: Array.from(document.querySelectorAll("[data-tool]"))
};

elements.loadUrl.addEventListener("click", loadInspectedUrl);
elements.send.addEventListener("click", sendRequest);
elements.tools.forEach((button) => {
  button.addEventListener("click", () => applyTool(button.dataset.tool));
});

loadInspectedUrl();

function loadInspectedUrl() {
  setStatus("Loading inspected URL");
  chrome.devtools.inspectedWindow.eval("location.href", (result, exceptionInfo) => {
    if (exceptionInfo && exceptionInfo.isException) {
      setStatus(exceptionInfo.value || "Unable to load inspected URL", "error");
      return;
    }

    elements.url.value = typeof result === "string" ? result : "";
    setStatus("Ready", "ok");
  });
}

async function sendRequest() {
  let payload;
  try {
    payload = buildPayload();
  } catch (error) {
    setStatus(error.message, "error");
    return;
  }

  setBusy(true);
  clearResponse();
  setStatus("Sending request");

  try {
    const response = await chrome.runtime.sendMessage({
      type: "SEND_REQUEST",
      payload
    });

    if (!response || !response.ok) {
      const message = response && response.error && response.error.message
        ? response.error.message
        : "Request failed";
      throw new Error(message);
    }

    renderResponse(response.result);
    setStatus("Request complete", "ok");
  } catch (error) {
    renderError(error);
    setStatus(error.message || "Request failed", "error");
  } finally {
    setBusy(false);
  }
}

function buildPayload() {
  const method = elements.method.value.toUpperCase();
  const url = elements.url.value.trim();

  if (!url) {
    throw new Error("URL is required");
  }

  try {
    new URL(url);
  } catch (_error) {
    throw new Error("URL must be absolute and valid");
  }

  const body = elements.body.value;
  if ((method === "GET" || method === "HEAD") && body.trim()) {
    throw new Error(`${method} requests cannot include a body`);
  }

  return {
    method,
    url,
    headers: parseHeaders(elements.headers.value),
    body
  };
}

function parseHeaders(input) {
  const headers = {};
  const lines = input.split(/\r?\n/);

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex < 1) {
      throw new Error(`Header line ${index + 1} must be "Name: Value"`);
    }

    const name = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!name) {
      throw new Error(`Header line ${index + 1} is missing a name`);
    }

    headers[name] = value;
  });

  return headers;
}

function renderResponse(result) {
  elements.responseStatus.textContent = `${result.status} ${result.statusText}`;
  elements.responseTime.textContent = `${result.elapsedMs} ms`;
  elements.responseSize.textContent = result.truncated
    ? `showing ${result.displayedChars} of ${result.totalChars} chars`
    : `${result.displayedChars} chars`;
  elements.responseHeaders.value = formatHeaders(result.headers);
  elements.responseBody.value = result.body;
}

function renderError(error) {
  elements.responseStatus.textContent = "Error";
  elements.responseTime.textContent = "";
  elements.responseSize.textContent = "";
  elements.responseHeaders.value = "";
  elements.responseBody.value = error && error.stack ? error.stack : String(error);
}

function clearResponse() {
  elements.responseStatus.textContent = "No response";
  elements.responseTime.textContent = "";
  elements.responseSize.textContent = "";
  elements.responseHeaders.value = "";
  elements.responseBody.value = "";
}

function formatHeaders(headers) {
  return Object.entries(headers || {})
    .map(([name, value]) => `${name}: ${value}`)
    .join("\n");
}

function applyTool(tool) {
  const target = getActiveTextTarget();
  const selected = getSelectedText(target);
  const input = selected || target.value;
  let output = "";

  try {
    if (tool === "url-encode") {
      output = encodeURIComponent(input);
    } else if (tool === "url-decode") {
      output = decodeURIComponent(input);
    } else if (tool === "base64-encode") {
      output = btoa(unescape(encodeURIComponent(input)));
    } else if (tool === "base64-decode") {
      output = decodeURIComponent(escape(atob(input)));
    } else {
      throw new Error("Unknown tool");
    }
  } catch (error) {
    setStatus(error.message || "Tool failed", "error");
    return;
  }

  replaceText(target, output, Boolean(selected));
  setStatus("Tool applied", "ok");
}

function getActiveTextTarget() {
  const active = document.activeElement;
  if (active === elements.url || active === elements.headers || active === elements.body) {
    return active;
  }

  return elements.body;
}

function getSelectedText(target) {
  if (typeof target.selectionStart !== "number" || typeof target.selectionEnd !== "number") {
    return "";
  }

  return target.value.slice(target.selectionStart, target.selectionEnd);
}

function replaceText(target, value, replaceSelection) {
  if (!replaceSelection) {
    target.value = value;
    target.focus();
    return;
  }

  const start = target.selectionStart;
  const end = target.selectionEnd;
  target.value = `${target.value.slice(0, start)}${value}${target.value.slice(end)}`;
  target.selectionStart = start;
  target.selectionEnd = start + value.length;
  target.focus();
}

function setBusy(isBusy) {
  elements.send.disabled = isBusy;
  elements.loadUrl.disabled = isBusy;
}

function setStatus(message, tone) {
  elements.status.textContent = message;
  elements.status.classList.toggle("is-error", tone === "error");
  elements.status.classList.toggle("is-ok", tone === "ok");
}
```

- [ ] **Step 2: Check JavaScript syntax**

Run:

```powershell
node --check panel.js
```

Expected output is empty and exit code is `0`.

---

### Task 5: Local Verification

**Files:**
- Read: `manifest.json`
- Read: `devtools.html`
- Read: `devtools.js`
- Read: `panel.html`
- Read: `panel.css`
- Read: `panel.js`
- Read: `background.js`

- [ ] **Step 1: Check all expected files are present**

Run:

```powershell
Get-ChildItem -Name manifest.json,devtools.html,devtools.js,panel.html,panel.css,panel.js,background.js,README.md
```

Expected output contains all eight file names.

- [ ] **Step 2: Check JavaScript syntax**

Run:

```powershell
node --check devtools.js
node --check background.js
node --check panel.js
```

Expected output is empty and all commands exit with code `0`.

- [ ] **Step 3: Validate extension manifest JSON**

Run:

```powershell
node -e "const fs=require('fs'); const m=JSON.parse(fs.readFileSync('manifest.json','utf8')); if(m.manifest_version!==3) throw new Error('manifest_version must be 3'); if(m.devtools_page!=='devtools.html') throw new Error('missing devtools page'); if(!m.background.service_worker) throw new Error('missing service worker'); console.log('manifest ok')"
```

Expected output:

```text
manifest ok
```

- [ ] **Step 4: Load the extension manually**

Manual steps:

```text
1. Open chrome://extensions.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select E:\Code\ChromeExt\hackbar.
5. Confirm Chrome shows the HackBar extension without manifest errors.
```

Expected result: Chrome accepts the unpacked extension.

- [ ] **Step 5: Verify the DevTools panel manually**

Manual steps:

```text
1. Open https://example.com in Chrome.
2. Open DevTools.
3. Select the HackBar panel.
4. Click Load URL.
5. Confirm the URL field becomes https://example.com/.
```

Expected result: The panel appears and can read the inspected page URL.

- [ ] **Step 6: Verify requests manually**

Manual steps:

```text
1. In the HackBar panel, keep method GET.
2. Use URL https://example.com/.
3. Click Send.
4. Confirm status shows 200, elapsed time is shown, response headers are populated, and response body contains Example Domain.
5. Change method to POST.
6. Use URL https://httpbin.org/post.
7. Set Headers to Content-Type: application/json.
8. Set Body to {"hello":"world"}.
9. Click Send.
10. Confirm the response body includes "hello": "world".
```

Expected result: GET and POST requests complete through the background service worker.

- [ ] **Step 7: Verify validation and tools manually**

Manual steps:

```text
1. Set URL to not-a-url and click Send.
2. Confirm the status shows URL must be absolute and valid.
3. Set Headers to BadHeader and click Send.
4. Confirm the status shows Header line 1 must be "Name: Value".
5. Type hello world in Body.
6. Click URL Encode and confirm Body becomes hello%20world.
7. Click URL Decode and confirm Body becomes hello world.
8. Click Base64 Encode and confirm Body becomes aGVsbG8gd29ybGQ=.
9. Click Base64 Decode and confirm Body becomes hello world.
```

Expected result: Validation errors are visible and encoding tools transform focused text.

---

## Self-Review

- Spec coverage: The plan covers MV3 setup, DevTools panel registration, inspected URL loading, method/URL/header/body editing, background `fetch` with `credentials: "include"`, response rendering, validation, encoding tools, truncation, and manual verification.
- Placeholder scan: The plan contains no `TBD`, `TODO`, or placeholder implementation steps.
- Type consistency: Message type is consistently `SEND_REQUEST`; payload fields are consistently `method`, `url`, `headers`, and `body`; response fields are consistently rendered from `status`, `statusText`, `elapsedMs`, `headers`, `body`, `truncated`, `displayedChars`, and `totalChars`.
- Git note: Commit steps are intentionally omitted because the workspace is not a git repository.
