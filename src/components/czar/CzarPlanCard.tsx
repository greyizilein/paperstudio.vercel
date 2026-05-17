import { ScrollText, Check, ArrowRight, Lightbulb, BookOpen, HelpCircle, Info } from "lucide-react";

export interface PlanSpec {
  kind: "plan";
  understanding: string;
  deliverable?: { type: string; length_words: number; format: string } | null;
  approach: { step: string; detail: string }[];
  sources: { label: string; why: string }[];
  assumptions: string[];
  open_questions: string[];
  estimate?: { sections: number; figures: number; time_minutes: number } | null;
  next_action_label: string;
}

interface Props {
  spec: PlanSpec;
  onApprove: (spec: PlanSpec) => void;
  onEdit?: () => void;
  disabled?: boolean;
}

/** Extract a [CZAR_PLAN]{json}[/CZAR_PLAN] block from persisted assistant
 *  content so plan cards re-render after a page reload. */
export function extractPlanSpec(content: string): { spec: PlanSpec | null; rest: string } {
  if (!content) return { spec: null, rest: content };
  const m = content.match(/\[CZAR_PLAN\]([\s\S]*?)\[\/CZAR_PLAN\]/);
  if (!m) return { spec: null, rest: content };
  try {
    const spec = JSON.parse(m[1].trim()) as PlanSpec;
    if (!spec || spec.kind !== "plan") return { spec: null, rest: content };
    const rest = (content.slice(0, m.index!) + content.slice(m.index! + m[0].length)).trim();
    return { spec, rest };
  } catch {
    return { spec: null, rest: content };
  }
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider font-semibold" style={{ color: "var(--czar-text-faint)" }}>
        <span style={{ color: "var(--czar-accent)" }}>{icon}</span>
        <span>{label}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-[11px] mr-1.5 mb-1.5"
      style={{ background: "var(--czar-bg)", border: "1px solid var(--czar-border)", color: "var(--czar-text-dim)" }}
    >
      {children}
    </span>
  );
}

export function CzarPlanCard({ spec, onApprove, onEdit, disabled }: Props) {
  const meta: string[] = [];
  if (spec.deliverable?.type) meta.push(spec.deliverable.type);
  if (spec.deliverable?.length_words) meta.push(`~${spec.deliverable.length_words.toLocaleString()} words`);
  if (spec.deliverable?.format) meta.push(`.${spec.deliverable.format}`);

  return (
    <div
      className="czar-card-in rounded-2xl p-4 sm:p-5 max-w-full"
      style={{
        background: "var(--czar-surface)",
        border: "1px solid var(--czar-border)",
        color: "var(--czar-text)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <ScrollText size={14} style={{ color: "var(--czar-accent)" }} />
          <span className="text-[13px] font-semibold">Plan</span>
        </div>
        {meta.length > 0 && (
          <div className="text-[10.5px] text-right" style={{ color: "var(--czar-text-faint)" }}>
            {meta.join(" · ")}
          </div>
        )}
      </div>

      {/* Understanding */}
      {spec.understanding && (
        <div
          className="rounded-xl p-3 mb-3 text-[12.5px] leading-relaxed"
          style={{ background: "var(--czar-bg)", border: "1px solid var(--czar-border)", color: "var(--czar-text-dim)" }}
        >
          {spec.understanding}
        </div>
      )}

      <div className="flex flex-col gap-3.5">
        {/* Approach */}
        {spec.approach.length > 0 && (
          <Row icon={<ArrowRight size={11} />} label="Approach">
            <ol className="flex flex-col gap-1.5">
              {spec.approach.map((s, i) => (
                <li key={i} className="flex gap-2 text-[12.5px] leading-snug">
                  <span
                    className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9.5px] font-bold mt-0.5"
                    style={{ background: "var(--czar-accent)", color: "var(--czar-accent-fg)" }}
                  >
                    {i + 1}
                  </span>
                  <span>
                    <span className="font-medium" style={{ color: "var(--czar-text)" }}>{s.step}</span>
                    {s.detail && (
                      <span style={{ color: "var(--czar-text-dim)" }}> — {s.detail}</span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </Row>
        )}

        {/* Sources */}
        {spec.sources.length > 0 && (
          <Row icon={<BookOpen size={11} />} label="Sources">
            <div className="flex flex-wrap">
              {spec.sources.map((s, i) => (
                <Chip key={i}>
                  {s.label}
                  {s.why && <span style={{ opacity: 0.6 }}> · {s.why}</span>}
                </Chip>
              ))}
            </div>
          </Row>
        )}

        {/* Assumptions */}
        {spec.assumptions.length > 0 && (
          <Row icon={<Lightbulb size={11} />} label="Assumptions">
            <ul className="flex flex-col gap-1">
              {spec.assumptions.map((s, i) => (
                <li key={i} className="text-[12px] flex gap-1.5" style={{ color: "var(--czar-text-dim)" }}>
                  <span style={{ color: "var(--czar-accent)", opacity: 0.7 }}>•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </Row>
        )}

        {/* Open questions */}
        {spec.open_questions.length > 0 && (
          <Row icon={<HelpCircle size={11} />} label="Open questions">
            <ul className="flex flex-col gap-1">
              {spec.open_questions.map((s, i) => (
                <li key={i} className="text-[12px] flex gap-1.5" style={{ color: "var(--czar-text-dim)" }}>
                  <span style={{ color: "var(--czar-accent)", opacity: 0.7 }}>?</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </Row>
        )}

        {/* Estimate */}
        {spec.estimate && (spec.estimate.sections + spec.estimate.figures + spec.estimate.time_minutes > 0) && (
          <div
            className="flex items-center gap-3 text-[10.5px] pt-1"
            style={{ color: "var(--czar-text-faint)" }}
          >
            <Info size={10} />
            <span>
              {spec.estimate.sections > 0 && `${spec.estimate.sections} sections`}
              {spec.estimate.figures > 0 && ` · ${spec.estimate.figures} figures`}
              {spec.estimate.time_minutes > 0 && ` · ~${spec.estimate.time_minutes} min`}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-3" style={{ borderTop: "1px solid var(--czar-border)" }}>
        {onEdit && (
          <button
            onClick={onEdit}
            disabled={disabled}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium hover:opacity-80 disabled:opacity-40 transition-opacity"
            style={{ background: "var(--czar-bg)", border: "1px solid var(--czar-border)", color: "var(--czar-text-dim)" }}
          >
            Edit
          </button>
        )}
        <button
          onClick={() => onApprove(spec)}
          disabled={disabled}
          className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
          style={{ background: "var(--czar-accent)", color: "var(--czar-accent-fg)" }}
        >
          <Check size={12} strokeWidth={2.6} /> {spec.next_action_label || "Build it"}
        </button>
      </div>
    </div>
  );
}
