import { memo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContextualToolbar } from "@/components/writer/ContextualToolbar";
import { CzarQuillCaret } from "./CzarQuillCaret";
import { CzarClarifyCard, extractClarifySpec } from "./CzarClarifyCard";
import { CzarFollowups } from "./CzarFollowups";
import { CzarPlanCard, extractPlanSpec } from "./CzarPlanCard";
import { CzarToolCard } from "./CzarToolCard";
import { CzarNoteCard } from "./CzarNoteCard";
import type { CzarToolCallState } from "./CzarToolCard";
import type { DiffParagraph } from "@/lib/diffUtils";

// ── Memoised markdown renderer (same pattern as CzarThread) ─────────────────
const StreamingMarkdown = memo(
  function StreamingMarkdown({ content }: { content: string }) {
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {content || ""}
      </ReactMarkdown>
    );
  },
  (prev, next) => prev.content === next.content,
);

// ── Note extraction (mirrors CzarThread logic) ────────────────────────────────
function extractNotes(content: string): { notes: { text: string; label?: string }[]; rest: string } {
  const notes: { text: string; label?: string }[] = [];
  const rest = content.replace(/\[CZAR_NOTE(?::([^\]]*))?\]([\s\S]*?)\[\/CZAR_NOTE\]/g, (_m, label, text) => {
    notes.push({ text: text.trim(), label: label?.trim() });
    return "";
  }).trim();
  return { notes, rest };
}

function ThinkingDots({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-1" style={{ color: "var(--czar-text-faint)" }}>
      <Loader2 size={13} className="animate-spin" style={{ color: "var(--czar-accent)" }} />
      <span className="text-[12px]">{label}</span>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  content: string;
  streaming: boolean;
  showQuillCaret?: boolean;
  isEditing?: boolean;
  displayName?: string;
  diff?: DiffParagraph[] | null;
  onAcceptDiff?: () => void;
  onRejectDiff?: () => void;
  /** Called when user saves a direct (textarea) edit. */
  onDirectEdit?: (newContent: string) => void;
  /** Called when ContextualToolbar fires an action on selected text. */
  onAction?: (action: string, selectedText: string) => void;
  /** Which inline-edit action is currently loading (blocks toolbar). */
  inlineAction?: string | null;
  // Special cards
  clarifySpec?: any;
  onClarifyConfirm?: (values: Record<string, unknown>) => void;
  onClarifyReview?: (values: Record<string, unknown>) => void;
  followups?: string[];
  onFollowupPick?: (text: string) => void;
  toolCalls?: CzarToolCallState[];
  isBuild?: boolean;
  delivery?: string | null;
  onApprovePlan?: (content: string) => void;
  mode?: string;
  thinking?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CzarDocumentView({
  content,
  streaming,
  showQuillCaret = true,
  isEditing = false,
  displayName,
  diff,
  onAcceptDiff,
  onRejectDiff,
  onDirectEdit,
  onAction,
  inlineAction,
  clarifySpec,
  onClarifyConfirm,
  onClarifyReview,
  followups,
  onFollowupPick,
  toolCalls,
  isBuild,
  delivery,
  onApprovePlan,
  mode,
  thinking,
}: Props) {
  const [textSelection, setTextSelection] = useState<{ text: string; rect: DOMRect } | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  // Extract plan / clarify / notes from content string
  const { spec: planSpec, rest: afterPlan } = extractPlanSpec(content);
  const { spec: clarifyInline, rest: afterClarify } = !clarifySpec
    ? extractClarifySpec(afterPlan)
    : { spec: null, rest: afterPlan };
  const { notes, rest } = extractNotes(afterClarify);
  const activeClarify = clarifySpec ?? clarifyInline;

  // Text selection → ContextualToolbar
  const handleMouseUp = () => {
    if (!onAction) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.toString().trim().length < 4) {
      setTextSelection(null);
      return;
    }
    const range = sel.getRangeAt(0);
    setTextSelection({ text: sel.toString().trim(), rect: range.getBoundingClientRect() });
  };

  // Direct edit: sync draft with content when entering edit mode
  const handleEditFocus = () => {
    if (editDraft !== content) setEditDraft(content);
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;

  // ── Empty state ──
  if (!content && !streaming) {
    return (
      <div className="flex-1 flex flex-col px-5 sm:px-10 pt-10 sm:pt-14 select-none animate-in fade-in duration-300">
        {displayName && (
          <p
            className="text-[13px] sm:text-[14px] font-medium mb-2 opacity-60"
            style={{ color: "var(--czar-text)" }}
          >
            Hi {displayName}
          </p>
        )}
        <h1
          className="text-[28px] sm:text-[38px] font-bold leading-[1.12] tracking-tight max-w-[14ch]"
          style={{ color: "var(--czar-text)" }}
        >
          What's been on your mind lately?
        </h1>
      </div>
    );
  }

  // ── Streaming with no content yet (thinking phase) ──
  if (streaming && !content && !(toolCalls?.length) && !thinking) {
    return (
      <div className="flex-1 flex items-start justify-center px-4 pt-12">
        <div className="max-w-[680px] lg:max-w-[920px] w-full">
          <ThinkingDots label={mode === "plan" ? "Drafting plan…" : "CZAR is thinking…"} />
        </div>
      </div>
    );
  }

  // ── Edit mode: raw textarea ──
  if (isEditing) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <textarea
          value={editDraft || content}
          onFocus={handleEditFocus}
          onChange={(e) => setEditDraft(e.target.value)}
          onBlur={() => {
            if (editDraft && editDraft !== content) onDirectEdit?.(editDraft);
          }}
          className="flex-1 resize-none outline-none font-mono text-[13px] leading-relaxed p-6 bg-transparent"
          style={{ color: "var(--czar-text)", caretColor: "var(--czar-accent)" }}
          placeholder="Document content (markdown)…"
          spellCheck={false}
        />
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto relative"
      onClick={() => setTextSelection(null)}
    >
      {/* ── ContextualToolbar ── */}
      {textSelection && onAction && (
        <ContextualToolbar
          rect={textSelection.rect}
          isLoading={!!inlineAction}
          activeAction={inlineAction ?? null}
          onAction={(action) => {
            onAction(action, textSelection.text);
            setTextSelection(null);
          }}
        />
      )}

      <div className="max-w-[680px] lg:max-w-[920px] xl:max-w-[1040px] mx-auto px-4 sm:px-10 py-8 pb-24">

        {/* ── Tool calls (research / web search) ── */}
        {toolCalls && toolCalls.length > 0 && (
          <div className="mb-4 space-y-2">
            {toolCalls.map((c) => <CzarToolCard key={c.id} call={c} />)}
          </div>
        )}

        {/* ── Notes ── */}
        {notes.length > 0 && (
          <div className="mb-4 space-y-2">
            {notes.map((n, i) => <CzarNoteCard key={i} text={n.text} label={n.label} streaming={streaming} />)}
          </div>
        )}

        {/* ── Plan card (plan mode) ── */}
        {planSpec && (
          <CzarPlanCard
            spec={planSpec}
            onApprove={(p) => onApprovePlan?.(`[CZAR_PLAN]${JSON.stringify(p)}[/CZAR_PLAN]`)}
            disabled={streaming}
          />
        )}

        {/* ── Clarify card ── */}
        {activeClarify && (
          <div className="mb-6">
            <CzarClarifyCard
              spec={activeClarify}
              onConfirm={(values) => onClarifyConfirm?.(values)}
              onReview={onClarifyReview ? (values) => onClarifyReview(values) : undefined}
            />
          </div>
        )}

        {/* ── Diff view (tracked changes) ── */}
        {diff ? (
          <>
            <style>{`
              .czar-diff-del { background: rgba(239,68,68,0.18); color: #b91c1c; text-decoration: line-through; border-radius: 2px; padding: 0 1px; }
              .dark .czar-diff-del { color: #f87171; }
              .czar-diff-ins { background: rgba(34,197,94,0.18); color: #15803d; border-radius: 2px; padding: 0 1px; }
              .dark .czar-diff-ins { color: #4ade80; }
            `}</style>
            <div className="space-y-1.5 mb-6">
              {diff.map((para, i) => (
                <div
                  key={i}
                  className={cn(
                    "px-3 py-2 rounded border-l-4 text-[14px] leading-relaxed",
                    para.type === "unchanged" ? "border-transparent" :
                    para.type === "modified"  ? "bg-amber-500/[0.08] border-amber-400" :
                    para.type === "added"     ? "bg-emerald-500/10 border-emerald-500" :
                                               "bg-red-500/10 border-red-500 opacity-70"
                  )}
                  style={{ color: "var(--czar-text)" }}
                >
                  {para.type === "modified" && para.diffHtml ? (
                    <p dangerouslySetInnerHTML={{ __html: para.diffHtml.replace(/diff-del/g, "czar-diff-del").replace(/diff-ins/g, "czar-diff-ins") }} />
                  ) : para.type === "deleted" ? (
                    <p className="line-through opacity-60">{para.text}</p>
                  ) : (
                    <p>{para.text}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Accept / Discard bar */}
            <div className="sticky bottom-6 flex justify-center">
              <div
                className="flex items-center gap-3 px-4 py-2.5 rounded-2xl shadow-xl border"
                style={{ background: "var(--czar-bg-elev)", borderColor: "var(--czar-border)" }}
              >
                <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                <span className="text-[12px] font-semibold" style={{ color: "var(--czar-text)" }}>
                  AI updated your document
                </span>
                <button
                  onClick={onRejectDiff}
                  className="text-[12px] transition-opacity hover:opacity-80 ml-1"
                  style={{ color: "var(--czar-text-dim)" }}
                >
                  Discard
                </button>
                <button
                  onClick={onAcceptDiff}
                  className="px-3 py-1.5 rounded-xl text-[12px] font-bold transition-opacity hover:opacity-80"
                  style={{ background: "var(--czar-text)", color: "var(--czar-bg)" }}
                >
                  Accept changes
                </button>
              </div>
            </div>
          </>
        ) : (
          /* ── Normal document prose ── */
          <div
            ref={contentRef}
            onMouseUp={handleMouseUp}
            onTouchEnd={handleMouseUp}
          >
            <article
              className={cn(
                "czar-prose czar-paper-prose max-w-none",
                streaming
                  ? showQuillCaret
                    ? "czar-stream-quill"
                    : "czar-stream-caret"
                  : "",
              )}
            >
              <StreamingMarkdown content={rest || content} />
              {streaming && showQuillCaret && <CzarQuillCaret streaming size={18} />}
            </article>
          </div>
        )}

        {/* ── Word count ── */}
        {!streaming && wordCount > 0 && (
          <div className="mt-6 flex justify-end">
            <span
              className="text-[11px] tabular-nums opacity-40"
              style={{ color: "var(--czar-text)" }}
            >
              {wordCount.toLocaleString()} words
            </span>
          </div>
        )}

        {/* ── Follow-up suggestions ── */}
        {followups && followups.length > 0 && !streaming && onFollowupPick && (
          <CzarFollowups suggestions={followups} onPick={onFollowupPick} />
        )}
      </div>
    </div>
  );
}
