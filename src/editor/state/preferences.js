// Per-browser preferences kept in localStorage (best effort; never required).
const KEY = "advanced-editor-preferences";

export const DEFAULT_PREFERENCES = { wheelZooms: true, exportFormat: "png", exportQuality: 92 };

export function loadPreferences() {
  try {
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(preferences) {
  try {
    localStorage.setItem(KEY, JSON.stringify(preferences));
  } catch {
    // Storage can be unavailable (private mode); preferences then last for the session.
  }
}
