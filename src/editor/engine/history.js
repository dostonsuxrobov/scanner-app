// Undo stack of reversible entries. Each entry stores only "the other state":
// applying it swaps that state with the current one, so undo and redo are the
// same operation. The stack is bounded by count and approximate memory.
export function createHistory({ maxEntries = 60, maxBytes = 384 * 1024 * 1024 } = {}) {
  const past = [];
  const future = [];
  let nextId = 1;

  const bytes = () => [...past, ...future].reduce((n, e) => n + (e.bytes || 0), 0);

  function trim() {
    while (past.length > 1 && (past.length > maxEntries || bytes() > maxBytes)) past.shift();
  }

  return {
    push(entry) {
      entry.id = nextId++;
      past.push(entry);
      future.length = 0;
      trim();
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
    },
    // Identifies the document state; changes on every edit, undo, and redo.
    get currentId() {
      return past[past.length - 1]?.id ?? 0;
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
