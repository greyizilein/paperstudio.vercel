import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  PanelLeftClose, PanelLeftOpen, Loader2, Square,
  User, Bot, AlertCircle, Search, PenLine, Cpu,
  ChevronDown, LayoutPanelLeft, FileSearch, Clock, X,
} from "lucide-react";
import { PsThemeToggle } from "@/components/ps/PsThemeToggle";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  streamCzar, loadMessages,
  type CzarRequest, type CzarMode, type CzarHandlers,
  type CzarMetaEvent, type CzarAgentEvent, type CzarToolEvent,
} from "@/lib/czarStream";
import { ConvSidebar } from "@/components/czar/ConvSidebar";
import { UpgradeModal } from "@/components/czar/UpgradeModal";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

import { lazy, Suspense } from "react";
const AgentDock = lazy(() => import("@/components/czar/AgentDock").then(m => ({ default: m.AgentDock })));
const DocumentPanel = lazy(() => import("@/components/czar/DocumentPanel").then(m => ({ default: m.DocumentPanel })));
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
}

type MobileTab = "chat" | "document" | "agents";

// ── Helpers ────────────────────────────────────────────────────────

function modeLabel(mode: CzarMode): string {
  return { chat: "Chat", write: "Write", correct: "Correct", research: "Research", plan: "Plan" }[mode] ?? mode;
}

function modeIcon(mode: CzarMode) {
  const cls = "w-3.5 h-3.5";
  return {
    chat: <Cpu className={cls} />,
    write: <PenLine className={cls} />,
    correct: <FileSearch className={cls} />,
    research: <Search className={cls} />,
    plan: <LayoutPanelLeft className={cls} />,
  }[mode] ?? <Cpu className={cls} />;
}

const MODE_COLOURS: Record<CzarMode, string> = {
  chat: "bg-secondary text-muted-foreground",
  write: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  correct: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  research: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  plan: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

const MODE_DESCRIPTIONS: Record<CzarMode, string> = {
  chat: "Ask questions, get explanations",
  write: "Generate full documents",
  correct: "Fix and improve your draft",
  research: "Find and synthesise sources",
  plan: "Structure before you write",
};

// ── Main component ─────────────────────────────────────────────────

export default function CzarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (user === null) navigate("/auth"); }, [user]);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileTab, setMobileTab] = useState<MobileTab>("chat");
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);

  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const agentClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [docContent, setDocContent] = useState("");
  const [docStreaming, setDocStreaming] = useState(false);

  const [agents, setAgents] = useState<LiveAgent[]>([]);
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
      const assistantText = msgs
        .filter(m => m.role === "assistant" && m.content)
        .map(m => m.content!)
        .join("\n\n---\n\n");
      setDocContent(assistantText);
    } catch {
      // non-fatal
    }
  }, []);

  const newConv = useCallback(() => {
    abortRef.current?.abort();
    if (agentClearRef.current) clearTimeout(agentClearRef.current);
    setConvId(null);
    setMessages([]);
    setDocContent("");
    setAgents([]);
    setStreaming(false);
    setDocStreaming(false);
  }, []);

  const selectConv = useCallback((id: string) => {
    if (id === convId) return;
    abortRef.current?.abort();
    if (agentClearRef.current) clearTimeout(agentClearRef.current);
    setConvId(id);
    setStreaming(false);
    setDocStreaming(false);
    setAgents([]);
    loadConv(id);
    setMobileTab("chat");
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

  const sendMessage = useCallback(async (text: string, files: File[]) => {
    if (!user || streaming) return;
    if (!text.trim() && files.length === 0) return;

    // Cancel any pending agent-clear from prior stream
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
    setDocStreaming(true);
    setAgents([]);

    if (["write", "correct", "research", "plan"].includes(mode)) {
      setMobileTab("document");
    }

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
          if (["write", "correct", "research"].includes(mode)) {
            setDocContent(accText);
          }
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
          setDocStreaming(false);
        },
        onBilling: (reason: string) => {
          setUpgradeReason(reason);
          setShowUpgrade(true);
          setMessages(prev => prev.filter(m => m.id !== assistantMsgId));
          setStreaming(false);
          setDocStreaming(false);
        },
        onDone: (e) => {
          setMessages(prev => prev.map(m =>
            m.id === assistantMsgId ? { ...m, streaming: false } : m
          ));
          setStreaming(false);
          setDocStreaming(false);
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

      await streamCzar({ conversation_id: convId, user_message: text, attachments, mode, settings: {} }, handlers, ctrl.signal);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setMessages(prev => prev.map(m =>
          m.id === assistantMsgId
            ? { ...m, content: "Something went wrong. Please try again.", error: true, streaming: false }
            : m
        ));
      }
      setStreaming(false);
      setDocStreaming(false);
    }
  }, [user, streaming, convId, mode, uploadFiles]);

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
    setDocStreaming(false);
    setMessages(prev => prev.map(m => m.streaming ? { ...m, streaming: false } : m));
    setAgents(prev => prev.map(a => a.status === "working" ? { ...a, status: "done" } : a));
  }, []);

  const handleSelectionAction = useCallback((action: string, selectedText: string) => {
    if (action === "export") {
      const blob = new Blob([docContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "czar-document.txt"; a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const prompts: Record<string, string> = {
      improve: `Improve this passage: "${selectedText}"`,
      shorten: `Shorten this passage while keeping all key points: "${selectedText}"`,
      expand: `Expand this passage with more detail and examples: "${selectedText}"`,
      rewrite: `Rewrite this passage in a cleaner, more academic style: "${selectedText}"`,
    };
    const prompt = prompts[action];
    if (prompt) sendMessage(prompt, []);
  }, [docContent, sendMessage]);

  if (!user) return null;

  const isDocMode = ["write", "correct", "research"].includes(mode);
  const activeAgents = agents.filter(a => a.status !== "idle");

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

      {/* Main workstation */}
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
                  className="fixed z-[200] bg-background border border-border rounded-xl shadow-2xl overflow-hidden w-52 animate-in fade-in slide-in-from-top-1 duration-150"
                  style={{ top: dropdownPos.top, left: dropdownPos.left }}
                >
                  {(["chat", "write", "correct", "research", "plan"] as CzarMode[]).map(m => (
                    <button key={m}
                      onClick={() => { setMode(m); setShowModeMenu(false); }}
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

          {/* Right side actions */}
          <div className="ml-auto flex items-center gap-1">
            {/* Stop button — always visible during streaming so user can stop from any tab */}
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

        {/* Mobile tab bar */}
        <div className="lg:hidden flex border-b border-border bg-background/95 backdrop-blur-sm flex-shrink-0">
          {(["chat", "document", "agents"] as MobileTab[]).map(t => (
            <button key={t} onClick={() => setMobileTab(t)}
              className={`flex-1 py-2 text-[11px] font-semibold tracking-wide transition-colors ${
                mobileTab === t ? "text-foreground border-b-2 border-primary" : "text-muted-foreground/70"
              }`}>
              {t === "chat" ? "Chat" : t === "document" ? "Document" : "Agents"}
              {t === "agents" && activeAgents.filter(a => a.status === "working").length > 0 && (
                <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-blue-500 align-middle" />
              )}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 min-h-0 flex">

          {/* Left: Chat panel */}
          <div className={`flex flex-col min-h-0 ${
            isDocMode ? "w-full lg:w-[400px] lg:border-r lg:border-border" : "w-full"
          } ${mobileTab !== "chat" ? "hidden lg:flex" : "flex"}`}>

            {/* Agent dock */}
            {activeAgents.length > 0 && (
              <div className="flex-shrink-0 px-3 pt-2">
                <Suspense fallback={null}>
                  <AgentDock agents={agents} />
                </Suspense>
              </div>
            )}

            {/* Message thread */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {messages.length === 0 && (
                <WelcomeScreen mode={mode} onExample={(text) => sendMessage(text, [])} />
              )}
              {messages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              <div ref={threadEndRef} />
            </div>

            {/* Input */}
            <div className="flex-shrink-0 px-3 pb-3 pt-2">
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

          {/* Right: Document panel */}
          {isDocMode && (
            <div className={`flex-1 min-w-0 min-h-0 ${mobileTab !== "document" ? "hidden lg:flex" : "flex"} flex-col`}>
              <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>}>
                <DocumentPanel
                  content={docContent}
                  streaming={docStreaming}
                  mode={mode}
                  onSelectionAction={handleSelectionAction}
                  className="flex-1 min-h-0"
                />
              </Suspense>
            </div>
          )}

          {/* Document tab empty state — shown when not in a document-generating mode */}
          {mobileTab === "document" && !isDocMode && (
            <div className="lg:hidden flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
              <PenLine size={32} className="text-muted-foreground/25 mb-4" />
              <p className="text-[13px] font-semibold text-muted-foreground mb-1">Document panel</p>
              <p className="text-[12px] text-muted-foreground/60 mb-5 leading-relaxed">
                Switch to Write, Correct, or Research mode to generate a document here.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {(["write", "correct", "research"] as CzarMode[]).map(m => (
                  <button key={m}
                    onClick={() => { setMode(m); setMobileTab("chat"); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold ${MODE_COLOURS[m]}`}
                  >
                    {modeIcon(m)}
                    {modeLabel(m)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mobile agents tab */}
          {mobileTab === "agents" && (
            <div className="lg:hidden flex-1 overflow-y-auto p-4">
              <Suspense fallback={null}>
                <AgentDock agents={agents} expanded />
              </Suspense>
              {agents.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <Cpu size={28} className="text-muted-foreground/30 mb-3" />
                  <p className="text-[13px] text-muted-foreground">No agents running</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">Agents appear here when CZAR is working</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} reason={upgradeReason} />
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: UIMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot size={14} className="text-primary" />
        </div>
      )}
      <div className={`max-w-[85%] lg:max-w-[75%] ${isUser ? "order-first" : ""}`}>
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-relaxed ${
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm whitespace-pre-wrap"
              : msg.error
              ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-tl-sm"
              : "bg-secondary text-foreground rounded-tl-sm"
          }`}
        >
          {msg.error && <AlertCircle size={13} className="inline mr-1.5 mb-0.5" />}
          {isUser ? (
            <>
              {msg.content || (msg.streaming ? "" : "—")}
              {msg.streaming && <span className="inline-block w-0.5 h-4 bg-current ml-0.5 align-middle animate-pulse" />}
            </>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-pre:bg-background/50 prose-pre:border prose-pre:border-border prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded prose-blockquote:border-l-primary/40">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {msg.content || (msg.streaming ? "​" : "—")}
              </ReactMarkdown>
              {msg.streaming && <span className="inline-block w-0.5 h-4 bg-current ml-0.5 align-middle animate-pulse" />}
            </div>
          )}
        </div>
        {msg.mode && msg.mode !== "chat" && !isUser && (
          <span className="text-[10px] text-muted-foreground/40 mt-0.5 block ml-1">{msg.mode} mode</span>
        )}
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
          <User size={14} className="text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

function WelcomeScreen({ mode, onExample }: { mode: CzarMode; onExample: (t: string) => void }) {
  const examples: Record<CzarMode, string[]> = {
    chat: [
      "What is the difference between deductive and inductive reasoning?",
      "Explain the PICO framework in simple terms",
      "How do I structure a strong argument in an essay?",
    ],
    write: [
      "Write a 2000-word literature review on climate change adaptation in Sub-Saharan Africa",
      "Write a methodology chapter for a mixed-methods study on student mental health",
      "Write a research proposal on the impact of social media on adolescent self-esteem",
    ],
    correct: [
      "Upload your document and I'll correct grammar, citations, structure, and argument quality",
      "I'll identify every weakness in your draft and show you exactly how to fix them",
      "Upload your essay and I'll rewrite weak sections and fill citation gaps",
    ],
    research: [
      "Find and synthesise key literature on blockchain in healthcare",
      "Research the current evidence on mindfulness interventions for anxiety",
      "Build a bibliography on urban planning and climate resilience",
    ],
    plan: [
      "Plan a 10,000-word dissertation on gender inequality in STEM fields",
      "Create a detailed outline for a systematic literature review",
      "Structure a business report on the impact of remote work on productivity",
    ],
  };

  const icons: Record<CzarMode, React.ReactNode> = {
    chat: <Cpu size={28} className="text-muted-foreground/20" />,
    write: <PenLine size={28} className="text-blue-400/30" />,
    correct: <FileSearch size={28} className="text-amber-400/30" />,
    research: <Search size={28} className="text-purple-400/30" />,
    plan: <LayoutPanelLeft size={28} className="text-emerald-400/30" />,
  };

  const titles: Record<CzarMode, string> = {
    chat: "Ask CZAR anything",
    write: "What shall I write?",
    correct: "Upload content to correct",
    research: "What shall I research?",
    plan: "What shall I plan?",
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] text-center px-4 py-8">
      <div className="mb-3">{icons[mode]}</div>
      <h2 className="text-[15px] font-semibold text-foreground mb-1">{titles[mode]}</h2>
      <p className="text-[12px] text-muted-foreground mb-5 max-w-[280px]">
        {mode === "correct" ? "Attach a file or paste your text, then send" : "Type, speak, or attach files to get started"}
      </p>
      <div className="flex flex-col gap-1.5 w-full max-w-[320px]">
        {examples[mode].map((ex, i) => (
          <button key={i} onClick={() => onExample(ex)}
            className="text-left px-3.5 py-2.5 rounded-xl border border-border text-[12px] text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-secondary/50 transition-all leading-relaxed">
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}

function InputFallback() {
  return <div className="h-[80px] rounded-2xl border border-border bg-secondary/30 animate-pulse" />;
}

function modePlaceholder(mode: CzarMode): string {
  return {
    chat: "Ask CZAR anything…",
    write: "Describe what to write — topic, length, style, audience…",
    correct: "Attach your document and describe what to improve…",
    research: "What topic should I research?",
    plan: "Describe the document you want to plan…",
  }[mode] ?? "Ask CZAR…";
}
