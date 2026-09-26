// Numeric input. Drag the label left/right to scrub the value; arrow keys
// step by 1 (Shift: 10). Invalid text is ignored until it becomes a number.
import { useEffect, useRef, useState } from "react";

const clamp = (v, min, max) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v));

export function NumberField({ label, value, onChange, min, max, step = 1, unit, disabled, title, decimals = 0 }) {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(String(Math.round(value * 10 ** decimals) / 10 ** decimals));
  }, [value, decimals]);

  const emit = (v) => {
    const next = clamp(Math.round(v * 10 ** decimals) / 10 ** decimals, min, max);
    if (next !== value) onChange(next);
    return next;
  };

  const scrub = (event) => {
    if (disabled) return;
    event.preventDefault();
    const startX = event.clientX;
    const start = value;
    const onMove = (e) => setText(String(emit(start + Math.round((e.clientX - startX) / 2) * step)));
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <label className="ae-field ae-number" title={title}>
      {label && (
        <span className="ae-field-label ae-scrub" onPointerDown={scrub}>
          {label}
        </span>
      )}
      <span className="ae-number-box">
        <input
          type="text"
          inputMode="decimal"
          value={text}
          disabled={disabled}
          aria-label={label}
          onFocus={(e) => {
            focused.current = true;
            e.target.select();
          }}
          onBlur={() => {
            focused.current = false;
            setText(String(value));
          }}
          onChange={(e) => {
            setText(e.target.value);
            const n = Number(e.target.value);
            if (e.target.value.trim() !== "" && Number.isFinite(n)) emit(n);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              const delta = (e.shiftKey ? 10 : 1) * step * (e.key === "ArrowUp" ? 1 : -1);
              setText(String(emit(value + delta)));
            } else if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        {unit && <span className="ae-unit">{unit}</span>}
      </span>
    </label>
  );
}
