const assert = require("node:assert");
const { buildJsonTree, renderTree } = require("../response-tree");

const tree = buildJsonTree('{"name":"HackBar","items":[{"id":1,"enabled":true}],"meta":{"empty":null}}');

assert.strictEqual(tree.kind, "object");
assert.strictEqual(tree.children.length, 3);
assert.strictEqual(tree.children[0].key, "name");
assert.strictEqual(tree.children[1].kind, "array");
assert.strictEqual(tree.children[1].children[0].kind, "object");

const rendered = renderTree(tree, { defaultDepth: 2 });
assert.match(rendered, /class="tree-view"/);
assert.match(rendered, /data-tree-node/);
assert.match(rendered, /aria-expanded="true"/);
assert.match(rendered, /aria-expanded="false"/);
assert.match(rendered, /<span class="tree-key">name<\/span>/);
assert.match(rendered, /<span class="tree-string">&quot;HackBar&quot;<\/span>/);
assert.match(rendered, /<span class="tree-number">1<\/span>/);
assert.match(rendered, /<span class="tree-boolean">true<\/span>/);
assert.match(rendered, /<span class="tree-null">null<\/span>/);

assert.throws(() => buildJsonTree("{"), /Invalid JSON/);

console.log("response tree tests passed");
