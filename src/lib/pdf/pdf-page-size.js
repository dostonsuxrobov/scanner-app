// Physical size (in PDF points, 1/72 inch) of an exported page. A page known
// to be A4 or Letter gets exactly that size; any other page keeps its
// proportions with its long edge as long as an A4 sheet's, so it prints and
// zooms like a page instead of like a poster sized by its pixel count.
const PAPER_POINTS = { A4: [595.28, 841.89], Letter: [612, 792] };
const LONG_EDGE = PAPER_POINTS.A4[1];

export function pdfPageSize(width, height, paper = null) {
  const landscape = width > height;
  if (PAPER_POINTS[paper]) {
    const [short, long] = PAPER_POINTS[paper];
    return landscape ? { width: long, height: short } : { width: short, height: long };
  }
  const k = LONG_EDGE / Math.max(width, height);
  return { width: width * k, height: height * k };
}
