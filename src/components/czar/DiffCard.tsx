import { Check, X } from "lucide-react";
import type { DiffParagraph } from "@/lib/diffUtils";
import { cn } from "@/lib/utils";

interface Props {
  diff: DiffParagraph[];
  onAccept: () => void;
  onDismiss: () => void;
}

const BG: Record<DiffParagraph["type"], string> = {
  unchanged: "",
  modified:  "rgba(245,158,11,0.10)",
  added:     "rgba(16,185,129,0.10)",
  deleted:   "rgba(239,68,68,0.10)",
};

const BORDER: Record<DiffParagraph["type"], string> = {
  unchanged: "transparent",
  modified:  "rgba(245,158,11,0.35)",
  added:     "rgba(16,185,129,0.35)",
  deleted:   "rgba(239,68,68,0.35)",
};

const LABEL: Partial<Record<DiffParagraph["type"], string>> = {
  modified: "MODIFIED",
  added:    "ADDED",
  deleted:  "DELETED",
};

const LABEL_COLOR: Partial<Record<DiffParagraph["type"], string>> = {
  modified: "text-amber-600",
  added:    "text-emerald-600",
  deleted:  "text-red-500",
};

export function DiffCard({ diff, onAccept, onDismiss }: Props) {
  const changed = diff.filter((p) => p.type !== "unchanged").length;

  return (
    <div
      className="rounded-xl border overflow-hidden my-2"
      style={{ background: "var(--czar-surface)", borderColor: "var(--czar-border)" }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between gap-2" style={{ borderColor: "var(--czar-border)" }}>
        <div>
          <p className="text-[13px] font-semibold" style={{ color: "var(--czar-text)" }}>
            Corrections applied
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--czar-text-dim)" }}>
            {changed} paragraph{changed !== 1 ? "s" : ""} changed
            <span className="ml-2">
              <span className="inline-block w-2 h-2 rounded-sm bg-amber-400/60 mr-1" />modified
              <span className="inline-block w-2 h-2 rounded-sm bg-emerald-400/60 ml-2 mr-1" />added
              <span className="inline-block w-2 h-2 rounded-sm bg-red-400/60 ml-2 mr-1" />deleted
            </span>
          </p>
        </div>
      </div>

      {/* Diff body */}
      <div
        className="px-4 py-3 max-h-[420px] overflow-y-auto space-y-2 text-[13px] leading-relaxed"
        style={{ color: "var(--czar-text)" }}
      >
        {diff.map((para, i) => (
          <div
            key={i}
            className={cn("rounded px-3 py-2 border-l-2")}
            style={{
              background: BG[para.type],
              borderLeftColor: BORDER[para.type],
              borderLeft: para.type === "unchanged" ? "none" : undefined,
              paddingLeft: para.type === "unchanged" ? 0 : undefined,
            }}
          >
            {LABEL[para.type] && (
              <span className={cn("text-[9px] font-black tracking-wider block mb-1", LABEL_COLOR[para.type])}>
                {LABEL[para.type]}
              </span>
            )}
            {para.diffHtml ? (
              <p
                className="[&_del]:line-through [&_del]:opacity-60 [&_del]:bg-red-100 [&_ins]:bg-emerald-100 [&_ins]:no-underline"
                dangerouslySetInnerHTML={{ __html: para.diffHtml }}
              />
            ) : (
              <p className={cn(para.type === "deleted" && "line-through opacity-60")}>
                {para.type === "deleted" ? para.originalText || para.text : para.text}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t flex items-center gap-3 justify-end" style={{ borderColor: "var(--czar-border)" }}>
        <button
          onClick={onDismiss}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium hover:opacity-80 transition-opacity"
          style={{ background: "var(--czar-surface)", border: "1px solid var(--czar-border)", color: "var(--czar-text-dim)" }}
        >
          <X size={12} /> Dismiss
        </button>
        <button
          onClick={onAccept}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-semibold hover:opacity-90 transition-opacity"
          style={{ background: "var(--czar-accent)", color: "var(--czar-accent-fg)" }}
        >
          <Check size={12} /> Accept changes
        </button>
      </div>
    </div>
  );
}
