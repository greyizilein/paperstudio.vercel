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
import { streamCzarChat, streamDocCorrection, exportCorrectedDoc } from "@/lib/czarStream";
import { CzarDocCorrectModal } from "@/components/czar/CzarDocCorrectModal";
import { applyTheme, DEFAULT_THEME_ID } from "@/lib/czarThemes";
import { toast } from "@/hooks/use-toast";
import { Settings, Pencil, FileText } from "lucide-react";
import { CzarIcon } from "@/components/icons/CzarIcon";
import { ImageAckModal, ImageProgressModal, hasAckedImageNotice, ackImageNotice } from "@/components/ImageNoticeModal";
import { CzarAttachModal, type AttachSelection } from "@/components/czar/CzarAttachModal";
import { CzarAgentRunCard } from "@/components/czar/CzarAgentRunCard";
import { CzarPreviewPanel, type PreviewActivityItem } from "@/components/czar/CzarPreviewPanel";
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
  /** Set when this message was produced by the doc-correction pipeline. */
  correctionDocId?: string;
  /** Original filename of the corrected document. */
  correctionFilename?: string;
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
  // Doc correction pipeline state
  const [docEditMode, setDocEditMode] = useState(false);
  const [showDocCorrectModal, setShowDocCorrectModal] = useState(false);
  const [pendingDocEdit, setPendingDocEdit] = useState<{ text: string; attachments: CzarAttachment[] } | null>(null);
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
  // Live preview panel (Claude-artifact style) for doc corrections.
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [previewFilename, setPreviewFilename] = useState<string | null>(null);
  const [previewActivity, setPreviewActivity] = useState<PreviewActivityItem[]>([]);
  const [previewStreaming, setPreviewStreaming] = useState(false);
  // Resizable split — desktop only. Persisted across sessions.
  const [previewWidth, setPreviewWidth] = useState<number>(() => {
    if (typeof window === "undefined") return 560;
    const v = parseInt(localStorage.getItem("czar:preview-width") || "", 10);
    return Number.isFinite(v) ? Math.min(900, Math.max(360, v)) : 560;
  });
  const draggingRef = useRef(false);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("czar:preview-width", String(previewWidth));
  }, [previewWidth]);
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
          // Restore corrected-doc download button after reload.
          correctionDocId: m.metadata?.document_id,
          correctionFilename: m.metadata?.filename,
        };
      }));
    })();
    return () => { cancelled = true; };
  }, [conversationId, streaming]);

  // Reset the doc preview panel — call on chat switch / new chat / tab close.
  const resetPreview = useCallback(() => {
    setPreviewOpen(false);
    setPreviewDocId(null);
    setPreviewFilename(null);
    setPreviewActivity([]);
    setPreviewStreaming(false);
  }, []);

  const newChat = () => {
    if (streaming) abortRef.current?.abort();
    setConversationId(null);
    setMessages([]);
    setAgentMsgId(null);
    setAgentDownloaded(false);
    setShowSidebar(false);
    resetPreview();
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
    resetPreview();
  }, [resetPreview]);

  const closeTab = useCallback((id: string) => {
    setOpenTabs((prev) => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const next = prev.filter((x) => x !== id);
      if (id === conversationId) {
        const fallback = next[idx] || next[idx - 1] || null;
        setConversationId(fallback);
        resetPreview();
        if (!fallback) {
          setMessages([]);
          setAgentMsgId(null);
          setAgentDownloaded(false);
        }
      }
      return next;
    });
  }, [conversationId, resetPreview]);


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

  // ── Doc correction pipeline ───────────────────────────────────────────────
  const sendDocCorrection = useCallback(async (text: string, attachments: CzarAttachment[]) => {
    if (!user || streaming) return;
    const docAtt = attachments.find((a) => {
      const lower = a.filename.toLowerCase();
      return lower.endsWith(".docx") || lower.endsWith(".pdf") || a.mime.includes("officedocument.wordprocessingml") || a.mime === "application/pdf";
    });
    if (!docAtt) { sendMessage(text, attachments); return; }

    const userTempId = `u-${Date.now()}`;
    const asstTempId = `a-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: userTempId, role: "user", content: text, attachments },
      { id: asstTempId, role: "assistant", content: "", streaming: true, thinking: "" },
    ]);
    setStreaming(true);
    abortRef.current = new AbortController();
    setDocEditMode(false);

    // Reset + open the live preview panel for this correction.
    setPreviewActivity([]);
    setPreviewDocId(null);
    setPreviewFilename(docAtt.filename);
    setPreviewStreaming(true);
    setPreviewOpen(true);

    let correctionDocId: string | undefined;

    try {
      await streamDocCorrection(
        {
          storage_path: docAtt.path,
          filename: docAtt.filename,
          mime: docAtt.mime,
          user_message: text,
          conversation_id: conversationId,
          model_id: settings?.model_id ?? null,
        },
        {
          onMeta: (meta) => {
            correctionDocId = meta.document_id;
            setPreviewDocId(meta.document_id);
            setPreviewFilename(meta.filename);
            // Adopt server-assigned conversation_id so the chat persists in the sidebar
            // and a subsequent reload finds the assistant message + doc id.
            const serverConvId = (meta as any).conversation_id;
            if (serverConvId && serverConvId !== conversationId) {
              setConversationId(serverConvId);
              lastLoadedConvIdRef.current = serverConvId;
            }
            setMessages((prev) => prev.map((m) =>
              m.id === asstTempId
                ? { ...m, correctionDocId: meta.document_id, correctionFilename: meta.filename }
                : m,
            ));
          },
          onDelta: (chunk) => {
            // Stream reasoning/status into the chat thread (no document
            // contents — those go to the preview panel).
            setMessages((prev) => prev.map((m) =>
              m.id === asstTempId ? { ...m, content: m.content + chunk } : m,
            ));
          },
          onTool: (ev) => {
            // Translate every tool event into a friendly activity-log item
            // for the preview panel. We hide tool cards from the chat thread
            // because the panel is the source of truth.
            const evId = (ev as any)?.id || "";
            const phase = (ev as any)?.phase || "";
            const name = ((ev as any)?.name || "").toString();
            const input = (ev as any)?.input || {};
            const friendly =
              name === "apply_targeted_correction"
                ? `Editing: "${(input.original_text || "").slice(0, 60)}"`
                : name === "read_document_with_annotations"
                  ? "Reading document"
                  : name === "web_search"
                    ? `Searching: ${(input.query || "").slice(0, 60)}`
                    : name.replace(/_/g, " ");
            setPreviewActivity((prev) => {
              const existing = prev.find((p) => p.id === evId);
              if (existing) {
                return prev.map((p) =>
                  p.id === evId
                    ? {
                        ...p,
                        status: phase === "result" ? "done" : phase === "error" ? "error" : p.status,
                        detail: phase === "error" ? (ev as any).error : p.detail,
                      }
                    : p,
                );
              }
              return [
                ...prev.slice(-40),
                { id: evId, label: friendly, status: phase === "error" ? "error" : phase === "result" ? "done" : "running" },
              ];
            });
          },
          onCorrectionDone: (data) => {
            correctionDocId = data.document_id;
            setPreviewDocId(data.document_id);
            setPreviewFilename(data.filename);
            setMessages((prev) => prev.map((m) =>
              m.id === asstTempId
                ? { ...m, correctionDocId: data.document_id, correctionFilename: data.filename }
                : m,
            ));
          },
          onError: (msg) => {
            toast({ title: "Correction error", description: msg, variant: "destructive" });
            setMessages((prev) => prev.map((m) =>
              m.id === asstTempId ? { ...m, streaming: false, content: m.content || `⚠️ ${msg}` } : m,
            ));
          },
          onDone: () => {
            setMessages((prev) => prev.map((m) =>
              m.id === asstTempId
                ? { ...m, streaming: false, correctionDocId: correctionDocId || m.correctionDocId }
                : m,
            ));
            setPreviewStreaming(false);
          },
        },
        abortRef.current.signal,
      );
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast({ title: "Correction failed", description: e?.message || "Unknown error", variant: "destructive" });
      }
      setMessages((prev) => prev.map((m) => m.id === asstTempId ? { ...m, streaming: false } : m));
    } finally {
      setStreaming(false);
      setPreviewStreaming(false);
      abortRef.current = null;
    }
  }, [user, streaming, conversationId, sendMessage]);

  const handleSmartDocEdit = useCallback((text: string, attachments: CzarAttachment[]) => {
    setPendingDocEdit({ text, attachments });
    setShowDocCorrectModal(true);
  }, []);

  const handleDownloadCorrected = useCallback(async (documentId: string, fmt: "docx" | "pdf") => {
    toast({ title: "Preparing corrected document…" });
    try {
      const data = await exportCorrectedDoc(documentId, fmt);
      if (data.encoding !== "base64") throw new Error("Unexpected export response");
      const binary = atob(data.content);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const mimeType = fmt === "pdf" ? "text/html" : data.mimeType;
      const blob = new Blob([bytes], { type: mimeType });
      saveAs(blob, data.filename);
      toast({ title: "Downloaded", description: data.filename });
    } catch (e: any) {
      toast({ title: "Download failed", description: e?.message || "Unknown error", variant: "destructive" });
    }
  }, []);

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

        {/* Main content area. When the preview is closed, the chat takes the
            full width with no extra wrappers — closing fully restores the
            original Czar shell. When open on desktop, the chat shrinks and a
            draggable divider sits between it and the preview panel. On mobile
            the preview self-renders as a bottom sheet (see end of return). */}
        <div className={`flex-1 min-w-0 min-h-0 ${previewOpen ? "lg:flex lg:flex-row flex flex-col" : "flex flex-col"}`}>
          {/* Chat column */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <div className={`flex-1 flex flex-col min-h-0 mx-auto w-full ${previewOpen ? "lg:max-w-none max-w-[820px]" : "max-w-[820px]"}`}>

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
                  onDownloadCorrected={handleDownloadCorrected}
                  onOpenPreview={(documentId, filename) => {
                    setPreviewDocId(documentId);
                    setPreviewFilename(filename || null);
                    setPreviewActivity([]);
                    setPreviewStreaming(false);
                    setPreviewOpen(true);
                  }}
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
                />
              )}
            </div>

            <CzarComposer
              ref={composerRef}
              onSend={docEditMode ? sendDocCorrection : sendMessage}
              onStop={stopStream}
              disabled={streaming || Object.values(imageJobs).some((s) => s === "loading")}
              streaming={streaming}
              thinkingMode={thinkingMode}
              onToggleThinking={() => setThinkingMode((t) => !t)}
              mode={mode}
              onModeChange={setMode}
              subscription={isAdmin ? { unlimited: true } : subscription}
              onUpgrade={isAdmin ? undefined : () => setShowUpgrade(true)}
              docEditMode={docEditMode}
              onDocEditModeChange={setDocEditMode}
              onSmartDocEdit={handleSmartDocEdit}
            />
          </div>

          {/* Desktop split — draggable divider + sized preview column */}
          {previewOpen && (
            <>
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize document preview"
                className="hidden lg:block shrink-0 cursor-col-resize group"
                style={{ width: 6, background: "transparent" }}
                onPointerDown={(e) => {
                  draggingRef.current = true;
                  (e.target as HTMLElement).setPointerCapture(e.pointerId);
                  document.body.style.cursor = "col-resize";
                  document.body.style.userSelect = "none";
                }}
                onPointerMove={(e) => {
                  if (!draggingRef.current) return;
                  const next = Math.min(900, Math.max(360, window.innerWidth - e.clientX));
                  setPreviewWidth(next);
                }}
                onPointerUp={(e) => {
                  draggingRef.current = false;
                  try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
                  document.body.style.cursor = "";
                  document.body.style.userSelect = "";
                }}
              >
                <div
                  className="w-full h-full transition-colors group-hover:bg-[color-mix(in_srgb,var(--czar-text)_18%,transparent)]"
                  style={{ background: "color-mix(in srgb, var(--czar-text) 8%, transparent)" }}
                />
              </div>
              <div className="hidden lg:flex shrink-0" style={{ width: previewWidth }}>
                <CzarPreviewPanel
                  open={previewOpen}
                  documentId={previewDocId}
                  filename={previewFilename}
                  activity={previewActivity}
                  streaming={previewStreaming}
                  onClose={() => setPreviewOpen(false)}
                  onDownload={() => previewDocId && handleDownloadCorrected(previewDocId, "docx")}
                  inline
                />
              </div>
            </>
          )}
        </div>

        {/* Mobile bottom-sheet preview — rendered by the panel itself when isMobile. */}
        {previewOpen && (
          <div className="lg:hidden">
            <CzarPreviewPanel
              open={previewOpen}
              documentId={previewDocId}
              filename={previewFilename}
              activity={previewActivity}
              streaming={previewStreaming}
              onClose={() => setPreviewOpen(false)}
              onDownload={() => previewDocId && handleDownloadCorrected(previewDocId, "docx")}
            />
          </div>
        )}

        {/* Reopen pill — appears when the preview was closed but a document
            is still available, so the user can recover the doc panel after
            an accidental close. */}
        {!previewOpen && previewDocId && (
          <button
            onClick={() => setPreviewOpen(true)}
            className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-full shadow-2xl text-[12.5px] font-semibold animate-fade-in hover:scale-[1.03] active:scale-[0.97] transition-transform"
            style={{
              background: "var(--czar-accent)",
              color: "var(--czar-accent-fg)",
              boxShadow: "0 12px 32px -8px color-mix(in srgb, var(--czar-accent) 60%, transparent)",
            }}
            title="Reopen document preview"
            aria-label="Reopen document preview"
          >
            <FileText size={14} />
            <span className="max-w-[160px] truncate">{previewFilename || "Open document"}</span>
          </button>
        )}
      </div>


      {showDocCorrectModal && pendingDocEdit && (
        <CzarDocCorrectModal
          filename={pendingDocEdit.attachments.find((a) => {
            const l = a.filename.toLowerCase();
            return l.endsWith(".docx") || l.endsWith(".pdf");
          })?.filename || "document"}
          onEditInDoc={() => {
            setShowDocCorrectModal(false);
            sendDocCorrection(pendingDocEdit.text, pendingDocEdit.attachments);
            setPendingDocEdit(null);
          }}
          onContinueAsChat={() => {
            setShowDocCorrectModal(false);
            sendMessage(pendingDocEdit.text, pendingDocEdit.attachments);
            setPendingDocEdit(null);
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
    </div>
  );
}
