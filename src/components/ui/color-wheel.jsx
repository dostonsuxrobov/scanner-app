// Circular hue/saturation picker: draws every hue at full brightness and reports picks while dragging.
import { useEffect, useRef } from 'react';
import { hsvToHex } from '../../lib/color/color-space';
import { pointToHueSat, hueSatToPoint } from '../../lib/color/wheel-geometry';

function paintWheel(canvas, size) {
  const dpr = window.devicePixelRatio || 1;
  const px = Math.round(size * dpr);
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(px, px);
  const r = px / 2;
  for (let y = 0; y < px; y++) {
    for (let x = 0; x < px; x++) {
      const dist = Math.hypot(x + 0.5 - r, y + 0.5 - r);
      if (dist > r) continue;
      const { h, s } = pointToHueSat(x + 0.5, y + 0.5, r);
      const hex = hsvToHex({ h, s, v: 1 });
      const i = (y * px + x) * 4;
      img.data[i] = parseInt(hex.slice(1, 3), 16);
      img.data[i + 1] = parseInt(hex.slice(3, 5), 16);
      img.data[i + 2] = parseInt(hex.slice(5, 7), 16);
      img.data[i + 3] = Math.round(255 * Math.min(1, r - dist + 0.5)); // anti-aliased rim
    }
  }
  ctx.putImageData(img, 0, 0);
}

export function ColorWheel({ hue, saturation, value, onChange, size = 192 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    paintWheel(canvasRef.current, size);
  }, [size]);

  const pick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    onChange(pointToHueSat(e.clientX - rect.left, e.clientY - rect.top, rect.width / 2));
  };

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pick(e);
  };

  const marker = hueSatToPoint(hue, saturation, size / 2);

  return (
    <div className="relative mx-auto touch-none select-none" style={{ width: size, height: size }}>
      <canvas
        ref={canvasRef}
        className="rounded-full cursor-crosshair shadow-sm"
        style={{ width: size, height: size }}
        onPointerDown={onPointerDown}
        onPointerMove={(e) => e.buttons === 1 && pick(e)}
        aria-label="Color wheel"
      />
      <span
        className="pointer-events-none absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)]"
        style={{ left: marker.x, top: marker.y, backgroundColor: hsvToHex({ h: hue, s: saturation, v: value }) }}
      />
    </div>
  );
}
