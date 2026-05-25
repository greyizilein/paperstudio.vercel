import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Moon, Sun, Settings, Plus, X, Mic, Loader2, Check, Copy, ChevronRight,
} from "lucide-react";
import { CzarIcon } from "@/components/icons/CzarIcon";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PsAvatar } from "@/components/ps/PsAvatar";
import { usePsTheme } from "@/contexts/PsThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { chatMarkdownComponents } from "@/lib/czarDocUtils.tsx";
import type { CzarMode } from "@/lib/czarStream";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MobileMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: string;
  streaming?: boolean;
  error?: boolean;
}

interface Conv { id: string; title: string; updated_at: string; }

interface CzarMobileSettings {
  citationStyle: string;
  writingLevel: string;
  language: string;
  autoDetectDomain: boolean;
  formalRegister: boolean;
  saveCheckpoints: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const MODE_OPTIONS: { num: number; mode: CzarMode; name: string; desc: string }[] = [
  { num: 1, mode: "chat",             name: "Chat",       desc: "Conversational — ask anything, get direct answers" },
  { num: 2, mode: "write",            name: "Write",      desc: "Generate essays, reports, stories, scripts" },
  { num: 3, mode: "correct",          name: "Correct",    desc: "Paste your text — CZAR critiques and improves it" },
  { num: 4, mode: "research",         name: "Research",   desc: "Gather sources, synthesise literature" },
  { num: 5, mode: "plan",             name: "Plan",       desc: "Outline and structure your document" },
  { num: 6, mode: "literature_review",name: "Lit Review", desc: "Systematic literature review synthesis" },
];

const CITE_STYLES = ["Harvard", "APA 7th", "Chicago", "Vancouver", "IEEE", "MLA"];
const WRITING_LEVELS = ["GCSE", "A-Level", "Undergraduate", "Graduate", "PhD", "Professional"];
const LANGUAGES = ["British English", "American English", "Australian English", "Canadian English"];

const DEFAULT_SETTINGS: CzarMobileSettings = {
  citationStyle: "Harvard",
  writingLevel: "Graduate",
  language: "British English",
  autoDetectDomain: true,
  formalRegister: false,
  saveCheckpoints: true,
};

function loadSettings(): CzarMobileSettings {
  try {
    const raw = localStorage.getItem("czar-mobile-settings");
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
}

function persistSettings(s: CzarMobileSettings) {
  localStorage.setItem("czar-mobile-settings", JSON.stringify(s));
}

const GROUP_ORDER = ["Today", "Yesterday", "This week", "Earlier"];

function groupLabel(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return "This week";
  return "Earlier";
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  messages: MobileMsg[];
  streaming: boolean;
  convId: string | null;
  mode: CzarMode;
  onModeChange: (m: CzarMode) => void;
  userName: string;
  userInitials: string;
  avatarUrl?: string;
  onSend: (text: string, files: File[], meta?: Record<string, any>) => void;
  onStop: () => void;
  onNewConv: () => void;
  onSelectConv: (id: string) => void;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function CzarMobileLayout({
  messages, streaming, convId, mode, onModeChange,
  userName, userInitials, avatarUrl,
  onSend, onStop, onNewConv, onSelectConv,
}: Props) {
  const navigate = useNavigate();
  const { mode: themeMode, toggleMode } = usePsTheme();
  const isDark = themeMode === "dark";
  const threadRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Panel states
  const [histOpen, setHistOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modeSheetOpen, setModeSheetOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionText, setCorrectionText] = useState("");

  // History list
  const [convs, setConvs] = useState<Conv[]>([]);

  // Input state
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [imageMode, setImageMode] = useState(false);

  // Settings
  const [settings, setSettings] = useState<CzarMobileSettings>(loadSettings);
  const [wordBalance, setWordBalance] = useState<number | null>(null);

  // Fetch conversation list whenever history opens
  useEffect(() => {
    if (!histOpen) return;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return;
      const { data } = await supabase
        .from("czar_conversations" as any)
        .select("id,title,updated_at")
        .eq("user_id", u.user.id)
        .order("updated_at", { ascending: false })
        .limit(40);
      if (data) setConvs(data as Conv[]);
    })();
  }, [histOpen]);

  // Fetch word balance once
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return;
      const { data } = await supabase
        .from("subscriptions" as any)
        .select("words_remaining")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (data) setWordBalance((data as any).words_remaining ?? null);
    })();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    requestAnimationFrame(() => {
      if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
    });
  }, [messages]);

  const updateSettings = useCallback((patch: Partial<CzarMobileSettings>) => {
    setSettings(prev => { const next = { ...prev, ...patch }; persistSettings(next); return next; });
  }, []);

  const buildMeta = useCallback((): Record<string, any> => ({
    citation_style: settings.citationStyle.toLowerCase().replace(/\s+/g, "_"),
    writing_level: settings.writingLevel.toLowerCase(),
    language: settings.language,
    formal_register: settings.formalRegister,
    auto_detect_domain: settings.autoDetectDomain,
    ...(imageMode ? { generateImage: true } : {}),
  }), [settings, imageMode]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setText("");
    setFiles([]);
    setImageMode(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    onSend(trimmed, files, buildMeta());
  }, [text, files, streaming, onSend, buildMeta]);

  const handleCorrectionSubmit = useCallback(() => {
    const trimmed = correctionText.trim();
    if (!trimmed) return;
    setCorrectionOpen(false);
    setCorrectionText("");
    onModeChange("correct");
    onSend(trimmed, [], { ...buildMeta() });
    setTimeout(() => onModeChange("chat"), 50);
  }, [correctionText, onSend, buildMeta, onModeChange]);

  const handleFileAttach = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  }, []);

  const hasMessages = messages.length > 0;
  const modeOpt = MODE_OPTIONS.find(o => o.mode === mode) ?? MODE_OPTIONS[0];

  // Group conversations by recency
  const groupedConvs = convs.reduce<Record<string, Conv[]>>((acc, c) => {
    const g = groupLabel(c.updated_at);
    (acc[g] ??= []).push(c);
    return acc;
  }, {});

  const anyPanelOpen = histOpen || settingsOpen || modeSheetOpen || correctionOpen;

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        background: isDark
          ? "radial-gradient(ellipse at 30% 40%, rgba(21,128,61,.22) 0%, transparent 60%), radial-gradient(ellipse at 75% 70%, rgba(20,83,45,.16) 0%, transparent 55%), hsl(var(--background))"
          : "radial-gradient(ellipse at 30% 40%, rgba(134,239,172,.45) 0%, transparent 60%), radial-gradient(ellipse at 75% 70%, rgba(187,247,208,.35) 0%, transparent 55%), radial-gradient(ellipse at 60% 20%, rgba(167,243,208,.25) 0%, transparent 50%), #f8fdf9",
      }}
    >

      {/* ── PERSISTENT TOP BAR — always visible ── */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 z-[70]"
        style={{
          paddingTop: "calc(14px + env(safe-area-inset-top, 0px))",
          paddingBottom: 10,
        }}
      >
        <div className="flex items-center gap-2">
          {/* Avatar → dashboard */}
          <button onClick={() => navigate("/dashboard")} className="flex-shrink-0">
            <PsAvatar initials={userInitials} sizeClass="w-10 h-10 text-[16px]" avatarUrl={avatarUrl} />
          </button>
          {/* History button */}
          <button
            onClick={() => setHistOpen(true)}
            className="w-8 h-8 rounded-full bg-black/[.07] dark:bg-white/10 flex items-center justify-center text-foreground/60 transition-colors active:bg-black/[.14]"
            aria-label="Conversations"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
              <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-0.5">
          {/* Day / Night toggle */}
          <button
            onClick={toggleMode}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-foreground/60 hover:bg-black/[.05] dark:hover:bg-white/10 transition-colors"
            aria-label={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {/* Settings */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-foreground/60 hover:bg-black/[.05] dark:hover:bg-white/10 transition-colors"
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* ── WELCOME SCREEN — only when no messages ── */}
      {!hasMessages && (
        <div className="flex-1 flex flex-col px-5 pt-4 overflow-hidden">
          <p className="text-[14px] text-muted-foreground mb-2">
            Hi {userName.split(" ")[0] || "there"}
          </p>
          <h1 className="text-[30px] font-extrabold leading-tight text-foreground max-w-[280px]">
            What's been on your mind lately?
          </h1>
        </div>
      )}

      {/* ── THREAD ── */}
      {hasMessages && (
        <div
          ref={threadRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-2"
          style={{ WebkitOverflowScrolling: "touch" as any }}
        >
          {messages.map(msg => (
            <MobileMessage key={msg.id} msg={msg} userInitials={userInitials} streaming={streaming} />
          ))}
        </div>
      )}

      {/* ── INPUT DOCK ── */}
      <div
        className="flex-shrink-0 px-3"
        style={{ paddingTop: 8, paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="bg-background/80 backdrop-blur-sm border border-border rounded-[18px] overflow-hidden shadow-sm">
          {/* Attach hint — clicking opens file picker */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[13px] text-muted-foreground border-b border-dashed border-border text-left"
          >
            <span className="text-[15px] opacity-60">📎</span>
            {files.length > 0
              ? <span className="text-foreground font-medium">{files.length} file{files.length > 1 ? "s" : ""} attached</span>
              : <span>Drag &amp; drop files, or tap to attach</span>
            }
            {files.length > 0 && (
              <button
                onClick={e => { e.stopPropagation(); setFiles([]); }}
                className="ml-auto text-muted-foreground hover:text-foreground"
              >
                <X size={13} />
              </button>
            )}
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileAttach} />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => {
              setText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
            }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={imageMode ? "Describe the image to generate…" : "Ask CZAR anything — essay, report, script, question… or type / for commands"}
            className="w-full min-h-[52px] max-h-[140px] px-3.5 pt-3 pb-1 border-0 outline-none resize-none text-[15px] text-foreground bg-transparent leading-relaxed placeholder:text-muted-foreground"
            rows={2}
          />

          {/* Input row */}
          <div className="flex items-center justify-between px-2.5 pb-2.5 pt-1.5 gap-2">
            {/* Mode button */}
            <button
              onClick={() => setModeSheetOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-border rounded-full text-[13px] font-medium text-foreground bg-secondary/40 active:bg-secondary transition-colors"
            >
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                {modeOpt.num}
              </span>
              {modeOpt.name}
            </button>

            <div className="flex items-center gap-0.5">
              {/* Image mode toggle */}
              <button
                onClick={() => setImageMode(p => !p)}
                title={imageMode ? "Cancel image generation" : "Generate image"}
                className={`w-8 h-8 rounded-[8px] flex items-center justify-center transition-colors ${imageMode ? "bg-primary/10 text-primary" : "text-muted-foreground active:bg-secondary"}`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </button>
              {/* Mic (placeholder) */}
              <button className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground active:bg-secondary transition-colors" title="Voice input">
                <Mic size={18} />
              </button>
              {/* Send / Stop — same button */}
              {streaming ? (
                <button
                  onClick={onStop}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-destructive text-white transition-all active:scale-90"
                  aria-label="Stop"
                >
                  <span className="w-3 h-3 rounded-[2px] bg-white" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!text.trim() && files.length === 0}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${(text.trim() || files.length > 0) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── SHARED BACKDROP ── */}
      {anyPanelOpen && (
        <div
          className="fixed inset-0 bg-foreground/30 z-[80]"
          onClick={() => { setHistOpen(false); setSettingsOpen(false); setModeSheetOpen(false); setCorrectionOpen(false); }}
        />
      )}

      {/* ── HISTORY PANEL — compact floating card ── */}
      <div
        className="fixed z-[100] bg-background border border-border rounded-2xl shadow-xl flex flex-col overflow-hidden"
        style={{
          top: "calc(16px + env(safe-area-inset-top, 0px))",
          left: 16,
          width: 268,
          maxHeight: "62vh",
          transformOrigin: "top left",
          transition: "opacity .2s, transform .2s",
          opacity: histOpen ? 1 : 0,
          transform: histOpen ? "scale(1) translateY(0)" : "scale(.92) translateY(-8px)",
          pointerEvents: histOpen ? "auto" : "none",
        }}
      >
        <div className="flex items-center justify-between px-3.5 py-3 border-b border-border flex-shrink-0">
          <span className="text-[13px] font-bold text-foreground">Conversations</span>
          <button onClick={() => setHistOpen(false)} className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary transition-colors">
            <X size={13} />
          </button>
        </div>
        <button
          onClick={() => { onNewConv(); setHistOpen(false); }}
          className="flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-semibold text-primary border-b border-border hover:bg-secondary/50 transition-colors w-full text-left"
        >
          <Plus size={13} />
          New conversation
        </button>
        <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" as any }}>
          {convs.length === 0 && (
            <p className="px-3.5 py-4 text-[12px] text-muted-foreground italic">No conversations yet</p>
          )}
          {GROUP_ORDER.filter(g => groupedConvs[g]?.length).map(group => (
            <div key={group}>
              <div className="px-3.5 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{group}</div>
              {groupedConvs[group].map(c => (
                <button
                  key={c.id}
                  onClick={() => { onSelectConv(c.id); setHistOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 border-b border-border text-[13px] transition-colors truncate block ${c.id === convId ? "bg-primary/5 border-l-2 border-l-primary text-foreground font-medium" : "text-foreground hover:bg-secondary/50"}`}
                  style={c.id === convId ? { paddingLeft: 12 } : undefined}
                >
                  {c.title || "Untitled"}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── SETTINGS SHEET ── slides up from bottom */}
      <div
        className="fixed inset-x-0 bottom-0 bg-background rounded-t-[20px] z-[90] overflow-y-auto"
        style={{
          maxHeight: "80vh",
          paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
          transform: settingsOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform .3s cubic-bezier(.4,0,.2,1)",
        }}
      >
        <div className="w-9 h-1 bg-border rounded-full mx-auto mt-3" />
        <div className="text-[16px] font-bold px-5 py-4 border-b border-border">Settings</div>

        <SettingsPickerRow label="Citation style" value={settings.citationStyle} options={CITE_STYLES}
          onChange={v => updateSettings({ citationStyle: v })} />
        <SettingsPickerRow label="Writing level" value={settings.writingLevel} options={WRITING_LEVELS}
          onChange={v => updateSettings({ writingLevel: v })} />

        {/* Language */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div>
            <div className="text-[15px] text-foreground">Language</div>
            <div className="text-[12px] text-muted-foreground mt-0.5">{settings.language}</div>
          </div>
          <select
            value={settings.language}
            onChange={e => updateSettings({ language: e.target.value })}
            className="text-[12px] text-muted-foreground bg-secondary border border-border rounded-lg px-2 py-1.5 outline-none cursor-pointer"
          >
            {LANGUAGES.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>

        <SettingsToggleRow label="Auto-detect domain" sub="Detects academic, fiction, professional…"
          value={settings.autoDetectDomain} onChange={v => updateSettings({ autoDetectDomain: v })} />
        <SettingsToggleRow label="Formal register" sub="No contractions, third person"
          value={settings.formalRegister} onChange={v => updateSettings({ formalRegister: v })} />
        <SettingsToggleRow label="Save checkpoints" sub="Remember context across sessions"
          value={settings.saveCheckpoints} onChange={v => updateSettings({ saveCheckpoints: v })} />

        {wordBalance !== null && (
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <div>
              <div className="text-[15px] text-foreground">Word balance</div>
              <div className="text-[12px] text-muted-foreground mt-0.5">{wordBalance.toLocaleString()} remaining</div>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </div>
        )}
      </div>

      {/* ── MODE PICKER ── slides up from bottom */}
      <div
        className="fixed inset-x-0 bottom-0 bg-background rounded-t-[20px] z-[90]"
        style={{
          paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
          transform: modeSheetOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform .3s cubic-bezier(.4,0,.2,1)",
        }}
      >
        <div className="w-9 h-1 bg-border rounded-full mx-auto mt-3" />
        <div className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground px-5 py-3.5 border-b border-border">
          Writing mode
        </div>
        {MODE_OPTIONS.map(opt => (
          <button
            key={opt.mode}
            onClick={() => {
              onModeChange(opt.mode);
              setModeSheetOpen(false);
              if (opt.mode === "correct") setTimeout(() => setCorrectionOpen(true), 280);
            }}
            className={`w-full flex items-center gap-3.5 px-5 py-3.5 border-b border-border text-left transition-colors ${mode === opt.mode ? "bg-primary/5" : "active:bg-secondary/50"}`}
          >
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0 border transition-colors"
              style={mode === opt.mode
                ? { background: "hsl(var(--primary))", borderColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }
                : { background: "hsl(var(--secondary))", borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }
              }
            >
              {opt.num}
            </span>
            <div>
              <div className="text-[15px] font-semibold text-foreground">{opt.name}</div>
              <div className="text-[12px] text-muted-foreground">{opt.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* ── CORRECTION MODAL ── slides up, pastes text */}
      <div
        className="fixed inset-x-0 bottom-0 bg-background rounded-t-[20px] z-[95] flex flex-col"
        style={{
          maxHeight: "88vh",
          paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
          transform: correctionOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform .3s cubic-bezier(.4,0,.2,1)",
        }}
      >
        <div className="w-9 h-1 bg-border rounded-full mx-auto mt-3 flex-shrink-0" />
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border flex-shrink-0">
          <span className="text-[16px] font-bold text-foreground">Correct text</span>
          <button onClick={() => { setCorrectionOpen(false); onModeChange("chat"); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
          <div>
            <div className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Paste your text</div>
            <textarea
              value={correctionText}
              onChange={e => setCorrectionText(e.target.value)}
              placeholder="Paste the paragraph or section you want CZAR to critique and improve…"
              className="w-full min-h-[140px] p-3 border border-border rounded-xl text-[15px] text-foreground bg-secondary/30 resize-none outline-none leading-relaxed focus:border-primary focus:bg-background transition-colors"
            />
          </div>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            CZAR will analyse your text for argument flow, citation completeness, register consistency, and structural fit — then return a revised version with a clear explanation of each change.
          </p>
        </div>
        <div className="px-5 pt-3 flex-shrink-0">
          <button
            onClick={handleCorrectionSubmit}
            className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl text-[15px] font-bold hover:opacity-90 transition-opacity"
          >
            Correct with CZAR
          </button>
        </div>
      </div>

    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SettingsToggleRow({
  label, sub, value, onChange,
}: { label: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
      <div>
        <div className="text-[15px] text-foreground">{label}</div>
        <div className="text-[12px] text-muted-foreground mt-0.5">{sub}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className="flex-shrink-0 rounded-full relative transition-colors"
        style={{ width: 44, height: 26, background: value ? "hsl(var(--primary))" : "hsl(var(--border))" }}
      >
        <span
          className="absolute top-[3px] w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200"
          style={{ left: 3, transform: value ? "translateX(18px)" : "translateX(0)" }}
        />
      </button>
    </div>
  );
}

function SettingsPickerRow({
  label, value, options, onChange,
}: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border">
      <button onClick={() => setOpen(p => !p)} className="w-full flex items-center justify-between px-5 py-3.5 text-left">
        <div>
          <div className="text-[15px] text-foreground">{label}</div>
          <div className="text-[12px] text-muted-foreground mt-0.5">{value}</div>
        </div>
        <ChevronRight size={16} className={`text-muted-foreground transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="pb-3 px-5 flex flex-wrap gap-2">
          {options.map(o => (
            <button
              key={o}
              onClick={() => { onChange(o); setOpen(false); }}
              className={`px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${o === value ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileMessage({ msg, userInitials, streaming }: { msg: MobileMsg; userInitials: string; streaming: boolean }) {
  const [copied, setCopied] = useState(false);

  if (msg.role === "user") {
    return (
      <div className="flex items-end justify-end gap-2 mb-6">
        <div className="bg-primary text-primary-foreground px-4 py-3 rounded-[20px_4px_20px_20px] text-[15px] leading-relaxed max-w-[calc(100%-48px)] break-words">
          {msg.content}
        </div>
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[13px] font-bold text-foreground flex-shrink-0">
          {userInitials[0] ?? "U"}
        </div>
      </div>
    );
  }

  const isCurrentlyStreaming = msg.streaming && streaming;

  return (
    <div className="flex items-start gap-2.5 mb-6">
      <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center flex-shrink-0 mt-0.5 text-foreground/80">
        <CzarIcon size={18} streaming={isCurrentlyStreaming} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold text-muted-foreground mb-1.5 tracking-wide">/ CZAR</div>
        {msg.streaming && !msg.content && (
          <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <Loader2 size={12} className="animate-spin" />
            <span>Thinking…</span>
          </div>
        )}
        {msg.content && (
          <div className="text-[15px] leading-[1.7] text-foreground prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={chatMarkdownComponents as any}>
              {msg.content}
            </ReactMarkdown>
          </div>
        )}
        {msg.streaming && msg.content && (
          <span className="inline-block w-[2px] h-4 bg-foreground align-middle ml-0.5 animate-pulse" />
        )}
        {!msg.streaming && !msg.error && msg.content && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(msg.content).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }}
            className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? <Check size={10} /> : <Copy size={10} />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    </div>
  );
}
