// On-canvas text entry. A textarea styled like the final text sits exactly
// where the text layer will render, scaled with the view.
import { useEffect, useRef } from "react";
import { cssFont } from "../../engine/text/font-catalog.js";
import { ensureFont } from "../../engine/text/font-loader.js";
import { measureText } from "../../engine/text/text-render.js";
import { useEditor, useRuntime, useView } from "../editor-context.js";

export function TextEditorOverlay() {
  const rt = useRuntime();
  const edit = useEditor((s) => s.textEdit);
  const view = useView((s) => s);
  const ref = useRef(null);

  useEffect(() => {
    if (edit) ensureFont(edit.text.style);
  }, [edit?.text.style.family, edit?.text.style.weight, edit?.text.style.italic]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length);
  }, [edit?.layerId, !!edit]);

  if (!edit) return null;
  const { text } = edit;
  const { style } = text;
  const z = view.zoom;
  const layout = measureText({ ...text, content: text.content || " " });
  const width = (text.boxWidth ?? Math.max(layout.blockWidth, style.size * 0.6)) * z;
  const left = text.boxWidth != null ? text.anchor.x : layout.blockLeft;

  return (
    <textarea
      ref={ref}
      className="ae-text-input"
      aria-label="Text"
      spellCheck={false}
      value={text.content}
      placeholder="Type here"
      onChange={(e) => rt.tools.text.setContent(rt, e.target.value)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") {
          e.preventDefault();
          rt.tools.text.discard(rt);
        } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          rt.tools.text.commit(rt);
        }
      }}
      style={{
        left: left * z + view.x,
        top: text.anchor.y * z + view.y,
        width: width + 4,
        height: Math.max(1, layout.lines.length) * layout.lineHeight * z + 2,
        font: cssFont(style, style.size * z),
        lineHeight: `${layout.lineHeight * z}px`,
        letterSpacing: `${style.letterSpacing * z}px`,
        color: style.color,
        textAlign: style.align,
        whiteSpace: text.boxWidth != null ? "pre-wrap" : "pre",
        textDecoration: [style.underline && "underline", style.strike && "line-through"].filter(Boolean).join(" ") || "none",
        WebkitTextStroke: style.strokeWidth ? `${style.strokeWidth * 2 * z}px ${style.strokeColor}` : undefined,
        paintOrder: "stroke fill",
      }}
    />
  );
}
