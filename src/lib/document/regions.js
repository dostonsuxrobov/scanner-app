// Connected regions of binary masks (4-connectivity).

// Labels every region; returns { labels (0 = none), sizes (index = label) }.
export function labelRegions(mask, width, height) {
  const labels = new Int32Array(mask.length);
  const stack = new Int32Array(mask.length);
  const sizes = [0];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || labels[start]) continue;
    const label = sizes.length;
    let size = 0, top = 0;
    stack[top++] = start;
    labels[start] = label;
    while (top) {
      const i = stack[--top];
      size++;
      const x = i % width;
      if (i >= width && mask[i - width] && !labels[i - width]) (labels[i - width] = label), (stack[top++] = i - width);
      if (i < mask.length - width && mask[i + width] && !labels[i + width]) (labels[i + width] = label), (stack[top++] = i + width);
      if (x > 0 && mask[i - 1] && !labels[i - 1]) (labels[i - 1] = label), (stack[top++] = i - 1);
      if (x < width - 1 && mask[i + 1] && !labels[i + 1]) (labels[i + 1] = label), (stack[top++] = i + 1);
    }
    sizes.push(size);
  }
  return { labels, sizes };
}

export function regionMask(labels, label) {
  const out = new Uint8Array(labels.length);
  for (let i = 0; i < labels.length; i++) out[i] = labels[i] === label ? 1 : 0;
  return out;
}

// Fills holes: anything the image border cannot reach without crossing the
// region is inside it (text and pictures on a page belong to the page).
export function fillHoles(region, width, height) {
  const outside = new Uint8Array(region.length);
  const stack = new Int32Array(region.length);
  let top = 0;
  const seed = (i) => {
    if (!region[i] && !outside[i]) {
      outside[i] = 1;
      stack[top++] = i;
    }
  };
  for (let x = 0; x < width; x++) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    seed(y * width);
    seed(y * width + width - 1);
  }
  while (top) {
    const i = stack[--top];
    const x = i % width;
    if (i >= width) seed(i - width);
    if (i < region.length - width) seed(i + width);
    if (x > 0) seed(i - 1);
    if (x < width - 1) seed(i + 1);
  }
  const out = new Uint8Array(region.length);
  for (let i = 0; i < out.length; i++) out[i] = outside[i] ? 0 : 1;
  return out;
}

// Grows a region by `radius` pixels (square neighbourhood).
export function dilate(region, width, height, radius) {
  let current = region;
  for (let r = 0; r < radius; r++) {
    const out = new Uint8Array(current);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (current[i]) continue;
        if ((x > 0 && current[i - 1]) || (x < width - 1 && current[i + 1]) || (y > 0 && current[i - width]) || (y < height - 1 && current[i + width]))
          out[i] = 1;
      }
    current = out;
  }
  return current;
}

// Fraction of the image border covered by the region.
export function borderContact(region, width, height) {
  let touching = 0;
  for (let x = 0; x < width; x++) touching += region[x] + region[(height - 1) * width + x];
  for (let y = 1; y < height - 1; y++) touching += region[y * width] + region[y * width + width - 1];
  return touching / (2 * (width + height) - 4);
}
