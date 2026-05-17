import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { Plus, Square, ScrollText, MessageSquare, Hammer, ChevronDown, UserRoundCheck, ArrowUp, FileEdit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { CzarAttachmentCard } from "./CzarAttachmentCard";

export interface CzarAttachment {
  path: string;
  filename: string;
  size: number;
  mime: string;
  status: "uploading" | "ready" | "error";
  progress?: number;
  error?: string;
  was_summarized?: boolean;
  summary_chunks?: number;
  original_words?: number;
}

export type CzarMode = "chat" | "plan" | "build" | "agent";

// Keywords that suggest the user wants to make edits inside the document.
const EDIT_KEYWORDS = /\b(fix|correct|revise|edit|change|update|improve|rewrite|modify|amend|adjust|proofread|review|check|correct|grammar|spell|annotate|redline|mark)\b/i;

// File extensions/mimes that qualify for the doc-correction pipeline.
function isDocFile(a: CzarAttachment): boolean {
  const lower = a.filename.toLowerCase();
  return lower.endsWith(".docx") || lower.endsWith(".pdf") || a.mime.includes("officedocument.wordprocessingml") || a.mime === "application/pdf";
}

interface Props {
  onSend: (text: string, attachments: CzarAttachment[]) => void;
  onStop?: () => void;
  disabled: boolean;
  streaming?: boolean;
  thinkingMode?: boolean;
  onToggleThinking?: () => void;
  mode?: CzarMode;
  onModeChange?: (m: CzarMode) => void;
  subscription?: any;
  onUpgrade?: () => void;
  /** True when the user has explicitly toggled "Edit in document". */
  docEditMode?: boolean;
  onDocEditModeChange?: (v: boolean) => void;
  /** Called instead of onSend when smart-detection fires (doc + edit keywords). */
  onSmartDocEdit?: (text: string, attachments: CzarAttachment[]) => void;
}

export interface CzarComposerHandle {
  prefill: (text: string) => void;
  focus: () => void;
}

const MAX_FILES = 15;
// 100 MB per file — matches the bucket file_size_limit.
const MAX_FILE_BYTES = 100 * 1024 * 1024;
// Pasting more than ~2k characters auto-converts to a .txt attachment.
const PASTE_AS_TXT_THRESHOLD = 2000;

const MODE_META: Record<CzarMode, { label: string; Icon: typeof ScrollText; hint: string }> = {
  chat:  { label: "Chat",  Icon: MessageSquare,  hint: "Conversational answers" },
  plan:  { label: "Plan",  Icon: ScrollText,     hint: "Outline the approach before writing" },
  build: { label: "Build", Icon: Hammer,         hint: "Skip preamble, deliver the artifact" },
  agent: { label: "Agent", Icon: UserRoundCheck, hint: "Autonomous — produces and downloads the work" },
};

export const CzarComposer = forwardRef<CzarComposerHandle, Props>(function CzarComposer(
  { onSend, onStop, disabled, streaming, thinkingMode, onToggleThinking, mode = "chat", onModeChange, subscription, onUpgrade, docEditMode = false, onDocEditModeChange, onSmartDocEdit },
  ref,
) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<CzarAttachment[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const modeBtnRef = useRef<HTMLDivElement>(null);

  // Compute remaining words for the live word-count strip.
  const wordsLeft = (() => {
    if (!subscription) return null;
    if (subscription.unlimited) return null; // admin / unlimited
    if (!subscription.tier || subscription.tier === "none") {
      return Math.max((subscription.bonus_words ?? 0) - (subscription.bonus_used ?? 0), 0);
    }
    return Math.max((subscription.word_limit ?? 0) - (subscription.words_used ?? 0), 0);
  })();


  useImperativeHandle(ref, () => ({
    prefill: (t: string) => { setText(t); taRef.current?.focus(); },
    focus: () => taRef.current?.focus(),
  }));

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as string;
      setText(detail);
      taRef.current?.focus();
    };
    window.addEventListener("czar:prefill", handler);
    return () => window.removeEventListener("czar:prefill", handler);
  }, []);

  useEffect(() => {
    if (!taRef.current) return;
    taRef.current.style.height = "auto";
    if (text === "") return;
    taRef.current.style.height = `${Math.min(taRef.current.scrollHeight, 220)}px`;
  }, [text]);

  useEffect(() => {
    if (!modeOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (modeBtnRef.current && !modeBtnRef.current.contains(e.target as Node)) setModeOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [modeOpen]);

  const submit = () => {
    if (disabled) return;
    if (!text.trim() && attachments.length === 0) return;
    if (attachments.some((a) => a.status === "uploading")) {
      toast({ title: "Files still uploading", description: "Wait for uploads to finish." });
      return;
    }
    const payloadText = text.trim();
    const payloadAttachments = attachments.filter((a) => a.status === "ready");

    // Smart detection: doc file + edit-like keywords → offer doc correction mode
    // Only fires when the user hasn't already opted in explicitly (docEditMode).
    if (!docEditMode && onSmartDocEdit && payloadAttachments.some(isDocFile) && EDIT_KEYWORDS.test(payloadText)) {
      onSmartDocEdit(payloadText, payloadAttachments);
      requestAnimationFrame(() => {
        setText("");
        setAttachments([]);
        if (taRef.current) taRef.current.style.height = "auto";
      });
      return;
    }

    onSend(payloadText, payloadAttachments);
    requestAnimationFrame(() => {
      setText("");
      setAttachments([]);
      if (taRef.current) taRef.current.style.height = "auto";
    });
  };

  const handleFiles = async (files: FileList | File[]) => {
    if (!user) return;
    const list = Array.from(files);
    if (attachments.length + list.length > MAX_FILES) {
      toast({ title: "Too many files", description: `Max ${MAX_FILES} per message.`, variant: "destructive" });
      return;
    }
    for (const file of list) {
      if (file.size > MAX_FILE_BYTES) {
        toast({ title: "File too large", description: `${file.name} exceeds 100 MB.`, variant: "destructive" });
        continue;
      }
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${crypto.randomUUID()}-${safe}`;
      const att: CzarAttachment = {
        path, filename: file.name, size: file.size,
        mime: file.type || "application/octet-stream", status: "uploading", progress: 0,
      };
      setAttachments((prev) => [...prev, att]);

      const expectedMs = Math.max(800, (file.size / (500 * 1024)) * 1000);
      const startedAt = Date.now();
      const ticker = window.setInterval(() => {
        const elapsed = Date.now() - startedAt;
        const pct = Math.min(95, (elapsed / expectedMs) * 100);
        setAttachments((prev) => prev.map((a) =>
          a.path === path && a.status === "uploading" ? { ...a, progress: pct } : a
        ));
      }, 200);

      const { error } = await supabase.storage.from("czar-uploads").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
      window.clearInterval(ticker);
      setAttachments((prev) => prev.map((a) =>
        a.path === path
          ? { ...a, status: error ? "error" : "ready", progress: error ? a.progress : 100, error: error?.message }
          : a
      ));
      if (error) {
        toast({ title: `Upload failed: ${file.name}`, description: error.message, variant: "destructive" });
      }
    }
  };

  const removeAttachment = async (path: string) => {
    setAttachments((prev) => prev.filter((a) => a.path !== path));
    supabase.storage.from("czar-uploads").remove([path]).catch(() => {});
  };

  const ModeIcon = MODE_META[mode].Icon;
  const canSend = (text.trim().length > 0 || attachments.length > 0) && !disabled;


  return (
    <div className="px-3 lg:px-6 pb-3 lg:pb-5 shrink-0">
      <div className="max-w-3xl mx-auto">
        <div
          className="rounded-3xl transition-colors"
          style={{
            background: "var(--czar-surface)",
            border: `1px solid ${dragOver ? "var(--czar-accent)" : "var(--czar-border)"}`,
            boxShadow: dragOver ? `0 0 0 3px color-mix(in srgb, var(--czar-accent) 22%, transparent)` : "0 2px 12px rgba(0,0,0,0.06)",
          }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
          }}
        >
          {/* Credit balance strip — clean pill row, matches reference */}
          {subscription && (
            <div
              className="flex items-center justify-between px-4 pt-2.5 pb-1.5"
              style={{ borderBottom: "1px solid color-mix(in srgb, var(--czar-border) 60%, transparent)" }}
            >
              <span className="flex items-baseline gap-1.5 text-[12px]" style={{ color: "var(--czar-text)" }}>
                {wordsLeft !== null ? (
                  <>
                    <strong className="text-[13px] font-bold" style={{ color: "var(--czar-text)" }}>
                      {wordsLeft.toLocaleString()}
                    </strong>
                    <span className="opacity-60">Credits Remaining</span>
                  </>
                ) : (
                  <strong className="text-[13px] font-bold" style={{ color: "var(--czar-text)" }}>
                    Unlimited
                  </strong>
                )}
              </span>
              {onUpgrade && wordsLeft !== null && (
                <button
                  onClick={onUpgrade}
                  className="text-[12px] font-semibold hover:opacity-80 transition-opacity shrink-0"
                  style={{ color: "var(--czar-accent)" }}
                >
                  Upgrade
                </button>
              )}
            </div>
          )}

          <div className="px-3 pt-3 pb-2">
            {attachments.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-2">
                {attachments.map((a) => (
                  <CzarAttachmentCard key={a.path} attachment={a} onRemove={removeAttachment} />
                ))}
              </div>
            )}

            <textarea
              ref={taRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData("text");
                if (pasted && pasted.length > PASTE_AS_TXT_THRESHOLD) {
                  e.preventDefault();
                  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
                  const file = new File([pasted], `pasted-${ts}.txt`, { type: "text/plain" });
                  handleFiles([file]);
                  toast({ title: "Pasted as file", description: `Saved ${(pasted.length / 1024).toFixed(1)} KB as pasted-${ts}.txt` });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={
                mode === "plan"  ? "Describe what you want planned…" :
                mode === "build" ? "Describe the artifact to build…" :
                mode === "agent" ? "Drop your brief or describe the deliverable. Agent will produce and download it." :
                                   "Ask CZAR anything, or describe what to write…"
              }
              rows={1}
              className="w-full bg-transparent resize-none outline-none text-[14px] px-1 py-1 max-h-[220px] placeholder:opacity-50"
              style={{ color: "var(--czar-text)" }}
            />

            <div className="flex items-center justify-between gap-2 pt-1.5">
              {/* Left cluster: attach + mode dropdown + think */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="*/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                {/* Attach */}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity shrink-0"
                  style={{ background: "var(--czar-bg)", color: "var(--czar-text-dim)", border: "1px solid var(--czar-border)" }}
                  title="Attach files — up to 15 · 100 MB each"
                  aria-label="Attach files"
                >
                  <Plus size={15} />
                </button>

                {/* Mode dropdown */}
                {onModeChange && (
                  <div className="relative" ref={modeBtnRef}>
                    <button
                      type="button"
                      onClick={() => setModeOpen((v) => !v)}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-medium transition-colors shrink-0"
                      style={{
                        background: "var(--czar-bg)",
                        color: "var(--czar-text)",
                        border: "1px solid var(--czar-border)",
                      }}
                      title={MODE_META[mode].hint}
                      aria-haspopup="menu"
                      aria-expanded={modeOpen}
                    >
                      <ModeIcon size={13} />
                      <span>{MODE_META[mode].label}</span>
                      <ChevronDown size={11} style={{ opacity: 0.6 }} />
                    </button>
                    {modeOpen && (
                      <div
                        role="menu"
                        className="absolute bottom-full left-0 mb-2 min-w-[200px] rounded-xl py-1 shadow-xl z-[60]"
                        style={{ background: "var(--czar-bg-elev)", border: "1px solid var(--czar-border)" }}
                      >
                        {(Object.keys(MODE_META) as CzarMode[]).map((id) => {
                          const { label, Icon, hint } = MODE_META[id];
                          const active = mode === id;
                          return (
                            <button
                              key={id}
                              role="menuitemradio"
                              aria-checked={active}
                              onClick={() => { onModeChange(id); setModeOpen(false); }}
                              className="w-full flex items-start gap-2.5 px-3 py-2 text-left hover:opacity-90 transition-colors"
                              style={{
                                background: active ? "var(--czar-surface)" : "transparent",
                                color: "var(--czar-text)",
                              }}
                            >
                              <Icon size={13} className="mt-0.5 shrink-0" style={{ color: active ? "var(--czar-accent)" : "var(--czar-text-dim)" }} />
                              <span className="flex-1 min-w-0">
                                <span className="block text-[12px] font-medium">{label}</span>
                                <span className="block text-[10.5px] opacity-60 leading-snug">{hint}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Think toggle — "+THINK" pill */}
                {onToggleThinking && (
                  <button
                    onClick={onToggleThinking}
                    className="flex items-center h-8 px-3 rounded-full text-[11px] font-semibold tracking-widest transition-all shrink-0"
                    style={{
                      color: thinkingMode ? "var(--czar-accent-fg)" : "var(--czar-text-dim)",
                      background: thinkingMode ? "var(--czar-accent)" : "var(--czar-bg)",
                      border: thinkingMode
                        ? "1.5px solid var(--czar-accent)"
                        : "1px solid var(--czar-border)",
                      boxShadow: thinkingMode
                        ? "0 0 12px color-mix(in srgb, var(--czar-accent) 35%, transparent)"
                        : undefined,
                    }}
                    title="Deep thinking — slower, higher reasoning"
                  >
                    +THINK
                  </button>
                )}

                {/* Edit in document toggle — always visible; requires a doc file to activate */}
                {onDocEditModeChange && (
                  <button
                    onClick={() => {
                      if (!attachments.some(isDocFile)) {
                        toast({ title: "Attach a document first", description: "Upload a .docx or .pdf to enable in-document editing." });
                        return;
                      }
                      onDocEditModeChange(!docEditMode);
                    }}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-semibold transition-all shrink-0"
                    style={{
                      color: docEditMode ? "var(--czar-accent-fg)" : "var(--czar-text-dim)",
                      background: docEditMode ? "var(--czar-accent)" : "var(--czar-bg)",
                      border: docEditMode
                        ? "1.5px solid var(--czar-accent)"
                        : "1px solid var(--czar-border)",
                      boxShadow: docEditMode
                        ? "0 0 12px color-mix(in srgb, var(--czar-accent) 35%, transparent)"
                        : undefined,
                      opacity: attachments.some(isDocFile) ? 1 : 0.45,
                    }}
                    title={attachments.some(isDocFile) ? "Apply corrections directly inside the uploaded document" : "Attach a .docx or .pdf to enable in-document editing"}
                  >
                    <FileEdit size={12} />
                    Edit in doc
                  </button>
                )}
              </div>

              {/* Send / Stop — ✦ dark circle */}
              {streaming ? (
                <button
                  onClick={() => onStop?.()}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:opacity-90 shrink-0 transition-opacity"
                  style={{ background: "var(--czar-text)", color: "var(--czar-bg)" }}
                  title="Stop generating"
                  aria-label="Stop"
                >
                  <Square size={12} fill="currentColor" />
                </button>
              ) : (
                <button
                  onClick={submit}
                  disabled={!canSend}
                  className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-25 disabled:cursor-not-allowed hover:opacity-90 shrink-0 transition-opacity"
                  style={{
                    background: "var(--czar-text)",
                    color: "var(--czar-bg)",
                  }}
                  title="Send (Enter)"
                  aria-label="Send"
                >
                  <ArrowUp size={17} strokeWidth={2.4} />
                </button>
              )}
            </div>
          </div>
        </div>
        <p className="text-center text-[10px] mt-1.5 opacity-50" style={{ color: "var(--czar-text-faint)" }}>
          CZAR can make mistakes — verify important information.
        </p>
      </div>
    </div>
  );
});
