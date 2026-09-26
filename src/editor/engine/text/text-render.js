// Rasterizes an editable text record into a tightly sized layer canvas.
// text: { content, style, anchor: {x, y}, boxWidth }
// The anchor is the top of the first line: its left edge, centre, or right
// edge for left, centre, and right alignment (or the box's left edge).
import { createCanvas } from "../canvas.js";
import { cssFont } from "./font-catalog.js";
import { layoutLines, lineOffset } from "./text-layout.js";

const measureCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;

const supportsLetterSpacing = () => measureCanvas && "letterSpacing" in measureCanvas.getContext("2d");

function prepare(ctx, style) {
  ctx.font = cssFont(style);
  if (supportsLetterSpacing()) ctx.letterSpacing = `${style.letterSpacing}px`;
}

function measurer(ctx, style) {
  const manual = !supportsLetterSpacing() && style.letterSpacing;
  return (text) =>
    manual
      ? [...text].reduce((w, ch) => w + ctx.measureText(ch).width + style.letterSpacing, 0) - (text ? style.letterSpacing : 0)
      : ctx.measureText(text).width;
}

// Font ascent/descent as CSS uses them, so on-canvas editing lines up.
function verticalMetrics(ctx, style) {
  const m = ctx.measureText("Hg");
  const ascent = m.fontBoundingBoxAscent ?? style.size * 0.9;
  const descent = m.fontBoundingBoxDescent ?? style.size * 0.25;
  return { ascent, descent };
}

export function measureText(text) {
  const ctx = measureCanvas.getContext("2d");
  const { style } = text;
  prepare(ctx, style);
  const measure = measurer(ctx, style);
  const lines = layoutLines(text.content, text.boxWidth, measure);
  const lineHeight = style.size * style.lineHeight;
  const blockWidth = text.boxWidth ?? Math.max(1, ...lines.map((l) => l.width));
  const { ascent, descent } = verticalMetrics(ctx, style);
  const blockLeft =
    text.boxWidth != null
      ? text.anchor.x
      : text.anchor.x - lineOffset(style.align, blockWidth, 0);
  return { lines, lineHeight, blockWidth, blockLeft, ascent, descent, height: lines.length * lineHeight, measure };
}

export function renderText(text) {
  const { style } = text;
  const layout = measureText(text);
  const pad = Math.ceil(style.strokeWidth + style.size * 0.35);
  const width = Math.ceil(layout.blockWidth + pad * 2);
  const height = Math.ceil(layout.height + pad * 2);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  prepare(ctx, style);
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = style.color;
  ctx.strokeStyle = style.strokeColor;
  ctx.lineJoin = "round";
  ctx.lineWidth = style.strokeWidth * 2;
  const manual = !supportsLetterSpacing() && style.letterSpacing;
  const halfLeading = (layout.lineHeight - (layout.ascent + layout.descent)) / 2;
  layout.lines.forEach((line, i) => {
    const x = pad + lineOffset(style.align, layout.blockWidth, line.width);
    const baseline = pad + i * layout.lineHeight + halfLeading + layout.ascent;
    const draw = (op) => (manual ? drawSpaced(ctx, op, line.text, x, baseline, style.letterSpacing) : ctx[op](line.text, x, baseline));
    if (style.strokeWidth > 0) draw("strokeText");
    draw("fillText");
    const thickness = Math.max(1, style.size / 15);
    if (style.underline) ctx.fillRect(x, baseline + style.size * 0.1, line.width, thickness);
    if (style.strike) ctx.fillRect(x, baseline - style.size * 0.28, line.width, thickness);
  });
  return { canvas, x: Math.round(layout.blockLeft - pad), y: Math.round(text.anchor.y - pad) };
}

function drawSpaced(ctx, op, text, x, y, spacing) {
  let cursor = x;
  for (const ch of text) {
    ctx[op](ch, cursor, y);
    cursor += ctx.measureText(ch).width + spacing;
  }
}
