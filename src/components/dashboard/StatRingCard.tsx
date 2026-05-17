import { useEffect, useState } from "react";
import { AnimatedRing } from "./AnimatedRing";

interface StatRingCardProps {
  title: string;
  value: number;
  max?: number;
  suffix?: string;
  badge?: string;
  color?: string;
  icon: React.ReactNode;
}

export function StatRingCard({ title, value, max, suffix = "", badge, color = "hsl(var(--aqua))", icon }: StatRingCardProps) {
  const [display, setDisplay] = useState(0);
  const pct = max ? Math.min(Math.round((value / max) * 100), 100) : 100;

  useEffect(() => {
    if (value === 0) return;
    const dur = 800;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(ease * value));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);

  const formatted = display >= 1000 ? `${(display / 1000).toFixed(1)}k` : `${display}`;

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
      <div className="relative flex-shrink-0">
        <AnimatedRing size={52} strokeWidth={4} percent={pct} color={color}>
          <foreignObject x={10} y={10} width={32} height={32}>
            <div className="flex items-center justify-center w-full h-full text-muted-foreground">
              {icon}
            </div>
          </foreignObject>
        </AnimatedRing>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">{title}</div>
        <div className="text-xl font-black font-heading text-foreground leading-tight">
          {formatted}{suffix}
        </div>
        {badge && (
          <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-green/15 text-green">{badge}</span>
        )}
        {max && (
          <div className="text-[10px] text-muted-foreground mt-0.5">of {max >= 1000 ? `${(max / 1000).toFixed(0)}k` : max}</div>
        )}
      </div>
    </div>
  );
}
