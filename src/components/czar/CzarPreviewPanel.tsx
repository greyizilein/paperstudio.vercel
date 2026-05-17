// CzarPreviewPanel — Claude-artifact–style live document view
// ─────────────────────────────────────────────────────────────────────────
// Two layout modes:
//   • inline (desktop split, rendered inside the chat shell as a sibling
//     column) — this is the default on lg+. Czar.tsx switches its main
//     area to a side-by-side layout when the preview is open.
//   • overlay (mobile or maximised) — full-screen sheet that slides up.
//
// In-document features added on top of the original viewer:
//   • Show changes / Show clean toggle (CSS-only mark visibility flip)
//   • Find in document (Ctrl/Cmd-F) with prev/next + match count
//   • Copy as text (strips <mark> tags)
//   • Live word + change counter in the footer
//   • "Jump to latest" chip while streaming if the user scrolled away
//
// Auto-scroll always fires on the very first chunk, then continues while
// the user remains within ~240 px of the bottom.

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  X, Download, FileText, Loader2, CheckCircle2, AlertCircle,
  Maximize2, Minimize2, Search, Eye, EyeOff, Copy, ChevronDown,
  ChevronUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

export interface PreviewActivityItem {
  id: string;
  label: string;
  status: "running" | "done" | "error";
  detail?: string;
}

interface Props {
  open: boolean;
  documentId: string | null;
  filename: string | null;
  activity: PreviewActivityItem[];
  streaming: boolean;
  onClose: () => void;
  onDownload: () => void;
  /** When true, render as an inline column (used by the desktop split layout). */
  inline?: boolean;
}

function highlightHtml(raw: string): string {
  if (!raw) return "";
  const esc = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const withMarks = esc.replace(
    /&lt;mark\s+style=&quot;([^&]*?)&quot;&gt;([\s\S]*?)&lt;\/mark&gt;/g,
    (_full, style: string, inner: string) => {
      const safe = style.replace(/[^a-zA-Z0-9:#;,.\s\-()%]/g, "");
      return `<mark data-czar-change="1" style="${safe}">${inner}</mark>`;
    },
  );
  const lines = withMarks.split("\n");
  const out: string[] = [];
  let inList = false;
  for (const ln of lines) {
    const h1 = ln.match(/^#\s+(.+)$/);
    const h2 = ln.match(/^##\s+(.+)$/);
    const h3 = ln.match(/^###\s+(.+)$/);
    const bullet = ln.match(/^\s*[-*]\s+(.+)$/);
    if (h1) { if (inList) { out.push("</ul>"); inList = false; } out.push(`<h1>${h1[1]}</h1>`); continue; }
    if (h2) { if (inList) { out.push("</ul>"); inList = false; } out.push(`<h2>${h2[1]}</h2>`); continue; }
    if (h3) { if (inList) { out.push("</ul>"); inList = false; } out.push(`<h3>${h3[1]}</h3>`); continue; }
    if (bullet) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${bullet[1]}</li>`);
      continue;
    }
    if (inList) { out.push("</ul>"); inList = false; }
    if (ln.trim()) out.push(`<p>${ln}</p>`);
  }
  if (inList) out.push("</ul>");
  return out.join("\n");
}

function plainText(raw: string): string {
  // Remove our <mark style="…">…</mark> wrappers but keep their inner text.
  return raw.replace(/<mark[^>]*>([\s\S]*?)<\/mark>/g, "$1");
}

function countWords(s: string): number {
  const t = plainText(s).replace(/<[^>]+>/g, " ").trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

function countChanges(s: string): number {
  const m = s.match(/<mark[^>]*>/g);
  return m ? m.length : 0;
}

export function CzarPreviewPanel({
  open,
  documentId,
  filename,
  activity,
  streaming,
  onClose,
  onDownload,
  inline = false,
}: Props) {
  const isMobile = useIsMobile();
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [showChanges, setShowChanges] = useState(true);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findIndex, setFindIndex] = useState(0);
  const [showJump, setShowJump] = useState(false);
  const docContentRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const firstChunkRef = useRef(true);

  const [status, setStatus] = useState<"processing" | "done" | "failed" | null>(null);

  // ── Mobile bottom-sheet snap points ──────────────────────────────────
  // peek = 38vh, half = 70vh, full = 100vh - 64px (leave chat header tappable).
  type Snap = "peek" | "half" | "full";
  const [snap, setSnap] = useState<Snap>("half");
  const [dragOffset, setDragOffset] = useState(0); // live drag delta in px
  const dragStartRef = useRef<{ y: number; t: number; baseTranslate: number } | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const snapHeights = (): Record<Snap, number> => {
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    return {
      peek: Math.round(vh * 0.38),
      half: Math.round(vh * 0.70),
      full: vh - 64,
    };
  };

  // Reset to half-open whenever the sheet is freshly opened on mobile.
  useEffect(() => {
    if (open && isMobile) setSnap("half");
  }, [open, isMobile]);


  // Initial fetch
  useEffect(() => {
    if (!open || !documentId) { setHtml(""); setStatus(null); firstChunkRef.current = true; return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("document_corrections")
        .select("corrected_html, status")
        .eq("id", documentId)
        .maybeSingle();
      if (cancelled) return;
      setHtml((data?.corrected_html as string) || "");
      setStatus(((data?.status as any) || null));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, documentId]);

  // Realtime subscription
  useEffect(() => {
    if (!open || !documentId) return;
    const channel = supabase
      .channel(`doc-correction-${documentId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "document_corrections", filter: `id=eq.${documentId}` },
        (payload) => {
          const next = (payload.new as any) || {};
          if (typeof next.corrected_html === "string") setHtml(next.corrected_html);
          if (typeof next.status === "string") setStatus(next.status);
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [open, documentId]);

  // Auto-scroll: always pin on the very first chunk, then track only if
  // the user is within 240 px of the bottom.
  const lastLenRef = useRef(0);
  useEffect(() => {
    if (!streaming) { lastLenRef.current = html.length; return; }
    const el = docContentRef.current;
    if (!el) return;
    if (firstChunkRef.current && html.length > 0) {
      el.scrollTop = el.scrollHeight;
      firstChunkRef.current = false;
      lastLenRef.current = html.length;
      return;
    }
    const dist = el.scrollHeight - (el.scrollTop + el.clientHeight);
    if (dist < 240 && html.length > lastLenRef.current) {
      el.scrollTop = el.scrollHeight;
    }
    lastLenRef.current = html.length;
  }, [html, streaming]);

  // Track when user has scrolled away from the bottom (for the Jump chip).
  useEffect(() => {
    const el = docContentRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - (el.scrollTop + el.clientHeight);
      setShowJump(streaming && dist > 300);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [streaming, html]);

  // Ctrl/Cmd-F intercept inside this panel
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        const el = docContentRef.current;
        if (!el) return;
        // Only intercept when focus is inside the preview
        if (document.activeElement && el.contains(document.activeElement as Node)) {
          e.preventDefault();
          setFindOpen(true);
        }
      }
      if (e.key === "Escape" && findOpen) {
        setFindOpen(false);
        setFindQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, findOpen]);

  // Local highlight + jump for find
  const matchCount = useMemo(() => {
    if (!findQuery.trim()) return 0;
    try {
      const re = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      const text = plainText(html).replace(/<[^>]+>/g, " ");
      return (text.match(re) || []).length;
    } catch { return 0; }
  }, [findQuery, html]);

  useEffect(() => {
    const el = articleRef.current;
    if (!el) return;
    // Strip prior find marks
    el.querySelectorAll("mark.czar-find-mark").forEach((m) => {
      const parent = m.parentNode;
      if (!parent) return;
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
    });
    if (!findQuery.trim()) return;
    try {
      const re = new RegExp(findQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      const targets: Text[] = [];
      let node = walker.nextNode() as Text | null;
      while (node) {
        if (node.nodeValue && re.test(node.nodeValue)) targets.push(node);
        re.lastIndex = 0;
        node = walker.nextNode() as Text | null;
      }
      targets.forEach((t) => {
        const html = (t.nodeValue || "").replace(re, (m) => `<mark class="czar-find-mark">${m}</mark>`);
        const span = document.createElement("span");
        span.innerHTML = html;
        t.parentNode?.replaceChild(span, t);
      });
      // Scroll to current match
      const all = el.querySelectorAll("mark.czar-find-mark");
      const target = all[Math.min(findIndex, all.length - 1)] as HTMLElement | undefined;
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.style.setProperty("outline", "2px solid var(--czar-accent)");
    } catch { /* ignore */ }
  }, [findQuery, findIndex, html, showChanges]);

  const handleCopy = useCallback(async () => {
    try {
      const text = plainText(html).replace(/<[^>]+>/g, "");
      await navigator.clipboard.writeText(text);
    } catch { /* ignore */ }
  }, [html]);

  const liveBusy = streaming || status === "processing";
  const wordCount = useMemo(() => countWords(html), [html]);
  const changeCount = useMemo(() => countChanges(html), [html]);

  if (!open) return null;

  // Render mode selection
  // - Mobile  → curved bottom sheet with snap points (peek / half / full)
  // - Desktop maximised → full-screen overlay
  // - Desktop inline    → rendered inside Czar.tsx's split column
  // - Desktop standalone (no inline prop) → right-docked overlay
  const heights = snapHeights();
  const sheetH = heights[snap];
  // While dragging, translate the sheet by dragOffset (positive = downward).
  const sheetTranslate = Math.max(0, dragOffset);

  const containerClass = isMobile
    ? "fixed left-0 right-0 bottom-0 z-50 shadow-2xl"
    : maximized
      ? "fixed inset-0 z-50"
      : inline
        ? "flex flex-col h-full w-full border-l"
        : "fixed top-0 right-0 bottom-0 z-50 w-[42vw] min-w-[420px] max-w-[720px] border-l shadow-2xl";

  // Mobile sheet only dims when fully expanded — otherwise the user can
  // still tap-through to the chat behind.
  const showMobileBackdrop = isMobile && snap === "full";
  // Desktop overlay backdrop only for the right-docked standalone case.
  const showDesktopBackdrop = !isMobile && !maximized && !inline;

  return (
    <>
      {showMobileBackdrop && (
        <div
          className="fixed inset-0 z-40 bg-black/40 animate-fade-in"
          onClick={() => setSnap("half")}
          aria-hidden="true"
        />
      )}
      {showDesktopBackdrop && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        ref={sheetRef}
        className={`${containerClass} flex flex-col min-h-0 ${isMobile ? "" : "animate-fade-in"}`}
        style={{
          background: "var(--czar-bg)",
          borderColor: "var(--czar-border)",
          color: "var(--czar-text)",
          ...(isMobile
            ? {
                height: sheetH,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                transform: `translateY(${sheetTranslate}px)`,
                transition: dragStartRef.current ? "none" : "transform 280ms cubic-bezier(.22,1,.36,1), height 280ms cubic-bezier(.22,1,.36,1)",
                boxShadow: "0 -20px 60px -10px rgba(0,0,0,0.5)",
                overflow: "hidden",
              }
            : {}),
        }}
        role="dialog"
        aria-label="Document preview"
      >
        {/* Mobile grab handle — drag to snap, tap area covers the top strip */}
        {isMobile && (
          <div
            className="shrink-0 pt-2 pb-1 flex flex-col items-center cursor-grab active:cursor-grabbing touch-none select-none"
            onPointerDown={(e) => {
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              dragStartRef.current = { y: e.clientY, t: Date.now(), baseTranslate: 0 };
              setDragOffset(0);
            }}
            onPointerMove={(e) => {
              const start = dragStartRef.current;
              if (!start) return;
              setDragOffset(e.clientY - start.y);
            }}
            onPointerUp={(e) => {
              const start = dragStartRef.current;
              dragStartRef.current = null;
              try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
              if (!start) { setDragOffset(0); return; }
              const dy = e.clientY - start.y;
              const dt = Math.max(1, Date.now() - start.t);
              const velocity = dy / dt; // px/ms, positive = downward
              const order: Snap[] = ["full", "half", "peek"];
              const idx = order.indexOf(snap);
              let nextSnap: Snap = snap;
              // Velocity-driven snap takes priority on a fast flick.
              if (velocity > 0.6) nextSnap = order[Math.min(idx + 1, order.length - 1)];
              else if (velocity < -0.6) nextSnap = order[Math.max(idx - 1, 0)];
              else if (Math.abs(dy) > 80) {
                // Slow drag — pick by direction.
                nextSnap = dy > 0
                  ? order[Math.min(idx + 1, order.length - 1)]
                  : order[Math.max(idx - 1, 0)];
              }
              // Closing gesture: at peek, an extra downward flick dismisses.
              if (snap === "peek" && (velocity > 0.6 || dy > 120)) {
                setDragOffset(0);
                onClose();
                return;
              }
              setDragOffset(0);
              setSnap(nextSnap);
            }}
            aria-label="Drag to resize preview"
            role="slider"
          >
            <span className="block w-10 h-1.5 rounded-full" style={{ background: "color-mix(in srgb, var(--czar-text) 28%, transparent)" }} />
          </div>
        )}

        {/* Header */}
        <div
          className="flex items-center gap-2 px-3 sm:px-4 py-2.5 shrink-0"
          style={{ borderBottom: "1px solid var(--czar-border)" }}
        >
          {!isMobile && <FileText size={16} style={{ color: "var(--czar-accent)" }} />}
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold truncate" title={filename || ""}>
              {filename || "Document"}
            </div>
            <div className="text-[11px]" style={{ color: "var(--czar-text-faint)" }}>
              {liveBusy ? "Editing live…" : documentId ? `${wordCount.toLocaleString()} words · ${changeCount} change${changeCount === 1 ? "" : "s"}` : "No document"}
            </div>
          </div>

          {/* Header tools */}
          <button
            onClick={() => setFindOpen((v) => !v)}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-80"
            style={{ background: findOpen ? "var(--czar-accent)" : "var(--czar-surface)", color: findOpen ? "var(--czar-accent-fg)" : "var(--czar-text-dim)" }}
            title="Find (Ctrl/Cmd-F)"
            aria-label="Find in document"
          >
            <Search size={13} />
          </button>
          <button
            onClick={() => setShowChanges((v) => !v)}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-80"
            style={{ background: "var(--czar-surface)", color: "var(--czar-text-dim)" }}
            title={showChanges ? "Hide change highlights" : "Show change highlights"}
            aria-label="Toggle change highlights"
          >
            {showChanges ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
          <button
            onClick={handleCopy}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-80"
            style={{ background: "var(--czar-surface)", color: "var(--czar-text-dim)" }}
            title="Copy as text"
            aria-label="Copy as text"
          >
            <Copy size={13} />
          </button>
          {!isMobile && inline && (
            <button
              onClick={() => setMaximized((v) => !v)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-80"
              style={{ background: "var(--czar-surface)", color: "var(--czar-text-dim)" }}
              title={maximized ? "Restore split" : "Maximize"}
              aria-label="Toggle maximize"
            >
              {maximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-80"
            style={{ background: "var(--czar-surface)", color: "var(--czar-text-dim)" }}
            title="Close preview"
            aria-label="Close preview"
          >
            <X size={13} />
          </button>
        </div>

        {/* Find bar */}
        {findOpen && (
          <div
            className="flex items-center gap-2 px-3 sm:px-4 py-2 shrink-0"
            style={{ borderBottom: "1px solid var(--czar-border)", background: "var(--czar-surface)" }}
          >
            <Search size={12} style={{ color: "var(--czar-text-faint)" }} />
            <input
              type="text"
              value={findQuery}
              onChange={(e) => { setFindQuery(e.target.value); setFindIndex(0); }}
              placeholder="Find in document"
              autoFocus
              className="flex-1 bg-transparent outline-none text-[12.5px]"
              style={{ color: "var(--czar-text)" }}
            />
            <span className="text-[11px]" style={{ color: "var(--czar-text-faint)" }}>
              {findQuery ? `${matchCount === 0 ? 0 : findIndex + 1}/${matchCount}` : ""}
            </span>
            <button
              onClick={() => setFindIndex((i) => (matchCount === 0 ? 0 : (i - 1 + matchCount) % matchCount))}
              className="w-7 h-7 rounded-md flex items-center justify-center hover:opacity-80"
              style={{ color: "var(--czar-text-dim)" }}
              aria-label="Previous match"
            >
              <ChevronUp size={13} />
            </button>
            <button
              onClick={() => setFindIndex((i) => (matchCount === 0 ? 0 : (i + 1) % matchCount))}
              className="w-7 h-7 rounded-md flex items-center justify-center hover:opacity-80"
              style={{ color: "var(--czar-text-dim)" }}
              aria-label="Next match"
            >
              <ChevronDown size={13} />
            </button>
            <button
              onClick={() => { setFindOpen(false); setFindQuery(""); }}
              className="w-7 h-7 rounded-md flex items-center justify-center hover:opacity-80"
              style={{ color: "var(--czar-text-dim)" }}
              aria-label="Close find"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Activity log */}
        {(liveBusy || activity.length > 0) && (
          <div
            className="px-3 sm:px-4 py-2 shrink-0 max-h-[24%] overflow-y-auto"
            style={{ borderBottom: "1px solid var(--czar-border)", background: "var(--czar-surface)" }}
          >
            <div className="text-[10.5px] uppercase tracking-[0.12em] font-semibold mb-1.5" style={{ color: "var(--czar-text-faint)" }}>
              Activity
            </div>
            <ul className="space-y-1">
              {activity.length === 0 && liveBusy && (
                <li className="flex items-center gap-2 text-[12px]" style={{ color: "var(--czar-text-dim)" }}>
                  <Loader2 size={12} className="animate-spin" />
                  Reading the document…
                </li>
              )}
              {activity.map((a) => (
                <li key={a.id} className="flex items-start gap-2 text-[12px]" style={{ color: "var(--czar-text-dim)" }}>
                  {a.status === "running" && <Loader2 size={12} className="animate-spin mt-0.5 shrink-0" />}
                  {a.status === "done" && <CheckCircle2 size={12} className="mt-0.5 shrink-0" style={{ color: "var(--czar-accent)" }} />}
                  {a.status === "error" && <AlertCircle size={12} className="mt-0.5 shrink-0" style={{ color: "#dc2626" }} />}
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{a.label}</div>
                    {a.detail && (
                      <div className="text-[11px] opacity-70 truncate" title={a.detail}>{a.detail}</div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Document body — paper sheet, scrollable */}
        <div
          ref={docContentRef}
          className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 relative"
          style={{ background: "var(--czar-bg)" }}
        >
          {loading && !html ? (
            <div className="flex items-center justify-center h-full text-[13px]" style={{ color: "var(--czar-text-dim)" }}>
              <Loader2 size={14} className="animate-spin mr-2" /> Loading document…
            </div>
          ) : !html ? (
            <div className="flex items-center justify-center h-full text-[13px] text-center px-8" style={{ color: "var(--czar-text-faint)" }}>
              {liveBusy ? "Waiting for the first edit…" : "No content yet."}
            </div>
          ) : (
            <article
              ref={articleRef}
              className="czar-prose czar-paper-prose max-w-3xl mx-auto"
              data-show-changes={showChanges ? "true" : "false"}
              dangerouslySetInnerHTML={{ __html: highlightHtml(html) }}
            />
          )}

          {/* Jump-to-latest chip */}
          {showJump && (
            <button
              onClick={() => {
                const el = docContentRef.current;
                if (el) el.scrollTop = el.scrollHeight;
              }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-semibold shadow-lg hover:opacity-90 transition-opacity"
              style={{ background: "var(--czar-accent)", color: "var(--czar-accent-fg)" }}
            >
              <ChevronDown size={12} /> Jump to latest
            </button>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-2 px-3 sm:px-4 py-2.5 shrink-0"
          style={{ borderTop: "1px solid var(--czar-border)" }}
        >
          <div className="text-[11px] flex-1 min-w-0 truncate" style={{ color: "var(--czar-text-faint)" }}>
            {liveBusy
              ? "You can download once editing finishes."
              : `${wordCount.toLocaleString()} words · ${changeCount} change${changeCount === 1 ? "" : "s"} highlighted`}
          </div>
          <button
            onClick={onDownload}
            disabled={liveBusy || !documentId}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            style={{ background: "var(--czar-accent)", color: "var(--czar-accent-fg)" }}
          >
            <Download size={12} /> Download .docx
          </button>
        </div>

        {/* Inline CSS for change-toggle + find marks. Scoped to this article. */}
        <style>{`
          .czar-paper-prose[data-show-changes="false"] mark[data-czar-change="1"] {
            background: transparent !important;
            color: inherit !important;
            box-shadow: none !important;
          }
          mark.czar-find-mark {
            background: color-mix(in srgb, var(--czar-accent) 35%, transparent);
            color: inherit;
            border-radius: 2px;
            padding: 0 1px;
          }
        `}</style>
      </aside>
    </>
  );
}
