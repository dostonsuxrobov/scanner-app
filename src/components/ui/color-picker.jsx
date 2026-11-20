// Full-spectrum color picker: wheel for hue/saturation, slider for brightness, emits #rrggbb.
import { useEffect, useRef, useState } from 'react';
import { hexToHsv, hsvToHex } from '../../lib/color/color-space';
import { ColorWheel } from './color-wheel';
import { BrightnessSlider } from './brightness-slider';

export function ColorPicker({ color, onChange }) {
  // Keep HSV locally: hex alone forgets hue/saturation at black or gray.
  const [hsv, setHsv] = useState(() => hexToHsv(color));
  const emitted = useRef(color);

  useEffect(() => {
    if (color !== emitted.current) {
      emitted.current = color;
      setHsv(hexToHsv(color));
    }
  }, [color]);

  const update = (patch) => {
    const next = { ...hsv, ...patch };
    setHsv(next);
    emitted.current = hsvToHex(next);
    onChange(emitted.current);
  };

  return (
    <div className="space-y-3">
      {/* Picking a hue while the color is black would stay black, so lift it to full brightness. */}
      <ColorWheel hue={hsv.h} saturation={hsv.s} value={hsv.v} onChange={(hs) => update(hsv.v === 0 ? { ...hs, v: 1 } : hs)} />
      <BrightnessSlider hue={hsv.h} saturation={hsv.s} value={hsv.v} onChange={(v) => update({ v })} />
      <div className="flex items-center gap-2 text-xs">
        <span className="w-6 h-6 rounded border border-border" style={{ backgroundColor: color }} />
        <span className="font-mono uppercase text-muted-foreground">{color}</span>
      </div>
    </div>
  );
}
