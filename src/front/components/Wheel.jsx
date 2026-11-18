// La Rueda de la Vida: una porción por área. Cada porción se llena según la nota (1 a 10) que la persona se pone.
// Con `onRate`, tocar un anillo de la porción guarda esa nota.
import { useState } from "react";

const polar = (r, a) => [100 + r * Math.cos(a), 100 + r * Math.sin(a)];
const slice = (r0, r1, a0, a1) => {
  const [x0, y0] = polar(r1, a0), [x1, y1] = polar(r1, a1), [x2, y2] = polar(r0, a1), [x3, y3] = polar(r0, a0);
  const big = a1 - a0 > Math.PI ? 1 : 0;
  return `M${x0} ${y0} A${r1} ${r1} 0 ${big} 1 ${x1} ${y1} L${x2} ${y2} A${r0} ${r0} 0 ${big} 0 ${x3} ${y3}Z`;
};
const R0 = 13, R1 = 88;

export function Wheel({ pillars, scores = {}, onRate, children }) {
  const [hover, setHover] = useState(null); // { id, n }
  const n = pillars.length || 1, step = (Math.PI * 2) / n, gap = n > 1 ? 0.022 : 0;
  const rate = (e, p) => {
    const box = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * 200 - 100, y = ((e.clientY - box.top) / box.height) * 200 - 100;
    return Math.max(1, Math.min(10, Math.ceil(((Math.hypot(x, y) - R0) / (R1 - R0)) * 10)));
  };
  return (
    <div className={"wheel" + (onRate ? " rate" : "")}>
      <svg viewBox="0 0 200 200" role="img" aria-label="Rueda de la vida">
        {pillars.map((p, i) => {
          const a0 = -Math.PI / 2 + i * step + gap, a1 = -Math.PI / 2 + (i + 1) * step - gap, mid = (a0 + a1) / 2;
          const saved = +scores[p.id] || 0, shown = hover?.id === p.id ? hover.n : saved;
          const [ex, ey] = polar(R1 + 8, mid);
          return (
            <g key={p.id} style={{ "--c": p.color }}
              onPointerMove={onRate ? (e) => setHover({ id: p.id, n: rate(e, p) }) : undefined}
              onPointerLeave={onRate ? () => setHover(null) : undefined}
              onClick={onRate ? (e) => onRate(p, rate(e, p)) : undefined}>
              <title>{p.name}{saved ? `: ${saved} de 10` : ": sin calificar"}</title>
              <path d={slice(R0, R1, a0, a1)} className="wheel-track" />
              {shown > 0 && <path d={slice(R0, R0 + ((R1 - R0) * shown) / 10, a0, a1)} className="wheel-fill" />}
              {[2, 4, 6, 8].map((k) => { const r = R0 + ((R1 - R0) * k) / 10, [x0, y0] = polar(r, a0), [x1, y1] = polar(r, a1); return <path key={k} d={`M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}`} className="wheel-grid" />; })}
              <text x={ex} y={ey} className="wheel-emoji" textAnchor="middle" dominantBaseline="central">{p.emoji}</text>
            </g>
          );
        })}
      </svg>
      {children && <div className="wheel-center">{children}</div>}
      {hover && <div className="wheel-hint num">{pillars.find((p) => p.id === hover.id)?.name}: <b>{hover.n}</b></div>}
    </div>
  );
}

export const wheelAverage = (pillars, scores = {}) => {
  const rated = pillars.map((p) => +scores[p.id] || 0).filter(Boolean);
  return rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : 0;
};
