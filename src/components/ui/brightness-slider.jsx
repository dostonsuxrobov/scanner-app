// Brightness (HSV value) slider whose track fades from black to the current hue/saturation.
import { hsvToHex } from '../../lib/color/color-space';

export function BrightnessSlider({ hue, saturation, value, onChange }) {
  const full = hsvToHex({ h: hue, s: saturation, v: 1 });
  return (
    <input
      type="range"
      min="0"
      max="100"
      value={Math.round(value * 100)}
      onChange={(e) => onChange(+e.target.value / 100)}
      aria-label="Brightness"
      className="w-full h-3 rounded-full appearance-none cursor-pointer border border-border"
      style={{ background: `linear-gradient(to right, #000000, ${full})` }}
    />
  );
}
