import { useMemo, useState, useCallback } from "react";
import { Check, X, Download, RotateCcw, Eye, List, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type CorrectionChange,
  type CorrectionSummary,
  type CorrectionType,
  CORRECTION_TYPE_META,
  buildSegments,
  buildCleanText,
} from "@/lib/czarCorrection";

// ── Props ─────────────────────────────────────────────────────────────────────

interface CorrectionDiffViewProps {
  summary: CorrectionSummary | null;
  changes: CorrectionChange[];
  isAnalyzing: boolean;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onDownload: (cleanText: string) => void;
  onFinalPass: (cleanText: string) => void;
}

// ── Type filter pill ──────────────────────────────────────────────────────────

function TypePill({
  type, count, active, onClick,
}: { type: CorrectionType | "all"; count: number; active: boolean; onClick: () => void }) {
  if (type === "all") {
    return (
      <button
        onClick={onClick}
        className={cn(
          "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors",
          active
            ? "bg-foreground text-background"
            : "bg-secondary text-muted-foreground hover:bg-secondary/80",
        )}
      >
        All · {count}
      </button>
    );
  }

  const meta = CORRECTION_TYPE_META[type];
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors",
        active ? `${meta.pillClass} ring-2 ring-offset-1 ring-current` : "bg-secondary text-muted-foreground hover:bg-secondary/80",
      )}
    >
      {meta.label} · {count}
    </button>
  );
}

// ── Change card (list view) ────────────────────────────────────────────────────

function ChangeCard({
  change, onAccept, onReject,
}: { change: CorrectionChange; onAccept: (id: string) => void; onReject: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const meta = CORRECTION_TYPE_META[change.type];

  return (
    <div className={cn(
      "border-l-[3px] rounded-r-xl bg-background border border-l-transparent overflow-hidden",
      meta.borderClass,
    )}>
      <div className="px-3 py-2.5 flex items-start gap-3">
        <span className={cn("text-[10px] font-bold uppercase tracking-wide mt-0.5 flex-shrink-0 px-1.5 py-0.5 rounded", meta.pillClass)}>
          {meta.label}
        </span>

        <div className="flex-1 min-w-0">
          {/* Before → After */}
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
            <del className="text-destructive/80 line-through text-[12px] leading-relaxed">{change.original}</del>
            <span className="text-muted-foreground/50 text-[11px]">→</span>
            <ins className={cn("no-underline font-medium text-[12px] leading-relaxed", meta.colorClass)}>{change.corrected}</ins>
          </div>

          {/* Explanation toggle */}
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-muted-foreground mt-1 transition-colors"
          >
            {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            {open ? "Hide" : "Why"}
          </button>
          {open && (
            <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{change.explanation}</p>
          )}
        </div>

        {/* Accept / Reject */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {change.status === "accepted" ? (
            <button
              onClick={() => onReject(change.id)}
              title="Undo accept"
              className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors"
            >
              <Check size={13} />
            </button>
          ) : change.status === "rejected" ? (
            <button
              onClick={() => onAccept(change.id)}
              title="Undo reject"
              className="w-7 h-7 rounded-full bg-destructive/20 text-destructive flex items-center justify-center hover:bg-destructive/30 transition-colors"
            >
              <X size={13} />
            </button>
          ) : (
            <>
              <button
                onClick={() => onAccept(change.id)}
                title="Accept"
                className="w-7 h-7 rounded-full border border-border text-muted-foreground flex items-center justify-center hover:bg-green-100 hover:text-green-700 hover:border-green-300 dark:hover:bg-green-900/30 dark:hover:text-green-400 transition-colors"
              >
                <Check size={12} />
              </button>
              <button
                onClick={() => onReject(change.id)}
                title="Reject"
                className="w-7 h-7 rounded-full border border-border text-muted-foreground flex items-center justify-center hover:bg-red-100 hover:text-red-700 hover:border-red-300 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
              >
                <X size={12} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Document view (tracked changes inline) ────────────────────────────────────

function DocumentView({
  originalText, changes, viewMode, onAccept, onReject,
}: {
  originalText: string;
  changes: CorrectionChange[];
  viewMode: "tracked" | "clean";
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const segments = useMemo(() => buildSegments(originalText, changes), [originalText, changes]);
  const cleanText = useMemo(() => buildCleanText(originalText, changes), [originalText, changes]);

  if (viewMode === "clean") {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap font-serif">
        {cleanText}
      </div>
    );
  }

  return (
    <div className="text-sm leading-relaxed font-serif whitespace-pre-wrap">
      {segments.map((seg, i) => {
        if (seg.kind === "text") {
          return <span key={i}>{seg.text}</span>;
        }

        const { change } = seg;
        const meta = CORRECTION_TYPE_META[change.type];

        if (change.status === "accepted") {
          return (
            <mark
              key={i}
              className={cn("rounded px-0.5 not-italic", meta.bgClass, meta.colorClass)}
              title={`Accepted: ${change.explanation}`}
            >
              {change.corrected}
              <button
                onClick={() => onReject(change.id)}
                title="Undo"
                className="ml-0.5 text-[9px] opacity-60 hover:opacity-100"
              >
                ↺
              </button>
            </mark>
          );
        }

        if (change.status === "rejected") {
          return (
            <span
              key={i}
              className="text-muted-foreground/40 line-through"
              title={`Rejected: ${change.explanation}`}
            >
              {change.original}
              <button
                onClick={() => onAccept(change.id)}
                title="Undo"
                className="ml-0.5 text-[9px] no-underline opacity-60 hover:opacity-100"
              >
                ↺
              </button>
            </span>
          );
        }

        // pending
        return (
          <span
            key={i}
            className={cn(
              "inline-flex flex-wrap items-baseline gap-x-1 gap-y-0 rounded-sm px-0.5 border-b-2",
              meta.bgClass, meta.borderClass,
            )}
          >
            <del className="text-destructive/70 text-[inherit] leading-inherit">{change.original}</del>
            <span className="text-muted-foreground/40 text-[11px]">→</span>
            <ins className={cn("no-underline font-medium", meta.colorClass)}>{change.corrected}</ins>
            <span className="inline-flex gap-px ml-0.5 flex-shrink-0">
              <button
                onClick={() => onAccept(change.id)}
                title="Accept"
                className="text-[9px] px-1 py-0 rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 leading-[1.4] transition-colors"
              >✓</button>
              <button
                onClick={() => onReject(change.id)}
                title="Reject"
                className="text-[9px] px-1 py-0 rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 leading-[1.4] transition-colors"
              >✗</button>
            </span>
          </span>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const CORRECTION_TYPES: CorrectionType[] = ["grammar", "style", "structure", "argument", "register"];

export function CorrectionDiffView({
  summary,
  changes,
  isAnalyzing,
  onAccept,
  onReject,
  onAcceptAll,
  onRejectAll,
  onDownload,
  onFinalPass,
}: CorrectionDiffViewProps) {
  const [tab, setTab] = useState<"document" | "list">("document");
  const [viewMode, setViewMode] = useState<"tracked" | "clean">("tracked");
  const [typeFilter, setTypeFilter] = useState<CorrectionType | "all">("all");

  const filteredChanges = useMemo(
    () => typeFilter === "all" ? changes : changes.filter(c => c.type === typeFilter),
    [changes, typeFilter],
  );

  const acceptedCount = useMemo(() => changes.filter(c => c.status === "accepted").length, [changes]);
  const rejectedCount = useMemo(() => changes.filter(c => c.status === "rejected").length, [changes]);
  const pendingCount = useMemo(() => changes.filter(c => c.status === "pending").length, [changes]);

  const handleDownload = useCallback(() => {
    if (!summary?.original_text) return;
    onDownload(buildCleanText(summary.original_text, changes));
  }, [summary, changes, onDownload]);

  const handleFinalPass = useCallback(() => {
    if (!summary?.original_text) return;
    onFinalPass(buildCleanText(summary.original_text, changes));
  }, [summary, changes, onFinalPass]);

  if (isAnalyzing && !summary) {
    return (
      <div className="rounded-2xl border border-border bg-background p-6 text-center text-sm text-muted-foreground">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Analyzing document for corrections…
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden">

      {/* Summary bar */}
      <div className="px-4 py-3 border-b border-border bg-secondary/20">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
          <span className="text-[13px] font-semibold">
            {isAnalyzing ? "Analyzing…" : `${summary.total} change${summary.total !== 1 ? "s" : ""} found`}
          </span>
          {summary.word_count_before > 0 && (
            <span className="text-[11px] text-muted-foreground">
              Words: {summary.word_count_before} → {summary.word_count_after || summary.word_count_before}
            </span>
          )}
          <span className="text-[11px] text-muted-foreground ml-auto">
            {acceptedCount > 0 && <span className="text-green-600 dark:text-green-400">{acceptedCount} accepted</span>}
            {acceptedCount > 0 && rejectedCount > 0 && " · "}
            {rejectedCount > 0 && <span className="text-destructive">{rejectedCount} rejected</span>}
            {pendingCount > 0 && (acceptedCount > 0 || rejectedCount > 0) && " · "}
            {pendingCount > 0 && <span>{pendingCount} pending</span>}
          </span>
        </div>

        {/* Type filter pills */}
        <div className="flex flex-wrap gap-1.5">
          <TypePill type="all" count={changes.length} active={typeFilter === "all"} onClick={() => setTypeFilter("all")} />
          {CORRECTION_TYPES.map(t => {
            const count = (summary.by_type[t] ?? 0);
            if (count === 0) return null;
            return (
              <TypePill key={t} type={t} count={count} active={typeFilter === t} onClick={() => setTypeFilter(t)} />
            );
          })}
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 flex-wrap">
        {/* Tab switch */}
        <div className="flex gap-1 bg-secondary rounded-lg p-0.5 text-[11px] font-medium">
          <button
            onClick={() => setTab("document")}
            className={cn("px-2.5 py-1 rounded-md transition-colors flex items-center gap-1",
              tab === "document" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <Eye size={11} />Document
          </button>
          <button
            onClick={() => setTab("list")}
            className={cn("px-2.5 py-1 rounded-md transition-colors flex items-center gap-1",
              tab === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <List size={11} />Changes
          </button>
        </div>

        {tab === "document" && (
          <div className="flex gap-1 bg-secondary rounded-lg p-0.5 text-[11px] font-medium">
            <button
              onClick={() => setViewMode("tracked")}
              className={cn("px-2.5 py-1 rounded-md transition-colors",
                viewMode === "tracked" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              Tracked
            </button>
            <button
              onClick={() => setViewMode("clean")}
              className={cn("px-2.5 py-1 rounded-md transition-colors",
                viewMode === "clean" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              Preview
            </button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={onAcceptAll}
            className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 dark:border-green-700 dark:text-green-400 dark:bg-green-950/30 dark:hover:bg-green-950/50 transition-colors"
          >
            Accept all
          </button>
          <button
            onClick={onRejectAll}
            className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:bg-red-950/30 dark:hover:bg-red-950/50 transition-colors"
          >
            Reject all
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="p-4 max-h-[60vh] overflow-y-auto">
        {tab === "document" ? (
          <>
            {summary.original_text ? (
              <DocumentView
                originalText={summary.original_text}
                changes={filteredChanges}
                viewMode={viewMode}
                onAccept={onAccept}
                onReject={onReject}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Document text not available.</p>
            )}
          </>
        ) : (
          <div className="space-y-2">
            {filteredChanges.length === 0 ? (
              <p className="text-sm text-muted-foreground">No changes match the current filter.</p>
            ) : (
              filteredChanges.map(c => (
                <ChangeCard key={c.id} change={c} onAccept={onAccept} onReject={onReject} />
              ))
            )}
          </div>
        )}
      </div>

      {/* Register notes */}
      {summary.register_notes.length > 0 && (
        <div className="px-4 py-3 border-t border-border bg-purple-50/50 dark:bg-purple-950/20">
          <p className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 mb-1">Register / Tone notes</p>
          <ul className="space-y-0.5">
            {summary.register_notes.map((note, i) => (
              <li key={i} className="text-[11px] text-muted-foreground">• {note}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Download card */}
      {!isAnalyzing && (
        <div className="px-4 py-3 border-t border-border bg-secondary/10 flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-muted-foreground flex-1">
            {pendingCount > 0
              ? `${pendingCount} pending changes will be accepted on download`
              : "All changes resolved"
            }
          </span>
          <button
            onClick={handleFinalPass}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <RotateCcw size={12} />
            Final pass
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Download size={12} />
            Download clean
          </button>
        </div>
      )}
    </div>
  );
}
