import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  PanelLeftClose, PanelLeftOpen, Loader2, Square,
  Bot, AlertCircle, Search, PenLine, Cpu,
  ChevronDown, ChevronRight, LayoutPanelLeft, FileSearch, Clock, X,
  BookOpen, Film, Scale, Download, Volume2, VolumeX, Edit3, Eye, FileText, Sparkles,
  Compass, FlaskConical, Pen, Library, Gavel, RefreshCw, ImageIcon,
  Copy, Trash2, MoreHorizontal,
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
import { buildDocx, stripMarkdown, markdownComponents, chatMarkdownComponents } from "@/lib/czarDocUtils.tsx";
import { computeParaDiff, type DiffParagraph } from "@/lib/diffUtils";
import { ConvSidebar } from "@/components/czar/ConvSidebar";
import { UpgradeModal } from "@/components/czar/UpgradeModal";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { CorrectionModal } from "@/components/czar/CorrectionModal";

import { lazy, Suspense } from "react";
import { TeamScene, GreetingLine, AgentActivityDock, FloatingElements, WritingGlow, WelcomeAurora } from "@/components/czar/CzarVisuals";
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

const DOC_FILENAMES: Partial<Record<CzarMode, string>> = {
  write: "czar-essay.docx",
  research: "czar-research.docx",
  correct: "czar-corrected.docx",
  literature_review: "czar-lit-review.docx",
  legal: "czar-legal.docx",
  screenplay: "czar-screenplay.docx",
  plan: "czar-plan.docx",
};

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

const MODE_DESCRIPTIONS: Record<CzarMode, string> = {
  chat: "Ask questions, get explanations",
  write: "Generate full documents",
  correct: "Fix and improve your draft",
  research: "Find and synthesise sources",
  plan: "Structure before you write",
  literature_review: "Systematic review, PRISMA, synthesis",
  screenplay: "Fountain format, scene headings, dialogue",
  legal: "IRAC structure, statute and case law",
};

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
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
          if (e.mode) setMode(e.mode as CzarMode);
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

      {/* Conversation history sidebar — desktop */}
      <aside className={`flex-shrink-0 border-r border-border overflow-hidden transition-all duration-200 ${sidebarOpen ? "w-[220px]" : "w-0"} hidden lg:block`}>
        {sidebarOpen && <ConvSidebar currentId={convId} onSelect={selectConv} onNew={newConv} />}
      </aside>

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

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {messages.length === 0 && <WelcomeAurora />}

        {/* Top bar */}
        <header className="flex items-center gap-2 px-3 h-11 border-b border-border flex-shrink-0 bg-background/95 backdrop-blur-sm">
          {/* Desktop: sidebar toggle */}
          <button onClick={() => setSidebarOpen(o => !o)}
            className="hidden lg:flex p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}>
            {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>

          {/* Mobile: history button */}
          <button onClick={() => setMobileHistoryOpen(true)}
            className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Conversation history">
            <Clock size={16} />
          </button>

          {/* Right: stop + status + theme */}
          <div className="ml-auto flex items-center gap-1">
            {streaming && (
              <button onClick={stopStream}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                <Square size={11} className="fill-current" />
                <span>Stop</span>
              </button>
            )}
            {streaming && (
              <span className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground px-1">
                <Loader2 size={11} className="animate-spin" />
                Writing…
              </span>
            )}
            <PsThemeToggle size={15} />
          </div>
        </header>

        {/* Thread */}
        <div className="flex-1 overflow-y-auto relative">
          <WritingGlow visible={streaming || messages.length > 0} />
          <div className="relative max-w-3xl mx-auto px-4 py-6 pb-10 space-y-8">
            {messages.length === 0 && (
              <WelcomeScreen
                mode={mode}
                onExample={(text) => sendMessage(text, [])}
                onOpenCorrectionModal={() => setCorrectionModalOpen(true)}
              />
            )}

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
        </div>

        {/* Input */}
        <div className="flex-shrink-0 bg-background sticky bottom-0 z-[100]">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <Suspense fallback={<InputFallback />}>
              <CommandInput
                onSend={sendMessage}
                onStop={stopStream}
                streaming={streaming}
                tier={userTier}
                onCorrect={() => setCorrectionModalOpen(true)}
              />
            </Suspense>
            <p className="text-center text-[10px] text-muted-foreground/40 mt-1.5 px-2">
              CZAR can make mistakes — verify important information.
            </p>
          </div>
        </div>
      </div>

      <AgentActivityDock agents={agents} visible={streaming} />

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} reason={upgradeReason} />

      <CorrectionModal
        open={correctionModalOpen}
        onClose={() => setCorrectionModalOpen(false)}
        onApplied={handleCorrectionApplied}
      />
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

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
    const filename = DOC_FILENAMES[msg.mode as CzarMode] ?? "czar-document.docx";
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }, [msg.content, msg.mode]);

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

  const filename = DOC_FILENAMES[msg.mode as CzarMode] ?? "czar-document.docx";

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

        {/* Standard doc content (non-correction doc modes) */}
        {!msg.error && isDocMsg && msg.mode !== "correct" && (
          <InlineDocMessage
            msg={msg}
            onContentChange={onContentChange}
            onSelectionAction={onSelectionAction}
          />
        )}

        {!msg.error && !isDocMsg && (
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
        )}
      </div>
    </div>
  );
}

const WELCOME_MODE_CONFIG: Record<string, { greeting: string; left?: string; center: string; right?: string }> = {
  chat:              { greeting: "What are we working on?",        left: "/chars/char-social.png",      center: "/chars/char-planner.png",    right: "/chars/char-writer.png" },
  write:             { greeting: "The blank page ends here.",      left: "/chars/char-planner.png",     center: "/chars/char-writer.png",     right: "/chars/char-critic.png" },
  research:          { greeting: "Let's find the evidence.",       left: "/chars/char-writer.png",      center: "/chars/char-researcher.png", right: "/chars/char-team.png" },
  plan:              { greeting: "Let's structure this.",          left: "/chars/char-social.png",      center: "/chars/char-planner.png",    right: "/chars/char-team.png" },
  correct:           { greeting: "Ready to review.",              center: "/chars/char-critic.png" },
  literature_review: { greeting: "Systematic review mode.",       left: "/chars/char-planner.png",     center: "/chars/char-researcher.png", right: "/chars/char-critic.png" },
  screenplay:        { greeting: "Action.",                       left: "/chars/char-social.png",      center: "/chars/char-writer.png",     right: "/chars/char-team.png" },
  legal:             { greeting: "IRAC. Statute. Case law.",      left: "/chars/char-planner.png",     center: "/chars/char-critic.png",     right: "/chars/char-researcher.png" },
};

function WelcomeScreen({ mode, onExample, onOpenCorrectionModal }: { mode: CzarMode; onExample: (text: string) => void; onOpenCorrectionModal?: () => void }) {
  const [visible, setVisible] = useState(false);
  const [typedGreeting, setTypedGreeting] = useState("");
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const config = WELCOME_MODE_CONFIG[mode] ?? WELCOME_MODE_CONFIG.chat;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, [mode]);

  useEffect(() => {
    if (!visible) return;
    setTypedGreeting("");
    let i = 0;
    const tick = () => {
      i++;
      setTypedGreeting(config.greeting.slice(0, i));
      if (i < config.greeting.length) typingRef.current = setTimeout(tick, 30);
    };
    const start = setTimeout(tick, 500);
    return () => { clearTimeout(start); if (typingRef.current) clearTimeout(typingRef.current); };
  }, [visible, config.greeting]);

  const examples: Partial<Record<CzarMode, { text: string; label: string }[]>> = {
    chat: [
      { label: "Explain a concept", text: "Explain the difference between qualitative and quantitative research methods." },
      { label: "Quick question", text: "What's the Harvard referencing format for a journal article?" },
      { label: "Brainstorm", text: "What are some angles I could take for an essay on climate change policy?" },
    ],
    write: [
      { label: "Academic essay", text: "Write a 2,000-word Level 7 essay on transformational leadership in NHS trusts, Harvard references." },
      { label: "Literature review", text: "Write a systematic literature review on the effectiveness of mindfulness-based stress reduction in the workplace." },
      { label: "Legal memo", text: "Write a legal memo applying IRAC to whether an employer can monitor employee emails under UK law." },
    ],
    research: [
      { label: "Synthesis", text: "Research and synthesise current academic literature on AI bias in hiring algorithms." },
      { label: "Topic overview", text: "Find and summarise key academic sources on the digital divide in higher education." },
    ],
    correct: [
      { label: "Improve draft", text: "Here's my draft introduction — improve the academic tone and citation integration:" },
      { label: "Fix structure", text: "Review this paragraph for argument coherence and suggest improvements:" },
    ],
  };

  const items = examples[mode] ?? examples.chat!;

  const charStyle = (delay: number, scale = 1): React.CSSProperties => ({
    opacity: visible ? (scale === 1 ? 1 : 0.72) : 0,
    transform: visible ? "translateY(0) scale(1)" : "translateY(24px) scale(0.88)",
    transition: `opacity 0.7s ${delay}ms, transform 0.7s ${delay}ms`,
  });

  if (mode === "correct") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 py-6 overflow-hidden">
        {/* Character with speech bubble */}
        <div className="relative flex flex-col items-center mb-4" style={charStyle(0)}>
          {typedGreeting.length > 0 && (
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-foreground text-background text-[11px] font-semibold px-3 py-1.5 rounded-xl shadow-lg z-10">
              {typedGreeting}
              {typedGreeting.length < config.greeting.length && (
                <span className="inline-block w-0.5 h-3 bg-background/70 ml-0.5 align-middle animate-pulse" />
              )}
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-foreground rotate-45 rounded-sm" />
            </div>
          )}
          <img
            src={config.center}
            alt="Agent"
            className="h-48 sm:h-56 object-contain"
            style={{ animation: visible ? "welcomeBob 3s ease-in-out infinite alternate" : "none" }}
          />
        </div>

        <div style={{ opacity: visible ? 1 : 0, transition: "opacity 0.7s 200ms" }}>
          <h2 className="text-xl font-bold text-foreground mb-1">Correct &amp; Improve</h2>
          <p className="text-sm text-muted-foreground mb-3 max-w-sm leading-relaxed">
            Upload a document or paste your text. CZAR identifies every correction — grammar, style, argument, register — as tracked changes. Accept or reject each one individually, then download the clean document.
          </p>
          <div className="flex flex-col items-center gap-1.5 text-[11px] text-muted-foreground/50 mb-7">
            <span>Grammar · Style · Structure · Argument · Register</span>
            <span>Color-coded · Accept/Reject per change · Clean download</span>
          </div>
          <button
            onClick={onOpenCorrectionModal}
            className="px-7 py-3 rounded-xl bg-foreground text-background font-bold text-sm hover:opacity-80 transition-opacity shadow-md"
          >
            Open Document
          </button>
        </div>
        <style>{`@keyframes welcomeBob { from { transform: translateY(0); } to { transform: translateY(-7px); } }`}</style>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 py-4 overflow-hidden">
      {/* Three characters */}
      <div className="flex items-end justify-center gap-4 sm:gap-8 mb-8 mt-6">
        {/* Left character */}
        {config.left && (
          <img
            src={config.left}
            alt=""
            className="h-32 sm:h-40 object-contain flex-shrink-0"
            style={{
              ...charStyle(200, 0.72),
              animation: visible ? "welcomeBob 3.5s 0.3s ease-in-out infinite alternate" : "none",
            }}
          />
        )}

        {/* Center character — largest, speech bubble */}
        <div className="relative flex flex-col items-center flex-shrink-0">
          {typedGreeting.length > 0 && (
            <div
              className="absolute -top-14 left-1/2 -translate-x-1/2 whitespace-nowrap bg-foreground text-background text-[11px] font-semibold px-3 py-1.5 rounded-xl shadow-lg z-10"
              style={{ opacity: typedGreeting.length > 0 ? 1 : 0, transition: "opacity 0.3s" }}
            >
              {typedGreeting}
              {typedGreeting.length < config.greeting.length && (
                <span className="inline-block w-0.5 h-3 bg-background/70 ml-0.5 align-middle animate-pulse" />
              )}
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-foreground rotate-45 rounded-sm" />
            </div>
          )}
          <img
            src={config.center}
            alt="Agent"
            className="h-44 sm:h-56 object-contain"
            style={{
              ...charStyle(0),
              animation: visible ? "welcomeBob 3s ease-in-out infinite alternate" : "none",
            }}
          />
        </div>

        {/* Right character */}
        {config.right && (
          <img
            src={config.right}
            alt=""
            className="h-32 sm:h-40 object-contain flex-shrink-0"
            style={{
              ...charStyle(400, 0.72),
              animation: visible ? "welcomeBob 4s 0.6s ease-in-out infinite alternate" : "none",
            }}
          />
        )}
      </div>

      {/* Title & description */}
      <div
        className="mb-6"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)", transition: "opacity 0.7s 500ms, transform 0.7s 500ms" }}
      >
        <h2 className="text-xl font-bold text-foreground mb-1">CZAR</h2>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">{MODE_DESCRIPTIONS[mode]}</p>
      </div>

      {/* Example prompts */}
      <div
        className="w-full max-w-lg space-y-2"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)", transition: "opacity 0.7s 700ms, transform 0.7s 700ms" }}
      >
        {items.map((ex) => (
          <button
            key={ex.text}
            onClick={() => onExample(ex.text)}
            className="w-full text-left px-4 py-3 rounded-xl border border-border bg-background/60 hover:bg-secondary hover:border-primary/20 transition-all text-sm text-foreground group"
          >
            <span className="font-semibold text-foreground/70 text-[11.5px] block mb-0.5 group-hover:text-foreground/90 transition-colors">{ex.label}</span>
            <span className="text-muted-foreground text-[11.5px] leading-snug line-clamp-2 group-hover:text-foreground/60 transition-colors">{ex.text}</span>
          </button>
        ))}
      </div>

      <style>{`@keyframes welcomeBob { from { transform: translateY(0); } to { transform: translateY(-7px); } }`}</style>
    </div>
  );
}

function InputFallback() {
  return <div className="h-20 rounded-xl border border-border bg-background/50 animate-pulse" />;
}
