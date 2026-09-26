// Aspect ratio presets for the Crop tool (width / height).
export const CROP_RATIOS = [
  ["free", "Free"],
  ["original", "Original"],
  ["1:1", "1 : 1 (square)"],
  ["4:3", "4 : 3"],
  ["3:4", "3 : 4"],
  ["3:2", "3 : 2"],
  ["2:3", "2 : 3"],
  ["16:9", "16 : 9"],
  ["9:16", "9 : 16"],
  ["custom", "Custom…"],
];

export function cropRatio(options, doc) {
  if (options.ratio === "free") return null;
  if (options.ratio === "original") return doc.width / doc.height;
  if (options.ratio === "custom") return options.ratioW > 0 && options.ratioH > 0 ? options.ratioW / options.ratioH : null;
  const [w, h] = options.ratio.split(":").map(Number);
  return w / h;
}

// Largest rect of `ratio` centred in the document.
export function fitRatio(doc, ratio) {
  if (!ratio) return { x: 0, y: 0, w: doc.width, h: doc.height };
  const w = Math.min(doc.width, doc.height * ratio);
  const h = w / ratio;
  return { x: (doc.width - w) / 2, y: (doc.height - h) / 2, w, h };
}
