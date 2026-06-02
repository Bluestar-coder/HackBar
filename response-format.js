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

  function highlightResponseBody(body, type) {
    const text = String(body || "");
    if (type === "json") {
      return highlightJson(text);
    }
    if (type === "html") {
      return highlightHtml(text);
    }

    return escapeHtml(text);
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

  function highlightJson(text) {
    return text.replace(/("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b|[<>&]/g, (match, stringToken, keySuffix, literalToken) => {
      if (match === "<" || match === ">" || match === "&") {
        return escapeHtml(match);
      }
      if (stringToken) {
        const className = keySuffix ? "syntax-key" : "syntax-string";
        return `<span class="${className}">${escapeHtml(stringToken)}</span>${keySuffix || ""}`;
      }
      if (literalToken === "true" || literalToken === "false") {
        return `<span class="syntax-boolean">${literalToken}</span>`;
      }
      if (literalToken === "null") {
        return `<span class="syntax-null">null</span>`;
      }
      return `<span class="syntax-number">${match}</span>`;
    });
  }

  function highlightHtml(text) {
    return escapeHtml(text).replace(/&lt;(\/?)([a-zA-Z][\w:-]*)([^&]*?)(&gt;)/g, (match, slash, tagName, rest, close) => {
      const highlightedRest = rest.replace(/([\w:-]+)(=)(&quot;.*?&quot;|'.*?'|[^\s&]+)/g, '<span class="syntax-attr">$1</span>$2<span class="syntax-string">$3</span>');
      return `&lt;${slash}<span class="syntax-tag">${tagName}</span>${highlightedRest}${close}`;
    }).replace(/&lt;!--([\s\S]*?)--&gt;/g, '<span class="syntax-comment">&lt;!--$1--&gt;</span>');
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  return {
    formatResponseBody,
    formatHtml,
    highlightResponseBody,
    escapeHtml
  };
});
