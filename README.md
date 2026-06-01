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
