import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  PanelLeftClose, PanelLeftOpen, Loader2, Square,
  Bot, AlertCircle, Search, PenLine, Cpu,
  ChevronDown, ChevronRight, LayoutPanelLeft, FileSearch, Clock, X,
  BookOpen, Film, Scale, Download, Volume2, VolumeX, Edit3, Eye, FileText, Sparkles,
  Compass, FlaskConical, Pen, Library, Gavel, RefreshCw, ImageIcon,
  Copy, Trash2, MoreHorizontal, Check, FileDown, LayoutGrid,
} from "lucide-react";
import { PsThemeToggle } from "@/components/ps/PsThemeToggle";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Packer } from "docx";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  streamCzar, loadMessages,
  type CzarRequest, type CzarMode, type CzarHandlers,
  type CzarMetaEvent, type CzarAgentEvent, type CzarToolEvent,
  type CzarClarificationEvent,
  type CorrectionSummaryEvent, type CorrectionChangeEvent,
} from "@/lib/czarStream";
import { buildDocx, docxFilename, stripMarkdown, markdownComponents, chatMarkdownComponents } from "@/lib/czarDocUtils.tsx";
import { computeParaDiff, type DiffParagraph } from "@/lib/diffUtils";
import { ConvSidebar } from "@/components/czar/ConvSidebar";
import { UpgradeModal } from "@/components/czar/UpgradeModal";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MobileDashboardSheet } from "@/components/dashboard/MobileDashboardSheet";
import { CorrectionModal } from "@/components/czar/CorrectionModal";
import { CzarMobileLayout } from "@/components/czar/CzarMobileLayout";

import { lazy, Suspense } from "react";
import { WritingGlow, WelcomeAurora, CzarObjectScene } from "@/components/czar/CzarVisuals";
const CommandInput = lazy(() => import("@/components/czar/CommandInput").then(m => ({ default: m.CommandInput })));

// ── Types ──────────────────────────────────────────────────────────

interface LiveAgent {
  id: string;
  name: string;
  status: "idle" | "starting" | "working" | "done" | "error";
  action?: string;
  detail?: string;
}

interface UIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: string;
  streaming?: boolean;
  error?: boolean;
  agents?: LiveAgent[];
  correctionApplied?: boolean;
  correctionDiff?: DiffParagraph[];
  correctionOriginalText?: string;
  clarificationQuestions?: string[];
  clarificationTitle?: string;
}

// ── Constants ──────────────────────────────────────────────────────

const DOC_MODES = ["write", "correct", "research", "literature_review", "legal", "screenplay"];


// ── Helpers ────────────────────────────────────────────────────────

function modeLabel(mode: CzarMode): string {
  return {
    chat: "Chat",
    write: "Write",
    correct: "Correct",
    research: "Research",
    plan: "Plan",
    literature_review: "Lit Review",
    screenplay: "Screenplay",
    legal: "Legal",
  }[mode] ?? mode;
}

function modeIcon(mode: CzarMode) {
  const cls = "w-3.5 h-3.5";
  return {
    chat: <Cpu className={cls} />,
    write: <PenLine className={cls} />,
    correct: <FileSearch className={cls} />,
    research: <Search className={cls} />,
    plan: <LayoutPanelLeft className={cls} />,
    literature_review: <BookOpen className={cls} />,
    screenplay: <Film className={cls} />,
    legal: <Scale className={cls} />,
  }[mode] ?? <Cpu className={cls} />;
}

const MODE_COLOURS: Record<CzarMode, string> = {
  chat: "bg-secondary text-muted-foreground",
  write: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  correct: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  research: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  plan: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  literature_review: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  screenplay: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  legal: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
};


// ── Main component ─────────────────────────────────────────────────

export default function CzarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (user === null) navigate("/auth"); }, [user]);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [mobileDashboardOpen, setMobileDashboardOpen] = useState(false);

  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const agentClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [agents, setAgents] = useState<LiveAgent[]>([]);
  const agentsRef = useRef<LiveAgent[]>([]);
  useEffect(() => { agentsRef.current = agents; }, [agents]);

  const [mode, setMode] = useState<CzarMode>("chat");

  const threadEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    requestAnimationFrame(() => {
      threadEndRef.current?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
    });
  }, [messages]);

  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");

  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);

  const [userName, setUserName] = useState("");
  const [userInitials, setUserInitials] = useState("U");
  const [userTier, setUserTier] = useState("free");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();

  useEffect(() => {
    if (!user) return;
    const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
    setUserName(name);
    setUserInitials(name[0]?.toUpperCase() ?? "U");
    setAvatarUrl(user.user_metadata?.avatar_url);
    supabase.from("subscriptions" as any).select("tier").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setUserTier((data as any).tier); });
  }, [user]);

  const loadConv = useCallback(async (id: string) => {
    try {
      const msgs = await loadMessages(id);
      setMessages(msgs.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content || "",
        mode: m.mode ?? undefined,
      })));
    } catch {
      // non-fatal
    }
  }, []);

  const newConv = useCallback(() => {
    abortRef.current?.abort();
    if (agentClearRef.current) clearTimeout(agentClearRef.current);
    setConvId(null);
    setMessages([]);
    setAgents([]);
    setStreaming(false);
  }, []);

  const selectConv = useCallback((id: string) => {
    if (id === convId) return;
    abortRef.current?.abort();
    if (agentClearRef.current) clearTimeout(agentClearRef.current);
    setConvId(id);
    setStreaming(false);
    setAgents([]);
    loadConv(id);
    setMobileHistoryOpen(false);
  }, [convId, loadConv]);

  const uploadFiles = useCallback(async (files: File[]): Promise<CzarRequest["attachments"]> => {
    if (!user || files.length === 0) return [];
    const results: CzarRequest["attachments"] = [];
    for (const file of files) {
      const path = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("czar-uploads").upload(path, file);
      if (error) { console.warn("Upload failed:", file.name, error.message); continue; }
      results!.push({ storage_path: path, filename: file.name, size: file.size, mime: file.type || "application/octet-stream" });
    }
    return results;
  }, [user]);

  const sendMessage = useCallback(async (text: string, files: File[], extraSettings: Record<string, any> = {}) => {
    if (!user || streaming) return;
    if (!text.trim() && files.length === 0) return;

    if (agentClearRef.current) {
      clearTimeout(agentClearRef.current);
      agentClearRef.current = null;
    }

    const userMsgId = `u_${Date.now()}`;
    const assistantMsgId = `a_${Date.now()}`;

    const isApplyStep = extraSettings.correction_apply === true;
    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: "user", content: text, mode, correctionApplied: isApplyStep },
      { id: assistantMsgId, role: "assistant", content: "", mode, streaming: true, correctionApplied: isApplyStep },
    ]);
    setStreaming(true);
    setAgents([]);

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let accText = "";

    try {
      const attachments = await uploadFiles(files);

      const handlers: CzarHandlers = {
        onMeta: (e: CzarMetaEvent) => {
          setConvId(e.conversation_id);
          if (e.mode) {
            setMessages(prev => prev.map(m =>
              m.id === assistantMsgId ? { ...m, mode: e.mode as string } : m
            ));
            setMode(e.mode as CzarMode);
          }
        },
        onAgent: (e: CzarAgentEvent) => {
          setAgents(prev => {
            const idx = prev.findIndex(a => a.id === e.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = { ...next[idx], ...e };
              return next;
            }
            return [...prev, e as LiveAgent];
          });
        },
        onDelta: (text: string) => {
          accText += text;
          setMessages(prev => prev.map(m =>
            m.id === assistantMsgId ? { ...m, content: accText } : m
          ));
        },
        onTool: (_e: CzarToolEvent) => {},
        onStatus: (e) => {
          setAgents(prev => {
            const idx = prev.findIndex(a => a.status === "working");
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = { ...next[idx], action: e.message || e.phase };
              return next;
            }
            return prev;
          });
        },
        onError: (message: string) => {
          setMessages(prev => prev.map(m =>
            m.id === assistantMsgId
              ? { ...m, content: accText || message, error: true, streaming: false }
              : m
          ));
          setStreaming(false);
        },
        onBilling: (reason: string) => {
          setUpgradeReason(reason);
          setShowUpgrade(true);
          setMessages(prev => prev.filter(m => m.id !== assistantMsgId));
          setStreaming(false);
        },
        onCorrectionSummary: (e: CorrectionSummaryEvent) => {
          setMessages(prev => prev.map(m =>
            m.id === assistantMsgId ? { ...m, correctionSummary: e } : m
          ));
        },
        onCorrectionChange: (e: CorrectionChangeEvent) => {
          setMessages(prev => prev.map(m =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  correctionChanges: [
                    ...(m.correctionChanges ?? []),
                    { ...e, selected: true, overrideInstruction: "" },
                  ],
                }
              : m
          ));
        },
        onClarification: (e: CzarClarificationEvent) => {
          setMessages(prev => prev.map(m =>
            m.id === assistantMsgId
              ? { ...m, clarificationQuestions: e.questions, clarificationTitle: e.title }
              : m
          ));
        },
        onReplace: (e) => {
          accText = e.content;
          setMessages(prev => prev.map(m =>
            m.id === assistantMsgId ? { ...m, content: e.content } : m
          ));
        },
        onDone: (e) => {
          const agentSnapshot = agentsRef.current.filter(a => a.name);
          const finalMode = (e as any).mode || mode;
          setMessages(prev => prev.map(m =>
            m.id === assistantMsgId
              ? { ...m, streaming: false, agents: agentSnapshot }
              : m
          ));
          setStreaming(false);
          setAgents(prev => prev.map(a => a.status === "working" ? { ...a, status: "done" } : a));
          agentClearRef.current = setTimeout(() => {
            agentClearRef.current = null;
            setAgents([]);
          }, 3500);
          if (e.conversation_id && e.conversation_id !== convId) {
            setConvId(e.conversation_id);
          }
          if (extraSettings.autoDownload && accText.trim()) {
            downloadContent(accText);
          }
        },
      };

      await streamCzar({
        conversation_id: convId,
        user_message: text,
        attachments,
        settings: extraSettings,
      }, handlers, ctrl.signal);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setMessages(prev => prev.map(m =>
          m.id === assistantMsgId
            ? { ...m, content: "Something went wrong. Please try again.", error: true, streaming: false }
            : m
        ));
      }
      setStreaming(false);
    }
  }, [user, streaming, convId, mode, uploadFiles]);

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
    setMessages(prev => prev.map(m => m.streaming ? { ...m, streaming: false } : m));
    setAgents(prev => prev.map(a => a.status === "working" ? { ...a, status: "done" } : a));
  }, []);

  // Trigger a DOCX download from any markdown string
  const downloadContent = useCallback(async (content: string) => {
    if (!content.trim()) return;
    try {
      const [{ buildDocx, docxFilename }, { Packer }] = await Promise.all([
        import("@/lib/czarDocUtils.tsx"),
        import("docx"),
      ]);
      const blob = await Packer.toBlob(buildDocx(content));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = docxFilename(content);
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
  }, []);

  // Download the last complete assistant message
  const handleDownloadLast = useCallback(() => {
    const last = [...messages].reverse().find(
      m => m.role === "assistant" && !m.streaming && m.content.trim().length > 0
    );
    if (last) downloadContent(last.content);
  }, [messages, downloadContent]);

  // Detect messages whose sole intent is to download (not write + download)
  function isDownloadIntent(text: string): boolean {
    const t = text.toLowerCase().trim().replace(/[.!?]+$/, "");
    if (t === "/download" || t === "download") return true;
    // Strip polite filler from the start
    const core = t
      .replace(/^(please|can you|could you|just|hey czar|czar)\s+/g, "")
      .trim();
    const hasDownloadVerb = /\b(download|save|export)\b/.test(core);
    if (!hasDownloadVerb) return false;
    // Must not be mixed with a writing/research task
    const hasWritingTask = /\b(write|draft|create|generate|make|produce|compose|discuss|explain|describe|analys[ei]s?|research|summari[sz]e|tell me|what is|what are|how does|why)\b/.test(core);
    if (hasWritingTask) return false;
    // Short message with a document reference → pure download intent
    const hasDocRef = /\b(docx?|word(?:\s+doc(?:ument)?)?|document|file|this|it|the\s+(?:essay|report|paper|response|last\s+(?:response|message|output)))\b/.test(core);
    const wordCount = core.split(/\s+/).filter(Boolean).length;
    return hasDocRef && wordCount <= 10;
  }

  const handleCommandSend = useCallback((text: string, files: File[], meta?: Record<string, any>) => {
    // Pure download intent — trigger download without sending to the backend
    if (files.length === 0 && !meta?.autoDownload && isDownloadIntent(text)) {
      handleDownloadLast();
      return;
    }
    sendMessage(text, files, meta ?? {});
  }, [sendMessage, handleDownloadLast]);

  const handleSelectionAction = useCallback((action: string, selectedText: string) => {
    const prompts: Record<string, string> = {
      improve: `Improve this passage: "${selectedText}"`,
      shorten: `Shorten this passage while keeping all key points: "${selectedText}"`,
      expand: `Expand this passage with more detail and examples: "${selectedText}"`,
      rewrite: `Rewrite this passage in a cleaner, more academic style: "${selectedText}"`,
    };
    const prompt = prompts[action];
    if (prompt) sendMessage(prompt, []);
  }, [sendMessage]);

  const handleMessageContentChange = useCallback((id: string, content: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content } : m));
  }, []);

  const handleCorrectionApplied = useCallback((content: string, originalText: string, count: number) => {
    const assistantMsgId = `a_${Date.now()}`;
    const diff = originalText ? computeParaDiff(originalText, content) : undefined;
    setMessages(prev => [...prev, {
      id: assistantMsgId,
      role: "assistant",
      content,
      mode: "correct",
      correctionApplied: true,
      correctionDiff: diff,
      correctionOriginalText: originalText,
    }]);
  }, []);

  const handleDismissDiff = useCallback((id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, correctionDiff: undefined } : m));
  }, []);

  const handleDeleteMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  if (!user) return null;

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
      {/* App sidebar — desktop only */}
      <DashboardSidebar
        userName={userName} userInitials={userInitials} tier={userTier}
        onSignOut={async () => { await supabase.auth.signOut(); navigate("/auth"); }}
        userEmail={user.email} avatarUrl={avatarUrl}
      />

      {/* Right container — relative so conv sidebar can overlay without shifting layout */}
      <div className="flex-1 relative overflow-hidden flex flex-col min-w-0">

        {/* Conversation history sidebar — desktop overlay (slides in, no layout shift) */}
        <aside className={`hidden lg:flex flex-col absolute top-0 left-0 bottom-0 z-40 w-[220px] bg-sidebar border-r border-border overflow-hidden transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <ConvSidebar currentId={convId} onSelect={selectConv} onNew={newConv} />
        </aside>
        {/* Click-away backdrop when sidebar is open on desktop */}
        {sidebarOpen && (
          <div className="hidden lg:block absolute inset-0 z-30" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Mobile history drawer */}
        {mobileHistoryOpen && (
          <div className="lg:hidden fixed inset-0 z-[300] flex">
            <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setMobileHistoryOpen(false)} />
            <div className="relative w-[280px] max-w-[85vw] h-full bg-sidebar shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-border flex-shrink-0">
                <span className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground">History</span>
                <button onClick={() => setMobileHistoryOpen(false)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary">
                  <X size={15} />
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <ConvSidebar currentId={convId} onSelect={selectConv} onNew={() => { newConv(); setMobileHistoryOpen(false); }} />
              </div>
            </div>
          </div>
        )}

        {/* ── DESKTOP main — hidden on mobile ── */}
        <div className="hidden lg:flex flex-col flex-1 relative min-w-0 min-h-0">
          {messages.length === 0 && <WelcomeAurora />}

          {/* Floating sidebar toggle (top-left) */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="absolute top-2 left-3 z-[60] p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title={sidebarOpen ? "Hide history" : "Show history"}
          >
            {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>

          {/* Floating theme toggle (top-right) */}
          <div className="absolute top-2 right-3 z-[60] flex items-center gap-1">
            <PsThemeToggle size={15} />
          </div>

          {/* Thread */}
          <div className={`flex-1 relative min-h-0 ${messages.length > 0 ? "overflow-y-auto" : "overflow-hidden"}`}>
            <WritingGlow visible={streaming || messages.length > 0} />
            {messages.length === 0 ? (
              <WelcomeScreen userName={userName} userInitials={userInitials} avatarUrl={avatarUrl} />
            ) : (
              <div className="relative max-w-3xl mx-auto px-4 py-6 pb-10 space-y-8">
                {messages.map(msg => (
                  <CzarMessage
                    key={msg.id}
                    msg={msg}
                    currentAgents={agents}
                    userInitials={userInitials}
                    onContentChange={handleMessageContentChange}
                    onSelectionAction={handleSelectionAction}
                    onDismissDiff={handleDismissDiff}
                    onClarificationAnswer={(answer) => sendMessage(answer, [])}
                    onDeleteMessage={handleDeleteMessage}
                  />
                ))}
                <div ref={threadEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex-shrink-0 bg-background z-[100]">
            <div className="max-w-3xl mx-auto px-4 py-3">
              <Suspense fallback={<InputFallback />}>
                <CommandInput
                  onSend={handleCommandSend}
                  onStop={stopStream}
                  streaming={streaming}
                  onCorrect={() => setCorrectionModalOpen(true)}
                  onNewConversation={newConv}
                  onDownload={handleDownloadLast}
                />
              </Suspense>
              <p className="text-center text-[10px] text-muted-foreground/40 mt-1.5 px-2">
                CZAR can make mistakes — verify important information.
              </p>
            </div>
          </div>
        </div>

        {/* ── MOBILE main — hidden on desktop ── */}
        <div className="flex lg:hidden flex-col flex-1 min-w-0 min-h-0">
          <CzarMobileLayout
            messages={messages}
            streaming={streaming}
            convId={convId}
            mode={mode}
            onModeChange={setMode}
            userName={userName}
            userInitials={userInitials}
            avatarUrl={avatarUrl}
            onSend={handleCommandSend}
            onStop={stopStream}
            onNewConv={newConv}
            onSelectConv={selectConv}
          />
        </div>

      </div>{/* end right container */}


      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} reason={upgradeReason} />

      <CorrectionModal
        open={correctionModalOpen}
        onClose={() => setCorrectionModalOpen(false)}
        onApplied={handleCorrectionApplied}
      />

      <MobileDashboardSheet
        open={mobileDashboardOpen}
        onClose={() => setMobileDashboardOpen(false)}
        userName={userName}
        userInitials={userInitials}
        tier={userTier}
        userEmail={user.email}
        avatarUrl={avatarUrl}
        onSignOut={async () => { await supabase.auth.signOut(); navigate("/auth"); }}
      />
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

// Hover-reveal action row under chat-style assistant messages
function AssistantActions({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [content]);

  const handleSaveDocx = useCallback(async () => {
    try {
      const [{ buildDocx, docxFilename }, { Packer }] = await Promise.all([
        import("@/lib/czarDocUtils.tsx"),
        import("docx"),
      ]);
      const blob = await Packer.toBlob(buildDocx(content));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = docxFilename(content);
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* silently ignore download errors */ }
  }, [content]);

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="flex items-center gap-0.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
        {copied ? "Copied" : "Copy"}
      </button>
      {wordCount >= 80 && (
        <button
          type="button"
          onClick={handleSaveDocx}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <FileDown size={11} />
          Save DOCX
        </button>
      )}
    </div>
  );
}

function ClarificationCard({ questions, title, onAnswer }: {
  questions: string[];
  title?: string;
  onAnswer: (answer: string) => void;
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const allAnswered = questions.every((_, i) => (answers[i] || "").trim().length > 0);

  const handleSubmit = () => {
    const combined = questions.map((q, i) => `${q}\n${answers[i] || ""}`).join("\n\n");
    onAnswer(combined);
  };

  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles size={13} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <p className="text-[12px] font-bold text-amber-700 dark:text-amber-400">
          A few details will help me write this better
          {title ? ` — "${title}"` : ""}
        </p>
      </div>
      {questions.map((q, i) => (
        <div key={i} className="space-y-1">
          <label className="block text-[11px] font-semibold text-foreground/80">{q}</label>
          <input
            type="text"
            value={answers[i] || ""}
            onChange={e => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
            onKeyDown={e => { if (e.key === "Enter" && allAnswered) handleSubmit(); }}
            className="w-full px-2.5 py-1.5 rounded-lg border border-border text-[12px] bg-background text-foreground outline-none focus:border-amber-400 dark:focus:border-amber-600 placeholder:text-muted-foreground/40"
            placeholder="Your answer…"
          />
        </div>
      ))}
      <button
        onClick={handleSubmit}
        disabled={!allAnswered}
        className="px-4 py-1.5 rounded-lg text-[12px] font-bold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 transition-colors"
      >
        Continue →
      </button>
    </div>
  );
}

const AGENT_ICON_MAP: Record<string, React.ReactNode> = {
  planner:    <Compass size={10} />,
  architect:  <Compass size={10} />,
  researcher: <FlaskConical size={10} />,
  writer:     <Pen size={10} />,
  editor:     <Library size={10} />,
  critic:     <Gavel size={10} />,
  revision:   <RefreshCw size={10} />,
  illustrator:<ImageIcon size={10} />,
};

function AgentStepsBlock({ agents, isLive }: { agents: LiveAgent[]; isLive: boolean }) {
  const named = agents.filter(a => a.name);
  const [open, setOpen] = useState(isLive);

  useEffect(() => {
    if (!isLive) {
      const t = setTimeout(() => setOpen(false), 2000);
      return () => clearTimeout(t);
    }
  }, [isLive]);

  if (named.length === 0) return null;

  const working = named.filter(a => a.status === "working");
  const allDone = named.every(a => a.status === "done" || a.status === "error");
  const hasRevision = named.some(a => a.id === "revision");

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors group"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="font-medium">
          {allDone
            ? `${named.length} agent${named.length !== 1 ? "s" : ""}${hasRevision ? " · revised" : ""}`
            : working.length > 0
            ? `${working[0].name}${working[0].action ? ` · ${working[0].action}` : ""}`
            : "Preparing…"
          }
        </span>
        {!allDone && isLive && (
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse ml-0.5" />
        )}
      </button>
      {open && (
        <div className="mt-2 ml-3 border-l-2 border-border pl-3 space-y-1.5">
          {named.map(a => (
            <div key={a.id} className="flex items-start gap-2 min-w-0">
              <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                a.status === "done" ? "bg-emerald-500"
                : a.status === "working" ? "bg-blue-500 animate-pulse"
                : a.status === "error" ? "bg-destructive"
                : a.status === "clarification" ? "bg-amber-500 animate-pulse"
                : "bg-muted-foreground/30"
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground/60">{AGENT_ICON_MAP[a.id.toLowerCase()] ?? <Bot size={10} />}</span>
                  <span className="text-[12px] font-medium text-foreground/80">{a.name}</span>
                  {a.action && (
                    <span className="text-[11px] text-muted-foreground/60 truncate">{a.action}</span>
                  )}
                </div>
                {a.detail && a.status === "done" && (
                  <p className="text-[10.5px] text-muted-foreground/50 mt-0.5 leading-snug">{a.detail}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InlineDocMessage({ msg, onContentChange, onSelectionAction, onDismissDiff }: {
  msg: UIMessage;
  onContentChange?: (id: string, content: string) => void;
  onSelectionAction?: (action: string, text: string) => void;
  onDismissDiff?: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editContent, setEditContent] = useState(msg.content);
  const [selectionToolbar, setSelectionToolbar] = useState<{ x: number; y: number; text: string } | null>(null);
  const [docCopied, setDocCopied] = useState(false);

  useEffect(() => {
    if (!isEditMode) setEditContent(msg.content);
  }, [msg.content, isEditMode]);

  useEffect(() => () => { window.speechSynthesis.cancel(); }, []);
  useEffect(() => {
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msg.content]);

  const handleSpeak = useCallback(() => {
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
    const text = stripMarkdown(msg.content);
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const ukVoice = voices.find(v => v.lang === "en-GB") ?? voices.find(v => v.lang.startsWith("en"));
    if (ukVoice) utterance.voice = ukVoice;
    utterance.lang = "en-GB";
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }, [isSpeaking, msg.content]);

  const handleDownload = useCallback(async () => {
    const doc = buildDocx(msg.content);
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = docxFilename(msg.content); a.click();
    URL.revokeObjectURL(url);
  }, [msg.content]);

  const handleDocCopy = useCallback(() => {
    navigator.clipboard.writeText(msg.content).catch(() => {});
    setDocCopied(true);
    setTimeout(() => setDocCopied(false), 1800);
  }, [msg.content]);

  const handleToggleEdit = useCallback(() => {
    if (isEditMode) onContentChange?.(msg.id, editContent);
    setIsEditMode(e => !e);
  }, [isEditMode, editContent, msg.id, onContentChange]);

  const handleMouseUp = useCallback(() => {
    if (isEditMode) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) { setSelectionToolbar(null); return; }
    const selectedText = sel.toString().trim();
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    setSelectionToolbar({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 8,
      text: selectedText,
    });
  }, [isEditMode]);

  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) setSelectionToolbar(null);
    };
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, []);

  const filename = docxFilename(msg.content);

  return (
    <div ref={containerRef} className="relative" onMouseUp={handleMouseUp}>
      {/* ── Diff view (correction mode only) ── */}
      {msg.correctionDiff && !isEditMode && (
        <div className="mb-5 rounded-xl border border-border overflow-hidden">
          <style>{`
            .czar-diff-del { background: rgba(239,68,68,0.18); color: #b91c1c; text-decoration: line-through; border-radius: 2px; padding: 0 1px; }
            .dark .czar-diff-del { color: #f87171; }
            .czar-diff-ins { background: rgba(34,197,94,0.18); color: #15803d; border-radius: 2px; padding: 0 1px; }
            .dark .czar-diff-ins { color: #4ade80; }
          `}</style>
          {/* Diff toolbar */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-500/5 border-b border-border flex-wrap">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">Corrections applied</span>
            <span className="flex gap-1.5 text-[10px]">
              <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-semibold">~ modified</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-semibold">+ added</span>
              <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 font-semibold">– deleted</span>
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={handleDownload} className="text-[11px] px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">⬇ Download</button>
              <button onClick={() => onDismissDiff?.(msg.id)} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">Dismiss</button>
              <button onClick={() => onDismissDiff?.(msg.id)} className="text-[11px] px-3 py-1 rounded-lg bg-foreground text-background font-semibold hover:opacity-80 transition-opacity">Accept all</button>
            </div>
          </div>
          {/* Diff paragraphs */}
          <div className="px-5 py-4 space-y-1 max-h-[60vh] overflow-y-auto">
            {msg.correctionDiff.map((para, i) => {
              const isHeading = /^#{1,4}\s/.test(para.text.trimStart());
              return (
                <div
                  key={i}
                  className={[
                    "px-3 py-2 rounded-md border-l-4 text-[13.5px] leading-relaxed transition-colors",
                    para.type === "unchanged" ? "border-transparent" :
                    para.type === "modified"  ? "bg-amber-500/8 border-amber-500" :
                    para.type === "added"     ? "bg-emerald-500/10 border-emerald-500" :
                                                "bg-red-500/10 border-red-500 opacity-70",
                  ].join(" ")}
                >
                  {para.type === "modified" && para.diffHtml && !isHeading ? (
                    <p dangerouslySetInnerHTML={{ __html: para.diffHtml.replace(/diff-del/g, "czar-diff-del").replace(/diff-ins/g, "czar-diff-ins") }} className="text-foreground" />
                  ) : para.type === "deleted" ? (
                    <p className="line-through text-muted-foreground">{para.text}</p>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents as any}>{para.text}</ReactMarkdown>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isEditMode ? (
        <textarea
          value={editContent}
          onChange={e => setEditContent(e.target.value)}
          className="w-full min-h-[60vh] bg-transparent text-sm text-foreground font-mono leading-relaxed resize-none outline-none border border-border rounded-md p-4 focus:border-primary/50 transition-colors"
          spellCheck
        />
      ) : (
        <div>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents as React.ComponentProps<typeof ReactMarkdown>["components"]}
          >
            {msg.content || (msg.streaming ? "​" : "")}
          </ReactMarkdown>
          {msg.streaming && (
            <span
              className="inline-block w-0.5 h-4 bg-foreground/70 align-text-bottom ml-0.5"
              style={{ animation: "czarCursor 1s step-end infinite" }}
              aria-hidden="true"
            />
          )}
        </div>
      )}

      {/* Download card — shown after streaming */}
      {!msg.streaming && msg.content && (
        <div className="mt-6 flex flex-wrap items-center gap-3 p-3 border border-border rounded-xl bg-secondary/20">
          <div className="w-9 h-9 rounded-lg bg-background border border-border flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium text-foreground truncate">{filename}</div>
            <div className="text-[10.5px] text-muted-foreground/60">Document · DOCX</div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
            <button
              onClick={handleDocCopy}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
            >
              {docCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              {docCopied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={handleSpeak}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
            >
              {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              {isSpeaking ? "Stop" : "Listen"}
            </button>
            <button
              onClick={handleToggleEdit}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
            >
              {isEditMode ? <Eye className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
              {isEditMode ? "Done" : "Edit"}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
            >
              <Download className="w-3 h-3" />
              Download
            </button>
          </div>
        </div>
      )}

      {/* Floating selection toolbar */}
      {selectionToolbar && onSelectionAction && (
        <div
          className="absolute z-50 flex items-center gap-0.5 bg-foreground rounded-lg shadow-lg px-1 py-1"
          style={{ left: selectionToolbar.x, top: selectionToolbar.y, transform: "translate(-50%, -100%)" }}
          onMouseDown={e => e.preventDefault()}
        >
          {["Improve", "Shorten", "Expand", "Rewrite"].map(action => (
            <button
              key={action}
              onClick={() => {
                onSelectionAction(action.toLowerCase(), selectionToolbar.text);
                setSelectionToolbar(null);
                window.getSelection()?.removeAllRanges();
              }}
              className="px-2.5 py-1 text-xs font-medium text-background hover:bg-background/15 rounded-md transition-colors whitespace-nowrap"
            >
              {action}
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes czarCursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function UserMessage({ msg, userInitials, onDelete }: {
  msg: UIMessage;
  userInitials: string;
  onDelete?: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content).catch(() => {});
    setMenuOpen(false);
  };

  return (
    <div className="flex justify-end gap-2 group">
      {/* Options button — shown on hover */}
      <div className="relative flex items-start mt-1 opacity-0 group-hover:opacity-100 transition-opacity" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="Message options"
        >
          <MoreHorizontal size={13} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-6 z-50 bg-background border border-border rounded-xl shadow-lg overflow-hidden min-w-[120px] animate-in fade-in duration-100">
            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-foreground hover:bg-secondary transition-colors"
            >
              <Copy size={12} className="text-muted-foreground" />
              Copy
            </button>
            {onDelete && (
              <button
                onClick={() => { onDelete(msg.id); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 size={12} />
                Delete
              </button>
            )}
          </div>
        )}
      </div>
      <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tr-sm bg-primary text-primary-foreground text-[13.5px] leading-relaxed whitespace-pre-wrap">
        {msg.content}
      </div>
      <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-semibold text-muted-foreground">
        {userInitials}
      </div>
    </div>
  );
}

function CzarMessage({
  msg, currentAgents, userInitials,
  onContentChange, onSelectionAction, onDismissDiff, onClarificationAnswer, onDeleteMessage,
}: {
  msg: UIMessage;
  currentAgents: LiveAgent[];
  userInitials: string;
  onContentChange: (id: string, content: string) => void;
  onSelectionAction: (action: string, text: string) => void;
  onDismissDiff: (id: string) => void;
  onClarificationAnswer: (answer: string) => void;
  onDeleteMessage?: (id: string) => void;
}) {
  const isDocMsg = DOC_MODES.includes(msg.mode ?? "");

  if (msg.role === "user") {
    // Correction mode is a document flow — hide all user trigger messages from the thread
    if (msg.mode === "correct") return null;
    return (
      <UserMessage
        msg={msg}
        userInitials={userInitials}
        onDelete={onDeleteMessage}
      />
    );
  }

  // For assistant messages: show live agents if streaming, frozen agents if done
  const agentsToShow = msg.streaming ? currentAgents : (msg.agents ?? []);

  // Only render the full document UI (InlineDocMessage + download card) for substantial
  // content. Short conversational responses (clarification prompts, errors, brief
  // acknowledgements) fall back to regular chat rendering even in doc modes.
  const docWordCount = msg.content.trim().split(/\s+/).filter(Boolean).length;
  const showAsDoc = isDocMsg && msg.mode !== "correct" && (msg.streaming || docWordCount >= 50);

  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot size={14} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        {/* Agent steps */}
        {agentsToShow.filter(a => a.name).length > 0 && (
          <AgentStepsBlock agents={agentsToShow} isLive={!!msg.streaming} />
        )}

        {/* Clarification card — shown when planner needs more info */}
        {msg.clarificationQuestions && msg.clarificationQuestions.length > 0 && (
          <ClarificationCard
            questions={msg.clarificationQuestions}
            title={msg.clarificationTitle}
            onAnswer={onClarificationAnswer}
          />
        )}

        {/* Mode badge */}
        {msg.mode && msg.mode !== "chat" && (
          <div className="flex items-center gap-1 mb-3">
            <span className={`inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${MODE_COLOURS[msg.mode as CzarMode] ?? "bg-secondary text-muted-foreground"}`}>
              {modeIcon(msg.mode as CzarMode)}
              {modeLabel(msg.mode as CzarMode)}
            </span>
          </div>
        )}

        {/* Error */}
        {msg.error && (
          <div className="flex items-center gap-2 text-destructive text-sm p-3 rounded-xl border border-destructive/20 bg-destructive/5">
            <AlertCircle size={14} className="flex-shrink-0" />
            <span>{msg.content || "Something went wrong. Please try again."}</span>
          </div>
        )}

        {/* Corrected document — placed in thread after modal completes */}
        {!msg.error && msg.mode === "correct" && msg.correctionApplied && (
          <InlineDocMessage
            msg={msg}
            onContentChange={onContentChange}
            onSelectionAction={onSelectionAction}
            onDismissDiff={onDismissDiff}
          />
        )}

        {/* Standard doc content — only for substantial multi-paragraph documents */}
        {!msg.error && showAsDoc && (
          <InlineDocMessage
            msg={msg}
            onContentChange={onContentChange}
            onSelectionAction={onSelectionAction}
          />
        )}

        {/* Chat-style rendering for short/conversational responses and non-doc modes */}
        {!msg.error && !showAsDoc && msg.mode !== "correct" && (
          <div className="group">
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-pre:bg-secondary prose-pre:border prose-pre:border-border prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded text-[13.5px] leading-relaxed text-foreground">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={chatMarkdownComponents as React.ComponentProps<typeof ReactMarkdown>["components"]}
              >
                {msg.content || (msg.streaming ? "​" : "—")}
              </ReactMarkdown>
              {msg.streaming && (
                <span className="inline-block w-0.5 h-4 bg-current ml-0.5 align-middle animate-pulse" />
              )}
            </div>
            {!msg.streaming && !msg.error && msg.content && (
              <AssistantActions content={msg.content} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const GREETING_POOL = [
  "The blank page ends here.",
  "What are we building today?",
  "Ready when you are.",
  "Your ideas deserve better words.",
  "Let's put it into words.",
  "Something great starts here.",
  "What's been on your mind?",
  "Time to write something great.",
  "Let's make it count.",
  "Words are waiting.",
];

function WelcomeScreen({ userName, userInitials, avatarUrl }: {
  userName?: string;
  userInitials?: string;
  avatarUrl?: string;
}) {
  const [visible, setVisible] = useState(false);
  const greeting = useMemo(() => GREETING_POOL[Math.floor(Math.random() * GREETING_POOL.length)], []);
  const firstName = userName?.split(" ")[0] || "";

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  const fadeIn = (delay = 0): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "none" : "translateY(16px)",
    transition: `opacity 0.65s ${delay}ms, transform 0.65s ${delay}ms`,
  });

  return (
    <div className="absolute inset-0 flex flex-col md:flex-row items-start px-5 py-6 gap-4 md:gap-10 md:px-14 md:items-center">

      {/* ── Greeting — always left-aligned, compact on mobile ── */}
      <div className="flex flex-col items-start text-left flex-shrink-0 md:flex-1 md:max-w-sm">
        <div className="flex items-center gap-2.5 mb-4" style={fadeIn(0)}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-border" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-bold select-none">
              {userInitials ?? "U"}
            </div>
          )}
          {firstName && (
            <span className="text-sm text-muted-foreground font-medium">Hi {firstName}</span>
          )}
        </div>
        <h1
          className="text-3xl sm:text-4xl md:text-5xl font-bold font-heading text-foreground leading-tight"
          style={fadeIn(120)}
        >
          {greeting}
        </h1>
      </div>

      {/* ── SVG Tour — fills remaining space on both mobile and desktop ── */}
      <div
        className="w-full flex-1 min-h-0 md:max-w-[480px] flex items-center justify-center"
        style={fadeIn(260)}
      >
        <CzarObjectScene />
      </div>

    </div>
  );
}

function InputFallback() {
  return <div className="h-20 rounded-xl border border-border bg-background/50 animate-pulse" />;
}
