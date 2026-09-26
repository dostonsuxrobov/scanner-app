// Color swatch with a hex input.
import { useEffect, useState } from "react";
import { hexToRgb, isHexColor, rgbToHex } from "../../engine/color.js";

export function ColorField({ label, value, onChange, disabled }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div className="ae-field">
      {label && <span className="ae-field-label">{label}</span>}
      <div className="ae-color-field">
        <label className="ae-color-chip" style={{ background: value }}>
          <input type="color" aria-label={label} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
        </label>
        <input
          type="text"
          aria-label={`${label} hex`}
          value={text}
          disabled={disabled}
          onChange={(e) => {
            setText(e.target.value);
            if (isHexColor(e.target.value)) onChange(rgbToHex(hexToRgb(e.target.value)));
          }}
          onBlur={() => setText(value)}
        />
      </div>
    </div>
  );
}
