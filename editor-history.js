(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.HackBarEditorHistory = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createEditorHistory(getSnapshot, restoreSnapshot, options) {
    const limit = Math.max(2, Number(options && options.limit) || 100);
    let entries = [];
    let index = -1;
    let restoring = false;

    function reset(snapshot) {
      entries = [cloneSnapshot(snapshot || getSnapshot())];
      index = 0;
    }

    function commit(snapshot) {
      if (restoring) {
        return false;
      }

      const next = cloneSnapshot(snapshot || getSnapshot());
      if (index >= 0 && snapshotsEqual(entries[index], next)) {
        return false;
      }

      entries = entries.slice(0, index + 1);
      entries.push(next);
      if (entries.length > limit) {
        entries.shift();
      }
      index = entries.length - 1;
      return true;
    }

    function undo() {
      if (!canUndo()) {
        return false;
      }

      index -= 1;
      restore(entries[index]);
      return true;
    }

    function redo() {
      if (!canRedo()) {
        return false;
      }

      index += 1;
      restore(entries[index]);
      return true;
    }

    function canUndo() {
      return index > 0;
    }

    function canRedo() {
      return index >= 0 && index < entries.length - 1;
    }

    function restore(snapshot) {
      restoring = true;
      try {
        restoreSnapshot(cloneSnapshot(snapshot));
      } finally {
        restoring = false;
      }
    }

    return {
      reset,
      commit,
      undo,
      redo,
      canUndo,
      canRedo
    };
  }

  function cloneSnapshot(snapshot) {
    return JSON.parse(JSON.stringify(snapshot));
  }

  function snapshotsEqual(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  return {
    createEditorHistory
  };
});
