// Whether a photo is bordered by blank paper on every side. Then the page
// already fills the photo (a scan, a PDF page, an earlier fix): nothing
// behind the page is visible, so there is no outline to crop or straighten to.
const BAND = 0.02; // border width, share of the map's long side
const PAPER_SHARE = 0.85; // of the photo's paper brightness
const BLANK = 0.9; // share of the border that must be paper

// map: brightness map from edgeMap().
export function borderedByPaper({ gray, width, height }) {
  const hist = new Uint32Array(256);
  for (const v of gray) hist[Math.max(0, Math.min(255, v | 0))]++;
  let paper = 255;
  for (let t = 0, seen = 0; t < 256; t++)
    if ((seen += hist[t]) >= gray.length * 0.95) {
      paper = t;
      break;
    }
  const band = Math.max(1, Math.round(Math.max(width, height) * BAND));
  let border = 0, blank = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      if (x >= band && x < width - band && y >= band && y < height - band) {
        x = width - band - 1; // skip the interior of this row
        continue;
      }
      border++;
      if (gray[y * width + x] >= paper * PAPER_SHARE) blank++;
    }
  return blank >= border * BLANK;
}
