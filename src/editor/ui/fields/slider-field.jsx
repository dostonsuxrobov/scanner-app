// Slider with a label and an editable value.
import { NumberField } from "./number-field.jsx";

export function SliderField({ label, value, onChange, min, max, step = 1, unit, disabled }) {
  return (
    <div className="ae-slider">
      <NumberField label={label} value={value} onChange={onChange} min={min} max={max} step={step} unit={unit} disabled={disabled} />
      <input
        type="range"
        aria-label={`${label} slider`}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
