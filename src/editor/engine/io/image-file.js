// Decodes an image file into a canvas, reducing it if it exceeds the limits.
import { createCanvas, loadImageFromBlob } from "../canvas.js";
import { fitWithinLimits } from "./fit-limits.js";

export async function decodeImageFile(file) {
  const image = await loadImageFromBlob(file);
  const naturalW = image.naturalWidth || image.width || 1024;
  const naturalH = image.naturalHeight || image.height || 1024;
  const { width, height, scaled } = fitWithinLimits(naturalW, naturalH);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, width, height);
  return { canvas, scaled };
}
