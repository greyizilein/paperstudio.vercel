import { useState } from "react";
import {
  LayoutPanelLeft, ChevronDown, ChevronRight,
  FileText, BookOpen, Lightbulb, Clock, Hash, Zap,
} from "lucide-react";

export interface PlanSection {
  number: number;
  title: string;
  description: string;
  words: number;
}

export interface CzarPlan {
  title: string;
  overview: string;
  sections: PlanSection[];
  key_arguments: string[];
  sources: string[];
  estimate: { sections: number; words: number; time_minutes: number };
  open_questions?: string[];
  assumptions?: string[];
}

interface Props {
  plan: CzarPlan;
  onStartWriting?: (plan: CzarPlan) => void;
}

function parsePlanJson(raw: string): CzarPlan | null {
  try {
    const obj = JSON.parse(raw);
    if (!obj.title || !Array.isArray(obj.sections)) return null;
    return obj as CzarPlan;
  } catch {
    return null;
  }
}

/** Extract a CzarPlan from raw assistant message content. Returns null if not a plan message. */
export function extractPlan(content: string): CzarPlan | null {
  const m = content.match(/```czar-plan\s*([\s\S]*?)```/);
  if (!m) return null;
  return parsePlanJson(m[1].trim());
}

export function CzarPlanCard({ plan, onStartWriting }: Props) {
  const [sectionsOpen, setSectionsOpen] = useState(true);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [argsOpen, setArgsOpen] = useState(false);

  const totalWords = plan.sections.reduce((s, sec) => s + (sec.words || 0), 0) || plan.estimate?.words || 0;
  const timeMin = plan.estimate?.time_minutes || Math.round(totalWords / 80);

  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden shadow-sm w-full max-w-xl">
      {/* Header */}
      <div className="bg-primary/5 border-b border-border px-4 py-3 flex items-start gap-3">
        <div className="mt-0.5 p-1.5 rounded-lg bg-primary/10 flex-shrink-0">
          <LayoutPanelLeft size={15} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-primary/70 mb-0.5">Document Plan</div>
          <h3 className="text-[14px] font-bold text-foreground leading-snug">{plan.title}</h3>
          {plan.overview && (
            <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{plan.overview}</p>
          )}
        </div>
      </div>

      {/* Estimates row */}
      <div className="flex divide-x divide-border border-b border-border">
        {[
          { icon: Hash, label: "Sections", value: plan.sections.length },
          { icon: FileText, label: "Words", value: totalWords.toLocaleString() },
          { icon: Clock, label: "Est. time", value: timeMin >= 60 ? `${Math.round(timeMin / 60)}h` : `${timeMin}m` },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex-1 flex flex-col items-center py-2.5">
            <Icon size={12} className="text-muted-foreground/60 mb-0.5" />
            <span className="text-[13px] font-bold text-foreground">{value}</span>
            <span className="text-[10px] text-muted-foreground/60">{label}</span>
          </div>
        ))}
      </div>

      {/* Sections */}
      <div className="border-b border-border">
        <button
          onClick={() => setSectionsOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-secondary/40 transition-colors"
        >
          <span className="text-[12px] font-semibold text-foreground">Sections</span>
          {sectionsOpen ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
        </button>
        {sectionsOpen && (
          <div className="pb-1">
            {plan.sections.map((sec) => (
              <div key={sec.number} className="flex items-start gap-3 px-4 py-2 hover:bg-secondary/20 transition-colors">
                <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                  {sec.number}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-[12.5px] font-semibold text-foreground">{sec.title}</span>
                    {sec.words > 0 && (
                      <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">~{sec.words.toLocaleString()} words</span>
                    )}
                  </div>
                  {sec.description && (
                    <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-relaxed">{sec.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Key Arguments */}
      {plan.key_arguments?.length > 0 && (
        <div className="border-b border-border">
          <button
            onClick={() => setArgsOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-secondary/40 transition-colors"
          >
            <span className="text-[12px] font-semibold text-foreground flex items-center gap-1.5">
              <Lightbulb size={12} className="text-amber-500" />
              Key Arguments
            </span>
            {argsOpen ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
          </button>
          {argsOpen && (
            <div className="px-4 pb-3 space-y-1.5">
              {plan.key_arguments.map((arg, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-500 flex-shrink-0" />
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{arg}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sources to research */}
      {plan.sources?.length > 0 && (
        <div className="border-b border-border">
          <button
            onClick={() => setSourcesOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-secondary/40 transition-colors"
          >
            <span className="text-[12px] font-semibold text-foreground flex items-center gap-1.5">
              <BookOpen size={12} className="text-blue-500" />
              Sources to Research
              <span className="text-[10px] text-muted-foreground font-normal">({plan.sources.length})</span>
            </span>
            {sourcesOpen ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
          </button>
          {sourcesOpen && (
            <div className="px-4 pb-3 space-y-1">
              {plan.sources.map((src, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-blue-500 flex-shrink-0" />
                  <p className="text-[11.5px] text-muted-foreground leading-relaxed">{src}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Open questions */}
      {plan.open_questions?.length > 0 && (
        <div className="px-4 py-3 bg-amber-500/5 border-b border-border">
          <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mb-1.5">Before I start writing, I need to know:</p>
          <ul className="space-y-1">
            {plan.open_questions.map((q, i) => (
              <li key={i} className="text-[12px] text-muted-foreground">• {q}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Assumptions */}
      {plan.assumptions?.length > 0 && (
        <div className="px-4 py-2.5 bg-secondary/30 border-b border-border">
          <p className="text-[10.5px] text-muted-foreground/60">
            <span className="font-semibold">Assumptions: </span>
            {plan.assumptions.join(" · ")}
          </p>
        </div>
      )}

      {/* Action */}
      {onStartWriting && (
        <div className="px-4 py-3 flex items-center justify-between bg-background">
          <p className="text-[11.5px] text-muted-foreground">Ready to write? I'll follow this plan exactly.</p>
          <button
            onClick={() => onStartWriting(plan)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90 transition-colors"
          >
            <Zap size={12} />
            Start Writing
          </button>
        </div>
      )}
    </div>
  );
}
