import { useState } from "react";
import {
  X, Check, ChevronRight, ChevronLeft,
  Palette, FileText, Cpu, Sliders, Info, BookOpen,
} from "lucide-react";
import { CZAR_THEMES, DEFAULT_THEME_ID } from "@/lib/czarThemes";
import { DEFAULT_MODEL_ID } from "@/lib/aiModels";

interface Props {
  open: boolean;
  onClose: () => void;
  settings: any;
  onChange: (s: any) => void;
  czarTier?: string;
  isAdmin?: boolean;
}

// CZAR model lineup. Some models are LOCKED to specific roles:
//   • Gemini 3 Pro      — image generation only (cannot be selected for chat)
//   • Claude Opus 4.6   — Agent mode only (cannot be selected outside Agent)
const CZAR_MODELS: Array<{ id: string; label: string; desc: string; provider: string; tag?: string; locked?: boolean; lockReason?: string }> = [
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", provider: "Anthropic", desc: "Default. Best academic prose, tools, long context." },
  { id: "gpt-5.2",           label: "GPT-5.2",            provider: "OpenAI",    desc: "Fast, capable everyday model." },
  { id: "gemini-2.5-flash",  label: "Gemini 2.5 Flash",   provider: "Google",    desc: "Fast multimodal model. Great for everyday tasks." },
  { id: "qwen3.6-plus",      label: "Qwen 3.6 Plus",      provider: "Alibaba",   desc: "Strong multilingual model with deep reasoning." },
  { id: "gpt-oss-120b",     label: "GPT OSS 120B",       provider: "Groq",      desc: "OpenAI open-source 120B model. Fast inference via Groq." },
  { id: "gemini-3-pro",      label: "Gemini 3 Pro",       provider: "Google",    desc: "Top-tier reasoning. Used internally for image generation only.", tag: "image-only", locked: true, lockReason: "Image generation only" },
  { id: "claude-opus-4-6",   label: "Claude Opus 4.6",    provider: "Anthropic", desc: "Heaviest reasoning. Unlocks automatically in Agent mode.", tag: "agent-only", locked: true, lockReason: "Unlocks in Agent mode" },
];

const TOGGLES = [
  { id: "allow_online_lookup",         label: "Allow online data lookup (live prices, current figures, recent news)" },
  { id: "no_contractions",             label: "Never use contractions in writing" },
  { id: "section_pause",               label: "Section-by-section pause (write one section, wait for 'continue')" },
  { id: "thinking_mode",               label: "Prefer deep thinking over speed" },
  { id: "cite_every_claim",            label: "Cite every evidence-based claim" },
  { id: "ban_filler",                  label: "Ban filler phrases (delve, tapestry, in conclusion…)" },
  { id: "vary_sentence_length",        label: "Force varied sentence rhythm" },
  { id: "british_spelling",            label: "Force British spelling" },
  { id: "oxford_comma",                label: "Use the Oxford comma" },
  { id: "show_word_count",             label: "Show running word count after each turn" },
  { id: "auto_export_each_section",    label: "Auto-prepare .docx after each section" },
  { id: "include_executive_summary",   label: "Add an executive summary at the top of long pieces" },
  { id: "prefer_active_voice",         label: "Prefer active voice" },
  { id: "remember_persona",            label: "Remember persona between chats" },
  { id: "redact_personal_data",        label: "Redact personal data from uploaded files" },
  { id: "store_uploads",               label: "Store uploaded files (off = process and discard)" },
  { id: "history_retention_30d",       label: "Auto-delete chats older than 30 days" },
  { id: "double_check_numbers",        label: "Double-check numerical claims" },
  { id: "sources_only_2018_plus",      label: "Only cite sources from 2018 onwards" },
  { id: "show_outline_first",          label: "Show me the outline before writing" },
  { id: "include_word_count_per_section", label: "Show target word count per section" },
{ id: "spell_out_acronyms",          label: "Spell out acronyms on first use" },
  { id: "include_keywords",            label: "Add keywords block under abstracts" },
  { id: "academic_register_lock",      label: "Lock to academic register (no casual asides)" },
  { id: "auto_paragraph_break",        label: "Break paragraphs after 4–5 sentences" },
];

const PICKERS = [
  { id: "language",       label: "Language variant",        options: ["UK", "US"] },
  { id: "citation_style", label: "Default citation style",  options: ["Harvard", "APA", "MLA", "OSCOLA", "Chicago", "none"] },
  { id: "tone",           label: "Default tone",            options: ["academic-postgraduate", "academic-undergraduate", "professional", "neutral", "creative"] },
  { id: "default_export", label: "Default export format",   options: ["docx", "pdf", "md", "txt"] },
];

type SectionId = "appearance" | "writing" | "reading" | "models" | "behaviour" | "about";

// Reading-mode pickers. Mirrors the maps in src/pages/Czar.tsx.
const READING_PICKERS: Array<{ id: string; label: string; options: Array<{ value: string; label: string }> }> = [
  { id: "reading_font", label: "Reading typeface", options: [
    { value: "system", label: "System default" },
    { value: "serif", label: "Serif (Source Serif)" },
    { value: "sans", label: "Sans (Inter)" },
    { value: "mono", label: "Mono (JetBrains Mono)" },
    { value: "dyslexic", label: "Dyslexia-friendly (OpenDyslexic)" },
    { value: "hyperlegible", label: "Hyperlegible (Atkinson)" },
  ]},
  { id: "reading_size", label: "Reading size", options: [
    { value: "XS", label: "XS · 13px" }, { value: "S", label: "S · 14px" },
    { value: "M", label: "M · 15px (default)" }, { value: "L", label: "L · 17px" },
    { value: "XL", label: "XL · 19px" }, { value: "XXL", label: "XXL · 22px" },
  ]},
  { id: "reading_leading", label: "Line height", options: [
    { value: "tight", label: "Tight" },
    { value: "comfortable", label: "Comfortable (default)" },
    { value: "relaxed", label: "Relaxed" },
  ]},
  { id: "reading_tracking", label: "Letter spacing", options: [
    { value: "default", label: "Default" }, { value: "loose", label: "Loose" }, { value: "looser", label: "Looser" },
  ]},
  { id: "reading_weight", label: "Text weight", options: [
    { value: "light", label: "Light" }, { value: "regular", label: "Regular (default)" },
    { value: "medium", label: "Medium" }, { value: "bold", label: "Bold" },
  ]},
  { id: "reading_tint", label: "Reading tint", options: [
    { value: "inherit", label: "Inherit theme" },
    { value: "cream", label: "Cream" },
    { value: "sepia", label: "Sepia" },
    { value: "mint", label: "Pale mint" },
    { value: "blue", label: "Pale blue" },
    { value: "hicontrast", label: "High contrast" },
  ]},
  { id: "reading_color", label: "Text colour", options: [
    { value: "inherit", label: "Inherit theme" },
    { value: "near-black", label: "Near-black" },
    { value: "dark-grey", label: "Dark grey" },
    { value: "charcoal", label: "Charcoal" },
    { value: "cream", label: "Cream-on-dark" },
  ]},
];

const READING_PRESETS: Array<{ id: string; label: string; desc: string; values: Record<string, any> }> = [
  { id: "dyslexia", label: "Dyslexia-friendly", desc: "OpenDyslexic · L · Relaxed · Loose · Cream tint",
    values: { reading_font: "dyslexic", reading_size: "L", reading_leading: "relaxed", reading_tracking: "loose",
              reading_weight: "regular", reading_tint: "cream", reading_color: "near-black",
              reading_justify: false, show_quill_caret: false } },
  { id: "editorial", label: "Focus / Editorial", desc: "Source Serif · M · Comfortable · Sepia tint",
    values: { reading_font: "serif", reading_size: "M", reading_leading: "comfortable", reading_tracking: "default",
              reading_weight: "regular", reading_tint: "sepia", reading_color: "near-black",
              reading_justify: false, show_quill_caret: true } },
  { id: "default", label: "Reset to default", desc: "Inherit theme typography",
    values: { reading_font: "system", reading_size: "M", reading_leading: "comfortable", reading_tracking: "default",
              reading_weight: "regular", reading_tint: "inherit", reading_color: "inherit",
              reading_justify: false, show_quill_caret: true } },
];

export function CzarSettingsDrawer({ open, onClose, settings, onChange, czarTier = "free", isAdmin = false }: Props) {
  const [section, setSection] = useState<SectionId | null>(null);
  if (!open) return null;
  const set = (k: string, v: any) => onChange({ ...settings, [k]: v });
  const activeTheme = settings.theme ?? DEFAULT_THEME_ID;
  const themeName = CZAR_THEMES.find((t) => t.id === activeTheme)?.name ?? "Default";
  const currentModelId = settings.model_id ?? DEFAULT_MODEL_ID;
  const claudeModelLabel = CZAR_MODELS.find((m) => m.id === currentModelId)?.label ?? "Claude Sonnet 4.6";

  const close = () => { setSection(null); onClose(); };

  const readingFontLabel = READING_PICKERS[0].options.find((o) => o.value === (settings.reading_font ?? "system"))?.label ?? "System default";
  const readingSummary = `${readingFontLabel} · ${settings.reading_size ?? "M"}`;
  const ROWS: Array<{ id: SectionId; Icon: typeof Palette; title: string; summary: string }> = [
    { id: "appearance", Icon: Palette,  title: "Appearance",       summary: themeName },
    { id: "reading",    Icon: BookOpen, title: "Reading",          summary: readingSummary },
    { id: "writing",    Icon: FileText, title: "Writing defaults", summary: `${settings.citation_style ?? "Harvard"} · ${settings.language ?? "UK"} · ${settings.tone ?? "Postgraduate"}` },
    { id: "models",     Icon: Cpu,      title: "AI model",         summary: claudeModelLabel },
    { id: "behaviour",  Icon: Sliders,  title: "Behaviour",        summary: `${TOGGLES.filter((t) => settings[t.id]).length} of ${TOGGLES.length} on` },
    { id: "about",      Icon: Info,     title: "About CZAR",       summary: `Tier: ${isAdmin ? "Admin" : czarTier}` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={close}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-md h-full overflow-y-auto"
        style={{ background: "var(--czar-bg-elev)", borderLeft: "1px solid var(--czar-border)", color: "var(--czar-text)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 px-4 py-3 flex items-center justify-between z-10"
          style={{ background: "var(--czar-bg-elev)", borderBottom: "1px solid var(--czar-border)" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {section && (
              <button
                onClick={() => setSection(null)}
                className="w-8 h-8 -ml-1 rounded-full flex items-center justify-center hover:opacity-80"
                style={{ color: "var(--czar-text-dim)" }}
                aria-label="Back"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <div className="font-semibold tracking-tight truncate">
              {section ? ROWS.find((r) => r.id === section)?.title : "Settings"}
            </div>
          </div>
          <button onClick={close} style={{ color: "var(--czar-text-dim)" }} className="hover:opacity-80 p-1" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* List view */}
        {!section && (
          <div className="p-3">
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "var(--czar-surface)", border: "1px solid var(--czar-border)" }}
            >
              {ROWS.map((row, i) => (
                <button
                  key={row.id}
                  onClick={() => setSection(row.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:opacity-90 transition-colors"
                  style={{
                    borderTop: i === 0 ? undefined : "1px solid var(--czar-border)",
                    background: "transparent",
                  }}
                >
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "var(--czar-bg)", color: "var(--czar-accent)" }}
                  >
                    <row.Icon size={15} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13.5px] font-medium" style={{ color: "var(--czar-text)" }}>{row.title}</span>
                    <span className="block text-[11px] truncate opacity-70" style={{ color: "var(--czar-text-dim)" }}>{row.summary}</span>
                  </span>
                  <ChevronRight size={16} style={{ color: "var(--czar-text-faint)" }} />
                </button>
              ))}
            </div>
            <p className="text-[10px] leading-relaxed mt-4 px-2" style={{ color: "var(--czar-text-faint)" }}>
              Settings apply to every new turn and sync across your devices via your account.
            </p>
          </div>
        )}

        {/* Detail: Appearance */}
        {section === "appearance" && (
          <div className="p-4 space-y-4">
            {(["Dark", "Light", "Vivid"] as const).map((cat) => (
              <div key={cat}>
                <div className="text-[10.5px] uppercase tracking-wider mb-2" style={{ color: "var(--czar-text-faint)" }}>{cat}</div>
                <div className="grid grid-cols-4 gap-2">
                  {CZAR_THEMES.filter((t) => t.category === cat).map((t) => {
                    const active = activeTheme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => set("theme", t.id)}
                        className="relative h-14 rounded-lg overflow-hidden transition-transform hover:scale-[1.03]"
                        style={{
                          background: t.vars["--czar-bg"],
                          border: active ? `2px solid ${t.vars["--czar-accent"]}` : `1px solid ${t.vars["--czar-border"]}`,
                        }}
                        title={t.name}
                      >
                        <div className="absolute inset-1 rounded flex items-end p-1.5" style={{
                          background: `linear-gradient(135deg, ${t.vars["--czar-bg"]} 0%, ${t.vars["--czar-surface"]} 60%, ${t.vars["--czar-accent"]} 100%)`,
                        }}>
                          <span className="text-[9px] font-medium" style={{ color: t.vars["--czar-text"] }}>{t.name}</span>
                        </div>
                        {active && (
                          <div className="absolute top-1 right-1 rounded-full p-0.5" style={{ background: t.vars["--czar-accent"] }}>
                            <Check size={9} style={{ color: t.vars["--czar-accent-fg"] }} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detail: Writing defaults */}
        {section === "writing" && (
          <div className="p-3 space-y-4">
            {PICKERS.map((p) => (
              <div key={p.id}>
                <div className="text-[10.5px] uppercase tracking-wider mb-2 px-1" style={{ color: "var(--czar-text-faint)" }}>{p.label}</div>
                <div className="rounded-2xl overflow-hidden" style={{ background: "var(--czar-surface)", border: "1px solid var(--czar-border)" }}>
                  {p.options.map((o, i) => {
                    const active = settings[p.id] === o;
                    return (
                      <button
                        key={o}
                        type="button"
                        onClick={() => set(p.id, o)}
                        className="w-full flex items-center justify-between gap-3 py-3 px-4 text-left transition-colors hover:opacity-90"
                        style={{ borderTop: i === 0 ? undefined : "1px solid var(--czar-border)" }}
                      >
                        <span className="text-[13px]" style={{ color: "var(--czar-text)" }}>{o}</span>
                        <span
                          className="shrink-0 inline-flex items-center justify-center rounded-full transition-all"
                          style={{
                            width: 18, height: 18,
                            background: active ? "var(--czar-accent)" : "transparent",
                            border: `1.5px solid ${active ? "var(--czar-accent)" : "var(--czar-border)"}`,
                          }}
                        >
                          {active && <Check size={11} strokeWidth={3} style={{ color: "var(--czar-accent-fg)" }} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detail: Reading (screen-only — does NOT affect downloads) */}
        {section === "reading" && (
          <div className="p-3 space-y-4">
            <p className="text-[10.5px] leading-relaxed px-1" style={{ color: "var(--czar-text-faint)" }}>
              Personal reading comfort. Affects on-screen prose only — downloads always use standard academic typography.
            </p>

            {/* Presets */}
            <div>
              <div className="text-[10.5px] uppercase tracking-wider mb-2 px-1" style={{ color: "var(--czar-text-faint)" }}>Quick presets</div>
              <div className="grid grid-cols-1 gap-1.5">
                {READING_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onChange({ ...settings, ...p.values })}
                    className="text-left px-3 py-2.5 rounded-xl hover:opacity-90 transition-colors"
                    style={{ background: "var(--czar-surface)", border: "1px solid var(--czar-border)" }}
                  >
                    <div className="text-[12.5px] font-medium" style={{ color: "var(--czar-text)" }}>{p.label}</div>
                    <div className="text-[10.5px]" style={{ color: "var(--czar-text-faint)" }}>{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Pickers */}
            {READING_PICKERS.map((p) => (
              <div key={p.id}>
                <div className="text-[10.5px] uppercase tracking-wider mb-2 px-1" style={{ color: "var(--czar-text-faint)" }}>{p.label}</div>
                <div className="rounded-2xl overflow-hidden" style={{ background: "var(--czar-surface)", border: "1px solid var(--czar-border)" }}>
                  {p.options.map((o, i) => {
                    const active = (settings[p.id] ?? p.options[0].value) === o.value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => set(p.id, o.value)}
                        className="w-full flex items-center justify-between gap-3 py-2.5 px-4 text-left transition-colors hover:opacity-90"
                        style={{ borderTop: i === 0 ? undefined : "1px solid var(--czar-border)" }}
                      >
                        <span className="text-[13px]" style={{ color: "var(--czar-text)" }}>{o.label}</span>
                        <span
                          className="shrink-0 inline-flex items-center justify-center rounded-full transition-all"
                          style={{
                            width: 18, height: 18,
                            background: active ? "var(--czar-accent)" : "transparent",
                            border: `1.5px solid ${active ? "var(--czar-accent)" : "var(--czar-border)"}`,
                          }}
                        >
                          {active && <Check size={11} strokeWidth={3} style={{ color: "var(--czar-accent-fg)" }} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Booleans */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--czar-surface)", border: "1px solid var(--czar-border)" }}>
              {[
                { id: "reading_justify",   label: "Justify body text" },
                { id: "show_quill_caret",  label: "Show animated quill while writing" },
              ].map((t, i) => {
                const on = !!settings[t.id];
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => set(t.id, !on)}
                    className="w-full flex items-center justify-between gap-3 py-3 px-4 text-left hover:opacity-90 transition-colors"
                    style={{ borderTop: i === 0 ? undefined : "1px solid var(--czar-border)" }}
                  >
                    <span className="text-[12.5px] flex-1" style={{ color: "var(--czar-text)" }}>{t.label}</span>
                    <span
                      role="checkbox"
                      aria-checked={on}
                      className="shrink-0 inline-flex items-center rounded-full transition-all"
                      style={{
                        width: 32, height: 18,
                        background: on ? "var(--czar-accent)" : "var(--czar-bg)",
                        border: `1px solid ${on ? "var(--czar-accent)" : "var(--czar-border)"}`,
                        padding: 1,
                      }}
                    >
                      <span
                        className="block rounded-full transition-transform"
                        style={{
                          width: 12, height: 12,
                          background: on ? "var(--czar-accent-fg)" : "var(--czar-text-faint)",
                          transform: on ? "translateX(14px)" : "translateX(0)",
                        }}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Detail: Models */}
        {section === "models" && (
          <div className="p-3">
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--czar-surface)", border: "1px solid var(--czar-border)" }}>
              {CZAR_MODELS.map((m, i) => {
                const active = currentModelId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={m.locked}
                    onClick={() => { if (!m.locked) set("model_id", m.id); }}
                    className="w-full flex items-center justify-between gap-3 py-3 px-4 text-left transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    title={m.locked ? m.lockReason : undefined}
                    style={{
                      borderTop: i === 0 ? undefined : "1px solid var(--czar-border)",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] flex items-center flex-wrap gap-2" style={{ color: "var(--czar-text)" }}>
                        <span>{m.label}</span>
                        <span className="text-[10px] opacity-60">{m.provider}</span>
                        {m.tag && (
                          <span className="text-[9.5px] uppercase tracking-wide rounded px-1.5 py-[1px]" style={{ background: "var(--czar-surface-elev)", border: "1px solid var(--czar-border)", color: "var(--czar-text-faint)" }}>
                            {m.tag === "image-only" ? "Image only" : m.tag === "agent-only" ? "Agent only" : m.tag === "data-analysis" ? "Data analysis only" : m.tag}
                          </span>
                        )}
                      </div>
                      <div className="text-[10.5px]" style={{ color: "var(--czar-text-faint)" }}>
                        {m.desc}{m.locked ? ` · ${m.lockReason}` : ""}
                      </div>
                    </div>
                    <span
                      className="shrink-0 inline-flex items-center justify-center rounded-full transition-all"
                      style={{
                        width: 18, height: 18,
                        background: active ? "var(--czar-accent)" : "transparent",
                        border: `1.5px solid ${active ? "var(--czar-accent)" : "var(--czar-border)"}`,
                      }}
                    >
                      {active && <Check size={11} strokeWidth={3} style={{ color: "var(--czar-accent-fg)" }} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Detail: Behaviour */}
        {section === "behaviour" && (
          <div className="p-3">
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--czar-surface)", border: "1px solid var(--czar-border)" }}>
              {TOGGLES.map((t, i) => {
                const on = !!settings[t.id];
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => set(t.id, !on)}
                    className="w-full flex items-center justify-between gap-3 py-3 px-4 text-left hover:opacity-90 transition-colors"
                    style={{ borderTop: i === 0 ? undefined : "1px solid var(--czar-border)" }}
                  >
                    <span className="text-[12.5px] flex-1" style={{ color: "var(--czar-text)" }}>{t.label}</span>
                    <span
                      aria-checked={on}
                      role="checkbox"
                      className="shrink-0 inline-flex items-center rounded-full transition-all"
                      style={{
                        width: 32, height: 18,
                        background: on ? "var(--czar-accent)" : "var(--czar-bg)",
                        border: `1px solid ${on ? "var(--czar-accent)" : "var(--czar-border)"}`,
                        padding: 1,
                      }}
                    >
                      <span
                        className="block rounded-full transition-transform"
                        style={{
                          width: 12, height: 12,
                          background: on ? "var(--czar-accent-fg)" : "var(--czar-text-faint)",
                          transform: on ? "translateX(14px)" : "translateX(0)",
                        }}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Detail: About */}
        {section === "about" && (
          <div className="p-4 space-y-3 text-[12.5px]" style={{ color: "var(--czar-text-dim)" }}>
            <div>
              <div className="text-[10.5px] uppercase tracking-wider mb-1" style={{ color: "var(--czar-text-faint)" }}>CZAR Tier</div>
              <div style={{ color: "var(--czar-text)" }}>{isAdmin ? "Admin (unlimited)" : czarTier}</div>
            </div>
            <div>
              <div className="text-[10.5px] uppercase tracking-wider mb-1" style={{ color: "var(--czar-text-faint)" }}>Version</div>
              <div style={{ color: "var(--czar-text)" }}>CZAR v1 · Sonnet 4.6 backbone</div>
            </div>
            <p className="text-[11.5px] leading-relaxed pt-2">
              CZAR is PaperStudio's autonomous academic and professional writing agent. It reads every uploaded file in full, decides on the optimal approach, and produces submission-ready output.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
