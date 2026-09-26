// Canvas allocation and image decoding helpers.
export function createCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

export function cloneCanvas(source) {
  const copy = createCanvas(source.width, source.height);
  copy.getContext("2d").drawImage(source, 0, 0);
  return copy;
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("This image could not be decoded."));
    image.src = url;
  });
}

export async function loadImageFromBlob(blob) {
  const url = URL.createObjectURL(blob);
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function canvasToBlob(canvas, type = "image/png", quality) {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("The image could not be encoded."))),
      type,
      quality,
    ),
  );
}

// Reusable scratch canvas that only grows, so hot paths never reallocate.
export function createScratch() {
  let canvas = null;
  return function scratch(width, height) {
    if (!canvas || canvas.width < width || canvas.height < height) {
      canvas = createCanvas(
        Math.max(width, canvas?.width || 0),
        Math.max(height, canvas?.height || 0),
      );
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = "none";
    ctx.clearRect(0, 0, width, height);
    return { canvas, ctx };
  };
}
