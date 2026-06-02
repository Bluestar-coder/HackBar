(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.HackBarResponseTree = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const DEFAULT_DEPTH = 5;
  const MAX_TEXT_LENGTH = 180;

  function buildJsonTree(text) {
    let value;
    try {
      value = JSON.parse(String(text || ""));
    } catch (error) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }

    return buildValueNode(value, "");
  }

  function buildHtmlTree(text) {
    if (typeof DOMParser === "undefined") {
      throw new Error("DOMParser is not available");
    }

    const parser = new DOMParser();
    const document = parser.parseFromString(String(text || ""), "text/html");
    const parseError = document.querySelector("parsererror");
    if (parseError) {
      throw new Error("Invalid HTML");
    }

    return {
      kind: "document",
      label: "#document",
      children: Array.from(document.childNodes).map(buildDomNode).filter(Boolean)
    };
  }

  function buildValueNode(value, key) {
    if (Array.isArray(value)) {
      return {
        kind: "array",
        key,
        summary: `Array(${value.length})`,
        children: value.map((item, index) => buildValueNode(item, String(index)))
      };
    }

    if (value && typeof value === "object") {
      const entries = Object.entries(value);
      return {
        kind: "object",
        key,
        summary: `Object(${entries.length})`,
        children: entries.map(([name, item]) => buildValueNode(item, name))
      };
    }

    return {
      kind: value === null ? "null" : typeof value,
      key,
      value
    };
  }

  function buildDomNode(node) {
    if (node.nodeType === Node.DOCUMENT_TYPE_NODE) {
      return {
        kind: "doctype",
        label: `<!DOCTYPE ${node.name}>`
      };
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const children = Array.from(node.childNodes)
        .map(buildDomNode)
        .filter(Boolean);
      return {
        kind: "element",
        label: node.tagName.toLowerCase(),
        attributes: Array.from(node.attributes).map((attribute) => ({
          name: attribute.name,
          value: attribute.value
        })),
        children
      };
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.replace(/\s+/g, " ").trim();
      if (!text) {
        return null;
      }

      return {
        kind: "text",
        value: text.length > MAX_TEXT_LENGTH ? `${text.slice(0, MAX_TEXT_LENGTH)}...` : text
      };
    }

    if (node.nodeType === Node.COMMENT_NODE) {
      const text = node.textContent.trim();
      return {
        kind: "comment",
        value: text.length > MAX_TEXT_LENGTH ? `${text.slice(0, MAX_TEXT_LENGTH)}...` : text
      };
    }

    return null;
  }

  function renderTree(tree, options) {
    const defaultDepth = Number(options && options.defaultDepth) || DEFAULT_DEPTH;
    return `<div class="tree-view" role="tree">${renderNode(tree, 0, defaultDepth)}</div>`;
  }

  function renderNode(node, depth, defaultDepth) {
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    const isExpanded = hasChildren && depth < defaultDepth;
    const childHtml = hasChildren
      ? `<div class="tree-children"${isExpanded ? "" : " hidden"}>${node.children.map((child) => renderNode(child, depth + 1, defaultDepth)).join("")}</div>`
      : "";
    const toggle = hasChildren
      ? `<button class="tree-toggle" type="button" aria-label="Toggle node" aria-expanded="${isExpanded}" data-tree-toggle></button>`
      : '<span class="tree-spacer"></span>';

    return `<div class="tree-node${hasChildren ? " has-children" : ""}" data-tree-node data-depth="${depth}" role="treeitem" aria-expanded="${hasChildren ? String(isExpanded) : "false"}">
      <div class="tree-row">${toggle}<span class="tree-content">${renderNodeContent(node, hasChildren)}</span></div>
      ${childHtml}
    </div>`;
  }

  function renderNodeContent(node, hasChildren) {
    if (node.kind === "document") {
      return `<span class="tree-tag">#document</span>${hasChildren ? renderCount(node.children.length) : ""}`;
    }
    if (node.kind === "doctype") {
      return `<span class="tree-comment">${escapeHtml(node.label)}</span>`;
    }
    if (node.kind === "element") {
      const attrs = (node.attributes || []).map((attribute) => ` <span class="tree-attr">${escapeHtml(attribute.name)}</span>=<span class="tree-string">&quot;${escapeHtml(attribute.value)}&quot;</span>`).join("");
      return `<span class="tree-punct">&lt;</span><span class="tree-tag">${escapeHtml(node.label)}</span>${attrs}<span class="tree-punct">&gt;</span>${hasChildren ? renderCount(node.children.length) : ""}`;
    }
    if (node.kind === "text") {
      return `<span class="tree-text">"${escapeHtml(node.value)}"</span>`;
    }
    if (node.kind === "comment") {
      return `<span class="tree-comment">&lt;!-- ${escapeHtml(node.value)} --&gt;</span>`;
    }
    if (node.kind === "object" || node.kind === "array") {
      const bracket = node.kind === "array" ? "[]" : "{}";
      return `${renderKey(node.key)}<span class="tree-punct">${bracket}</span>${renderCount(node.children.length)}`;
    }

    return `${renderKey(node.key)}${renderPrimitive(node)}`;
  }

  function renderKey(key) {
    return key ? `<span class="tree-key">${escapeHtml(key)}</span><span class="tree-punct">: </span>` : "";
  }

  function renderCount(count) {
    return ` <span class="tree-count">${count}</span>`;
  }

  function renderPrimitive(node) {
    if (node.kind === "string") {
      return `<span class="tree-string">&quot;${escapeHtml(node.value)}&quot;</span>`;
    }
    if (node.kind === "number") {
      return `<span class="tree-number">${escapeHtml(String(node.value))}</span>`;
    }
    if (node.kind === "boolean") {
      return `<span class="tree-boolean">${String(node.value)}</span>`;
    }
    if (node.kind === "null") {
      return '<span class="tree-null">null</span>';
    }

    return `<span class="tree-text">${escapeHtml(String(node.value))}</span>`;
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  return {
    buildJsonTree,
    buildHtmlTree,
    renderTree
  };
});
