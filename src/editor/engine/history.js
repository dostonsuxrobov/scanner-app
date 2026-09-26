// Undo stack of reversible entries. Each entry stores only "the other state":
// applying it swaps that state with the current one, so undo and redo are the
// same operation. The stack is bounded by count and approximate memory.
export function createHistory({ maxEntries = 60, maxBytes = 384 * 1024 * 1024 } = {}) {
  const past = [];
  const future = [];
  let nextId = 1;
  let baseId = 0; // state before the oldest remaining entry

  const bytes = () => [...past, ...future].reduce((n, e) => n + (e.bytes || 0), 0);

  function trim() {
    while (past.length > 1 && (past.length > maxEntries || bytes() > maxBytes)) baseId = past.shift().id;
  }

  return {
    push(entry) {
      entry.id = nextId++;
      past.push(entry);
      future.length = 0;
      trim();
    },
    // Folds a follow-up edit into the latest entry (e.g. scrubbing a value),
    // so one gesture is one undo step. Returns false if it cannot merge.
    merge(key, now, windowMs = 1200) {
      const top = past[past.length - 1];
      if (!key || future.length || !top || top.mergeKey !== key || now - top.time > windowMs) return false;
      top.id = nextId++;
      top.time = now;
      return true;
    },
    // `apply(entry)` swaps the entry's state with the document and returns it.
    undo(apply) {
      const entry = past.pop();
      if (!entry) return null;
      future.push(apply(entry));
      return entry;
    },
    redo(apply) {
      const entry = future.pop();
      if (!entry) return null;
      past.push(apply(entry));
      return entry;
    },
    clear() {
      past.length = 0;
      future.length = 0;
      baseId = 0;
    },
    // Identifies the document state; changes on every edit, undo, and redo.
    get currentId() {
      return past[past.length - 1]?.id ?? baseId;
    },
    get canUndo() {
      return past.length > 0;
    },
    get canRedo() {
      return future.length > 0;
    },
    get undoLabel() {
      return past[past.length - 1]?.label ?? "";
    },
    get redoLabel() {
      return future[future.length - 1]?.label ?? "";
    },
  };
}
