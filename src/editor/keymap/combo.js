// Parses and matches key combos like "Mod+Shift+Z" ("Mod" = Ctrl or ⌘).
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export function matchesCombo(combo, event) {
  const parts = combo.split("+");
  const key = parts.pop() || "+";
  const want = new Set(parts);
  const mod = event.ctrlKey || event.metaKey;
  if (want.has("Mod") !== mod) return false;
  if (want.has("Shift") !== event.shiftKey) return false;
  if (want.has("Alt") !== event.altKey) return false;
  const pressed = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  // The physical key stands in only when the layout gives no Latin character:
  // non-Latin layouts ("я"), ⌥-combos on a Mac ("∑", "Dead"), and shifted
  // digits ("!" for Shift+1). On Dvorak or AZERTY the typed letter decides,
  // otherwise one key press would match two different shortcuts.
  const typed = event.key.length === 1 && event.key.charCodeAt(0) < 128;
  const physical = event.code?.startsWith("Key") ? (typed ? null : event.code.slice(3).toLowerCase()) : event.code?.startsWith("Digit") ? event.code.slice(5) : null;
  const k = key.length === 1 ? key.toLowerCase() : key;
  return pressed === k || physical === k || (k === "[" && event.code === "BracketLeft") || (k === "]" && event.code === "BracketRight");
}

export function formatCombo(combo) {
  return combo
    .split("+")
    .map((part) => ({ Mod: isMac ? "⌘" : "Ctrl", Shift: isMac ? "⇧" : "Shift", Alt: isMac ? "⌥" : "Alt", Delete: "Del", Backspace: "⌫" })[part] ?? part.toUpperCase())
    .join(isMac ? "" : "+");
}
