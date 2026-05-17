import { useEffect, useState } from "react";

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: Segment[];
  centerLabel?: string;
  centerValue?: string;
}

export function DonutChart({ segments, centerLabel, centerValue }: DonutChartProps) {
  const [animated, setAnimated] = useState(false);
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const size = 120;
  const sw = 14;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  let acc = 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={sw} />
          {segments.map((seg, i) => {
            const pct = seg.value / total;
            const offset = animated ? circ - pct * circ : circ;
            const rotation = acc * 360 - 90;
            acc += pct;
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={sw}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
                style={{ transition: "stroke-dashoffset 1s ease-out" }}
              />
            );
          })}
        </svg>
        {centerValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-black font-heading text-foreground">{centerValue}</span>
            {centerLabel && <span className="text-[9px] text-muted-foreground">{centerLabel}</span>}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: seg.color }} />
            <span className="text-[10px] text-muted-foreground">{seg.label}</span>
            <span className="text-[10px] font-bold text-foreground">{Math.round((seg.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
