// Fonts offered by the Text tool. "system" fonts ship with most operating
// systems; "web" fonts are fetched from Google Fonts the first time they are used.
const range = (from, to) => Array.from({ length: (to - from) / 100 + 1 }, (_, i) => from + i * 100);

export const FONT_GROUPS = [
  {
    label: "Sans serif",
    fonts: [
      { family: "Inter", source: "web", weights: range(100, 900), fallback: "sans-serif" },
      { family: "Roboto", source: "web", weights: [100, 300, 400, 500, 700, 900], fallback: "sans-serif" },
      { family: "Open Sans", source: "web", weights: range(300, 800), fallback: "sans-serif" },
      { family: "Lato", source: "web", weights: [100, 300, 400, 700, 900], fallback: "sans-serif" },
      { family: "Montserrat", source: "web", weights: range(100, 900), fallback: "sans-serif" },
      { family: "Poppins", source: "web", weights: range(100, 900), fallback: "sans-serif" },
      { family: "Raleway", source: "web", weights: range(100, 900), fallback: "sans-serif" },
      { family: "Nunito", source: "web", weights: range(200, 900), fallback: "sans-serif" },
      { family: "Oswald", source: "web", weights: range(200, 700), fallback: "sans-serif" },
      { family: "Arial", source: "system", weights: [400, 700], fallback: "sans-serif" },
      { family: "Helvetica", source: "system", weights: [400, 700], fallback: "sans-serif" },
      { family: "Verdana", source: "system", weights: [400, 700], fallback: "sans-serif" },
      { family: "Trebuchet MS", source: "system", weights: [400, 700], fallback: "sans-serif" },
      { family: "Tahoma", source: "system", weights: [400, 700], fallback: "sans-serif" },
    ],
  },
  {
    label: "Serif",
    fonts: [
      { family: "Playfair Display", source: "web", weights: range(400, 900), fallback: "serif" },
      { family: "Merriweather", source: "web", weights: [300, 400, 700, 900], fallback: "serif" },
      { family: "Lora", source: "web", weights: range(400, 700), fallback: "serif" },
      { family: "Roboto Slab", source: "web", weights: range(100, 900), fallback: "serif" },
      { family: "DM Serif Display", source: "web", weights: [400], fallback: "serif" },
      { family: "Georgia", source: "system", weights: [400, 700], fallback: "serif" },
      { family: "Times New Roman", source: "system", weights: [400, 700], fallback: "serif" },
      { family: "Palatino Linotype", source: "system", weights: [400, 700], fallback: "serif" },
    ],
  },
  {
    label: "Display",
    fonts: [
      { family: "Bebas Neue", source: "web", weights: [400], fallback: "sans-serif" },
      { family: "Anton", source: "web", weights: [400], fallback: "sans-serif" },
      { family: "Abril Fatface", source: "web", weights: [400], fallback: "serif" },
      { family: "Righteous", source: "web", weights: [400], fallback: "sans-serif" },
      { family: "Lobster", source: "web", weights: [400], fallback: "cursive" },
      { family: "Impact", source: "system", weights: [400], fallback: "sans-serif" },
    ],
  },
  {
    label: "Handwriting",
    fonts: [
      { family: "Pacifico", source: "web", weights: [400], fallback: "cursive" },
      { family: "Dancing Script", source: "web", weights: range(400, 700), fallback: "cursive" },
      { family: "Caveat", source: "web", weights: range(400, 700), fallback: "cursive" },
      { family: "Permanent Marker", source: "web", weights: [400], fallback: "cursive" },
      { family: "Comic Sans MS", source: "system", weights: [400, 700], fallback: "cursive" },
    ],
  },
  {
    label: "Monospace",
    fonts: [
      { family: "Source Code Pro", source: "web", weights: range(200, 900), fallback: "monospace" },
      { family: "Roboto Mono", source: "web", weights: range(100, 700), fallback: "monospace" },
      { family: "Courier New", source: "system", weights: [400, 700], fallback: "monospace" },
    ],
  },
];

export const WEIGHT_NAMES = {
  100: "Thin",
  200: "Extra light",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "Semibold",
  700: "Bold",
  800: "Extra bold",
  900: "Black",
};

const catalog = new Map(FONT_GROUPS.flatMap((g) => g.fonts).map((f) => [f.family, f]));

// Fonts discovered on the user's computer are added at runtime.
export function registerLocalFonts(families) {
  for (const family of families)
    if (!catalog.has(family))
      catalog.set(family, { family, source: "local", weights: [400, 700], fallback: "sans-serif" });
}

export const localFontFamilies = () => [...catalog.values()].filter((f) => f.source === "local");

export const fontInfo = (family) =>
  catalog.get(family) ?? { family, source: "local", weights: [400, 700], fallback: "sans-serif" };

// Nearest available weight, so a font switch never requests a missing face.
export function nearestWeight(family, weight) {
  const { weights } = fontInfo(family);
  return weights.reduce((best, w) => (Math.abs(w - weight) < Math.abs(best - weight) ? w : best), weights[0]);
}

export function cssFont(style, sizePx = style.size) {
  const { fallback } = fontInfo(style.family);
  return `${style.italic ? "italic " : ""}${style.weight} ${sizePx}px "${style.family}", ${fallback}`;
}
