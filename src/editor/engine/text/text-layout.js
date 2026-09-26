// Breaks text into lines. With a box width, words wrap inside it; without,
// only explicit line breaks start new lines. `measure(text)` returns a width.
export function layoutLines(content, boxWidth, measure) {
  const lines = [];
  for (const paragraph of content.split("\n")) {
    if (!boxWidth) {
      lines.push({ text: paragraph, width: measure(paragraph) });
      continue;
    }
    const words = paragraph.split(/(\s+)/);
    let line = "";
    for (const token of words) {
      if (!token) continue;
      const candidate = line + token;
      if (!line || measure(candidate.trimEnd()) <= boxWidth) {
        line = candidate;
        // A single word wider than the box is split by characters.
        if (measure(line.trimEnd()) > boxWidth && !/\s/.test(line.trim())) {
          const pieces = splitWord(line, boxWidth, measure);
          lines.push(...pieces.slice(0, -1).map((text) => ({ text, width: measure(text) })));
          line = pieces[pieces.length - 1];
        }
        continue;
      }
      lines.push({ text: line.trimEnd(), width: measure(line.trimEnd()) });
      line = /^\s+$/.test(token) ? "" : token;
      if (measure(line) > boxWidth) {
        const pieces = splitWord(line, boxWidth, measure);
        lines.push(...pieces.slice(0, -1).map((text) => ({ text, width: measure(text) })));
        line = pieces[pieces.length - 1];
      }
    }
    lines.push({ text: line.trimEnd(), width: measure(line.trimEnd()) });
  }
  return lines;
}

function splitWord(word, boxWidth, measure) {
  const pieces = [];
  let current = "";
  for (const ch of word) {
    if (current && measure(current + ch) > boxWidth) {
      pieces.push(current);
      current = ch;
    } else current += ch;
  }
  pieces.push(current);
  return pieces;
}

// Horizontal start of a line inside a block of `blockWidth`.
export function lineOffset(align, blockWidth, lineWidth) {
  if (align === "center") return (blockWidth - lineWidth) / 2;
  if (align === "right") return blockWidth - lineWidth;
  return 0;
}
