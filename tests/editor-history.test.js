const assert = require("node:assert");
const { createEditorHistory } = require("../editor-history");

let currentState = {
  value: "",
  selection: { start: 0, end: 0 }
};

const history = createEditorHistory(
  () => currentState,
  (state) => {
    currentState = state;
  },
  { limit: 3 }
);

history.reset();
assert.strictEqual(history.canUndo(), false);
assert.strictEqual(history.canRedo(), false);

currentState = {
  value: "a",
  selection: { start: 1, end: 1 }
};
assert.strictEqual(history.commit(), true);

currentState = {
  value: "ab",
  selection: { start: 2, end: 2 }
};
assert.strictEqual(history.commit(), true);

assert.strictEqual(history.undo(), true);
assert.deepStrictEqual(currentState, {
  value: "a",
  selection: { start: 1, end: 1 }
});
assert.strictEqual(history.undo(), true);
assert.deepStrictEqual(currentState, {
  value: "",
  selection: { start: 0, end: 0 }
});
assert.strictEqual(history.undo(), false);

assert.strictEqual(history.redo(), true);
assert.deepStrictEqual(currentState, {
  value: "a",
  selection: { start: 1, end: 1 }
});

currentState = {
  value: "ax",
  selection: { start: 2, end: 2 }
};
assert.strictEqual(history.commit(), true);
assert.strictEqual(history.canRedo(), false);

currentState = {
  value: "ax",
  selection: { start: 2, end: 2 }
};
assert.strictEqual(history.commit(), false);

currentState = {
  value: "axe",
  selection: { start: 3, end: 3 }
};
history.commit();
currentState = {
  value: "axes",
  selection: { start: 4, end: 4 }
};
history.commit();

assert.strictEqual(history.undo(), true);
assert.deepStrictEqual(currentState, {
  value: "axe",
  selection: { start: 3, end: 3 }
});
assert.strictEqual(history.undo(), true);
assert.deepStrictEqual(currentState, {
  value: "ax",
  selection: { start: 2, end: 2 }
});
assert.strictEqual(history.undo(), false);

console.log("editor history tests passed");
