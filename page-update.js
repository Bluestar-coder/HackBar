(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.HackBarPageUpdate = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createPageUpdateScript(payload) {
    const method = String(payload.method || "GET").toUpperCase();
    const url = String(payload.url || "");

    if (method === "GET" || method === "HEAD") {
      return `window.location.href = ${JSON.stringify(url)};`;
    }

    const body = normalizeFormBody(String(payload.body || ""));
    return `
(function () {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = ${JSON.stringify(url)};
  form.style.display = "none";
  const params = new URLSearchParams(${JSON.stringify(body)});
  for (const [name, value] of params.entries()) {
    const nameInput = document.createElement("input");
    nameInput.type = "hidden";
    nameInput.name = name;
    nameInput.value = value;
    form.appendChild(nameInput);
  }
  document.body.appendChild(form);
  form.submit();
})();
`;
  }

  function normalizeFormBody(body) {
    return body
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join("&");
  }

  return {
    createPageUpdateScript,
    normalizeFormBody
  };
});
