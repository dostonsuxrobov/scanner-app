// Physical size (in PDF points, 1/72 inch) of an exported page. A page known
// to be A4 or Letter, or with exactly those proportions, gets exactly that
// size; any other page keeps its proportions with its long edge as long as
// an A4 sheet's, so it prints and zooms like a page instead of like a poster
// sized by its pixel count.
const PAPER_POINTS = { A4: [595.28, 841.89], Letter: [612, 792] };
const LONG_EDGE = PAPER_POINTS.A4[1];
const SAME_SHAPE = 0.01; // relative difference in proportions

function paperByShape(width, height) {
  const ratio = Math.max(width, height) / Math.min(width, height);
  return Object.keys(PAPER_POINTS).find((name) => Math.abs(ratio / (PAPER_POINTS[name][1] / PAPER_POINTS[name][0]) - 1) <= SAME_SHAPE);
}

export function pdfPageSize(width, height, paper = null) {
  const landscape = width > height;
  const known = PAPER_POINTS[paper] ?? PAPER_POINTS[paperByShape(width, height)];
  if (known) return landscape ? { width: known[1], height: known[0] } : { width: known[0], height: known[1] };
  const k = LONG_EDGE / Math.max(width, height);
  return { width: width * k, height: height * k };
}
