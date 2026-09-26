// Reads and writes project files, converting layer canvases to PNG data.
import { createCanvas, loadImage } from "../canvas.js";
import { createDocument } from "../document.js";
import { createLayer } from "../layer.js";
import { createSelection, selectionCanvas } from "../selection/selection.js";
import { PROJECT_TYPE, PROJECT_VERSION, validateProject } from "./project-format.js";

export function writeProject(doc, selection) {
  const data = {
    type: PROJECT_TYPE,
    version: PROJECT_VERSION,
    document: {
      width: doc.width,
      height: doc.height,
      name: doc.name,
      activeId: doc.activeId,
      layers: doc.layers.map(({ canvas, ...meta }) => ({ ...meta, src: canvas.toDataURL("image/png") })),
      selection: selection ? { src: selectionCanvas(selection).toDataURL("image/png"), shape: selection.shape } : null,
    },
  };
  return new Blob([JSON.stringify(data)], { type: "application/json" });
}

export async function readProject(file) {
  if (file.size > 512 * 1024 * 1024) throw new Error("The project file is larger than 512 MB.");
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error("This file is not an editor project.");
  }
  const d = validateProject(data);
  const layers = await Promise.all(
    d.layers.map(async ({ src, ...meta }) => {
      const image = await loadImage(src);
      const canvas = createCanvas(image.width, image.height);
      canvas.getContext("2d").drawImage(image, 0, 0);
      return createLayer(meta.name, canvas, {
        ...meta,
        id: meta.id,
        locked: !!meta.locked,
        alphaLocked: !!meta.alphaLocked,
        visible: meta.visible !== false,
        text: meta.text ?? null,
      });
    }),
  );
  const doc = createDocument({ width: d.width, height: d.height, name: d.name || file.name, layers });
  if (layers.some((l) => l.id === d.activeId)) doc.activeId = d.activeId;
  return { doc, selection: d.selection ? await readSelection(d.selection, d.width, d.height) : null };
}

async function readSelection(saved, width, height) {
  const image = await loadImage(saved.src);
  if (image.width !== width || image.height !== height) return null;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const rgba = ctx.getImageData(0, 0, width, height).data;
  const mask = new Uint8ClampedArray(width * height);
  for (let i = 0; i < mask.length; i++) mask[i] = rgba[i * 4 + 3];
  return createSelection(mask, width, height, saved.shape ?? saved.rect ?? null);
}
