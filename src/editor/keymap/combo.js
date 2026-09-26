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
  // Shifted symbols ("{" for Shift+[) are matched by their physical key.
  const physical = event.code?.startsWith("Key") ? event.code.slice(3).toLowerCase() : event.code?.startsWith("Digit") ? event.code.slice(5) : null;
  const k = key.length === 1 ? key.toLowerCase() : key;
  return pressed === k || physical === k || (k === "[" && event.code === "BracketLeft") || (k === "]" && event.code === "BracketRight");
}

export function formatCombo(combo) {
  return combo
    .split("+")
    .map((part) => ({ Mod: isMac ? "⌘" : "Ctrl", Shift: isMac ? "⇧" : "Shift", Alt: isMac ? "⌥" : "Alt", Delete: "Del", Backspace: "⌫" })[part] ?? part.toUpperCase())
    .join(isMac ? "" : "+");
}
