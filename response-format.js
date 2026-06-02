(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.HackBarResponseFormat = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function formatResponseBody(body, headers) {
    const text = String(body || "");
    const contentType = getContentType(headers);

    if (isJson(contentType, text)) {
      try {
        return {
          type: "json",
          body: JSON.stringify(JSON.parse(text), null, 2)
        };
      } catch (_error) {
        return {
          type: "text",
          body: text
        };
      }
    }

    if (isHtml(contentType, text)) {
      return {
        type: "html",
        body: formatHtml(text)
      };
    }

    return {
      type: "text",
      body: text
    };
  }

  function getContentType(headers) {
    const source = headers || {};
    const match = Object.keys(source).find((name) => name.toLowerCase() === "content-type");
    return match ? String(source[match]).toLowerCase() : "";
  }

  function isJson(contentType, text) {
    const trimmed = text.trim();
    return contentType.includes("json") || trimmed.startsWith("{") || trimmed.startsWith("[");
  }

  function isHtml(contentType, text) {
    const trimmed = text.trim().toLowerCase();
    return contentType.includes("html") || contentType.includes("xml") || trimmed.startsWith("<!doctype") || trimmed.startsWith("<html") || trimmed.startsWith("<?xml");
  }

  function formatHtml(html) {
    const tokens = html
      .replace(/>\s*</g, "><")
      .replace(/(<[^>]+>)/g, "\n$1\n")
      .split("\n")
      .map((token) => token.trim())
      .filter(Boolean);
    let depth = 0;
    const lines = [];

    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];
      if (isOpeningTag(token) && tokens[index + 1] && isClosingTag(tokens[index + 2])) {
        lines.push(`${"  ".repeat(depth)}${token}${tokens[index + 1]}${tokens[index + 2]}`);
        index += 2;
        continue;
      }

      if (isClosingTag(token)) {
        depth = Math.max(depth - 1, 0);
      }

      const line = `${"  ".repeat(depth)}${token}`;
      if (opensScope(token)) {
        depth += 1;
      }

      lines.push(line);
    }

    return lines.join("\n");
  }

  function isClosingTag(token) {
    return /^<\//.test(token);
  }

  function opensScope(token) {
    return isOpeningTag(token);
  }

  function isOpeningTag(token) {
    return /^<[^/!?][^>]*>$/.test(token) && !/\/>$/.test(token);
  }

  return {
    formatResponseBody,
    formatHtml
  };
});
