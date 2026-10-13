/**
 * Decorative topographic map: hand-tuned contour rings around a few "hills",
 * with marigold pins where leads were found. Pure SVG, no images.
 */
const hills = [
  { cx: 150, cy: 170, rings: 7, step: 22, wobble: 0.16 },
  { cx: 430, cy: 380, rings: 9, step: 20, wobble: 0.12 },
  { cx: 520, cy: 110, rings: 5, step: 24, wobble: 0.2 },
];

function ring(cx: number, cy: number, r: number, wobble: number, seed: number) {
  const pts: string[] = [];
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + wobble * Math.sin(a * 3 + seed) * 0.6 + wobble * Math.cos(a * 5 + seed * 1.7) * 0.4;
    const x = cx + Math.cos(a) * r * k * 1.15;
    const y = cy + Math.sin(a) * r * k;
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(" ") + "Z";
}

const pins = [
  { x: 196, y: 214 },
  { x: 402, y: 330 },
  { x: 468, y: 418 },
  { x: 548, y: 152 },
  { x: 300, y: 270 },
];

export function ContourMap({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 560" className={className} aria-hidden>
      <g fill="none" stroke="rgb(var(--muted))" strokeOpacity="0.22" strokeWidth="1">
        {hills.map((h, hi) =>
          Array.from({ length: h.rings }, (_, i) => (
            <path key={`${hi}-${i}`} d={ring(h.cx, h.cy, h.step * (i + 1), h.wobble, hi * 2 + i * 0.35)} />
          )),
        )}
      </g>
      <path
        d="M-10,470 C120,430 210,500 330,450 S520,330 660,360"
        fill="none"
        stroke="rgb(var(--info))"
        strokeOpacity="0.35"
        strokeWidth="2"
        strokeDasharray="2 6"
        strokeLinecap="round"
      />
      {pins.map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y})`}>
          <circle r="14" fill="rgb(var(--pin))" fillOpacity="0.12" />
          <path d="M0,-11 C6,-11 9,-6 9,-2 C9,4 0,11 0,11 C0,11 -9,4 -9,-2 C-9,-6 -6,-11 0,-11Z" fill="rgb(var(--pin))" />
          <circle cy="-2.5" r="3" fill="rgb(var(--night))" />
        </g>
      ))}
    </svg>
  );
}
