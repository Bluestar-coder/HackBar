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
