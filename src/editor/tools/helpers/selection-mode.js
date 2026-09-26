// Selection mode from modifier keys held when the selection starts, as in GIMP:
// Shift adds, Ctrl subtracts, Ctrl+Shift intersects. Alt also subtracts
// (Photoshop's convention). Without modifiers the tool option applies.
export function selectionMode(e, fallback) {
  const subtract = e.alt || e.mod;
  if (e.shift && subtract) return "intersect";
  if (e.shift) return "add";
  if (subtract) return "subtract";
  return fallback;
}
