// Decides whether a key press belongs to the focused form control rather than
// to the editor's shortcuts. Text fields keep every key. Sliders, checkboxes,
// and dropdowns keep only the keys they act on themselves, so Ctrl+Z or a tool
// letter still works right after one of them was used.
const TEXT_TYPES = /^(text|search|url|tel|email|password|number)$/;
const CONTROL_KEYS = /^(Arrow|Home$|End$|Page| $|Enter$)/;

export function controlKeepsKey(target, event) {
  if (target.isContentEditable || target.tagName === "TEXTAREA") return true;
  const mod = event.ctrlKey || event.metaKey;
  // A dropdown also uses letters, to jump to an option.
  if (target.tagName === "SELECT") return !mod;
  if (target.tagName !== "INPUT") return false;
  if (TEXT_TYPES.test(target.type || "text")) return true;
  return !mod && CONTROL_KEYS.test(event.key);
}
