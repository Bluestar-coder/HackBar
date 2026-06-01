# HackBar DevTools Panel MVP Design

## Context

This project starts as a new Chrome Extension workspace for a HackBar-style tool. The first release will be a Manifest V3 DevTools Panel built with static HTML, CSS, and JavaScript. The goal is to reproduce the classic HackBar request-editing workflow before adding advanced payload libraries or automation.

The workspace currently has no project files and is not a git repository.

## Goals

- Add a Chrome DevTools panel named `HackBar`.
- Load the inspected page URL into the panel.
- Let the user edit request method, URL, headers, and body.
- Send requests from the extension with the current browser session credentials included.
- Show response status, elapsed time, headers, body, and request errors.
- Provide basic URL and Base64 encode/decode tools.
- Keep the implementation framework-free and directly loadable via `chrome://extensions`.

## Non-Goals

- No payload library in the MVP.
- No automated vulnerability testing in the MVP.
- No cURL import/export in the MVP.
- No response diffing or reporting in the MVP.
- No binary response preview in the MVP.

## Architecture

The extension will use a small MV3 structure:

- `manifest.json` declares Manifest V3 metadata, the DevTools page, the background service worker, and extension permissions.
- `devtools.html` and `devtools.js` create the DevTools panel.
- `panel.html`, `panel.css`, and `panel.js` implement the HackBar user interface.
- `background.js` receives messages from the panel, performs network requests with `fetch`, and returns structured results.

The panel will not send requests directly. It will communicate with the background service worker through `chrome.runtime.sendMessage`. This keeps UI state, Chrome extension permissions, and network execution separated.

## User Interface

The MVP UI is a dense tool surface rather than a landing page.

The top toolbar contains:

- A button to load the inspected page URL.
- A method selector with common HTTP methods.
- A send button.
- A compact request status indicator.

The request area contains:

- A URL input.
- A headers editor.
- A body editor.

The tools area contains:

- URL encode.
- URL decode.
- Base64 encode.
- Base64 decode.

The response area contains:

- HTTP status.
- Elapsed time.
- Response headers.
- Response body.
- Error output when the request fails.

## Data Flow

1. `devtools.js` registers a panel named `HackBar`.
2. `panel.js` loads the inspected page URL with `chrome.devtools.inspectedWindow.eval("location.href")`.
3. The user edits method, URL, headers, and body.
4. The user clicks send.
5. `panel.js` validates input and sends a `SEND_REQUEST` message to `background.js`.
6. `background.js` parses the request, calls `fetch(url, { method, headers, body, credentials: "include" })`, and measures elapsed time.
7. `background.js` returns status, status text, headers, body text, elapsed time, and truncation metadata if needed.
8. `panel.js` renders the response or error.

## Request Model

The panel request payload will include:

- `method`: HTTP method string.
- `url`: absolute URL string.
- `headers`: plain text header input parsed as `Name: Value` lines.
- `body`: raw request body string.

For `GET` and `HEAD`, the body will be omitted. For other methods, the body will be included when non-empty.

Headers will be parsed line by line. Empty lines are ignored. A non-empty line without a colon is a validation error.

## Permissions

The MVP will use:

- `devtools_page` to register the DevTools integration.
- `background.service_worker` to run the request proxy.
- `host_permissions: ["<all_urls>"]` because HackBar is a general-purpose testing tool that may target arbitrary origins.

The MVP does not require `storage` unless local persistence is implemented during the first build. If persistence is added, it should be limited to non-sensitive UI state such as the last method or editor layout. Request bodies, headers, and cookies should not be persisted in MVP by default.

## Credentials

Requests will use `credentials: "include"` by default. This matches the selected product behavior: the tool should support testing authenticated endpoints in the current browser session.

This does not mean manually copying cookies into UI state. Cookies remain browser-managed.

## Response Handling

The background service worker will read responses as text. The panel will display:

- Status code and status text.
- Elapsed time in milliseconds.
- Response headers as text.
- Response body as text.

To avoid freezing the DevTools panel, the displayed body will be capped at 1 MB. If truncated, the UI will show that only the first 1 MB is displayed.

## Error Handling

Panel-side validation handles:

- Empty URL.
- Invalid URL.
- Invalid header line.
- Body present for `GET` or `HEAD`.

Background-side handling returns structured errors for:

- Network failures.
- Fetch exceptions.
- Response reading failures.

The UI should keep the previous request input intact after errors.

## Testing

Manual verification will cover:

- Load the extension unpacked from `chrome://extensions`.
- Open DevTools on a regular web page and verify the `HackBar` tab appears.
- Load the inspected page URL into the URL input.
- Send a GET request and render status, headers, body, and elapsed time.
- Send a POST request with a JSON body.
- Send custom headers.
- Verify authenticated requests include browser-managed credentials where allowed by Chrome.
- Validate URL encode, URL decode, Base64 encode, and Base64 decode.
- Confirm invalid URLs and malformed headers produce useful errors.
- Confirm large responses are truncated rather than freezing the panel.

## Implementation Notes

The first implementation should favor clear, small files and no build step. A later phase can add TypeScript, a component framework, history storage, payload libraries, cURL import, and automated tests after the MVP behavior is stable.
