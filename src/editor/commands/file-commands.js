// File menu: opening images, PDFs, and projects; saving; exporting.
import { createCanvas } from "../engine/canvas.js";
import { createLayer } from "../engine/layer.js";
import { MAX_LAYERS } from "../engine/limits.js";
import { downloadBlob } from "../engine/io/download.js";
import { exportImage } from "../engine/io/export-image.js";
import { EXPORT_FORMATS, writtenFormat } from "../engine/io/export-formats.js";
import { baseName, fileKind } from "../engine/io/file-kind.js";
import { decodeImageFile } from "../engine/io/image-file.js";
import { projectFileName } from "../engine/io/project-format.js";
import { readProject, writeProject } from "../engine/io/project-io.js";
import { loadImage } from "../engine/canvas.js";
import { flatten } from "../engine/flatten.js";
import { useScannerStore } from "../../store/scanner-store";
import { guardUnsaved, openCanvas, openDocument } from "./document-commands.js";
import { settle } from "./settle.js";

// Adds a canvas as a new layer centred in the document.
export function addLayerFromCanvas(rt, canvas, name) {
  const { session } = rt;
  const doc = session.doc;
  if (doc.layers.length >= MAX_LAYERS) return rt.toast(`A document can have up to ${MAX_LAYERS} layers.`, true);
  const layer = createLayer(name, canvas, {
    x: Math.round((doc.width - canvas.width) / 2),
    y: Math.round((doc.height - canvas.height) / 2),
  });
  session.edit("Add layer", (d) => {
    const at = d.layers.findIndex((l) => l.id === d.activeId);
    d.layers.splice(at + 1, 0, layer);
    d.activeId = layer.id;
  });
}

// Opens user files. The first image becomes the document (unless adding as
// layers to an open one); further images become layers. PDFs ask which pages.
export function openFiles(rt, files, { asLayers = false } = {}) {
  const list = [...files];
  const kinds = list.map(fileKind);
  const unknown = list.filter((_, i) => kinds[i] === "unknown");
  if (unknown.length) rt.toast(`Not an image, PDF, or project: ${unknown.map((f) => f.name).join(", ")}`, true);
  const project = list.find((_, i) => kinds[i] === "project");
  if (project) return guardUnsaved(rt, () => openProjectFile(rt, project), "open another file");
  const pdf = list.find((_, i) => kinds[i] === "pdf");
  const images = list.filter((_, i) => kinds[i] === "image");
  const intoCurrent = asLayers && rt.session.hasDocument;
  const run = async () => {
    if (!settle(rt)) return;
    await rt.task("Opening…", async () => {
      let reduced = false;
      for (const [index, file] of images.entries()) {
        const { canvas, scaled } = await decodeImageFile(file);
        reduced ||= scaled;
        if (index === 0 && !intoCurrent) openCanvas(rt, canvas, baseName(file.name));
        else addLayerFromCanvas(rt, canvas, baseName(file.name));
      }
      // A freshly opened image (even with several files as layers) has no unsaved work.
      if (images.length && !intoCurrent) rt.session.markSaved();
      if (reduced) rt.toast("A large image was reduced to fit the editor's size limit.");
    });
    if (pdf) rt.store.getState().openDialog("pdf", { file: pdf, asLayers: intoCurrent || images.length > 0 });
  };
  // A PDF on its own replaces nothing until its pages are chosen, so it asks
  // about unsaved changes then (see openPdfPages), not before its dialog.
  if (intoCurrent || !images.length) return run();
  guardUnsaved(rt, run, "open another file");
}

// Called by the PDF dialog with the chosen pages rendered to canvases.
export function openPdfPages(rt, pages, { asLayers, name }) {
  if (!pages.length) return;
  const [first, ...rest] = pages;
  const fresh = !asLayers || !rt.session.hasDocument;
  const title = (page) => `${name} p${page.number}`;
  const open = () => {
    if (fresh) openCanvas(rt, first.canvas, pages.length > 1 ? name : title(first), { layerName: title(first) });
    else addLayerFromCanvas(rt, first.canvas, title(first));
    for (const page of rest) addLayerFromCanvas(rt, page.canvas, title(page));
    if (fresh) rt.session.markSaved();
    if (pages.some((p) => p.scaled)) rt.toast("A page was rendered smaller to fit the editor's size limit.");
  };
  if (fresh) guardUnsaved(rt, open, "open the PDF");
  else open();
}

async function openProjectFile(rt, file) {
  await rt.task("Opening project…", async () => {
    const { doc, selection } = await readProject(file);
    openDocument(rt, doc, selection);
  });
}

export function openScannerPage(rt, page) {
  guardUnsaved(
    rt,
    () =>
      rt.task("Opening page…", async () => {
        const image = await loadImage(page.src);
        const canvas = createCanvas(image.width, image.height);
        canvas.getContext("2d").drawImage(image, 0, 0);
        openCanvas(rt, canvas, baseName(page.name), { sourceId: page.id });
      }),
    "open another image",
  );
}

// Returns whether the project was written, so callers never discard the
// document after a failed save.
export function saveProject(rt) {
  if (!rt.session.hasDocument || !settle(rt)) return false;
  const { doc, selection } = rt.session;
  try {
    downloadBlob(writeProject(doc, selection), projectFileName(doc.name));
  } catch (error) {
    // Very large documents can exceed what the browser can hold in one file.
    rt.toast(`The project could not be saved: ${error.message || error}. Export the image instead, or merge layers and try again.`, true);
    return false;
  }
  rt.session.markSaved();
  rt.toast("Project saved. Open it again with File › Open to keep editing layers.");
  return true;
}

export async function exportDocument(rt, { fileName, ...options }) {
  if (!rt.session.hasDocument || !settle(rt)) return false;
  const blob = await rt.task("Exporting…", () => exportImage(rt.session.doc, options));
  if (!blob) return false;
  // The browser may not be able to write the requested format (e.g. WebP).
  const written = writtenFormat(blob, options.format);
  const spec = EXPORT_FORMATS[written];
  const name = `${(fileName || rt.session.doc.name).replace(/\.[a-z0-9]+$/i, "")}.${spec.ext}`;
  downloadBlob(blob, name);
  rt.session.markSaved();
  rt.store.getState().setPreference("exportFormat", options.format);
  if (written === options.format) rt.toast(`Exported ${name}`);
  else rt.toast(`This browser cannot write ${EXPORT_FORMATS[options.format].label}, so the image was exported as ${name}.`, true);
  return true;
}

// Places a flattened copy in the Simple scanner, replacing the page it came from.
export function sendToScanner(rt) {
  if (!rt.session.hasDocument || !settle(rt)) return;
  const doc = rt.session.doc;
  const src = flatten(doc).toDataURL("image/png");
  const scanner = useScannerStore.getState();
  const page = rt.session.sourceId && scanner.pages.find((p) => p.id === rt.session.sourceId);
  if (page) {
    scanner.updatePage(page.id, { src, width: doc.width, height: doc.height });
    rt.toast(`Updated “${page.name}” in Simple.`);
  } else {
    const id = globalThis.crypto?.randomUUID?.() ?? String(Date.now());
    scanner.addPage({ id, name: doc.name, src, originalSrc: src, width: doc.width, height: doc.height, originalWidth: doc.width, originalHeight: doc.height, createdAt: Date.now() });
    rt.session.sourceId = id;
    rt.toast(`Added “${doc.name}” to Simple as a new page.`);
  }
  useScannerStore.getState().saveToDB();
}
