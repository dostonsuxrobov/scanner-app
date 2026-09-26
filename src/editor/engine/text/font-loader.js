// Loads web fonts on demand and lists fonts installed on the user's computer.
import { fontInfo, cssFont, registerLocalFonts } from "./font-catalog.js";

const requested = new Set();

function stylesheetUrl(font) {
  const family = font.family.replace(/ /g, "+");
  const weights = font.weights.length > 1 ? `:wght@${font.weights.join(";")}` : "";
  return `https://fonts.googleapis.com/css2?family=${family}${weights}&display=swap`;
}

// Resolves true once the face can render, false if it is unavailable (offline).
export async function ensureFont(style) {
  const font = fontInfo(style.family);
  if (font.source === "web" && !requested.has(font.family)) {
    requested.add(font.family);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = stylesheetUrl(font);
    const loaded = new Promise((resolve) => {
      link.onload = resolve;
      link.onerror = resolve;
    });
    document.head.appendChild(link);
    await loaded;
  }
  try {
    const faces = await document.fonts.load(cssFont(style, 32), "AaBb");
    return font.source !== "web" || faces.length > 0;
  } catch {
    return false;
  }
}

export const canListLocalFonts = () => typeof window !== "undefined" && "queryLocalFonts" in window;

export async function listLocalFonts() {
  const fonts = await window.queryLocalFonts();
  const families = [...new Set(fonts.map((f) => f.family))].sort((a, b) => a.localeCompare(b));
  registerLocalFonts(families);
  return families;
}
