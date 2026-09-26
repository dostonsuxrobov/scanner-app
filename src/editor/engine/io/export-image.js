// Encodes the flattened document as PNG, JPEG, WebP, or PDF.
import { canvasToBlob, createCanvas } from "../canvas.js";
import { flatten } from "../flatten.js";

export const EXPORT_FORMATS = {
  png: { label: "PNG", ext: "png", mime: "image/png", lossy: false, alpha: true },
  jpg: { label: "JPEG", ext: "jpg", mime: "image/jpeg", lossy: true, alpha: false },
  webp: { label: "WebP", ext: "webp", mime: "image/webp", lossy: true, alpha: true },
  pdf: { label: "PDF", ext: "pdf", mime: "application/pdf", lossy: false, alpha: false },
};

// options: { format, quality (0–1), background (for formats without alpha), scale }
export async function exportImage(doc, { format = "png", quality = 0.92, background = "#ffffff", scale = 1 }) {
  const spec = EXPORT_FORMATS[format];
  let canvas = flatten(doc, { background: spec.alpha ? null : background });
  if (scale !== 1) canvas = resample(canvas, scale);
  if (format !== "pdf") return canvasToBlob(canvas, spec.mime, spec.lossy ? quality : undefined);
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? "l" : "p",
    unit: "px",
    format: [canvas.width, canvas.height],
    hotfixes: ["px_scaling"],
  });
  pdf.addImage(canvas, "PNG", 0, 0, canvas.width, canvas.height);
  return pdf.output("blob");
}

function resample(source, scale) {
  const canvas = createCanvas(Math.max(1, Math.round(source.width * scale)), Math.max(1, Math.round(source.height * scale)));
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}
