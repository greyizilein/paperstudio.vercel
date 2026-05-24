import { useMemo } from "react";
import { CheckSquare, Square, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type CorrectionChangeUI,
  type CorrectionSummary,
  type CorrectionType,
  CORRECTION_TYPE_META,
} from "@/lib/czarCorrection";

// ── Props ─────────────────────────────────────────────────────────────────────

interface CorrectionDiffViewProps {
  summary: CorrectionSummary | null;
  changes: CorrectionChangeUI[];
  isAnalyzing: boolean;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onOverrideChange: (id: string, instruction: string) => void;
  onApply: (selectedChanges: CorrectionChangeUI[], originalText: string) => void;
}

// ── Correction card ───────────────────────────────────────────────────────────

function CorrectionCard({
  change,
  onToggle,
  onOverrideChange,
}: {
  change: CorrectionChangeUI;
  onToggle: () => void;
  onOverrideChange: (instruction: string) => void;
}) {
  const meta = CORRECTION_TYPE_META[change.type];

  // Truncate original text for the context quote (max 140 chars)
  const contextQuote = change.original.length > 140
    ? `"${change.original.slice(0, 137)}…"`
    : `"${change.original}"`;

  return (
    <div className={cn(
      "flex gap-3 p-4 rounded-xl border transition-colors",
      change.selected ? "border-border bg-background" : "border-border/50 bg-secondary/20 opacity-60",
    )}>
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className="flex-shrink-0 mt-0.5 text-muted-foreground hover:text-primary transition-colors"
        aria-label={change.selected ? "Deselect" : "Select"}
      >
        {change.selected
          ? <CheckSquare size={18} className="text-primary" />
          : <Square size={18} />
        }
      </button>

      <div className="flex-1 min-w-0">
        {/* Type badge + explanation */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={cn("text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded", meta.pillClass)}>
            {meta.label}
          </span>
          <span className="text-[13px] font-medium text-foreground leading-snug">
            {change.explanation}
          </span>
        </div>

        {/* Context quote */}
        <blockquote className={cn(
          "text-[12px] text-muted-foreground italic border-l-2 pl-3 mb-2.5 leading-relaxed",
          meta.borderClass,
        )}>
          {contextQuote}
        </blockquote>

        {/* Before → After */}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-3 text-[12px]">
          <del className="text-destructive/80 line-through">{change.original.length > 80 ? change.original.slice(0, 77) + "…" : change.original}</del>
          <span className="text-muted-foreground/50">→</span>
          <ins className={cn("no-underline font-medium", meta.colorClass)}>{change.corrected.length > 80 ? change.corrected.slice(0, 77) + "…" : change.corrected}</ins>
        </div>

        {/* Override instruction */}
        <input
          type="text"
          value={change.overrideInstruction}
          onChange={e => onOverrideChange(e.target.value)}
          placeholder="Override instruction (optional)"
          disabled={!change.selected}
          className="w-full text-[12px] border border-border rounded-lg px-2.5 py-1.5 bg-background placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        />
      </div>
    </div>
  );
}

// ── Type count chips ──────────────────────────────────────────────────────────

const CORRECTION_TYPES: CorrectionType[] = ["grammar", "style", "structure", "argument", "register"];

// ── Main component ─────────────────────────────────────────────────────────────

export function CorrectionDiffView({
  summary,
  changes,
  isAnalyzing,
  onToggleSelect,
  onSelectAll,
  onSelectNone,
  onOverrideChange,
  onApply,
}: CorrectionDiffViewProps) {
  const selectedCount = useMemo(() => changes.filter(c => c.selected).length, [changes]);

  if (isAnalyzing && changes.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-background p-8 flex flex-col items-center gap-3 text-center">
        <Loader2 size={22} className="animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Reading document and finding corrections…</p>
      </div>
    );
  }

  if (!isAnalyzing && changes.length === 0 && summary) {
    return (
      <div className="rounded-2xl border border-border bg-background p-8 text-center">
        <p className="text-base font-semibold text-foreground mb-1">No corrections needed</p>
        <p className="text-sm text-muted-foreground">The document looks clean. No issues were identified.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden">

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[15px] font-semibold text-foreground">
              {isAnalyzing
                ? `${changes.length} corrections found so far…`
                : `${changes.length} of ${changes.length} correction${changes.length !== 1 ? "s" : ""} selected`
              }
            </span>
            {!isAnalyzing && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Deselect items you want to skip. Hover badges for explanations.
              </p>
            )}
          </div>
          {!isAnalyzing && (
            <div className="flex items-center gap-2 text-[12px] font-medium flex-shrink-0">
              <button onClick={onSelectAll} className="text-primary hover:underline">All</button>
              <span className="text-muted-foreground/40">·</span>
              <button onClick={onSelectNone} className="text-muted-foreground hover:text-foreground">None</button>
            </div>
          )}
        </div>

        {/* Type breakdown chips */}
        {summary && (
          <div className="flex flex-wrap gap-1.5">
            {CORRECTION_TYPES.map(t => {
              const count = summary.by_type[t] ?? 0;
              if (count === 0) return null;
              const meta = CORRECTION_TYPE_META[t];
              return (
                <span key={t} className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", meta.pillClass)}>
                  {meta.label} · {count}
                </span>
              );
            })}
            {summary.word_count_before > 0 && (
              <span className="text-[10px] text-muted-foreground/60 ml-1 self-center">
                {summary.word_count_before.toLocaleString()} words
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card list */}
      <div className="p-3 space-y-2 max-h-[55vh] overflow-y-auto">
        {isAnalyzing && changes.length === 0 ? null : (
          changes.map(c => (
            <CorrectionCard
              key={c.id}
              change={c}
              onToggle={() => onToggleSelect(c.id)}
              onOverrideChange={(instruction) => onOverrideChange(c.id, instruction)}
            />
          ))
        )}
        {isAnalyzing && changes.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 text-[12px] text-muted-foreground">
            <Loader2 size={12} className="animate-spin flex-shrink-0" />
            Finding more corrections…
          </div>
        )}
      </div>

      {/* Register notes */}
      {summary && summary.register_notes.length > 0 && (
        <div className="px-4 py-2.5 border-t border-border bg-purple-50/50 dark:bg-purple-950/20">
          <p className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 mb-1">Register / Tone notes</p>
          {summary.register_notes.map((note, i) => (
            <p key={i} className="text-[11px] text-muted-foreground">• {note}</p>
          ))}
        </div>
      )}

      {/* Footer: how it works + apply button */}
      {!isAnalyzing && changes.length > 0 && (
        <div className="px-4 py-3 border-t border-border bg-secondary/10">
          <p className="text-[11px] text-muted-foreground/70 mb-3 leading-relaxed">
            <span className="font-semibold text-muted-foreground">How AI works:</span>{" "}
            It reads the document carefully, applies each correction surgically without touching unrelated text,
            infers the real intent behind vague instructions, then self-critiques its own output.
          </p>
          <button
            onClick={() => summary && onApply(changes.filter(c => c.selected), summary.original_text)}
            disabled={selectedCount === 0 || !summary}
            className={cn(
              "w-full py-2.5 rounded-xl text-sm font-semibold transition-colors",
              selectedCount > 0
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-secondary text-muted-foreground cursor-not-allowed",
            )}
          >
            {selectedCount === 0
              ? "Select at least one correction"
              : `Apply ${selectedCount} correction${selectedCount !== 1 ? "s" : ""} →`
            }
          </button>
        </div>
      )}
    </div>
  );
}
