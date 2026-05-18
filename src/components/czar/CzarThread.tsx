import { useEffect, useRef, useState, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Copy, RotateCw, Download, ChevronDown, Brain, FileDown, Eye } from "lucide-react";
import type { CzarAttachment } from "./CzarComposer";
import type { CzarMessage } from "@/pages/Czar";
import { toast } from "@/hooks/use-toast";
import { CzarIcon } from "@/components/icons/CzarIcon";
import { CzarQuillCaret } from "./CzarQuillCaret";
import { CzarAttachmentCard } from "./CzarAttachmentCard";
import { CzarToolCard } from "./CzarToolCard";
import { CzarFollowups } from "./CzarFollowups";
import { CzarClarifyCard, extractClarifySpec, type ClarifySpec } from "./CzarClarifyCard";
import { CzarNoteCard, extractNotes } from "./CzarNoteCard";
import { CzarPlanCard, extractPlanSpec, type PlanSpec } from "./CzarPlanCard";

/** Extracts `[CZAR_FIGPICK]{json}[/CZAR_FIGPICK]` blocks. JSON shape:
 *  { title?: string, tables?: {id,label}[], figures?: {id,label}[] }
 *  Returns a clarify spec with a `gallery` field, plus the cleaned content.
 */
function extractFigPickSpec(content: string): { spec: ClarifySpec | null; rest: string } {
  if (!content) return { spec: null, rest: content };
  const m = content.match(/\[CZAR_FIGPICK\]([\s\S]*?)\[\/CZAR_FIGPICK\]/);
  if (!m) return { spec: null, rest: content };
  try {
    const data = JSON.parse(m[1].trim());
    const tables = (data.tables || []).map((t: any) => ({
      id: String(t.id ?? t.label),
      label: String(t.label ?? t.id),
      kind: "table" as const,
    }));
    const figures = (data.figures || []).map((f: any) => ({
      id: String(f.id ?? f.label),
      label: String(f.label ?? f.id),
      kind: "figure" as const,
    }));
    if (tables.length === 0 && figures.length === 0) return { spec: null, rest: content };
    const rest = (content.slice(0, m.index!) + content.slice(m.index! + m[0].length)).trim();
    const spec: ClarifySpec = {
      title: data.title || "Pick what to include",
      info: data.info,
      confirmLabel: "Use selected",
      allowReview: true,
      fields: [{
        key: "__figpick",
        label: "",
        type: "gallery",
        items: [...tables, ...figures],
      }],
    };
    return { spec, rest };
  } catch {
    return { spec: null, rest: content };
  }
}

function extractBracketClarifySpec(content: string): { spec: ClarifySpec | null; rest: string } {
  if (!content) return { spec: null, rest: content };
  const m = content.match(/\[CZAR_CLARIFY\]([\s\S]*?)\[\/CZAR_CLARIFY\]/i);
  if (!m) return { spec: null, rest: stripHiddenControlText(content) };
  const rest = stripHiddenControlText(content.slice(0, m.index!) + content.slice(m.index! + m[0].length));
  try {
    const spec = JSON.parse(m[1].trim()) as ClarifySpec;
    if (!spec || !Array.isArray(spec.fields)) return { spec: null, rest };
    return { spec, rest };
  } catch {
    return { spec: null, rest };
  }
}

export type DownloadFormat = "docx" | "pdf" | "md";

interface Props {
  messages: CzarMessage[];
  onRegenerate?: (msgId: string) => void;
  onDownload?: (content: string, fmt: DownloadFormat) => void;
  onReattach?: () => void;
  showWordCount?: boolean;
  onFollowupPick?: (text: string) => void;
  onClarifyConfirm?: (msgId: string, values: Record<string, unknown>) => void;
  onClarifyReview?: (msgId: string, values: Record<string, unknown>) => void;
  userName?: string;
  mode?: "chat" | "plan" | "build" | "agent";
  onApprovePlan?: (content: string) => void;
  /** Show inline animated quill caret while streaming deliverables. */
  showQuillCaret?: boolean;
  /** Called when the user downloads a corrected doc from the pipeline. */
  onDownloadCorrected?: (documentId: string, fmt: "docx" | "pdf") => void;
  /** Called when the user clicks "Open preview" on a correction message. */
  onOpenPreview?: (documentId: string, filename?: string) => void;
}

function countWords(s: string): number {
  return (s || "").trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Decide whether an assistant message is a "deliverable" (a piece of work)
 * vs a "conversation" reply. Deliverables get the paper-sheet treatment;
 * conversation replies stay in the bubble.
 *
 * Heuristics — any of:
 *   • Has a markdown heading (#, ##, ###)
 *   • Has a markdown table
 *   • Word count ≥ 220  (i.e. roughly more than a long chat answer)
 *   • Brain emitted a SECTION_END token (Superior playbook deliverable)
 */
function isDeliverable(content: string): boolean {
  if (!content) return false;
  if (/^#{1,4}\s+/m.test(content)) return true;
  if (/^\s*\|.+\|.+\|/m.test(content)) return true;
  if (/<<<SECTION_END>>>/.test(content)) return true;
  return countWords(content) >= 220;
}
function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, (b) => b.replace(/```\w*\n?|```/g, ""))
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/^>\s?/gm, "")
    .trim();
}

function stripHiddenControlText(text: string): string {
  return (text || "")
    .replace(/\s*\[CZAR_DELIVERY:\w+\]\s*/gi, "")
    .replace(/\s*\[CZAR_IMAGE_SPEC\][\s\S]*?(?:\[\/CZAR_IMAGE_SPEC\]|$)\s*/gi, "")
    .replace(/\s*\[CZAR_CLARIFY\][\s\S]*?(?:\[\/CZAR_CLARIFY\]|$)\s*/gi, "")
    .replace(/\s*\[CZAR_PLAN\][\s\S]*?(?:\[\/CZAR_PLAN\]|$)\s*/gi, "")
    .replace(/\s*\[CZAR_FIGPICK\][\s\S]*?(?:\[\/CZAR_FIGPICK\]|$)\s*/gi, "")
    .replace(/\s*\[CZAR_NOTE(?::[^\]]*)?\][\s\S]*?(?:\[\/CZAR_NOTE\]|$)\s*/gi, "")
    .replace(/\s*\[CZAR(?:_[A-Z]+)?(?:[:\]][\s\S]*)?$/i, "")
    .trim();
}

function ThinkingDots({ label = "CZAR is thinking…" }: { label?: string }) {
  return (
    <div
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl rounded-tl-sm"
      style={{ background: "var(--czar-asst-bubble, var(--czar-surface))", color: "var(--czar-asst-bubble-fg, var(--czar-text-dim))" }}
    >
      <span className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "currentColor", animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "currentColor", animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "currentColor", animationDelay: "300ms" }} />
      </span>
      <span className="text-[12px] opacity-80">{label}</span>
    </div>
  );
}

// HumaniseStrip removed — humaniser progress now surfaces as a single
// glowing pill in the top strip (see <HumanisingPill /> in Czar.tsx).

function ThinkingPanel({ thinking, streaming }: { thinking: string; streaming?: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const wasStreamingRef = useRef(false);
  useEffect(() => {
    if (streaming) wasStreamingRef.current = true;
    if (!streaming && wasStreamingRef.current) setExpanded(false);
  }, [streaming]);
  if (!thinking) return null;
  return (
    <div className="rounded-xl mb-2 overflow-hidden" style={{ border: "1px solid var(--czar-border)", background: "var(--czar-bg)" }}>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:opacity-80"
        style={{ color: "var(--czar-text-dim)" }}
      >
        <Brain size={12} style={{ color: "var(--czar-accent, currentColor)" }} />
        <span className="text-[11px] font-medium tracking-wide flex-1">
          {streaming ? "CZAR is reasoning…" : "View reasoning"}
        </span>
        <ChevronDown size={11} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>
      {expanded && (
        <div
          className="px-3 pb-3 text-[11px] leading-relaxed whitespace-pre-wrap font-mono overflow-auto"
          style={{
            color: "var(--czar-text-dim)",
            borderTop: "1px solid var(--czar-border)",
            paddingTop: "0.5rem",
            maxHeight: "14rem",
            opacity: 0.85,
          }}
        >
          {thinking}
        </div>
      )}
    </div>
  );
}

function Menu({
  trigger,
  children,
}: {
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);
  return (
    <div ref={ref} className="relative inline-flex">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-[12px] hover:opacity-80">
        {trigger}
        <ChevronDown size={10} />
      </button>
      {open && (
        <div
          className="absolute bottom-full mb-1 left-0 z-20 min-w-[150px] rounded-xl py-1.5 shadow-lg"
          style={{ background: "var(--czar-surface)", border: "1px solid var(--czar-border)" }}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/**
 * Streaming markdown renderer with rehype-raw enabled so inline <mark>
 * correction highlights pass through unchanged. Memoised on content.
 */
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

function LiveMarkdown({ content }: { content: string; streaming?: boolean }) {
  return <StreamingMarkdown content={content} />;
}

function AsstAvatar() {
  return (
    <div
      className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5"
      style={{ background: "var(--czar-accent)", color: "var(--czar-accent-fg)" }}
    >
      <CzarIcon size={15} />
    </div>
  );
}

export function CzarThread({
  messages,
  onRegenerate,
  onDownload,
  onReattach,
  showWordCount,
  onFollowupPick,
  onClarifyConfirm,
  onClarifyReview,
  userName,
  mode,
  onApprovePlan,
  showQuillCaret = true,
  onDownloadCorrected,
  onOpenPreview,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);
  const [pinnedToBottom, setPinnedToBottom] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - (el.scrollTop + el.clientHeight);
      setPinnedToBottom(dist < 80);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) return;
    const idChanged = last.id !== lastIdRef.current;
    const isUserMessage = last.role === "user";
    // Always jump for the user's own new message; otherwise only follow if pinned.
    if (!pinnedToBottom && !(idChanged && isUserMessage)) {
      lastIdRef.current = last.id;
      return;
    }
    endRef.current?.scrollIntoView({ behavior: idChanged ? "smooth" : "auto" });
    lastIdRef.current = last.id;
  }, [messages, pinnedToBottom]);

  const copyMD = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied as Markdown" });
  };
  const copyPlain = (text: string) => {
    navigator.clipboard.writeText(stripMarkdown(text));
    toast({ title: "Copied as plain text" });
  };

  if (!messages.length) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="min-h-full flex items-center justify-center">
          <div className="text-center flex flex-col items-center gap-2">
            <div className="mb-4" style={{ color: "var(--czar-accent)", opacity: 0.9 }}>
              <CzarIcon size={56} streaming />
            </div>
            {userName && (
              <p className="text-[14px] font-medium" style={{ color: "var(--czar-text-dim)" }}>
                Hello, {userName}
              </p>
            )}
            <h1
              className="text-[22px] font-semibold tracking-tight"
              style={{ color: "var(--czar-text)" }}
            >
              Everything you need, in one place
            </h1>
            <p className="text-[13px] max-w-xs" style={{ color: "var(--czar-text-dim)" }}>
              Chat, write, edit, research. Drop in files. Press send.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-md">
              {[
                "Write my literature review",
                "Explain this methodology",
                "Check my citations",
                "Help me improve this paragraph",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => onFollowupPick?.(s)}
                  className="text-[12px] px-3 py-1.5 rounded-full transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: "var(--czar-surface)",
                    border: "1px solid var(--czar-border)",
                    color: "var(--czar-text-dim)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-2 sm:px-3 lg:px-4 py-6">
      {/* Wide column when ANY message is a deliverable, so the paper sheet
          uses the whole screen. Conversation-only threads stay narrower. */}
      <div
        key={messages[0]?.id ? `thread-${messages[0].id.slice(0, 4)}` : "thread-empty"}
        className={`czar-thread-in mx-auto space-y-4 ${messages.some((m) => m.role === "assistant" && (m.isBuild || isDeliverable(m.content))) ? "max-w-none" : "max-w-3xl"}`}
      >
        {messages.map((m) =>
          m.role === "user" ? (
            // ── User message — narrow accent bubble, top-right cutout tail ──
            <div key={m.id} className="czar-msg-in flex justify-end">
              <div className="max-w-[80%] sm:max-w-[70%] flex flex-col items-end gap-1.5">
                {(() => {
                  // Strip hidden control tags before display.
                  const visible = stripHiddenControlText(m.content || "");
                  if (!visible) return null;
                  return (
                    <div className="czar-bubble czar-bubble-user px-4 py-2.5 text-[14px] whitespace-pre-wrap leading-relaxed">
                      {visible}
                    </div>
                  );
                })()}
                {m.attachments && m.attachments.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full">
                    {m.attachments.map((a, i) => (
                      <CzarAttachmentCard
                        key={i}
                        attachment={{ ...a, status: a.status ?? "ready", progress: 100 } as any}
                        compact
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (() => {
            // ── Assistant message ──
            // PLAN card detection — wins over everything else. Comes from
            // either the live `clarify` SSE event (m.clarifySpec.kind==="plan")
            // or persisted [CZAR_PLAN]{json}[/CZAR_PLAN] in content.
            const livePlan: PlanSpec | null =
              (m.clarifySpec && (m.clarifySpec as any).kind === "plan")
                ? (m.clarifySpec as PlanSpec)
                : null;
            const persistedPlan = !livePlan ? extractPlanSpec(m.content || "") : { spec: null, rest: m.content };
            const planSpec: PlanSpec | null = livePlan || persistedPlan.spec;

            // Strip [CZAR_NOTE] blocks → render as Format-A dockable cards.
            const noteRes = extractNotes(planSpec ? "" : (m.content || ""));
            // Look for figure-picker block (Format C).
            const figRes = extractFigPickSpec(noteRes.rest);
            // Then server / legacy clarify blocks (Format B).
            const bracketClarify = extractBracketClarifySpec(figRes.rest);
            const fallback = extractClarifySpec(bracketClarify.rest);
            const spec = !planSpec && (m.clarifySpec || figRes.spec || bracketClarify.spec || fallback.spec);
            const rest = planSpec
              ? ""
              : (m.clarifySpec
                ? noteRes.rest
                : (figRes.spec ? figRes.rest : fallback.rest));
            const notes = planSpec ? [] : noteRes.notes;
            // While streaming, trust the server's pacing decision so the
            // layout doesn't snap from bubble → paper sheet mid-write.
            const deliverable = !planSpec && !!m.content && !spec && (
              m.isBuild ? true : isDeliverable(rest || "")
            );

            // Shared action bars
            const largeActionBar = !planSpec && m.content && !m.streaming && countWords(m.content) >= 40 ? (
              <div
                className="flex items-center flex-wrap gap-2 mt-3 pt-2.5"
                style={{ borderTop: "1px solid var(--czar-border)", color: "var(--czar-text-dim)" }}
              >
                {/* Approve & Build — only in plan mode for deliverables */}
                {mode === "plan" && deliverable && onApprovePlan && (
                  <button
                    onClick={() => onApprovePlan(m.content)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold hover:opacity-90 transition-opacity"
                    style={{ background: "var(--czar-accent)", color: "var(--czar-accent-fg)" }}
                  >
                    Approve &amp; Build
                  </button>
                )}
                <Menu
                  trigger={
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium"
                      style={{ background: "var(--czar-surface)", border: "1px solid var(--czar-border)" }}
                    >
                      <Copy size={12} /> Copy
                    </span>
                  }
                >
                  {(close) => (
                    <>
                      <button
                        onClick={() => { copyMD(m.content); close(); }}
                        className="w-full text-left px-3 py-1.5 text-[12px] hover:opacity-80"
                        style={{ color: "var(--czar-text)" }}
                      >
                        As Markdown
                      </button>
                      <button
                        onClick={() => { copyPlain(m.content); close(); }}
                        className="w-full text-left px-3 py-1.5 text-[12px] hover:opacity-80"
                        style={{ color: "var(--czar-text)" }}
                      >
                        As plain text
                      </button>
                    </>
                  )}
                </Menu>
                {/* Corrected document download — only on correction-pipeline messages.
                    Single one-click .docx download with highlighted changes baked in. */}
                {m.correctionDocId && onDownloadCorrected && (
                  <>
                    {onOpenPreview && (
                      <button
                        onClick={() => onOpenPreview(m.correctionDocId!, m.correctionFilename)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium hover:opacity-90 transition-opacity"
                        style={{ background: "var(--czar-surface)", border: "1px solid var(--czar-border)", color: "var(--czar-text-dim)" }}
                        title="Open the live document preview with highlighted edits"
                      >
                        <Eye size={12} /> Open preview
                      </button>
                    )}
                    <button
                      onClick={() => onDownloadCorrected(m.correctionDocId!, "docx")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold hover:opacity-90 transition-opacity"
                      style={{ background: "var(--czar-accent)", color: "var(--czar-accent-fg)" }}
                      title="Download the corrected document (.docx) with highlighted changes"
                    >
                      <FileDown size={12} /> Download corrected .docx
                    </button>
                  </>
                )}
                {!m.correctionDocId && (
                  <button
                    onClick={() => onDownload?.(m.content, "docx")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium hover:opacity-90 transition-opacity"
                    style={{ background: mode === "plan" && deliverable && onApprovePlan ? "var(--czar-surface)" : "var(--czar-accent)", border: mode === "plan" && deliverable && onApprovePlan ? "1px solid var(--czar-border)" : undefined, color: mode === "plan" && deliverable && onApprovePlan ? "var(--czar-text-dim)" : "var(--czar-accent-fg)" }}
                    title="Download as Word document"
                  >
                    <Download size={12} /> Download
                  </button>
                )}
                {onReattach && (
                  <button
                    onClick={onReattach}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium hover:opacity-80"
                    style={{ background: "var(--czar-surface)", border: "1px solid var(--czar-border)", color: "var(--czar-text-dim)" }}
                    title="Re-pick what to attach"
                  >
                    Re-attach
                  </button>
                )}
                <button
                  onClick={() => onRegenerate?.(m.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium hover:opacity-80"
                  style={{ background: "var(--czar-surface)", border: "1px solid var(--czar-border)" }}
                >
                  <RotateCw size={12} /> Regenerate
                </button>
                {showWordCount && (
                  <span className="text-[11px] ml-auto" style={{ color: "var(--czar-text-faint)" }}>
                    {countWords(m.content).toLocaleString()} words
                  </span>
                )}
              </div>
            ) : null;

            // ── Deliverable: full-width paper sheet layout ──
            if (deliverable) {
              return (
                <div key={m.id} className="czar-msg-in">
                  {m.toolCalls && m.toolCalls.length > 0 && (
                    <div className="px-2 sm:px-3 lg:px-4 mb-2">
                      {m.toolCalls.map((c) => <CzarToolCard key={c.id} call={c} />)}
                    </div>
                  )}
                  {m.thinking && (
                    <div className="px-2 sm:px-3 lg:px-4">
                      <ThinkingPanel thinking={m.thinking} streaming={m.streaming} />
                    </div>
                  )}
                  {notes.length > 0 && (
                    <div className="px-2 sm:px-3 lg:px-4">
                      {notes.map((n, i) => (
                        <CzarNoteCard key={i} text={n.text} label={n.label} streaming={m.streaming} />
                      ))}
                    </div>
                  )}
                  <div className="czar-paper px-4 sm:px-6 lg:px-8 py-2">
                    <article className={`czar-prose czar-paper-prose max-w-none ${m.streaming ? (showQuillCaret ? "czar-stream-quill" : "czar-stream-caret") : ""}`}>
                      <LiveMarkdown content={rest || m.content} streaming={m.streaming} />
                      {m.streaming && showQuillCaret && <CzarQuillCaret streaming size={18} />}
                    </article>
                  </div>
                  {largeActionBar && (
                    <div className="px-2 sm:px-3 lg:px-4">{largeActionBar}</div>
                  )}
                  {m.followups && m.followups.length > 0 && !m.streaming && onFollowupPick && (
                    <div className="px-2 sm:px-3 lg:px-4">
                      <CzarFollowups suggestions={m.followups} onPick={onFollowupPick} />
                    </div>
                  )}
                </div>
              );
            }

            // ── Non-deliverable: bubble-less Google-style flow with a thin
            // accent rail in the left gutter. No avatar, no bubble — the AI
            // text reads as a quiet column on the page. User bubbles unchanged. ──
            return (
              <div key={m.id} className="czar-msg-in czar-asst-flat flex gap-3 group">
                <div className="czar-asst-rail shrink-0 mt-1.5" aria-hidden="true" />
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-1.5 mb-1.5" style={{ color: "var(--czar-text-faint)" }}>
                    <CzarIcon size={12} streaming={m.streaming} />
                    <span className="text-[10.5px] uppercase tracking-[0.12em] font-medium">CZAR</span>
                  </div>
                  {m.toolCalls && m.toolCalls.length > 0 && (
                    <div className="mb-2">
                      {m.toolCalls.map((c) => <CzarToolCard key={c.id} call={c} />)}
                    </div>
                  )}
                  {m.thinking && <ThinkingPanel thinking={m.thinking} streaming={m.streaming} />}
                  {notes.length > 0 && (
                    <div>
                      {notes.map((n, i) => (
                        <CzarNoteCard key={i} text={n.text} label={n.label} streaming={m.streaming} />
                      ))}
                    </div>
                  )}
                  {planSpec ? (
                    <CzarPlanCard
                      spec={planSpec}
                      onApprove={(p) => onApprovePlan?.(`[CZAR_PLAN]${JSON.stringify(p)}[/CZAR_PLAN]`)}
                    />
                  ) : m.streaming && !m.content && !m.thinking && !(m.toolCalls?.length) ? (
                    <ThinkingDots label={mode === "plan" ? "Drafting plan…" : "CZAR is thinking…"} />
                  ) : m.streaming && !m.content && m.toolCalls?.some((c) => c.phase === "running") ? (
                    <ThinkingDots label="CZAR is researching…" />
                  ) : mode === "plan" && m.streaming ? (
                    <ThinkingDots label="Drafting plan…" />
                  ) : (spec || rest) ? (
                    <div>
                      {spec && (
                        <CzarClarifyCard
                          spec={spec}
                          onConfirm={(values) => onClarifyConfirm?.(m.id, values)}
                          onReview={onClarifyReview ? (values) => onClarifyReview(m.id, values) : undefined}
                        />
                      )}
                      {rest && (
                        <article className={`czar-prose max-w-none ${m.streaming ? (showQuillCaret ? "czar-stream-quill" : "czar-stream-caret") : ""}`}>
                          <LiveMarkdown content={rest} streaming={m.streaming} />
                          {m.streaming && showQuillCaret && <CzarQuillCaret streaming size={15} />}
                        </article>
                      )}
                    </div>
                  ) : null}
                  {largeActionBar}
                  {m.content && !m.streaming && countWords(m.content) < 40 && (
                    <div className="flex items-center gap-2 mt-2" style={{ color: "var(--czar-text-faint)" }}>
                      <button
                        onClick={() => { navigator.clipboard.writeText(m.content); toast({ title: "Copied" }); }}
                        className="inline-flex items-center gap-1 text-[11px] hover:opacity-80"
                      >
                        <Copy size={11} /> Copy
                      </button>
                      <button
                        onClick={() => onRegenerate?.(m.id)}
                        className="inline-flex items-center gap-1 text-[11px] hover:opacity-80"
                      >
                        <RotateCw size={11} /> Retry
                      </button>
                    </div>
                  )}
                  {m.followups && m.followups.length > 0 && !m.streaming && onFollowupPick && (
                    <CzarFollowups suggestions={m.followups} onPick={onFollowupPick} />
                  )}
                </div>
              </div>
            );
          })(),
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
