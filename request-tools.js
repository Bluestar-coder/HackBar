(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.HackBarRequestTools = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  async function applyRequestTool(tool, input) {
    const text = String(input || "");

    if (tool === "url-encode") {
      return encodeURIComponent(text);
    }
    if (tool === "url-decode") {
      return decodeURIComponent(text);
    }
    if (tool === "base64-encode") {
      return base64Encode(text);
    }
    if (tool === "base64-decode") {
      return base64Decode(text);
    }
    if (tool === "html-encode") {
      return htmlEncode(text);
    }
    if (tool === "html-decode") {
      return htmlDecode(text);
    }
    if (tool === "hex-encode") {
      return hexEncode(text);
    }
    if (tool === "hex-decode") {
      return hexDecode(text);
    }
    if (tool === "unicode-encode") {
      return unicodeEncode(text);
    }
    if (tool === "unicode-decode") {
      return unicodeDecode(text);
    }
    if (tool === "md5") {
      return md5(text);
    }
    if (tool === "sha1") {
      return digest("SHA-1", text);
    }
    if (tool === "sha256") {
      return digest("SHA-256", text);
    }

    throw new Error("Unknown tool");
  }

  function base64Encode(text) {
    if (typeof btoa === "function") {
      return btoa(unescape(encodeURIComponent(text)));
    }

    return Buffer.from(text, "utf8").toString("base64");
  }

  function base64Decode(text) {
    if (typeof atob === "function") {
      return decodeURIComponent(escape(atob(text)));
    }

    return Buffer.from(text, "base64").toString("utf8");
  }

  function htmlEncode(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function htmlDecode(text) {
    const entities = {
      amp: "&",
      lt: "<",
      gt: ">",
      quot: "\"",
      apos: "'",
      "#39": "'"
    };

    return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, entity) => {
      if (entity.startsWith("#x")) {
        return String.fromCodePoint(parseInt(entity.slice(2), 16));
      }
      if (entity.startsWith("#")) {
        return String.fromCodePoint(parseInt(entity.slice(1), 10));
      }

      return Object.prototype.hasOwnProperty.call(entities, entity) ? entities[entity] : match;
    });
  }

  function hexEncode(text) {
    return Array.from(utf8Encode(text))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  function hexDecode(text) {
    const normalized = text.replace(/\s+/g, "");
    if (!/^(?:[0-9a-fA-F]{2})*$/.test(normalized)) {
      throw new Error("Input must be valid hex");
    }

    const bytes = [];
    for (let index = 0; index < normalized.length; index += 2) {
      bytes.push(parseInt(normalized.slice(index, index + 2), 16));
    }

    return utf8Decode(new Uint8Array(bytes));
  }

  function unicodeEncode(text) {
    return Array.from(text)
      .map((char) => {
        const code = char.codePointAt(0);
        if (code <= 0xffff) {
          return `\\u${code.toString(16).padStart(4, "0")}`;
        }

        return `\\u{${code.toString(16)}}`;
      })
      .join("");
  }

  function unicodeDecode(text) {
    return text
      .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_match, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/\\u([0-9a-fA-F]{4})/g, (_match, hex) => String.fromCodePoint(parseInt(hex, 16)));
  }

  async function digest(algorithm, text) {
    if (globalThis.crypto && crypto.subtle) {
      const hash = await crypto.subtle.digest(algorithm, utf8Encode(text));
      return bytesToHex(new Uint8Array(hash));
    }

    const nodeCrypto = require("node:crypto");
    return nodeCrypto.createHash(algorithm.toLowerCase().replace("-", "")).update(text, "utf8").digest("hex");
  }

  function md5(text) {
    if (typeof require === "function") {
      const nodeCrypto = require("node:crypto");
      return nodeCrypto.createHash("md5").update(text, "utf8").digest("hex");
    }

    return md5Browser(text);
  }

  function md5Browser(text) {
    const bytes = utf8Encode(text);
    const words = [];
    for (let index = 0; index < bytes.length; index += 1) {
      words[index >> 2] |= bytes[index] << ((index % 4) * 8);
    }
    words[bytes.length >> 2] |= 0x80 << ((bytes.length % 4) * 8);
    words[(((bytes.length + 8) >> 6) + 1) * 16 - 2] = bytes.length * 8;

    let a = 0x67452301;
    let b = 0xefcdab89;
    let c = 0x98badcfe;
    let d = 0x10325476;

    for (let index = 0; index < words.length; index += 16) {
      const aa = a;
      const bb = b;
      const cc = c;
      const dd = d;

      a = round1(a, b, c, d, words[index], 7, 0xd76aa478);
      d = round1(d, a, b, c, words[index + 1], 12, 0xe8c7b756);
      c = round1(c, d, a, b, words[index + 2], 17, 0x242070db);
      b = round1(b, c, d, a, words[index + 3], 22, 0xc1bdceee);
      a = round1(a, b, c, d, words[index + 4], 7, 0xf57c0faf);
      d = round1(d, a, b, c, words[index + 5], 12, 0x4787c62a);
      c = round1(c, d, a, b, words[index + 6], 17, 0xa8304613);
      b = round1(b, c, d, a, words[index + 7], 22, 0xfd469501);
      a = round1(a, b, c, d, words[index + 8], 7, 0x698098d8);
      d = round1(d, a, b, c, words[index + 9], 12, 0x8b44f7af);
      c = round1(c, d, a, b, words[index + 10], 17, 0xffff5bb1);
      b = round1(b, c, d, a, words[index + 11], 22, 0x895cd7be);
      a = round1(a, b, c, d, words[index + 12], 7, 0x6b901122);
      d = round1(d, a, b, c, words[index + 13], 12, 0xfd987193);
      c = round1(c, d, a, b, words[index + 14], 17, 0xa679438e);
      b = round1(b, c, d, a, words[index + 15], 22, 0x49b40821);

      a = round2(a, b, c, d, words[index + 1], 5, 0xf61e2562);
      d = round2(d, a, b, c, words[index + 6], 9, 0xc040b340);
      c = round2(c, d, a, b, words[index + 11], 14, 0x265e5a51);
      b = round2(b, c, d, a, words[index], 20, 0xe9b6c7aa);
      a = round2(a, b, c, d, words[index + 5], 5, 0xd62f105d);
      d = round2(d, a, b, c, words[index + 10], 9, 0x02441453);
      c = round2(c, d, a, b, words[index + 15], 14, 0xd8a1e681);
      b = round2(b, c, d, a, words[index + 4], 20, 0xe7d3fbc8);
      a = round2(a, b, c, d, words[index + 9], 5, 0x21e1cde6);
      d = round2(d, a, b, c, words[index + 14], 9, 0xc33707d6);
      c = round2(c, d, a, b, words[index + 3], 14, 0xf4d50d87);
      b = round2(b, c, d, a, words[index + 8], 20, 0x455a14ed);
      a = round2(a, b, c, d, words[index + 13], 5, 0xa9e3e905);
      d = round2(d, a, b, c, words[index + 2], 9, 0xfcefa3f8);
      c = round2(c, d, a, b, words[index + 7], 14, 0x676f02d9);
      b = round2(b, c, d, a, words[index + 12], 20, 0x8d2a4c8a);

      a = round3(a, b, c, d, words[index + 5], 4, 0xfffa3942);
      d = round3(d, a, b, c, words[index + 8], 11, 0x8771f681);
      c = round3(c, d, a, b, words[index + 11], 16, 0x6d9d6122);
      b = round3(b, c, d, a, words[index + 14], 23, 0xfde5380c);
      a = round3(a, b, c, d, words[index + 1], 4, 0xa4beea44);
      d = round3(d, a, b, c, words[index + 4], 11, 0x4bdecfa9);
      c = round3(c, d, a, b, words[index + 7], 16, 0xf6bb4b60);
      b = round3(b, c, d, a, words[index + 10], 23, 0xbebfbc70);
      a = round3(a, b, c, d, words[index + 13], 4, 0x289b7ec6);
      d = round3(d, a, b, c, words[index], 11, 0xeaa127fa);
      c = round3(c, d, a, b, words[index + 3], 16, 0xd4ef3085);
      b = round3(b, c, d, a, words[index + 6], 23, 0x04881d05);
      a = round3(a, b, c, d, words[index + 9], 4, 0xd9d4d039);
      d = round3(d, a, b, c, words[index + 12], 11, 0xe6db99e5);
      c = round3(c, d, a, b, words[index + 15], 16, 0x1fa27cf8);
      b = round3(b, c, d, a, words[index + 2], 23, 0xc4ac5665);

      a = round4(a, b, c, d, words[index], 6, 0xf4292244);
      d = round4(d, a, b, c, words[index + 7], 10, 0x432aff97);
      c = round4(c, d, a, b, words[index + 14], 15, 0xab9423a7);
      b = round4(b, c, d, a, words[index + 5], 21, 0xfc93a039);
      a = round4(a, b, c, d, words[index + 12], 6, 0x655b59c3);
      d = round4(d, a, b, c, words[index + 3], 10, 0x8f0ccc92);
      c = round4(c, d, a, b, words[index + 10], 15, 0xffeff47d);
      b = round4(b, c, d, a, words[index + 1], 21, 0x85845dd1);
      a = round4(a, b, c, d, words[index + 8], 6, 0x6fa87e4f);
      d = round4(d, a, b, c, words[index + 15], 10, 0xfe2ce6e0);
      c = round4(c, d, a, b, words[index + 6], 15, 0xa3014314);
      b = round4(b, c, d, a, words[index + 13], 21, 0x4e0811a1);
      a = round4(a, b, c, d, words[index + 4], 6, 0xf7537e82);
      d = round4(d, a, b, c, words[index + 11], 10, 0xbd3af235);
      c = round4(c, d, a, b, words[index + 2], 15, 0x2ad7d2bb);
      b = round4(b, c, d, a, words[index + 9], 21, 0xeb86d391);

      a = add32(a, aa);
      b = add32(b, bb);
      c = add32(c, cc);
      d = add32(d, dd);
    }

    return bytesToHex(new Uint8Array([a, a >> 8, a >> 16, a >> 24, b, b >> 8, b >> 16, b >> 24, c, c >> 8, c >> 16, c >> 24, d, d >> 8, d >> 16, d >> 24]));
  }

  function round1(a, b, c, d, x, s, t) {
    return transform(a, b, ((b & c) | (~b & d)), x, s, t);
  }

  function round2(a, b, c, d, x, s, t) {
    return transform(a, b, ((b & d) | (c & ~d)), x, s, t);
  }

  function round3(a, b, c, d, x, s, t) {
    return transform(a, b, (b ^ c ^ d), x, s, t);
  }

  function round4(a, b, c, d, x, s, t) {
    return transform(a, b, (c ^ (b | ~d)), x, s, t);
  }

  function transform(a, b, f, x, s, t) {
    const value = add32(add32(a, f), add32(x || 0, t));
    return add32(((value << s) | (value >>> (32 - s))), b);
  }

  function add32(a, b) {
    return (a + b) >>> 0;
  }

  function utf8Encode(text) {
    return new TextEncoder().encode(text);
  }

  function utf8Decode(bytes) {
    return new TextDecoder().decode(bytes);
  }

  function bytesToHex(bytes) {
    return Array.from(bytes)
      .map((byte) => (byte & 0xff).toString(16).padStart(2, "0"))
      .join("");
  }

  return {
    applyRequestTool
  };
});
