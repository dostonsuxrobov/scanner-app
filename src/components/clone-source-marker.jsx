// Crosshair showing where the clone tool copies from (leftPct/topPct: position on the page, in percent).
export function CloneSourceMarker({ leftPct, topPct }) {
  const lines = [[11, 0, 11, 6], [11, 16, 11, 22], [0, 11, 6, 11], [16, 11, 22, 11]];
  return (
    <div className="absolute pointer-events-none z-20" style={{ left: `${leftPct}%`, top: `${topPct}%`, transform: 'translate(-50%, -50%)' }} aria-hidden>
      <svg width="22" height="22" viewBox="0 0 22 22" style={{ display: 'block', filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }}>
        <circle cx="11" cy="11" r="8" fill="none" stroke="white" strokeWidth="2.5" />
        <circle cx="11" cy="11" r="8" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" />
        {lines.map(([x1, y1, x2, y2]) => (
          <g key={`${x1}-${y1}`}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="white" strokeWidth="2.5" />
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--primary))" strokeWidth="1.5" />
          </g>
        ))}
      </svg>
    </div>
  );
}
