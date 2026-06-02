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
        body: wrapLongLines(formatHtml(text))
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
    const tokens = tokenizeHtml(html);
    let depth = 0;
    const lines = [];

    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];
      if (
        token.type === "tag" &&
        isOpeningTag(token.value) &&
        !isVoidTag(token.value) &&
        tokens[index + 1] &&
        tokens[index + 1].type === "text" &&
        tokens[index + 2] &&
        isMatchingClosingTag(token.value, tokens[index + 2].value)
      ) {
        const text = tokens[index + 1].value.trim();
        if (text && !/[\r\n]/.test(text)) {
          lines.push(`${"  ".repeat(depth)}${token.value.trim()}${text}${tokens[index + 2].value.trim()}`);
          index += 2;
          continue;
        }
      }

      if (token.type === "text") {
        const text = token.value.trim();
        if (text) {
          lines.push(`${"  ".repeat(depth)}${text}`);
        }
        continue;
      }

      if (token.type === "raw") {
        lines.push(...formatRawText(token.value, token.tagName, "  ".repeat(depth)));
        continue;
      }

      if (isClosingTag(token.value)) {
        depth = Math.max(depth - 1, 0);
      }

      const line = `${"  ".repeat(depth)}${token.value.trim()}`;
      if (opensScope(token.value)) {
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
    return isOpeningTag(token) && !isVoidTag(token);
  }

  function isOpeningTag(token) {
    return /^<[^/!?][^>]*>$/.test(token) && !/\/>$/.test(token);
  }

  function isMatchingClosingTag(openTag, closeTag) {
    const openName = getTagName(openTag);
    const closeName = getTagName(closeTag);
    return Boolean(openName && closeName && openName === closeName && isClosingTag(closeTag));
  }

  function isVoidTag(token) {
    const match = token.match(/^<\s*([a-zA-Z][\w:-]*)/);
    if (!match) {
      return false;
    }

    return [
      "area",
      "base",
      "br",
      "col",
      "embed",
      "hr",
      "img",
      "input",
      "link",
      "meta",
      "param",
      "source",
      "track",
      "wbr"
    ].includes(match[1].toLowerCase());
  }

  function tokenizeHtml(html) {
    const source = String(html || "");
    const lowerSource = source.toLowerCase();
    const tokens = [];
    let index = 0;

    while (index < source.length) {
      if (source.startsWith("<!--", index)) {
        const end = source.indexOf("-->", index + 4);
        const closeIndex = end >= 0 ? end + 3 : source.length;
        tokens.push({ type: "tag", value: source.slice(index, closeIndex) });
        index = closeIndex;
        continue;
      }

      if (source[index] !== "<") {
        const nextTag = source.indexOf("<", index);
        const end = nextTag >= 0 ? nextTag : source.length;
        tokens.push({ type: "text", value: source.slice(index, end) });
        index = end;
        continue;
      }

      const tagEnd = source.indexOf(">", index + 1);
      if (tagEnd < 0) {
        tokens.push({ type: "text", value: source.slice(index) });
        break;
      }

      const tag = source.slice(index, tagEnd + 1);
      tokens.push({ type: "tag", value: tag });

      const tagName = getTagName(tag);
      if (tagName && isRawTextTag(tagName) && isOpeningTag(tag)) {
        const closingStart = lowerSource.indexOf(`</${tagName}`, tagEnd + 1);
        if (closingStart >= 0) {
          const closingEnd = source.indexOf(">", closingStart + 2);
          tokens.push({
            type: "raw",
            tagName,
            opener: tag,
            value: source.slice(tagEnd + 1, closingStart)
          });
          if (closingEnd >= 0) {
            tokens.push({ type: "tag", value: source.slice(closingStart, closingEnd + 1) });
            index = closingEnd + 1;
            continue;
          }
        }
      }

      index = tagEnd + 1;
    }

    return tokens.filter((token) => token.value);
  }

  function getTagName(tag) {
    const match = tag.match(/^<\/?\s*([a-zA-Z][\w:-]*)/);
    return match ? match[1].toLowerCase() : "";
  }

  function isRawTextTag(tagName) {
    return tagName === "script" || tagName === "style" || tagName === "textarea" || tagName === "pre";
  }

  function formatRawText(value, tagName, indent) {
    const text = String(value || "").trim();
    if (!text) {
      return [];
    }

    if (tagName === "script") {
      return formatScriptText(text, indent);
    }
    if (tagName === "style") {
      return formatStyleText(text, indent);
    }

    return text.split(/\r?\n/).map((line) => `${indent}${line.trimEnd()}`).filter((line) => line.trim());
  }

  function formatScriptText(text, indent) {
    const json = tryFormatJson(text);
    if (json) {
      return json.split("\n").map((line) => `${indent}${line}`);
    }

    return indentScriptLines(splitScriptLines(text), indent);
  }

  function splitScriptLines(text) {
    const lines = [];
    let current = "";
    let quote = "";
    let escaped = false;

    for (const char of String(text || "")) {
      current += char;

      if (quote) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === quote) {
          quote = "";
        }
        continue;
      }

      if (char === "\"" || char === "'" || char === "`") {
        quote = char;
        continue;
      }

      if (char === "}" || char === "]") {
        const beforeClosing = current.slice(0, -1);
        if (beforeClosing.trim()) {
          lines.push(beforeClosing);
        }
        lines.push(char);
        current = "";
        continue;
      }

      if (char === ";" || char === "," || char === "{" || char === "[") {
        lines.push(current);
        current = "";
      }
    }

    if (current) {
      lines.push(current);
    }

    return lines;
  }

  function indentScriptLines(lines, baseIndent) {
    const output = [];
    let depth = 0;

    lines
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        if (line === ";" && output.length) {
          output[output.length - 1] = `${output[output.length - 1]};`;
          return;
        }

        if (/^[}\]]/.test(line)) {
          depth = Math.max(depth - 1, 0);
        }

        output.push(`${baseIndent}${"  ".repeat(depth)}${line}`);

        if (/[{[]$/.test(line)) {
          depth += 1;
        }
      });

    return output;
  }

  function formatStyleText(text, indent) {
    return text
      .replace(/([{};])/g, "$1\n")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => `${indent}${line}`);
  }

  function tryFormatJson(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed || !/^[{[]/.test(trimmed)) {
      return "";
    }

    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2);
    } catch (_error) {
      return "";
    }
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
    return escapeHtml(text)
      .split("\n")
      .map(highlightHtmlLine)
      .join("\n");
  }

  function highlightHtmlLine(line) {
    if (/^\s*&lt;!--/.test(line)) {
      return line.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="syntax-comment">$1</span>');
    }

    if (line.includes("&lt;")) {
      return line.replace(/&lt;(\/?)([a-zA-Z][\w:-]*)([\s\S]*?)(&gt;)/g, (_match, slash, tagName, rest, close) => {
      const highlightedRest = rest.replace(/([\w:-]+)(=)(&quot;.*?&quot;|'.*?'|[^\s&]+)/g, '<span class="syntax-attr">$1</span>$2<span class="syntax-string">$3</span>');
      return `&lt;${slash}<span class="syntax-tag">${tagName}</span>${highlightedRest}${close}`;
      });
    }

    return highlightCodeLine(line);
  }

  function highlightCodeLine(line) {
    return line.replace(/(&quot;(?:\\.|[^&])*?&quot;|'(?:\\.|[^'\\])*?'|\b(?:true|false|null|undefined|function|return|var|let|const|if|else|for|while|new|this)\b|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)/g, (match) => {
      if (match.startsWith("&quot;") || match.startsWith("'")) {
        return `<span class="syntax-string">${match}</span>`;
      }
      if (/^(true|false)$/.test(match)) {
        return `<span class="syntax-boolean">${match}</span>`;
      }
      if (/^(null|undefined)$/.test(match)) {
        return `<span class="syntax-null">${match}</span>`;
      }
      if (/^-?\d/.test(match)) {
        return `<span class="syntax-number">${match}</span>`;
      }

      return `<span class="syntax-keyword">${match}</span>`;
    });
  }

  function wrapLongLines(text, maxLength) {
    const limit = maxLength || 320;
    return String(text || "")
      .split("\n")
      .flatMap((line) => splitLongLine(line, limit))
      .join("\n");
  }

  function splitLongLine(line, limit) {
    if (line.length <= limit) {
      return [line];
    }

    const indent = line.match(/^\s*/)[0];
    const continuationIndent = `${indent}  `;
    const chunks = [];
    let remaining = line;

    while (remaining.length > limit) {
      let splitAt = findWrapPosition(remaining, limit, continuationIndent.length + 16);
      if (splitAt <= continuationIndent.length) {
        splitAt = limit;
      }

      chunks.push(remaining.slice(0, splitAt).trimEnd());
      remaining = `${continuationIndent}${remaining.slice(splitAt).trimStart()}`;
    }

    if (remaining) {
      chunks.push(remaining);
    }

    return chunks;
  }

  function findWrapPosition(line, limit, minimum) {
    const candidates = [";", ",", " ", "><", "&amp;"];
    let best = -1;
    candidates.forEach((candidate) => {
      const index = line.lastIndexOf(candidate, limit);
      if (index >= minimum && index > best) {
        best = index + candidate.length;
      }
    });

    return best;
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
    wrapLongLines,
    escapeHtml
  };
});
