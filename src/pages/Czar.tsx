import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  PanelLeftClose, PanelLeftOpen, Loader2, Square,
  Bot, AlertCircle, Search, PenLine, Cpu,
  ChevronDown, ChevronRight, LayoutPanelLeft, FileSearch, Clock, X,
  BookOpen, Film, Scale, Download, Volume2, VolumeX, Edit3, Eye, FileText,
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
  type CorrectionChangeEvent, type CorrectionSummaryEvent,
} from "@/lib/czarStream";
import { buildDocx, stripMarkdown, markdownComponents } from "@/lib/czarDocUtils.tsx";
import { type CorrectionChange, type CorrectionSummary } from "@/lib/czarCorrection";
import { ConvSidebar } from "@/components/czar/ConvSidebar";
import { UpgradeModal } from "@/components/czar/UpgradeModal";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { CorrectionModal } from "@/components/czar/CorrectionModal";
import { CorrectionDiffView } from "@/components/czar/CorrectionDiffView";

import { lazy, Suspense } from "react";
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
  correctionChanges?: CorrectionChange[];
  correctionSummary?: CorrectionSummary | null;
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

function modePlaceholder(mode: CzarMode): string {
  return {
    chat: "Ask CZAR anything…",
    write: "Describe what you need written — topic, length, audience…",
    correct: "Paste your draft here or upload a file to correct…",
    research: "What topic should CZAR research?",
    plan: "Describe your assignment and CZAR will plan it…",
    literature_review: "Describe the research question for your literature review…",
    screenplay: "Describe the story, genre, and any specific scenes…",
    legal: "Describe the legal issue — CZAR will apply IRAC…",
  }[mode] ?? "Ask CZAR anything…";
}

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
  const [showModeMenu, setShowModeMenu] = useState(false);
  const modeButtonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  const threadEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");

  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [correctionModalInitialText, setCorrectionModalInitialText] = useState("");

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

    // In correction mode without a document source: redirect to the modal
    if (mode === "correct" && files.length === 0 && !extraSettings.correction_paste) {
      setCorrectionModalOpen(true);
      return;
    }

    if (agentClearRef.current) {
      clearTimeout(agentClearRef.current);
      agentClearRef.current = null;
    }

    const userMsgId = `u_${Date.now()}`;
    const assistantMsgId = `a_${Date.now()}`;

    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: "user", content: text, mode },
      { id: assistantMsgId, role: "assistant", content: "", mode, streaming: true },
    ]);
    setStreaming(true);
    setAgents([]);

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let accText = "";

    try {
      const attachments = await uploadFiles(files);

      const handlers: CzarHandlers = {
        onMeta: (e: CzarMetaEvent) => { setConvId(e.conversation_id); },
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
                    { ...e, status: "pending" as const },
                  ],
                }
              : m
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

      await streamCzar({ conversation_id: convId, user_message: text, attachments, mode, settings: extraSettings }, handlers, ctrl.signal);
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

  const handleCorrectionAccept = useCallback((msgId: string, changeId: string) => {
    setMessages(prev => prev.map(m =>
      m.id === msgId
        ? { ...m, correctionChanges: m.correctionChanges?.map(c => c.id === changeId ? { ...c, status: "accepted" as const } : c) }
        : m
    ));
  }, []);

  const handleCorrectionReject = useCallback((msgId: string, changeId: string) => {
    setMessages(prev => prev.map(m =>
      m.id === msgId
        ? { ...m, correctionChanges: m.correctionChanges?.map(c => c.id === changeId ? { ...c, status: "rejected" as const } : c) }
        : m
    ));
  }, []);

  const handleCorrectionAcceptAll = useCallback((msgId: string) => {
    setMessages(prev => prev.map(m =>
      m.id === msgId
        ? { ...m, correctionChanges: m.correctionChanges?.map(c => ({ ...c, status: "accepted" as const })) }
        : m
    ));
  }, []);

  const handleCorrectionRejectAll = useCallback((msgId: string) => {
    setMessages(prev => prev.map(m =>
      m.id === msgId
        ? { ...m, correctionChanges: m.correctionChanges?.map(c => ({ ...c, status: "rejected" as const })) }
        : m
    ));
  }, []);

  const handleCorrectionDownload = useCallback(async (cleanText: string) => {
    const doc = buildDocx(cleanText);
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "czar-corrected-clean.docx"; a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleCorrectionFinalPass = useCallback((cleanText: string) => {
    setCorrectionModalInitialText(cleanText);
    setCorrectionModalOpen(true);
  }, []);

  const handleCorrectionModalSubmit = useCallback(({ text, notes, file }: { text?: string; notes: string; file?: File }) => {
    setCorrectionModalOpen(false);
    const files = file ? [file] : [];
    const settings: Record<string, any> = {};
    if (notes) settings.correction_notes = notes;
    const docText = text ?? correctionModalInitialText;
    if (docText) settings.correction_paste = docText;
    setCorrectionModalInitialText("");
    sendMessage(
      "Correct this document" + (notes ? `. Editor notes: ${notes.slice(0, 120)}` : ""),
      files,
      settings,
    );
  }, [sendMessage, correctionModalInitialText]);

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

          {/* Mode selector */}
          <div className="relative">
            <button
              ref={modeButtonRef}
              onClick={() => {
                if (streaming) return;
                if (!showModeMenu && modeButtonRef.current) {
                  const r = modeButtonRef.current.getBoundingClientRect();
                  setDropdownPos({ top: r.bottom + 6, left: r.left });
                }
                setShowModeMenu(o => !o);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-semibold transition-colors ${streaming ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${MODE_COLOURS[mode]}`}
            >
              {modeIcon(mode)}
              <span>{modeLabel(mode)}</span>
              <ChevronDown size={11} className={`transition-transform ${showModeMenu ? "rotate-180" : ""}`} />
            </button>
            {showModeMenu && (
              <>
                <div className="fixed inset-0 z-[190]" onClick={() => setShowModeMenu(false)} />
                <div
                  className="fixed z-[200] bg-background border border-border rounded-xl shadow-2xl overflow-hidden w-52 animate-in fade-in duration-150"
                  style={{ top: dropdownPos.top, left: dropdownPos.left }}
                >
                  {(["chat", "write", "correct", "research", "plan"] as CzarMode[]).map(m => (
                    <button key={m}
                      onClick={() => {
                        setMode(m);
                        setShowModeMenu(false);
                        if (m === "correct") setCorrectionModalOpen(true);
                      }}
                      className={`w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-secondary transition-colors ${mode === m ? "bg-secondary/60" : ""}`}
                    >
                      <span className={`mt-0.5 ${mode === m ? "text-foreground" : "text-muted-foreground"}`}>{modeIcon(m)}</span>
                      <div className="min-w-0">
                        <div className={`text-[12px] font-semibold ${mode === m ? "text-foreground" : "text-muted-foreground"}`}>{modeLabel(m)}</div>
                        <div className="text-[10.5px] text-muted-foreground/60 leading-snug">{MODE_DESCRIPTIONS[m]}</div>
                      </div>
                      {mode === m && <span className="ml-auto mt-1 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

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
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
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
                onCorrectionAccept={(changeId) => handleCorrectionAccept(msg.id, changeId)}
                onCorrectionReject={(changeId) => handleCorrectionReject(msg.id, changeId)}
                onCorrectionAcceptAll={() => handleCorrectionAcceptAll(msg.id)}
                onCorrectionRejectAll={() => handleCorrectionRejectAll(msg.id)}
                onCorrectionDownload={handleCorrectionDownload}
                onCorrectionFinalPass={handleCorrectionFinalPass}
              />
            ))}
            <div ref={threadEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="flex-shrink-0 border-t border-border bg-background/95 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto px-4 py-3">
            {mode === "correct" && !streaming && (
              <div className="mb-2">
                <button
                  onClick={() => setCorrectionModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-secondary/30 transition-colors text-sm font-medium"
                >
                  <FileSearch size={15} />
                  Correct a document — upload or paste text
                </button>
              </div>
            )}
            <Suspense fallback={<InputFallback />}>
              <CommandInput
                onSend={sendMessage}
                onStop={stopStream}
                streaming={streaming}
                placeholder={modePlaceholder(mode)}
              />
            </Suspense>
          </div>
        </div>
      </div>

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} reason={upgradeReason} />

      <CorrectionModal
        open={correctionModalOpen}
        onClose={() => { setCorrectionModalOpen(false); setCorrectionModalInitialText(""); }}
        onSubmit={handleCorrectionModalSubmit}
        isSubmitting={streaming}
        initialText={correctionModalInitialText}
      />
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function AgentStepsBlock({ agents, isLive }: { agents: LiveAgent[]; isLive: boolean }) {
  const named = agents.filter(a => a.name);
  const [open, setOpen] = useState(isLive);

  // Auto-collapse when streaming ends
  useEffect(() => {
    if (!isLive) {
      const t = setTimeout(() => setOpen(false), 800);
      return () => clearTimeout(t);
    }
  }, [isLive]);

  if (named.length === 0) return null;

  const working = named.filter(a => a.status === "working");
  const allDone = named.every(a => a.status === "done" || a.status === "error");

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors group"
      >
        {open
          ? <ChevronDown size={12} className="transition-transform" />
          : <ChevronRight size={12} className="transition-transform" />
        }
        <span className="font-medium">
          {allDone
            ? `${named.length} step${named.length !== 1 ? "s" : ""}`
            : working.length > 0
            ? `Working — ${working[0].name}${working[0].action ? ` · ${working[0].action}` : ""}`
            : "Preparing…"
          }
        </span>
        {!allDone && isLive && (
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse ml-0.5" />
        )}
      </button>
      {open && (
        <div className="mt-2 ml-3 border-l-2 border-border pl-3 space-y-2">
          {named.map(a => (
            <div key={a.id} className="flex items-center gap-2 min-w-0">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                a.status === "done" ? "bg-emerald-500"
                : a.status === "working" ? "bg-blue-500 animate-pulse"
                : a.status === "error" ? "bg-destructive"
                : "bg-muted-foreground/30"
              }`} />
              <span className="text-[12px] font-medium text-foreground/80 flex-shrink-0">{a.name}</span>
              {a.action && (
                <span className="text-[11px] text-muted-foreground/60 truncate">{a.action}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InlineDocMessage({ msg, onContentChange, onSelectionAction }: {
  msg: UIMessage;
  onContentChange?: (id: string, content: string) => void;
  onSelectionAction?: (action: string, text: string) => void;
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

function CzarMessage({
  msg, currentAgents, userInitials,
  onContentChange, onSelectionAction,
  onCorrectionAccept, onCorrectionReject, onCorrectionAcceptAll, onCorrectionRejectAll,
  onCorrectionDownload, onCorrectionFinalPass,
}: {
  msg: UIMessage;
  currentAgents: LiveAgent[];
  userInitials: string;
  onContentChange: (id: string, content: string) => void;
  onSelectionAction: (action: string, text: string) => void;
  onCorrectionAccept: (changeId: string) => void;
  onCorrectionReject: (changeId: string) => void;
  onCorrectionAcceptAll: () => void;
  onCorrectionRejectAll: () => void;
  onCorrectionDownload: (cleanText: string) => void;
  onCorrectionFinalPass: (cleanText: string) => void;
}) {
  const isDocMsg = DOC_MODES.includes(msg.mode ?? "");

  if (msg.role === "user") {
    return (
      <div className="flex justify-end gap-2.5">
        <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tr-sm bg-primary text-primary-foreground text-[13.5px] leading-relaxed whitespace-pre-wrap">
          {msg.content}
        </div>
        <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-semibold text-muted-foreground">
          {userInitials}
        </div>
      </div>
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

        {/* Correction diff view */}
        {!msg.error && msg.mode === "correct" && (msg.correctionSummary || msg.streaming) && (
          <CorrectionDiffView
            summary={msg.correctionSummary ?? null}
            changes={msg.correctionChanges ?? []}
            isAnalyzing={!!msg.streaming}
            onAccept={onCorrectionAccept}
            onReject={onCorrectionReject}
            onAcceptAll={onCorrectionAcceptAll}
            onRejectAll={onCorrectionRejectAll}
            onDownload={onCorrectionDownload}
            onFinalPass={onCorrectionFinalPass}
          />
        )}

        {/* Correction history placeholder (no live data available) */}
        {!msg.error && msg.mode === "correct" && !msg.correctionSummary && !msg.streaming && msg.content && (
          <div className="text-sm text-muted-foreground px-4 py-3 rounded-xl border border-border bg-secondary/20">
            Correction session complete. Reload a new document to see tracked changes.
          </div>
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
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
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

function WelcomeScreen({ mode, onExample, onOpenCorrectionModal }: { mode: CzarMode; onExample: (text: string) => void; onOpenCorrectionModal?: () => void }) {
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

  if (mode === "correct") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 py-8">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
          <FileSearch className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-1">Correct & Improve</h2>
        <p className="text-sm text-muted-foreground mb-3 max-w-sm leading-relaxed">
          Upload a document or paste your text. CZAR identifies every correction — grammar, style, argument, register — as tracked changes. Accept or reject each one individually, then download the clean document.
        </p>
        <div className="flex flex-col items-center gap-2 text-[11px] text-muted-foreground/60 mb-8">
          <span>Grammar · Style · Structure · Argument · Register</span>
          <span>Color-coded · Accept/Reject per change · Clean download</span>
        </div>
        <button
          onClick={onOpenCorrectionModal}
          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors text-sm"
        >
          Open Document
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 py-8">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        {modeIcon(mode)}
      </div>
      <h2 className="text-xl font-bold text-foreground mb-1">CZAR</h2>
      <p className="text-sm text-muted-foreground mb-8 max-w-sm">
        {MODE_DESCRIPTIONS[mode]}
      </p>
      <div className="w-full max-w-lg space-y-2">
        {items.map((ex) => (
          <button
            key={ex.text}
            onClick={() => onExample(ex.text)}
            className="w-full text-left px-4 py-3 rounded-xl border border-border bg-secondary/30 hover:bg-secondary transition-colors text-sm text-foreground"
          >
            <span className="font-medium text-foreground/80 text-[12px] block mb-0.5">{ex.label}</span>
            <span className="text-muted-foreground text-[12px] leading-snug line-clamp-2">{ex.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function InputFallback() {
  return <div className="h-20 rounded-xl border border-border bg-background/50 animate-pulse" />;
}
