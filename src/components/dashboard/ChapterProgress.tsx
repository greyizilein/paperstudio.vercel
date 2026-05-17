import { AnimatedRing } from "./AnimatedRing";
import type { Chapter } from "@/types/project";

interface ChapterProgressProps {
  chapters: Chapter[];
}

const statusColor = (s: string) => {
  if (s === "completed") return "hsl(var(--green))";
  return "hsl(var(--aqua))";
};

const statusLabel = (s: string, pct: number) => {
  if (s === "completed") return "Complete";
  if (pct > 0) return "Drafting";
  return "Not started";
};

export function ChapterProgress({ chapters }: ChapterProgressProps) {
  const totalTarget = chapters.reduce((s, c) => s + (c.word_count_target || 0), 0);
  const totalActual = chapters.reduce((s, c) => s + (c.word_count_actual || 0), 0);
  const overallPct = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
  const completedCount = chapters.filter((c) => c.status === "completed").length;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground mb-3">Chapter Progress</div>
      <div className="space-y-2">
        {chapters.map((ch, i) => {
          const pct = ch.word_count_target > 0 ? Math.round(((ch.word_count_actual || 0) / ch.word_count_target) * 100) : 0;
          return (
            <div key={ch.id} className="flex items-center gap-2">
              <AnimatedRing size={28} strokeWidth={3} percent={pct} color={statusColor(ch.status)} />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-foreground truncate">Ch {i + 1} · {ch.title}</div>
                <div className="text-[10px] text-muted-foreground">
                  {(ch.word_count_actual || 0).toLocaleString()} / {(ch.word_count_target || 0).toLocaleString()}w · {statusLabel(ch.status, pct)}
                </div>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground">{pct}%</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 pt-3 border-t border-border flex items-center gap-3">
        <AnimatedRing size={40} strokeWidth={4} percent={overallPct} color="hsl(var(--primary))">
          <text x={20} y={24} textAnchor="middle" className="text-[9px] font-bold fill-foreground">{overallPct}%</text>
        </AnimatedRing>
        <div>
          <div className="text-[11px] font-bold text-foreground">Overall progress</div>
          <div className="text-[10px] text-muted-foreground">{completedCount} of {chapters.length} chapters complete</div>
        </div>
      </div>
    </div>
  );
}
