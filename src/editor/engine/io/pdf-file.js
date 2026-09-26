// Opens PDFs with pdf.js (loaded on demand) and renders pages to canvases.
import { createCanvas } from "../canvas.js";
import { fitWithinLimits } from "./fit-limits.js";

let pdfjs = null;
async function library() {
  if (!pdfjs) {
    pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
  }
  return pdfjs;
}

export async function openPdf(file) {
  const lib = await library();
  const pdf = await lib.getDocument({ data: await file.arrayBuffer() }).promise;

  // Renders page `number` (1-based) at `dpi` (72 = the PDF's own point size).
  async function render(number, dpi, background = "#ffffff") {
    const page = await pdf.getPage(number);
    const base = page.getViewport({ scale: 1 });
    const wanted = { width: Math.round((base.width * dpi) / 72), height: Math.round((base.height * dpi) / 72) };
    const size = fitWithinLimits(wanted.width, wanted.height);
    const viewport = page.getViewport({ scale: size.width / base.width });
    const canvas = createCanvas(size.width, size.height);
    const ctx = canvas.getContext("2d");
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    await page.render({ canvasContext: ctx, viewport, background: background || "rgba(0,0,0,0)" }).promise;
    page.cleanup();
    return { canvas, scaled: size.scaled };
  }

  async function pageSize(number) {
    const viewport = (await pdf.getPage(number)).getViewport({ scale: 1 });
    return { width: viewport.width, height: viewport.height };
  }

  async function thumbnail(number, maxSide = 180) {
    const size = await pageSize(number);
    return (await render(number, (72 * maxSide) / Math.max(size.width, size.height))).canvas;
  }

  return { pageCount: pdf.numPages, render, pageSize, thumbnail, close: () => pdf.destroy() };
}
