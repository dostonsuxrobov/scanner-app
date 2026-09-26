// Selection mode from modifier keys, supporting both Photoshop (Alt subtracts)
// and GIMP (Ctrl subtracts) conventions. Otherwise the tool option applies.
export function selectionMode(e, fallback) {
  const subtract = e.alt || e.mod;
  if (e.shift && subtract) return "intersect";
  if (e.shift) return "add";
  if (subtract) return "subtract";
  return fallback;
}
