const elements = {
  loadUrl: document.querySelector("#loadUrl"),
  splitUrl: document.querySelector("#splitUrl"),
  send: document.querySelector("#send"),
  clearAll: document.querySelector("#clearAll"),
  method: document.querySelector("#method"),
  contentType: document.querySelector("#contentType"),
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
  responseFormat: document.querySelector("#responseFormat"),
  responseRaw: document.querySelector("#responseRaw"),
  responseHeaders: document.querySelector("#responseHeaders"),
  responseBody: document.querySelector("#responseBody"),
  responseRawView: document.querySelector("#responseRawView"),
  responseHeadersView: document.querySelector("#responseHeadersView"),
  responseBodyView: document.querySelector("#responseBodyView"),
  responseBodyTree: document.querySelector("#responseBodyTree"),
  bodyViewTabs: Array.from(document.querySelectorAll("[data-body-view]")),
  response: document.querySelector(".response"),
  toggleResponse: document.querySelector("#toggleResponse"),
  responseTabs: Array.from(document.querySelectorAll("[data-response-tab]")),
  responsePanels: Array.from(document.querySelectorAll("[data-response-panel]")),
  menus: Array.from(document.querySelectorAll(".menu")),
  tools: Array.from(document.querySelectorAll("[data-tool]")),
  inserts: Array.from(document.querySelectorAll("[data-insert]"))
};

let lastTextTarget = elements.body;
let bodyViewMode = "tree";
const textTargets = [elements.url, elements.headers, elements.body];
const requestInputs = {
  url: elements.url,
  headers: elements.headers,
  body: elements.body,
  refererValue: elements.refererValue,
  userAgentValue: elements.userAgentValue,
  cookiesValue: elements.cookiesValue
};
const requestInputTargets = Object.values(requestInputs);
const requestInputKeyByElement = new Map(Object.entries(requestInputs).map(([key, target]) => [target, key]));
const editorHistory = HackBarEditorHistory.createEditorHistory(captureRequestState, restoreRequestState);

elements.loadUrl.addEventListener("click", () => loadInspectedUrl(true));
elements.splitUrl.addEventListener("click", splitUrl);
elements.send.addEventListener("click", sendRequest);
elements.clearAll.addEventListener("click", clearAll);
elements.method.addEventListener("change", () => {
  syncMethodState();
  recordEditorState();
});
elements.contentType.addEventListener("change", applyContentTypeShortcut);
elements.refererToggle.addEventListener("change", () => {
  syncExtraFields();
  recordEditorState();
});
elements.userAgentToggle.addEventListener("change", () => {
  syncExtraFields();
  recordEditorState();
});
elements.cookiesToggle.addEventListener("change", () => {
  syncExtraFields();
  recordEditorState();
});
elements.updatePage.addEventListener("change", recordEditorState);
elements.toggleResponse.addEventListener("click", () => {
  setResponseCollapsed(!elements.response.classList.contains("is-collapsed"), true);
});
window.addEventListener("resize", applyResponsiveResponseMode);
requestInputTargets.forEach((target) => {
  target.addEventListener("input", () => {
    if (textTargets.includes(target)) {
      lastTextTarget = target;
    }
    recordEditorState();
  });
});
textTargets.forEach((target) => {
  ["focus", "select", "mouseup", "keyup"].forEach((eventName) => {
    target.addEventListener(eventName, () => {
      lastTextTarget = target;
    });
  });
});
elements.tools.forEach((button) => {
  button.addEventListener("click", () => {
    applyTool(button.dataset.tool);
  });
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
elements.bodyViewTabs.forEach((button) => {
  button.addEventListener("click", () => setBodyView(button.dataset.bodyView));
});
elements.responseBodyTree.addEventListener("click", (event) => {
  const toggle = event.target.closest("[data-tree-toggle]");
  if (toggle) {
    toggleTreeNode(toggle);
  }
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".menu")) {
    closeMenus();
  }
});
document.addEventListener("keydown", handleKeyboardShortcut);

editorHistory.reset();
loadInspectedUrl(false);
syncMethodState();
syncExtraFields();
applyResponsiveResponseMode();

function loadInspectedUrl(shouldRecordHistory) {
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
    if (shouldRecordHistory) {
      recordEditorState();
    } else {
      editorHistory.reset();
    }
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
  const method = elements.method.value.toUpperCase();
  const url = normalizeSplitUrlInput(elements.url.value);

  if (!url) {
    throw new Error("URL is required");
  }

  try {
    new URL(url);
  } catch (_error) {
    throw new Error("URL must be absolute and valid");
  }

  const body = shouldSendBody(method) ? elements.body.value : "";
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
  elements.responseRaw.value = HackBarResponseFormat.formatHttpResponse(result);
  const formatted = HackBarResponseFormat.formatResponseBody(result.body, result.headers);
  elements.responseFormat.textContent = `Format: ${formatted.type.toUpperCase()}`;
  elements.responseBody.value = formatted.body;
  elements.responseRawView.innerHTML = HackBarResponseFormat.escapeHtml(elements.responseRaw.value);
  elements.responseBodyView.innerHTML = HackBarResponseFormat.highlightResponseBody(formatted.body, formatted.type);
  renderBodyTree(result.body, formatted.type);
  elements.responseHeadersView.innerHTML = highlightHeaders(elements.responseHeaders.value);
  syncResponseMetaSeparators();
  setResponseTab("raw");
  applyResponsiveResponseMode();
}

function renderError(error) {
  elements.responseStatus.textContent = "Error";
  elements.responseTime.textContent = "";
  elements.responseSize.textContent = "";
  elements.responseFormat.textContent = "";
  elements.responseHeaders.value = "";
  elements.responseRaw.value = "";
  elements.responseBody.value = error && error.stack ? error.stack : String(error);
  elements.responseRawView.innerHTML = "";
  elements.responseHeadersView.innerHTML = "";
  elements.responseBodyTree.innerHTML = "";
  elements.responseBodyView.innerHTML = HackBarResponseFormat.highlightResponseBody(elements.responseBody.value, "text");
  setBodyView("raw");
  syncResponseMetaSeparators();
  setResponseTab("body");
}

function clearResponse() {
  elements.responseStatus.textContent = "No response";
  elements.responseTime.textContent = "";
  elements.responseSize.textContent = "";
  elements.responseFormat.textContent = "";
  elements.responseHeaders.value = "";
  elements.responseRaw.value = "";
  elements.responseBody.value = "";
  elements.responseRawView.innerHTML = "";
  elements.responseHeadersView.innerHTML = "";
  elements.responseBodyTree.innerHTML = "";
  elements.responseBodyView.innerHTML = "";
  setBodyView("tree");
  syncResponseMetaSeparators();
}

function formatHeaders(headers) {
  return Object.entries(headers || {})
    .map(([name, value]) => `${name}: ${value}`)
    .join("\n");
}

function applyContentTypeShortcut() {
  if (!elements.contentType.value) {
    recordEditorState();
    return;
  }

  elements.headers.value = upsertHeader(elements.headers.value, "Content-Type", elements.contentType.value);
  const formatted = HackBarRequestTools.formatBodyForContentType(elements.body.value, elements.contentType.value);
  if (formatted.formatted) {
    elements.body.value = formatted.body;
    recordEditorState();
    setStatus(formatted.templated ? "Content-Type applied; body template inserted" : "Content-Type applied; body formatted", "ok");
    return;
  }
  if (formatted.error) {
    recordEditorState();
    setStatus(`Content-Type applied; ${formatted.error}`, "error");
    return;
  }

  recordEditorState();
  setStatus("Content-Type applied", "ok");
}

function upsertHeader(input, name, value) {
  const lines = input.split(/\r?\n/);
  let updated = false;
  const output = lines.map((line) => {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex > 0 && line.slice(0, separatorIndex).trim().toLowerCase() === name.toLowerCase()) {
      updated = true;
      return `${name}: ${value}`;
    }
    return line;
  }).filter((line) => line.trim());

  if (!updated) {
    output.push(`${name}: ${value}`);
  }

  return output.join("\n");
}

function highlightHeaders(headersText) {
  return HackBarResponseFormat.escapeHtml(headersText).replace(/^([^:\n]+):/gm, '<span class="syntax-key">$1</span>:');
}

function renderBodyTree(rawBody, type) {
  elements.responseBodyTree.innerHTML = "";

  try {
    let tree;
    if (type === "json") {
      tree = HackBarResponseTree.buildJsonTree(rawBody);
    } else if (type === "html") {
      tree = HackBarResponseTree.buildHtmlTree(rawBody);
    } else {
      throw new Error("Tree view is only available for HTML and JSON");
    }

    elements.responseBodyTree.innerHTML = HackBarResponseTree.renderTree(tree);
    setBodyView("tree");
  } catch (_error) {
    setBodyView("raw");
  }
}

function setBodyView(viewName) {
  const hasTree = Boolean(elements.responseBodyTree.innerHTML.trim());
  bodyViewMode = viewName === "tree" && hasTree ? "tree" : "raw";
  elements.bodyViewTabs.forEach((button) => {
    const selected = button.dataset.bodyView === bodyViewMode;
    button.setAttribute("aria-selected", String(selected));
    button.disabled = button.dataset.bodyView === "tree" && !hasTree;
  });
  elements.responseBodyTree.classList.toggle("is-hidden", bodyViewMode !== "tree");
  elements.responseBodyView.classList.toggle("is-hidden", bodyViewMode !== "raw");
}

function toggleTreeNode(toggle) {
  const node = toggle.closest("[data-tree-node]");
  if (!node) {
    return;
  }

  const children = node.querySelector(":scope > .tree-children");
  if (!children) {
    return;
  }

  const expanded = toggle.getAttribute("aria-expanded") !== "true";
  toggle.setAttribute("aria-expanded", String(expanded));
  node.setAttribute("aria-expanded", String(expanded));
  children.hidden = !expanded;
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

async function applyTool(tool) {
  const target = getActiveTextTarget();
  const selected = getSelectedText(target);
  const input = selected || target.value;

  try {
    const output = await HackBarRequestTools.applyRequestTool(tool, input);
    replaceText(target, output, Boolean(selected));
    closeMenus();
    setStatus("Tool applied", "ok");
  } catch (error) {
    setStatus(error.message || "Tool failed", "error");
  }
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

function handleKeyboardShortcut(event) {
  if (event.key === "Escape") {
    closeMenus();
    return;
  }

  const key = event.key.toLowerCase();
  const hasCommandModifier = event.metaKey || event.ctrlKey;
  if (!hasCommandModifier || event.altKey) {
    return;
  }

  // Ctrl/Cmd+Z and Ctrl/Cmd+Y cover app-driven textarea edits that native undo cannot see.
  if (key === "z") {
    const changed = event.shiftKey ? editorHistory.redo() : editorHistory.undo();
    if (changed) {
      event.preventDefault();
      event.stopPropagation();
      setStatus(event.shiftKey ? "Redone" : "Undone", "ok");
    }
    return;
  }

  if (key === "y") {
    const changed = editorHistory.redo();
    if (changed) {
      event.preventDefault();
      event.stopPropagation();
      setStatus("Redone", "ok");
    }
    return;
  }

  if (key === "enter") {
    event.preventDefault();
    closeMenus();
    sendRequest();
  }
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

  if (shouldShowBody(elements.method.value)) {
    elements.url.value = parsed.toString();
    elements.body.value = params;
    recordEditorState();
    setStatus(params ? "URL parameters copied to body" : "No query parameters", "ok");
    return;
  }

  elements.url.value = params ? `${parsed.toString()}?\n${params}` : parsed.toString();
  recordEditorState();
  setStatus(params ? "URL parameters split in URL box" : "No query parameters", "ok");
}

function clearAll() {
  elements.url.value = "";
  elements.headers.value = "";
  elements.body.value = "";
  elements.method.value = "GET";
  elements.contentType.value = "";
  elements.refererToggle.checked = false;
  elements.userAgentToggle.checked = false;
  elements.cookiesToggle.checked = false;
  elements.updatePage.checked = false;
  elements.refererValue.value = "";
  elements.userAgentValue.value = "";
  elements.cookiesValue.value = "";
  syncMethodState();
  syncExtraFields();
  clearResponse();
  recordEditorState();
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

function syncMethodState() {
  const showBody = shouldShowBody(elements.method.value);
  elements.body.classList.toggle("is-disabled", !showBody);
}

function shouldShowBody(method) {
  return !["GET", "HEAD", "OPTIONS"].includes(String(method || "GET").toUpperCase());
}

function shouldSendBody(method) {
  return shouldShowBody(method);
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

function recordEditorState() {
  editorHistory.commit();
}

function captureRequestState() {
  const activeKey = requestInputKeyByElement.get(document.activeElement)
    || requestInputKeyByElement.get(lastTextTarget)
    || "body";

  return {
    method: elements.method.value,
    contentType: elements.contentType.value,
    refererEnabled: elements.refererToggle.checked,
    userAgentEnabled: elements.userAgentToggle.checked,
    cookiesEnabled: elements.cookiesToggle.checked,
    updatePage: elements.updatePage.checked,
    inputs: Object.fromEntries(Object.entries(requestInputs).map(([key, target]) => [key, target.value])),
    selections: Object.fromEntries(Object.entries(requestInputs).map(([key, target]) => [key, captureSelection(target)])),
    activeKey
  };
}

function restoreRequestState(state) {
  Object.entries(requestInputs).forEach(([key, target]) => {
    target.value = state.inputs && typeof state.inputs[key] === "string" ? state.inputs[key] : "";
  });

  elements.method.value = state.method || "GET";
  elements.contentType.value = state.contentType || "";
  elements.refererToggle.checked = Boolean(state.refererEnabled);
  elements.userAgentToggle.checked = Boolean(state.userAgentEnabled);
  elements.cookiesToggle.checked = Boolean(state.cookiesEnabled);
  elements.updatePage.checked = Boolean(state.updatePage);
  syncMethodState();
  syncExtraFields();

  const target = requestInputs[state.activeKey] || elements.body;
  if (textTargets.includes(target)) {
    lastTextTarget = target;
  }
  restoreSelection(target, state.selections && state.selections[state.activeKey]);
  target.focus();
}

function captureSelection(target) {
  if (typeof target.selectionStart !== "number" || typeof target.selectionEnd !== "number") {
    return { start: 0, end: 0 };
  }

  return {
    start: target.selectionStart,
    end: target.selectionEnd
  };
}

function restoreSelection(target, selection) {
  if (!selection || typeof target.setSelectionRange !== "function") {
    return;
  }

  const start = Math.min(Number(selection.start) || 0, target.value.length);
  const end = Math.min(Number(selection.end) || 0, target.value.length);
  target.setSelectionRange(start, end);
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
  recordEditorState();
  if (!replaceSelection) {
    target.value = value;
    target.focus();
    recordEditorState();
    return;
  }

  const start = target.selectionStart;
  const end = target.selectionEnd;
  target.value = `${target.value.slice(0, start)}${value}${target.value.slice(end)}`;
  target.selectionStart = start;
  target.selectionEnd = start + value.length;
  target.focus();
  recordEditorState();
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
responseMetaObserver.observe(elements.responseFormat, { childList: true, characterData: true, subtree: true });
syncResponseMetaSeparators();

function syncResponseMetaSeparators() {
  const metaItems = [elements.responseStatus, elements.responseTime, elements.responseSize, elements.responseFormat];
  metaItems.forEach((element, index) => {
    const hasContent = Boolean(element.textContent.trim());
    const hasNext = metaItems.slice(index + 1).some((item) => Boolean(item.textContent.trim()));
    element.classList.toggle("has-content", hasContent);
    element.classList.toggle("has-next", hasContent && hasNext);
  });
}
