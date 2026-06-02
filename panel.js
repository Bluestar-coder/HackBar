const elements = {
  loadUrl: document.querySelector("#loadUrl"),
  splitUrl: document.querySelector("#splitUrl"),
  send: document.querySelector("#send"),
  clearAll: document.querySelector("#clearAll"),
  postData: document.querySelector("#postData"),
  refererToggle: document.querySelector("#refererToggle"),
  userAgentToggle: document.querySelector("#userAgentToggle"),
  cookiesToggle: document.querySelector("#cookiesToggle"),
  updatePage: document.querySelector("#updatePage"),
  refererValue: document.querySelector("#refererValue"),
  userAgentValue: document.querySelector("#userAgentValue"),
  cookiesValue: document.querySelector("#cookiesValue"),
  extraFields: document.querySelector(".extra-fields"),
  refererField: document.querySelector('[data-extra-field="referer"]'),
  userAgentField: document.querySelector('[data-extra-field="userAgent"]'),
  cookiesField: document.querySelector('[data-extra-field="cookies"]'),
  status: document.querySelector("#status"),
  url: document.querySelector("#url"),
  headers: document.querySelector("#headers"),
  body: document.querySelector("#body"),
  responseStatus: document.querySelector("#responseStatus"),
  responseTime: document.querySelector("#responseTime"),
  responseSize: document.querySelector("#responseSize"),
  responseHeaders: document.querySelector("#responseHeaders"),
  responseBody: document.querySelector("#responseBody"),
  response: document.querySelector(".response"),
  toggleResponse: document.querySelector("#toggleResponse"),
  responseTabs: Array.from(document.querySelectorAll("[data-response-tab]")),
  responsePanels: Array.from(document.querySelectorAll("[data-response-panel]")),
  menus: Array.from(document.querySelectorAll(".menu")),
  tools: Array.from(document.querySelectorAll("[data-tool]")),
  inserts: Array.from(document.querySelectorAll("[data-insert]"))
};

let lastTextTarget = elements.body;
const textTargets = [elements.url, elements.headers, elements.body];

elements.loadUrl.addEventListener("click", loadInspectedUrl);
elements.splitUrl.addEventListener("click", splitUrl);
elements.send.addEventListener("click", sendRequest);
elements.clearAll.addEventListener("click", clearAll);
elements.postData.addEventListener("change", syncPostDataState);
elements.refererToggle.addEventListener("change", syncExtraFields);
elements.userAgentToggle.addEventListener("change", syncExtraFields);
elements.cookiesToggle.addEventListener("change", syncExtraFields);
elements.toggleResponse.addEventListener("click", () => {
  setResponseCollapsed(!elements.response.classList.contains("is-collapsed"), true);
});
window.addEventListener("resize", applyResponsiveResponseMode);
textTargets.forEach((target) => {
  ["focus", "select", "mouseup", "keyup"].forEach((eventName) => {
    target.addEventListener(eventName, () => {
      lastTextTarget = target;
    });
  });
});
elements.tools.forEach((button) => {
  button.addEventListener("click", () => applyTool(button.dataset.tool));
});
elements.inserts.forEach((button) => {
  button.addEventListener("click", () => insertText(button.dataset.insert || ""));
});
elements.menus.forEach((menu) => {
  menu.addEventListener("toggle", () => {
    if (menu.open) {
      closeMenus(menu);
    }
  });
});
elements.responseTabs.forEach((button) => {
  button.addEventListener("click", () => setResponseTab(button.dataset.responseTab));
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".menu")) {
    closeMenus();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenus();
  }
});

loadInspectedUrl();
syncPostDataState();
syncExtraFields();
applyResponsiveResponseMode();

function loadInspectedUrl() {
  setBusy(true);
  setStatus("Loading inspected URL");
  if (!globalThis.chrome || !chrome.devtools || !chrome.devtools.inspectedWindow) {
    setStatus("Open inside Chrome DevTools", "error");
    setBusy(false);
    return;
  }

  chrome.devtools.inspectedWindow.eval("location.href", (result, exceptionInfo) => {
    if (exceptionInfo && exceptionInfo.isException) {
      setStatus(exceptionInfo.value || "Unable to load inspected URL", "error");
      setBusy(false);
      return;
    }

    elements.url.value = typeof result === "string" ? result : "";
    setStatus("Ready", "ok");
    setBusy(false);
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
    if (!globalThis.chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
      throw new Error("Open inside Chrome DevTools");
    }

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
    updateInspectedPage(payload);
    setStatus("Request complete", "ok");
  } catch (error) {
    renderError(error);
    setStatus(error.message || "Request failed", "error");
  } finally {
    setBusy(false);
  }
}

function buildPayload() {
  const method = elements.postData.checked ? "POST" : "GET";
  const url = normalizeSplitUrlInput(elements.url.value);

  if (!url) {
    throw new Error("URL is required");
  }

  try {
    new URL(url);
  } catch (_error) {
    throw new Error("URL must be absolute and valid");
  }

  const body = method === "POST" ? elements.body.value : "";
  const headers = parseHeaders(elements.headers.value);
  applyOptionalHeader(headers, elements.refererToggle, "Referer", elements.refererValue.value);
  applyOptionalHeader(headers, elements.userAgentToggle, "User-Agent", elements.userAgentValue.value);
  applyOptionalHeader(headers, elements.cookiesToggle, "Cookie", elements.cookiesValue.value);

  return {
    method,
    url,
    headers,
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

function applyOptionalHeader(headers, toggle, name, value) {
  if (!toggle.checked) {
    return;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${name} value is required when enabled`);
  }

  headers[name] = trimmed;
}

function renderResponse(result) {
  elements.responseStatus.textContent = `Status: ${result.status}${result.statusText ? ` ${result.statusText}` : ""}`;
  elements.responseTime.textContent = `Time: ${result.elapsedMs} ms`;
  elements.responseSize.textContent = result.truncated
    ? `Size: ${formatSize(result.displayedChars)} shown / ${formatSize(result.totalChars)} total`
    : `Size: ${formatSize(result.displayedChars)}`;
  elements.responseHeaders.value = formatHeaders(result.headers);
  elements.responseBody.value = result.body;
  syncResponseMetaSeparators();
  setResponseTab("body");
  applyResponsiveResponseMode();
}

function renderError(error) {
  elements.responseStatus.textContent = "Error";
  elements.responseTime.textContent = "";
  elements.responseSize.textContent = "";
  elements.responseHeaders.value = "";
  elements.responseBody.value = error && error.stack ? error.stack : String(error);
  syncResponseMetaSeparators();
  setResponseTab("body");
}

function clearResponse() {
  elements.responseStatus.textContent = "No response";
  elements.responseTime.textContent = "";
  elements.responseSize.textContent = "";
  elements.responseHeaders.value = "";
  elements.responseBody.value = "";
  syncResponseMetaSeparators();
}

function formatHeaders(headers) {
  return Object.entries(headers || {})
    .map(([name, value]) => `${name}: ${value}`)
    .join("\n");
}

function formatSize(chars) {
  const bytes = Number(chars) || 0;
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${bytes} B`;
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
  closeMenus();
  setStatus("Tool applied", "ok");
}

function insertText(value) {
  const target = getActiveTextTarget();
  replaceText(target, value, true);
  closeMenus();
  setStatus("Inserted", "ok");
}

function closeMenus(exceptMenu) {
  elements.menus.forEach((menu) => {
    if (menu !== exceptMenu) {
      menu.open = false;
    }
  });
}

function setResponseTab(tabName) {
  elements.responseTabs.forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.responseTab === tabName));
  });
  elements.responsePanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.responsePanel === tabName);
  });
}

function setResponseCollapsed(isCollapsed, manual) {
  elements.response.classList.toggle("is-collapsed", isCollapsed);
  elements.response.classList.toggle("is-expanded", !isCollapsed);
  elements.toggleResponse.textContent = isCollapsed ? "Expand" : "Collapse";
  elements.toggleResponse.setAttribute("aria-expanded", String(!isCollapsed));
  if (manual) {
    elements.response.dataset.manualResponse = isCollapsed ? "collapsed" : "expanded";
  }
}

function applyResponsiveResponseMode() {
  const isBottomDockLike = window.innerHeight < 560 && window.innerWidth / window.innerHeight > 1.6;
  const manualState = elements.response.dataset.manualResponse;

  if (manualState === "collapsed") {
    setResponseCollapsed(true, false);
    return;
  }
  if (manualState === "expanded") {
    setResponseCollapsed(false, false);
    return;
  }

  setResponseCollapsed(isBottomDockLike, false);
}

function splitUrl() {
  const rawUrl = normalizeSplitUrlInput(elements.url.value);
  if (!rawUrl) {
    setStatus("URL is required", "error");
    return;
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (_error) {
    setStatus("URL must be absolute and valid", "error");
    return;
  }

  const params = Array.from(parsed.searchParams.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("\n");
  parsed.search = "";

  if (elements.postData.checked) {
    elements.url.value = parsed.toString();
    elements.body.value = params;
    setStatus(params ? "URL parameters copied to Post data" : "No query parameters", "ok");
    return;
  }

  elements.url.value = params ? `${parsed.toString()}?\n${params}` : parsed.toString();
  setStatus(params ? "URL parameters split in URL box" : "No query parameters", "ok");
}

function clearAll() {
  elements.url.value = "";
  elements.headers.value = "";
  elements.body.value = "";
  elements.postData.checked = false;
  elements.refererToggle.checked = false;
  elements.userAgentToggle.checked = false;
  elements.cookiesToggle.checked = false;
  elements.updatePage.checked = false;
  elements.refererValue.value = "";
  elements.userAgentValue.value = "";
  elements.cookiesValue.value = "";
  syncPostDataState();
  syncExtraFields();
  clearResponse();
  setStatus("Cleared", "ok");
}

function normalizeSplitUrlInput(input) {
  const lines = input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length <= 1) {
    return input.trim();
  }

  const firstLine = lines[0];
  const base = firstLine.endsWith("?") || firstLine.endsWith("&") ? firstLine.slice(0, -1) : firstLine;
  const params = lines.slice(1).join("&");
  return params ? `${base}?${params}` : base;
}

function syncPostDataState() {
  elements.body.classList.toggle("is-disabled", !elements.postData.checked);
}

function syncExtraFields() {
  elements.refererField.classList.toggle("is-visible", elements.refererToggle.checked);
  elements.userAgentField.classList.toggle("is-visible", elements.userAgentToggle.checked);
  elements.cookiesField.classList.toggle("is-visible", elements.cookiesToggle.checked);
  elements.extraFields.classList.toggle(
    "has-visible",
    elements.refererToggle.checked || elements.userAgentToggle.checked || elements.cookiesToggle.checked
  );
}

function getActiveTextTarget() {
  const active = document.activeElement;
  if (active === elements.url || active === elements.headers || active === elements.body) {
    lastTextTarget = active;
    return active;
  }

  return lastTextTarget || elements.body;
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
  elements.splitUrl.disabled = isBusy;
}

function setStatus(message, tone) {
  elements.status.textContent = message;
  elements.status.classList.toggle("is-error", tone === "error");
  elements.status.classList.toggle("is-ok", tone === "ok");
}

function updateInspectedPage(payload) {
  if (!elements.updatePage.checked) {
    return;
  }

  if (!globalThis.chrome || !chrome.devtools || !chrome.devtools.inspectedWindow) {
    setStatus("Open inside Chrome DevTools to update page", "error");
    return;
  }

  const script = HackBarPageUpdate.createPageUpdateScript(payload);
  chrome.devtools.inspectedWindow.eval(script, (result, exceptionInfo) => {
    if (exceptionInfo && exceptionInfo.isException) {
      setStatus(exceptionInfo.value || "Unable to update inspected page", "error");
      return;
    }

    setStatus("Request complete; page updated", "ok");
  });
}

const responseMetaObserver = new MutationObserver(syncResponseMetaSeparators);
responseMetaObserver.observe(elements.responseStatus, { childList: true, characterData: true, subtree: true });
responseMetaObserver.observe(elements.responseTime, { childList: true, characterData: true, subtree: true });
responseMetaObserver.observe(elements.responseSize, { childList: true, characterData: true, subtree: true });
syncResponseMetaSeparators();

function syncResponseMetaSeparators() {
  const metaItems = [elements.responseStatus, elements.responseTime, elements.responseSize];
  metaItems.forEach((element, index) => {
    const hasContent = Boolean(element.textContent.trim());
    const hasNext = metaItems.slice(index + 1).some((item) => Boolean(item.textContent.trim()));
    element.classList.toggle("has-content", hasContent);
    element.classList.toggle("has-next", hasContent && hasNext);
  });
}
