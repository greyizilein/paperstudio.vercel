import { useEffect, useRef, useState, useCallback } from "react";
import { saveAs } from "file-saver";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CzarSidebar } from "@/components/czar/CzarSidebar";
import { CzarTabBar } from "@/components/czar/CzarTabBar";
import { CzarThread } from "@/components/czar/CzarThread";
import { CzarComposer, CzarComposerHandle, CzarAttachment } from "@/components/czar/CzarComposer";
import { CzarSettingsDrawer } from "@/components/czar/CzarSettingsDrawer";
import { CzarUpgradeModal } from "@/components/czar/CzarUpgradeModal";
import { streamCzarChat } from "@/lib/czarStream";
import { SupervisorFeedbackModal } from "@/components/writer/SupervisorFeedbackModal";
import { applyTheme, DEFAULT_THEME_ID } from "@/lib/czarThemes";
import { toast } from "@/hooks/use-toast";
import { Settings, Pencil, Wand2, X, Check, StopCircle, Loader2 } from "lucide-react";
import { computeParaDiff, type DiffParagraph } from "@/lib/diffUtils";
import { cn } from "@/lib/utils";
import { CzarIcon } from "@/components/icons/CzarIcon";
import { ImageAckModal, ImageProgressModal, hasAckedImageNotice, ackImageNotice } from "@/components/ImageNoticeModal";
import { CzarAttachModal, type AttachSelection } from "@/components/czar/CzarAttachModal";
import { CzarAgentRunCard } from "@/components/czar/CzarAgentRunCard";
import type { CzarToolCallState } from "@/components/czar/CzarToolCard";
import { toolEventToState } from "@/components/czar/CzarToolCard";

export interface CzarMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  streaming?: boolean;
  attachments?: CzarAttachment[];
  thinking?: string;
  toolCalls?: CzarToolCallState[];
  followups?: string[];
  /** Server-emitted clarify popup spec (replaces fenced JSON in content). */
  clarifySpec?: any;
  /** Server-decided delivery pacing for this turn — drives stable layout while streaming. */
  delivery?: string | null;
  isBuild?: boolean;
}

const DEFAULT_SETTINGS: Record<string, any> = {
  theme: DEFAULT_THEME_ID,
  language: "UK",
  citation_style: "Harvard",
  tone: "academic-postgraduate",
  default_export: "docx",
  show_word_count: true,
  // Reading preferences (screen-only — never reach exports).
  reading_font: "system",
  reading_size: "M",
  reading_leading: "comfortable",
  reading_tracking: "default",
  reading_weight: "regular",
  reading_tint: "inherit",
  reading_color: "inherit",
  reading_justify: false,
  show_quill_caret: true,
};
const SETTINGS_KEY = (uid: string) => `czar:settings:${uid}`;

// Reading-mode value maps. Kept in sync with CzarSettingsDrawer's pickers.
const READING_FONT_STACK: Record<string, string> = {
  system: "var(--czar-font-body)",
  serif: '"Source Serif 4", Georgia, "Times New Roman", serif',
  sans: '"Inter", system-ui, -apple-system, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  dyslexic: '"OpenDyslexic", "Comic Sans MS", system-ui, sans-serif',
  hyperlegible: '"Atkinson Hyperlegible", system-ui, sans-serif',
};
const READING_SIZE_PX: Record<string, string> = {
  XS: "13px", S: "14px", M: "15px", L: "17px", XL: "19px", XXL: "22px",
};
const READING_LEADING: Record<string, string> = { tight: "1.4", comfortable: "1.7", relaxed: "1.95" };
const READING_TRACKING: Record<string, string> = { default: "-0.005em", loose: "0.02em", looser: "0.05em" };
const READING_WEIGHT: Record<string, string> = { light: "300", regular: "400", medium: "500", bold: "700" };
const READING_TINT: Record<string, string> = {
  inherit: "", cream: "#FBF6E9", sepia: "#F4ECD8", mint: "#EAF5EE", blue: "#EAF1FA", hicontrast: "#F5F5F5",
};
const READING_COLOR: Record<string, string> = {
  inherit: "", "near-black": "#0A0A0A", "dark-grey": "#1F1F1F", charcoal: "#2C2C2C", cream: "#FBF6E9",
};

export default function Czar() {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<CzarMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("czar.sidebar.collapsed") === "1";
  });
  const [openTabs, setOpenTabs] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("czar.openTabs");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [thinkingMode, setThinkingMode] = useState(false);
  const [mode, setMode] = useState<"chat" | "plan" | "build" | "agent">("chat");
  // Supervisor feedback modal state
  const [showSupervisorModal, setShowSupervisorModal] = useState(false);
  const [settings, setSettings] = useState<Record<string, any>>(DEFAULT_SETTINGS);
  const [subscription, setSubscription] = useState<any>(null);
  const [showImageAck, setShowImageAck] = useState(false);
  // Live image-job tracker for CZAR (per-tool-call status from generate_image events)
  const [imageJobs, setImageJobs] = useState<Record<string, "loading" | "done" | "error">>({});
  // Ref mirror so onDone (inside a useCallback closure) always reads the live value.
  const imageJobsRef = useRef<Record<string, "loading" | "done" | "error">>({});
  // Holds a deferred download that must wait for in-flight images to settle.
  const pendingDownloadRef = useRef<{ fire: () => void } | null>(null);
  const [showImageProgress, setShowImageProgress] = useState(false);
  // Post-stream attach modal state
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachContent, setAttachContent] = useState<string>("");
  const [attachLastSel, setAttachLastSel] = useState<AttachSelection | null>(null);
  // Agent-mode tracking: which assistant message id belongs to the active
  // agent run, and whether the auto-download has already fired.
  const [agentMsgId, setAgentMsgId] = useState<string | null>(null);
  const [agentDownloaded, setAgentDownloaded] = useState(false);
  // Humaniser panel state
  const [czarHumanise, setCzarHumanise] = useState<{ msgId: string; original: string } | null>(null);
  const [czarHumanisedText, setCzarHumanisedText] = useState<string | null>(null);
  const [czarHumaniseDiff, setCzarHumaniseDiff] = useState<DiffParagraph[] | null>(null);
  const [isCzarHumanising, setIsCzarHumanising] = useState(false);
  const [czarHumaniseStages, setCzarHumaniseStages] = useState<{ stage: number; label: string; status: "pending" | "running" | "done" | "skipped" }[]>([]);
  const czarHumaniseAbortRef = useRef<AbortController | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const composerRef = useRef<CzarComposerHandle>(null);
  const isAdmin = (user?.email || "").toLowerCase() === "grey.izilein@gmail.com";

  // Derive a friendly first name from display name → email prefix
  const displayName: string = (() => {
    const full: string =
      (user as any)?.user_metadata?.full_name ||
      (user as any)?.user_metadata?.name ||
      "";
    if (full.trim()) return full.trim().split(/\s+/)[0];
    return (user?.email || "").split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).split(" ")[0];
  })();

  // Title of the active conversation
  const activeConversation = conversations.find((c) => c.id === conversationId);

  // Load + persist settings
  useEffect(() => {
    if (!user) return;
    try {
      const raw = localStorage.getItem(SETTINGS_KEY(user.id));
      if (raw) {
        const parsed = JSON.parse(raw);
        // Honour the user's saved choice exactly — do NOT migrate or rewrite it.
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch { /* ignore */ }
  }, [user]);
  useEffect(() => {
    if (!user) return;
    localStorage.setItem(SETTINGS_KEY(user.id), JSON.stringify(settings));
    applyTheme(settings.theme || DEFAULT_THEME_ID);
  }, [settings, user]);

  // Clean up body background and html data attribute when leaving CZAR so
  // the PS app pages don't inherit CZAR theme colours.
  useEffect(() => {
    return () => {
      document.body.style.background = "";
      delete document.documentElement.dataset.czarTheme;
    };
  }, []);

  // Keep the ref in sync so stale closures (sendMessage useCallback) can read
  // the live imageJobs value without adding it to every dependency array.
  useEffect(() => { imageJobsRef.current = imageJobs; }, [imageJobs]);

  // Auto-close the image progress modal ~1.2s after every job finishes,
  // so the user sees the green check then snaps back to the thread.
  useEffect(() => {
    if (!showImageProgress) return;
    const vals = Object.values(imageJobs);
    if (vals.length === 0) return;
    const stillLoading = vals.some((v) => v === "loading");
    if (stillLoading) return;
    const t = setTimeout(() => {
      setShowImageProgress(false);
      setImageJobs({});
    }, 1200);
    return () => clearTimeout(t);
  }, [imageJobs, showImageProgress]);

  // Fire any deferred download once all in-flight images have resolved.
  useEffect(() => {
    if (!pendingDownloadRef.current) return;
    const anyLoading = Object.values(imageJobs).some((s) => s === "loading");
    if (anyLoading) return;
    const { fire } = pendingDownloadRef.current;
    pendingDownloadRef.current = null;
    setTimeout(fire, 200);
  }, [imageJobs]);

  // Load subscription
  const loadSubscription = useCallback(async () => {
    if (!user) return;
    if (isAdmin) {
      setSubscription({ tier: "phd", word_limit: 999999999, words_used: 0, bonus_words: 999999999, bonus_used: 0, status: "active", unlimited: true });
      return;
    }
    const { data } = await supabase.from("czar_subscriptions").select("*").eq("user_id", user.id).maybeSingle();
    setSubscription(data);
  }, [user, isAdmin]);
  useEffect(() => { loadSubscription(); }, [loadSubscription]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("czar_conversations").select("*").eq("user_id", user.id).eq("archived", false).order("updated_at", { ascending: false });
    setConversations(data || []);
  }, [user]);
  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Load messages on conversation change.
  // CRITICAL: skip reload if this conversationId was JUST assigned by the
  // streaming `meta` event — otherwise we wipe the optimistic assistant
  // bubble and the deltas land on a non-existent message id.
  const lastLoadedConvIdRef = useRef<string | null>(null);
  useEffect(() => {
    // MUST be first: never clear or reload messages while streaming — the
    // optimistic bubbles live here and a fetch would wipe them.
    if (streaming) return;
    if (!conversationId) {
      // Defensive: if there are optimistic in-flight bubbles (server hasn't
      // assigned a conversation_id yet via meta), do NOT wipe them.
      const hasOptimistic = messages.some(
        (m) => typeof m.id === "string" && (m.id.startsWith("u-") || m.id.startsWith("a-")),
      );
      if (hasOptimistic) return;
      setMessages([]);
      lastLoadedConvIdRef.current = null;
      return;
    }
    // If we already have an optimistic assistant bubble streaming for this
    // conversation, don't refetch — the stream will finalize it.
    if (lastLoadedConvIdRef.current === conversationId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("czar_messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
      if (cancelled) return;
      lastLoadedConvIdRef.current = conversationId;
      setMessages((data || []).map((m: any) => {
        const raw = m.content || "";
        // Pull out persisted clarify placeholder so the popup re-renders
        // on reload — never leak the JSON to visible text.
        const cm = raw.match(/\[CZAR_CLARIFY\]([\s\S]*?)\[\/CZAR_CLARIFY\]/);
        let clarifySpec: any = undefined;
        let content = raw;
        if (cm) {
          try { clarifySpec = JSON.parse(cm[1]); } catch { /* ignore */ }
          content = (raw.slice(0, cm.index) + raw.slice(cm.index + cm[0].length)).trim();
        }
        return {
          id: m.id,
          role: m.role,
          content,
          attachments: m.metadata?.attachments,
          clarifySpec,
        };
      }));
    })();
    return () => { cancelled = true; };
  }, [conversationId, streaming]);

  const newChat = () => {
    if (streaming) abortRef.current?.abort();
    setConversationId(null);
    setMessages([]);
    setAgentMsgId(null);
    setAgentDownloaded(false);
    setShowSidebar(false);
    composerRef.current?.focus();
  };

  // ---------- Tabs (open chats strip) ----------
  useEffect(() => {
    try { localStorage.setItem("czar.openTabs", JSON.stringify(openTabs)); } catch { /* ignore */ }
  }, [openTabs]);

  useEffect(() => {
    try { localStorage.setItem("czar.sidebar.collapsed", sidebarCollapsed ? "1" : "0"); } catch { /* ignore */ }
  }, [sidebarCollapsed]);

  // Auto-add the active conversation to openTabs whenever it changes.
  useEffect(() => {
    if (!conversationId) return;
    setOpenTabs((prev) => (prev.includes(conversationId) ? prev : [...prev, conversationId]));
  }, [conversationId]);

  const openInNewTab = useCallback((id: string) => {
    setOpenTabs((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setConversationId(id);
    setAgentMsgId(null);
    setAgentDownloaded(false);
    setShowSidebar(false);
  }, []);

  const closeTab = useCallback((id: string) => {
    setOpenTabs((prev) => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const next = prev.filter((x) => x !== id);
      if (id === conversationId) {
        const fallback = next[idx] || next[idx - 1] || null;
        setConversationId(fallback);
        if (!fallback) {
          setMessages([]);
          setAgentMsgId(null);
          setAgentDownloaded(false);
        }
      }
      return next;
    });
  }, [conversationId]);


  const sendMessage = useCallback(async (text: string, attachments: CzarAttachment[], modeOverride?: "chat" | "plan" | "build" | "agent") => {
    if (!user || streaming) return;
    const ready = attachments.filter((a) => a.status === "ready");

    // Optimistic user bubble
    const userTempId = `u-${Date.now()}`;
    const asstTempId = `a-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: userTempId, role: "user", content: text, attachments: ready },
      { id: asstTempId, role: "assistant", content: "", streaming: true, thinking: "" },
    ]);

    setStreaming(true);
    abortRef.current = new AbortController();

    let resolvedConvId: string | null = conversationId;

    // Direct per-delta setState. React 18 batches updates inside async
    // microtasks, so this stays cheap — and avoids the rAF coalescing trap
    // where a busy ReactMarkdown render starves the next animation frame
    // and the user sees the whole reply land in one paint.

    const effectiveMode = modeOverride ?? mode;

    if (effectiveMode === "agent") {
      setAgentMsgId(asstTempId);
      setAgentDownloaded(false);
    } else {
      setAgentMsgId(null);
    }

    try {
      await streamCzarChat(
        {
          conversation_id: conversationId,
          user_message: text,
          attachments: ready.map((a) => ({ storage_path: a.path, filename: a.filename, size: a.size, mime: a.mime })),
          think: thinkingMode,
          mode: effectiveMode,
          // Strip display-only keys before sending — everything else is a writing
          // preference that buildSettingsManifest() compiles into the system prompt.
          settings: (({ theme, default_export, show_word_count, show_quill_caret,
            reading_font, reading_size, reading_leading, reading_tracking,
            reading_weight, reading_tint, reading_color, reading_justify,
            ...rest }) => rest)(settings),
        },
        {
          onMeta: (meta) => {
            resolvedConvId = meta.conversation_id;
            if (!conversationId) {
              setConversationId(meta.conversation_id);
              // Optimistically add the new conversation to the sidebar list so
              // it appears immediately without waiting for onDone → loadConversations.
              setConversations((prev) => {
                if (prev.some((c) => c.id === meta.conversation_id)) return prev;
                return [{
                  id: meta.conversation_id,
                  title: text.slice(0, 60).trim() || "New Chat",
                  updated_at: new Date().toISOString(),
                  archived: false,
                  user_id: user?.id,
                }, ...prev];
              });
            }
            // CRITICAL: mark this conversation as already-loaded so the
            // post-stream effect doesn't refetch and wipe the optimistic
            // user message (which is what was causing the "first message
            // disappears in new chats" bug).
            lastLoadedConvIdRef.current = meta.conversation_id;
            // Stamp the assistant bubble with this turn's delivery pacing
            // so the layout stays stable while streaming (no mid-write snap).
            setMessages((prev) => prev.map((m) =>
              m.id === asstTempId ? { ...m, delivery: meta.delivery ?? null, isBuild: !!meta.is_build } : m,
            ));
          },
          onDelta: (chunk) => {
            setMessages((prev) => prev.map((m) =>
              m.id === asstTempId ? { ...m, content: m.content + chunk } : m,
            ));
          },
          onThinking: (chunk) => {
            setMessages((prev) => prev.map((m) =>
              m.id === asstTempId ? { ...m, thinking: (m.thinking || "") + chunk } : m,
            ));
          },
          onClarify: (spec) => {
            // Defensive: short-circuits may emit clarify before any meta.
            // Lock in the optimistic conversation id so nothing wipes the bubble.
            lastLoadedConvIdRef.current = lastLoadedConvIdRef.current || conversationId;
            setMessages((prev) => prev.map((m) =>
              m.id === asstTempId ? { ...m, clarifySpec: spec } : m,
            ));
          },
          onTool: (ev) => {
            const evName = ((ev as any)?.name || (ev as any)?.tool || "").toString().toLowerCase();
            const evId = ((ev as any)?.id || "").toString();
            const phase = ((ev as any)?.phase || "").toString();
            if (evName === "generate_image" && evId) {
              if (!hasAckedImageNotice()) setShowImageAck(true);
              if (phase === "start") {
                setImageJobs((m) => ({ ...m, [evId]: "loading" }));
                setShowImageProgress(true);
              } else if (phase === "result") {
                setImageJobs((m) => ({ ...m, [evId]: "done" }));
              } else if (phase === "error") {
                setImageJobs((m) => ({ ...m, [evId]: "error" }));
              }
            } else if (evName.includes("image") && !hasAckedImageNotice()) {
              setShowImageAck(true);
            }
            setMessages((prev) => prev.map((m) =>
              m.id === asstTempId
                ? { ...m, toolCalls: toolEventToState(m.toolCalls || [], ev) }
                : m,
            ));
          },
          onFollowups: (suggestions) => {
            setMessages((prev) => prev.map((m) =>
              m.id === asstTempId ? { ...m, followups: suggestions } : m,
            ));
          },
          onCheckout: (ev) => {
            if (isAdmin) return;
            toast({ title: "Opening checkout…", description: `${ev.product === "czar" ? "CZAR" : "PaperStudio"} · ${ev.tier}` });
            setTimeout(() => { window.location.href = ev.authorization_url; }, 400);
          },
          onError: (msg, code) => {
            const friendly = code === 429 ? "Rate limited. Try again in a moment." : code === 402 ? "AI credits exhausted. Top up in workspace settings." : msg;
            toast({ title: "CZAR error", description: friendly, variant: "destructive" });
            setMessages((prev) => prev.map((m) => m.id === asstTempId ? { ...m, streaming: false, content: m.content || `⚠️ ${friendly}` } : m));
          },
          onDone: (data) => {
            // Defensive: if the server short-circuited and never sent meta,
            // adopt the conversation_id from `done` so the optimistic bubbles
            // are kept (and not wiped by the load-messages effect).
            if (data?.conversation_id && !conversationId) {
              setConversationId(data.conversation_id);
              lastLoadedConvIdRef.current = data.conversation_id;
              setConversations((prev) => {
                if (prev.some((c) => c.id === data.conversation_id)) return prev;
                return [{
                  id: data.conversation_id,
                  title: text.slice(0, 60).trim() || "New Chat",
                  updated_at: new Date().toISOString(),
                  archived: false,
                  user_id: user?.id,
                }, ...prev];
              });
            }
            // Handle billing short-circuit
            if (data.billing === "upgrade" && !isAdmin) {
              setMessages((prev) => prev.filter((m) => m.id !== asstTempId));
              setShowUpgrade(true);
            } else {
              setMessages((prev) => {
                const next = prev.map((m) => m.id === asstTempId ? { ...m, streaming: false } : m);
                // AGENT auto-download: when the run finishes, fire the
                // download immediately with sensible defaults (cover +
                // references + appendix + images all on). User never has
                // to click anything — that's the point of Agent.
                if (effectiveMode === "agent") {
                  const finished = next.find((m) => m.id === asstTempId);
                  const content = (finished?.content || "").trim();
                  if (content) {
                    setAttachContent(content);
                    const sel = { cover: true, references: true, appendix: false, images: true };
                    setAttachLastSel(sel);
                    const fire = () => {
                      const augmented = buildAugmentedContent(content, sel);
                      void downloadContent(augmented, { czarCoverPage: true, authorName: displayName || "" });
                      setAgentDownloaded(true);
                    };
                    const hasPendingImages = Object.values(imageJobsRef.current).some((s) => s === "loading");
                    if (hasPendingImages) {
                      // Park the download — the pendingDownloadRef useEffect will fire it
                      // once every image job resolves (success or error).
                      pendingDownloadRef.current = { fire };
                      setShowImageProgress(true);
                    } else {
                      setTimeout(fire, 200);
                    }
                  }
                }
                return next;
              });
            }
            loadSubscription();
            loadConversations();
          },
        },
        abortRef.current.signal,
      );

    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({ title: "Send failed", description: e?.message || "Unknown error", variant: "destructive" });
      }
      setMessages((prev) => prev.map((m) => m.id === asstTempId ? { ...m, streaming: false } : m));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [user, streaming, conversationId, thinkingMode, mode, settings, loadSubscription, loadConversations, isAdmin]);

  const stopStream = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  // Remove old apply/download handlers — handled by SupervisorFeedbackModal.
  const handleCzarHumanise = (msgId: string, content: string) => {
    setCzarHumanise({ msgId, original: content });
    setCzarHumanisedText(null);
    setCzarHumaniseDiff(null);
    setCzarHumaniseStages([]);
    setIsCzarHumanising(false);
  };

  const handleStartCzarHumanise = async () => {
    if (!czarHumanise || isCzarHumanising) return;
    setIsCzarHumanising(true);
    setCzarHumaniseStages([
      { stage: 1, label: "Vocabulary Purge", status: "pending" },
      { stage: 2, label: "Structure Break", status: "pending" },
      { stage: 3, label: "Citation Texture", status: "pending" },
      { stage: 4, label: "Human Depth", status: "pending" },
      { stage: 5, label: "Surface Polish", status: "pending" },
    ]);
    setCzarHumanisedText(null);
    setCzarHumaniseDiff(null);

    const abort = new AbortController();
    czarHumaniseAbortRef.current = abort;
    const hardTimeout = setTimeout(() => {
      abort.abort();
      toast({ title: "Humaniser timed out. Please try again.", variant: "destructive" });
      setIsCzarHumanising(false);
      setCzarHumaniseStages([]);
    }, 120_000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      else headers.Authorization = `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/czar-humanise`, {
        method: "POST",
        headers,
        body: JSON.stringify({ text: czarHumanise.original }),
        signal: abort.signal,
      });

      if (!resp.ok || !resp.body) {
        toast({ title: `Humaniser failed (${resp.status})`, variant: "destructive" });
        setIsCzarHumanising(false);
        setCzarHumaniseStage("pending");
        clearTimeout(hardTimeout);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let currentEvent = "message";
      let gotDone = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line) { currentEvent = "message"; continue; }
          if (line.startsWith("event:")) { currentEvent = line.slice(6).trim(); continue; }
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            const parsed = JSON.parse(payload);
            if (currentEvent === "stage_start") {
              const s = parsed.stage as number;
              setCzarHumaniseStages(prev => prev.map(st => st.stage === s ? { ...st, status: "running" } : st));
            } else if (currentEvent === "stage_done") {
              const s = parsed.stage as number;
              setCzarHumaniseStages(prev => prev.map(st => st.stage === s ? { ...st, status: "done" } : st));
            } else if (currentEvent === "done") {
              gotDone = true;
              if (parsed?.error || parsed?.stages_completed === 0) {
                toast({ title: `Humaniser error: ${parsed?.error || "no output returned."}`, variant: "destructive" });
                setCzarHumaniseStages([]);
              } else {
                const result = parsed?.humanised || "";
                if (result && result.trim().length > 50) {
                  setCzarHumanisedText(result);
                  setCzarHumaniseDiff(computeParaDiff(czarHumanise.original, result));
                  setCzarHumaniseStages(prev => prev.map(st => st.status === "pending" ? { ...st, status: "skipped" } : st));
                } else {
                  toast({ title: "Humaniser returned an empty result. Please try again.", variant: "destructive" });
                  setCzarHumaniseStages([]);
                }
              }
            }
          } catch { /* skip malformed */ }
        }
      }

      if (!gotDone && !abort.signal.aborted) {
        toast({ title: "Humaniser ended unexpectedly. Please try again.", variant: "destructive" });
        setCzarHumaniseStages([]);
      }
    } catch (e: any) {
      if (e?.name !== "AbortError" && !abort.signal.aborted) {
        toast({ title: e?.message || "Humaniser failed", variant: "destructive" });
        setCzarHumaniseStages([]);
      }
    } finally {
      clearTimeout(hardTimeout);
      setIsCzarHumanising(false);
    }
  };

  const handleApplyCzarHumanised = () => {
    if (!czarHumanisedText || !czarHumanise) return;
    setMessages(prev => prev.map(m => m.id === czarHumanise.msgId ? { ...m, content: czarHumanisedText } : m));
    setCzarHumanise(null);
    setCzarHumanisedText(null);
    setCzarHumaniseDiff(null);
    setCzarHumaniseStages([]);
    toast({ title: "Message humanised and applied." });
  };

  const regenerate = (msgId: string) => {
    // Find the previous user message and resend it
    const idx = messages.findIndex((m) => m.id === msgId);
    if (idx <= 0) return;
    const userMsg = [...messages.slice(0, idx)].reverse().find((m) => m.role === "user");
    if (!userMsg) return;
    sendMessage(userMsg.content, userMsg.attachments || []);
  };

  const handleFollowupPick = (text: string) => {
    if (streaming) return;
    sendMessage(text, []);
  };

  const handleClarifyConfirm = (msgId: string, values: Record<string, unknown>) => {
    if (streaming) return;
    // Special-case the delivery-mode picker: don't echo a visible "Locked in"
    // bubble. Instead, find the user's ORIGINAL request (the message just
    // before this assistant card) and re-send it with a hidden delivery tag.
    if ("__delivery" in values) {
      const choice = String(values.__delivery || "").toLowerCase();
      const tag = choice.startsWith("section") ? "section" : choice.startsWith("main") ? "main" : "full";
      const idx = messages.findIndex((m) => m.id === msgId);
      const originalUser = idx > 0
        ? [...messages.slice(0, idx)].reverse().find((m) => m.role === "user")
        : null;
      const baseText = originalUser?.content?.replace(/\s*\[CZAR_DELIVERY:\w+\]\s*$/i, "") || "Build it.";
      // Hidden suffix the backend reads but the UI strips before display.
      sendMessage(`${baseText} [CZAR_DELIVERY:${tag}]`, originalUser?.attachments || []);
      return;
    }
    // Image clarify card: forward as a hidden [CZAR_IMAGE_SPEC] tag so the
    // server short-circuits straight into image generation. No prose echo.
    if ("subject" in values || ("style" in values && "aspect" in values)) {
      const spec = {
        subject: String(values.subject || "").trim(),
        style: String(values.style || "Illustration"),
        aspect: String(values.aspect || "16:9"),
        count: parseInt(String(values.count || "1"), 10) || 1,
      };
      const visible = `Generate ${spec.count > 1 ? `${spec.count} figures` : "a figure"}: ${spec.subject || "(unspecified subject)"}`;
      sendMessage(`${visible} [CZAR_IMAGE_SPEC]${JSON.stringify(spec)}[/CZAR_IMAGE_SPEC]`, []);
      return;
    }
    const lines = Object.entries(values)
      .filter(([, v]) => v !== "" && v != null && !(Array.isArray(v) && v.length === 0))
      .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join("\n");
    const text = `Locked in:\n${lines}\n\nNow build it.`;
    sendMessage(text, []);
  };

  const handleApprovePlan = useCallback((content: string) => {
    if (streaming || !content) return;
    // The PlanCard hands us a `[CZAR_PLAN]{json}[/CZAR_PLAN]` payload so the
    // Build turn has the locked spec verbatim. Older prose plans still work
    // (we just forward the raw content).
    setMode("build");
    const planMatch = content.match(/\[CZAR_PLAN\]([\s\S]*?)\[\/CZAR_PLAN\]/);
    const buildPrompt = planMatch
      ? `Build this plan exactly as specified — write the full document end-to-end at A+ quality. Plan:\n\n${planMatch[1]}`
      : `Approved. Now write the full document end-to-end at full quality based on this plan:\n\n${content}`;
    sendMessage(buildPrompt, [], "build");
  }, [streaming, sendMessage]);

  // Step 1: user clicks Download → open the attach picker. Defaults are
  // derived from what's actually IN the message (citations / image markers).
  // If images are still generating, park the download and show the progress modal.
  const requestDownload = useCallback((content: string) => {
    if (!content || !content.trim()) {
      toast({ title: "Nothing to download", description: "This message is empty.", variant: "destructive" });
      return;
    }
    const hasPendingImages = Object.values(imageJobsRef.current).some((s) => s === "loading");
    if (hasPendingImages) {
      pendingDownloadRef.current = { fire: () => { setAttachContent(content); setAttachOpen(true); } };
      setShowImageProgress(true);
      return;
    }
    setAttachContent(content);
    setAttachOpen(true);
  }, []);

  // "Re-attach" button — re-opens the picker for the LAST downloaded message
  // so the user can fix mistakes (e.g. they unticked References by accident).
  const reopenAttach = useCallback(() => {
    if (!attachContent) {
      toast({ title: "Nothing to re-attach", description: "Generate or open a deliverable first.", variant: "destructive" });
      return;
    }
    setAttachOpen(true);
  }, [attachContent]);

  // Compile a quick reference list from inline (Author, Year) citations in the body.
  // This is a lossless local pass — no AI call needed for the MVP.
  const compileRefsFromBody = (body: string): string => {
    const cites = new Set<string>();
    const re = /\(([A-Z][A-Za-z'’\-]+(?:\s+(?:and|&|et al\.?))?(?:\s+[A-Z][A-Za-z'’\-]+)?),\s*(\d{4}[a-z]?)\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(body)) !== null) {
      cites.add(`${m[1].trim()} (${m[2]})`);
    }
    if (cites.size === 0) return "";
    const sorted = [...cites].sort((a, b) => a.localeCompare(b));
    return `\n\n## References\n\n${sorted.map((s) => `- ${s}.`).join("\n")}\n`;
  };

  const buildAugmentedContent = (content: string, sel: AttachSelection): string => {
    let out = content;
    // Cover page is now handled natively by export-docx (proper Word title page),
    // so we no longer prepend a markdown heading stub here.
    if (sel.references) {
      const hasRefs = /^#{1,3}\s+(references?|reference list|bibliography)\b/im.test(out);
      if (!hasRefs) {
        // Fallback: model should always write ## References now, but keep this
        // as a last resort for old/short responses that may not have one.
        const compiled = compileRefsFromBody(out);
        if (compiled) out += compiled;
      }
    }
    if (sel.appendix) {
      out += `\n\n## Appendix\n\n*Add supporting tables, transcripts, or supplementary material here.*\n`;
    }
    // Note: image markers are already inline; export-docx renders them. The
    // 'images' toggle only matters if we eventually strip them when unchecked.
    if (!sel.images) {
      // Strip markdown image embeds and [FIGURE: …] placeholders if user opted out.
      out = out.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/^\s*\[FIGURE:[^\]]*\]\s*$/gim, "");
    }
    return out;
  };

  const downloadContent = useCallback(async (
    content: string,
    opts?: { czarCoverPage?: boolean; authorName?: string },
  ) => {
    if (!content || !content.trim()) {
      toast({ title: "Nothing to download", description: "This message is empty.", variant: "destructive" });
      return;
    }
    toast({ title: "Preparing your document…" });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      else headers.Authorization = `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;

      const headingMatch = content.match(/^#{1,3}\s+(.+)$/m);
      const title = (headingMatch?.[1] || activeConversation?.title || "CZAR document").trim().slice(0, 80);

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-docx`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            content,
            title,
            format: "docx",
            singleDocument: true,
            isFinalExport: false,
            czarCoverPage: opts?.czarCoverPage ?? false,
            authorName: opts?.authorName ?? "",
          }),
        },
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Export failed (${resp.status})`);
      }
      const data = await resp.json();
      if (data.encoding !== "base64") throw new Error("Unexpected export response");
      const binary = atob(data.content);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const filename = data.filename || `${title.replace(/[/\\:*?"<>|]/g, "").trim() || "CZAR"}.docx`;
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      saveAs(blob, filename);
      toast({ title: "Downloaded", description: filename });
    } catch (e: any) {
      toast({ title: "Download failed", description: e?.message || "Unknown error", variant: "destructive" });
    }
  }, [activeConversation?.title, displayName]);

  const handleAttachConfirm = useCallback(async (sel: AttachSelection) => {
    setAttachLastSel(sel);
    setAttachOpen(false);
    const augmented = buildAugmentedContent(attachContent, sel);
    await downloadContent(augmented, { czarCoverPage: sel.cover, authorName: displayName || "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachContent, displayName, downloadContent]);

  // Detect what to preselect in the modal
  const hasCitations = /\([A-Z][A-Za-z'’\-]+(?:\s+(?:and|&|et al\.?))?(?:\s+[A-Z][A-Za-z'’\-]+)?,\s*\d{4}[a-z]?\)/.test(attachContent);
  const hasImages = /!\[[^\]]*\]\([^)]*\)|\[FIGURE:/i.test(attachContent);


  // Reading-mode CSS variables (screen-only — never reach the export pipeline).
  const readingStyle: React.CSSProperties = {
    background: "var(--czar-bg-gradient, var(--czar-bg))",
    color: "var(--czar-text)",
    ["--czar-reading-font" as any]: READING_FONT_STACK[settings.reading_font] || READING_FONT_STACK.system,
    ["--czar-reading-size" as any]: READING_SIZE_PX[settings.reading_size] || READING_SIZE_PX.M,
    ["--czar-reading-leading" as any]: READING_LEADING[settings.reading_leading] || READING_LEADING.comfortable,
    ["--czar-reading-tracking" as any]: READING_TRACKING[settings.reading_tracking] || READING_TRACKING.default,
    ["--czar-reading-weight" as any]: READING_WEIGHT[settings.reading_weight] || READING_WEIGHT.regular,
    ["--czar-reading-align" as any]: settings.reading_justify ? "justify" : "left",
  };
  const _tint = READING_TINT[settings.reading_tint] || "";
  const _colour = READING_COLOR[settings.reading_color] || "";
  if (_tint) (readingStyle as any)["--czar-reading-tint"] = _tint;
  if (_colour) (readingStyle as any)["--czar-reading-color"] = _colour;

  // Tab items derived from openTabs + conversations
  const tabItems = openTabs
    .map((id) => {
      const c = conversations.find((cv) => cv.id === id);
      return c ? { id, title: c.title || "Untitled" } : null;
    })
    .filter(Boolean) as { id: string; title: string }[];

  const sidebarProps = {
    conversations,
    activeId: conversationId,
    onSelect: (id: string) => {
      setConversationId(id);
      setAgentMsgId(null);
      setAgentDownloaded(false);
      setShowSidebar(false);
    },
    onNew: newChat,
    subscription,
    onUpgrade: () => { if (!isAdmin) setShowUpgrade(true); },
    isAdmin,
    onChanged: loadConversations,
    onLocalRemove: (id: string) => setConversations((prev) => prev.filter((c) => c.id !== id)),
    onLocalRestore: (c: any) => setConversations((prev) => [c, ...prev]),
    userName: displayName,
    onOpenInNewTab: openInNewTab,
  };

  return (
    <div className="czar-root czar-reading flex h-[100dvh] overflow-hidden" style={readingStyle}>
      {/* Desktop docked sidebar */}
      <div className="hidden lg:block shrink-0">
        <CzarSidebar
          {...sidebarProps}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        />
      </div>

      {/* Mobile/tablet overlay sidebar */}
      {showSidebar && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setShowSidebar(false)} />
          <div className="absolute left-0 top-0 h-full">
            <CzarSidebar
              {...sidebarProps}
              onClose={() => setShowSidebar(false)}
            />
          </div>
        </div>
      )}

      {/* Right-hand app area */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col">

        {/* Tab bar (desktop only) */}
        <CzarTabBar
          tabs={tabItems}
          activeId={conversationId}
          onSelect={(id) => { setConversationId(id); setAgentMsgId(null); setAgentDownloaded(false); }}
          onClose={closeTab}
          onNew={newChat}
        />

        {/* Minimal floating header */}
        <div className="relative flex items-center justify-between px-5 py-4 shrink-0">
          {/* Left: avatar (mobile opens drawer; desktop toggles collapse) */}
          <button
            onClick={() => {
              if (window.matchMedia("(min-width: 1024px)").matches) {
                setSidebarCollapsed((v) => !v);
              } else {
                setShowSidebar((v) => !v);
              }
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-[13px] hover:opacity-90 transition-opacity shrink-0"
            style={{ background: "var(--czar-accent)", color: "var(--czar-accent-fg)" }}
            title="Menu"
            aria-label="Open menu"
          >
            {displayName ? displayName[0].toUpperCase() : <CzarIcon size={15} />}
          </button>

          {/* Right: new chat + settings */}
          <div className="flex items-center gap-2">
            <button
              onClick={newChat}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
              style={{ background: "color-mix(in srgb, var(--czar-text) 8%, transparent)", color: "var(--czar-text-dim)" }}
              title="New chat"
              aria-label="New chat"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:opacity-90 transition-opacity"
              style={{ background: "color-mix(in srgb, var(--czar-text) 8%, transparent)", color: "var(--czar-text-dim)" }}
              title="Settings"
              aria-label="Settings"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          {/* Chat column */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <div className="flex-1 flex flex-col min-h-0 mx-auto w-full max-w-[820px]">

              {/* Agent run card */}
              {agentMsgId && (
                <CzarAgentRunCard
                  active={streaming}
                  words={(() => {
                    const m = messages.find((mm) => mm.id === agentMsgId);
                    if (!m?.content) return 0;
                    return m.content.trim().split(/\s+/).filter(Boolean).length;
                  })()}
                  files={(() => {
                    const m = messages.find((mm) => mm.id !== agentMsgId && messages.indexOf(mm) === messages.findIndex((x) => x.id === agentMsgId) - 1);
                    return m?.attachments?.length || 0;
                  })()}
                  imageJobs={Object.values(imageJobs).filter((s) => s === "loading").length}
                  downloaded={agentDownloaded}
                  onRedownload={() => {
                    if (!attachContent) return;
                    const sel = attachLastSel ?? { cover: true, references: true, appendix: false, images: true };
                    void downloadContent(buildAugmentedContent(attachContent, sel));
                  }}
                />
              )}

              {/* Welcome state — shown when no messages and not streaming */}
              {messages.length === 0 && !streaming ? (
                <div className="flex-1 flex flex-col px-5 sm:px-7 pt-2 select-none animate-fade-in">
                  <p className="text-[13px] sm:text-sm font-medium opacity-60 mb-1" style={{ color: "var(--czar-text)" }}>
                    Hi {displayName}
                  </p>
                  <h1 className="text-[28px] sm:text-4xl font-bold leading-[1.1] tracking-tight max-w-[14ch]" style={{ color: "var(--czar-text)" }}>
                    What's been on your mind lately?
                  </h1>
                </div>
              ) : (
                <CzarThread
                  messages={messages}
                  onRegenerate={regenerate}
                  onDownload={requestDownload}
                  onReattach={attachLastSel ? reopenAttach : undefined}
                  showWordCount={!!settings.show_word_count}
                  onFollowupPick={handleFollowupPick}
                  onClarifyConfirm={handleClarifyConfirm}
                  onClarifyReview={(_msgId, values) => {
                    if (streaming) return;
                    const summary = Object.entries(values)
                      .filter(([, v]) => v !== "" && v != null && !(Array.isArray(v) && v.length === 0))
                      .map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
                      .join("\n");
                    sendMessage(
                      `I'd like to review/adjust before approving. Current selections:\n${summary || "(none)"}\n\nWhat are my options here, and what do you recommend?`,
                      [],
                    );
                  }}
                  userName={displayName}
                  mode={mode}
                  onApprovePlan={handleApprovePlan}
                  showQuillCaret={settings.show_quill_caret !== false}
                  onHumanise={handleCzarHumanise}
                />
              )}
            </div>

            <CzarComposer
              ref={composerRef}
              onSend={sendMessage}
              onStop={stopStream}
              disabled={streaming || Object.values(imageJobs).some((s) => s === "loading")}
              streaming={streaming}
              thinkingMode={thinkingMode}
              onToggleThinking={() => setThinkingMode((t) => !t)}
              mode={mode}
              onModeChange={setMode}
              subscription={isAdmin ? { unlimited: true } : subscription}
              onUpgrade={isAdmin ? undefined : () => setShowUpgrade(true)}
              onOpenCorrections={() => setShowSupervisorModal(true)}
            />
          </div>
        </div>
      </div>

      {showSupervisorModal && (
        <SupervisorFeedbackModal
          open={showSupervisorModal}
          onClose={() => setShowSupervisorModal(false)}
          onApplied={(revisedContent, count) => {
            setShowSupervisorModal(false);
            const msgId = crypto.randomUUID();
            setMessages((prev) => [
              ...prev,
              { id: msgId, role: "assistant", content: revisedContent, streaming: false },
            ]);
            toast({ title: `Applied ${count} correction${count === 1 ? "" : "s"}` });
          }}
        />
      )}

      <CzarSettingsDrawer
        open={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onChange={setSettings}
        czarTier={subscription?.tier || "none"}
        isAdmin={isAdmin}
      />
      <CzarUpgradeModal open={!isAdmin && showUpgrade} onClose={() => setShowUpgrade(false)} />
      <ImageAckModal open={showImageAck} onAcknowledge={() => { ackImageNotice(); setShowImageAck(false); }} />
      <ImageProgressModal
        open={showImageProgress}
        info={(() => {
          const vals = Object.values(imageJobs);
          return {
            total: vals.length,
            done: vals.filter((v) => v === "done").length,
            failed: vals.filter((v) => v === "error").length,
            loading: vals.filter((v) => v === "loading").length,
          };
        })()}
        onWait={() => { /* hold */ }}
        onExit={() => { setShowImageProgress(false); setImageJobs({}); }}
      />
      <CzarAttachModal
        open={attachOpen}
        onClose={() => setAttachOpen(false)}
        onConfirm={handleAttachConfirm}
        hasCitations={hasCitations}
        hasImages={hasImages}
        initial={attachLastSel ?? undefined}
      />
      {/* Preview panel is rendered above (inline desktop split + mobile sheet). */}

      {/* Humaniser panel */}
      {czarHumanise && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-foreground/30 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-background border border-border rounded-2xl shadow-2xl p-5 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[15px] font-bold text-foreground flex items-center gap-2">
                  <Wand2 size={15} className="text-primary" />
                  AI Humaniser
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Rewrites this response to pass AI detection. Credits deducted from your word pack.
                </p>
              </div>
              <button
                onClick={() => { czarHumaniseAbortRef.current?.abort(); setCzarHumanise(null); setIsCzarHumanising(false); }}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Stage progress */}
            {czarHumaniseStages.length > 0 && (
              <div className="mb-4 space-y-1.5">
                {czarHumaniseStages.map(s => (
                  <div key={s.stage} className="flex items-center gap-2.5 text-[12px]">
                    <span className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold",
                      s.status === "done"    ? "bg-green-500/20 text-green-500" :
                      s.status === "running" ? "bg-primary/20 text-primary animate-pulse" :
                      "bg-secondary text-muted-foreground"
                    )}>
                      {s.status === "done" ? "✓" : s.status === "skipped" ? "−" : s.stage}
                    </span>
                    <span className={cn(
                      s.status === "running" ? "text-foreground font-medium" :
                      s.status === "done"    ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {s.label}
                    </span>
                    {s.status === "running" && <Loader2 size={11} className="animate-spin text-primary ml-auto" />}
                  </div>
                ))}
              </div>
            )}

            {/* Diff view */}
            {czarHumanisedText && czarHumaniseDiff && (
              <div className="mb-4">
                <style>{`
                  .czar-diff-del { background: rgba(239,68,68,0.18); color: #b91c1c; text-decoration: line-through; border-radius: 2px; padding: 0 1px; }
                  .dark .czar-diff-del { color: #f87171; }
                  .czar-diff-ins { background: rgba(34,197,94,0.18); color: #15803d; border-radius: 2px; padding: 0 1px; }
                  .dark .czar-diff-ins { color: #4ade80; }
                `}</style>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-foreground">{czarHumanisedText.trim().split(/\s+/).filter(Boolean).length.toLocaleString()} words</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-semibold">~ modified</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-semibold">+ added</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 font-semibold">– deleted</span>
                </div>
                <div className="overflow-y-auto max-h-[50vh] rounded-lg border border-border space-y-0.5 p-2 bg-background text-[13px] leading-relaxed">
                  {czarHumaniseDiff.map((para, i) => (
                    <div
                      key={i}
                      className={cn(
                        "px-2 py-1.5 rounded border-l-4",
                        para.type === "unchanged" ? "border-transparent" :
                        para.type === "modified"  ? "bg-amber-500/8 border-amber-500" :
                        para.type === "added"     ? "bg-emerald-500/10 border-emerald-500" :
                                                    "bg-red-500/10 border-red-500 opacity-70"
                      )}
                    >
                      {para.type === "modified" && para.diffHtml ? (
                        <p dangerouslySetInnerHTML={{ __html: para.diffHtml.replace(/diff-del/g, "czar-diff-del").replace(/diff-ins/g, "czar-diff-ins") }} />
                      ) : para.type === "deleted" ? (
                        <p className="line-through text-muted-foreground">{para.text}</p>
                      ) : (
                        <p>{para.text}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {!isCzarHumanising && !czarHumanisedText && (
                <button
                  onClick={handleStartCzarHumanise}
                  className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Wand2 size={13} />
                  Humanise response
                </button>
              )}
              {isCzarHumanising && (
                <button
                  onClick={() => { czarHumaniseAbortRef.current?.abort(); setIsCzarHumanising(false); setCzarHumaniseStages([]); }}
                  className="flex-1 h-9 rounded-lg bg-secondary text-foreground text-[13px] font-medium hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
                >
                  <StopCircle size={13} />
                  Cancel
                </button>
              )}
              {czarHumanisedText && (
                <>
                  <button
                    onClick={() => { setCzarHumanisedText(null); setCzarHumaniseDiff(null); setCzarHumaniseStages([]); }}
                    className="h-9 px-4 rounded-lg bg-secondary text-foreground text-[13px] font-medium hover:bg-secondary/80 transition-colors"
                  >
                    Retry
                  </button>
                  <button
                    onClick={handleApplyCzarHumanised}
                    className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <Check size={13} />
                    Apply humanised version
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
