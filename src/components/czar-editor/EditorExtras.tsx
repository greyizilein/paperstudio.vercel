import React, { useState, useEffect } from "react";
import { CZ_VOICES, CZ_SETTINGS_SECTIONS } from "./editorData";
import type { ImportedFile, DictationState } from "./editorHooks";

// ── Drop Zone Overlay ──────────────────────────────────────────────
export function CzDropOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="cz-dropzone">
      <span className="cz-dropzone-glyph">§</span>
      <p className="cz-dropzone-h">Drop to import</p>
      <p className="cz-dropzone-p">.txt · .md · .docx · .pdf · audio for transcription</p>
    </div>
  );
}

export function CzImportedChip({ file, onClose }: { file: ImportedFile | null; onClose: () => void }) {
  if (!file) return null;
  return (
    <div className="cz-imported">
      <span className="cz-imported-icon">§</span>
      <div className="cz-imported-body">
        <span className="cz-imported-name">Imported · {file.name}</span>
        <span className="cz-imported-meta">{file.kind} · {file.size} · {file.words}w added</span>
      </div>
      <button className="cz-imported-close" onClick={onClose}>×</button>
    </div>
  );
}

// ── Mic Waveform ──────────────────────────────────────────────────
export function CzMicWave({ count = 28 }: { count?: number }) {
  return (
    <div className="cz-mic-wave">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="cz-mic-wave-bar"
          style={{ animationDelay: `${i * 0.04}s`, height: `${20 + (i * 53) % 70}%` }}
        />
      ))}
    </div>
  );
}

// ── Mic Popover (desktop) ─────────────────────────────────────────
interface MicPopoverProps {
  open: boolean;
  dict: DictationState;
  onClose: () => void;
  onInsert?: (text: string) => void;
  style?: React.CSSProperties;
}
export function CzMicPopover({ open, dict, onClose, onInsert, style }: MicPopoverProps) {
  if (!open) return null;
  const mm = String(Math.floor(dict.seconds / 60)).padStart(2, "0");
  const ss = String(dict.seconds % 60).padStart(2, "0");
  return (
    <div className="cz-mic-pop" style={style}>
      <div className="cz-mic-head">
        <span className="cz-mic-dot" />
        <span className="cz-mic-h">Listening · <strong>dictation</strong></span>
        <span className="cz-mic-time">{mm}:{ss}</span>
      </div>
      <CzMicWave />
      <p className="cz-mic-transcript">
        <span className="cz-mic-final">{dict.final}</span>
        <span className="cz-mic-interim">{dict.interim}</span>
        <span className="cz-cursor" />
      </p>
      <div className="cz-mic-actions">
        <span className="cz-mic-lang">EN-US · auto-punctuate</span>
        <span className="cz-mic-spacer" />
        <button className="cz-mic-btn" onClick={onClose}>Cancel</button>
        <button className="cz-mic-btn" data-tone="primary"
          onClick={() => { onInsert?.(dict.final); onClose(); }}>Insert</button>
      </div>
    </div>
  );
}

// ── Settings Modal Panes ──────────────────────────────────────────
function CzModesPane({ activeVoice, setVoice }: { activeVoice: string; setVoice: (id: string) => void }) {
  return (
    <>
      <h2 className="cz-modal-pane-h">Writing modes</h2>
      <p className="cz-modal-pane-sub">
        A writing mode is a learned voice — a way of building sentences. Pick one to set the
        baseline for this draft. Czar reads against it as you write.
      </p>
      <div className="cz-mode-grid">
        {CZ_VOICES.map((v) => (
          <div key={v.id} className="cz-mode-card"
            data-active={activeVoice === v.id ? "true" : "false"}
            onClick={() => setVoice(v.id)}>
            <div className="cz-mode-card-head">
              <span className="cz-mode-card-glyph">{v.glyph}</span>
              <span className="cz-mode-card-name">{v.name}</span>
              <span className="cz-mode-card-tag">{v.tag}</span>
            </div>
            <p className="cz-mode-card-desc">{v.desc}</p>
            <div className="cz-mode-card-meters">
              {(["warmth", "formality", "brevity", "wit"] as const).map((m) => (
                <div key={m} className="cz-meter">
                  <span className="cz-meter-label">{m}</span>
                  <span className="cz-meter-bar" style={{ "--v": `${v.meters[m]}%` } as React.CSSProperties} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="cz-mode-train">
        <span className="cz-mode-train-icon">+</span>
        <div className="cz-mode-train-body">
          <p className="cz-mode-train-h">Train a new mode from your writing</p>
          <p className="cz-mode-train-p">Drop 3,000+ words and Czar will learn the rhythm — usually under a minute.</p>
        </div>
        <button>Train</button>
      </div>
    </>
  );
}

type PrefsState = {
  width: string; cursor: string; spell: string; focus: string; autosave: string;
  lang: string; punct: string; filler: string; apply: string;
};

function SegCtl({ prefs, setPrefs, k, opts }: {
  prefs: PrefsState; setPrefs: (p: PrefsState) => void;
  k: keyof PrefsState; opts: { value: string; label: string }[];
}) {
  return (
    <div className="cz-pref-segctl">
      {opts.map((o) => (
        <button key={o.value}
          data-active={prefs[k] === o.value ? "true" : "false"}
          onClick={() => setPrefs({ ...prefs, [k]: o.value })}>{o.label}</button>
      ))}
    </div>
  );
}

function CzEditorPane({ prefs, setPrefs }: { prefs: PrefsState; setPrefs: (p: PrefsState) => void }) {
  return (
    <>
      <h2 className="cz-modal-pane-h">Editor</h2>
      <p className="cz-modal-pane-sub">The small choices that add up to how the paper feels under your hands.</p>
      {([
        { label: "Paper width",   k: "width",    hint: "How wide the writing column is.",                opts: [{ value: "narrow", label: "Narrow · 56ch" }, { value: "medium", label: "Medium · 68ch" }, { value: "wide", label: "Wide · 80ch" }] },
        { label: "Cursor",        k: "cursor",   hint: "Blinking, steady, or typewriter.",               opts: [{ value: "blink", label: "Blink" }, { value: "steady", label: "Steady" }, { value: "typewriter", label: "Typewriter" }] },
        { label: "Spell check",   k: "spell",    hint: "Underline what looks wrong.",                    opts: [{ value: "on", label: "On" }, { value: "soft", label: "Soft" }, { value: "off", label: "Off" }] },
        { label: "Focus line",    k: "focus",    hint: "Highlight the current line, dim the rest.",      opts: [{ value: "off", label: "Off" }, { value: "line", label: "Line" }, { value: "paragraph", label: "Paragraph" }] },
        { label: "Autosave",      k: "autosave", hint: "When Czar writes to disk.",                      opts: [{ value: "live", label: "Every keystroke" }, { value: "30s", label: "Every 30s" }, { value: "manual", label: "Cmd-S only" }] },
      ] as { label: string; k: keyof PrefsState; hint: string; opts: { value: string; label: string }[] }[]).map(({ label, k, hint, opts }) => (
        <div className="cz-pref-row" key={label}>
          <div className="cz-pref-label">{label}<small>{hint}</small></div>
          <div className="cz-pref-control"><SegCtl prefs={prefs} setPrefs={setPrefs} k={k} opts={opts} /></div>
        </div>
      ))}
    </>
  );
}

function CzDictationPane({ prefs, setPrefs }: { prefs: PrefsState; setPrefs: (p: PrefsState) => void }) {
  return (
    <>
      <h2 className="cz-modal-pane-h">Dictation</h2>
      <p className="cz-modal-pane-sub">Speak it. Czar transcribes in your voice's idiom — not in flat machine prose.</p>
      <div className="cz-pref-row">
        <div className="cz-pref-label">Hot-key<small>Hold to dictate from anywhere in the editor.</small></div>
        <div className="cz-pref-control"><input className="cz-pref-text" defaultValue="⌥ Space" /></div>
      </div>
      {([
        { label: "Language",             k: "lang",   hint: "Dialect matters. Czar adjusts cadence.",             opts: [{ value: "en-us", label: "EN-US" }, { value: "en-gb", label: "EN-GB" }, { value: "es", label: "ES" }, { value: "fr", label: "FR" }] },
        { label: "Punctuation",          k: "punct",  hint: "Speak commas, or let Czar infer them.",             opts: [{ value: "auto", label: "Inferred" }, { value: "spoken", label: "Spoken" }] },
        { label: "Filler words",         k: "filler", hint: '"um," "like" — keep or quietly drop?',             opts: [{ value: "keep", label: "Keep" }, { value: "trim", label: "Trim" }, { value: "cut", label: "Cut" }] },
        { label: "Apply voice while dictating", k: "apply", hint: "Rewrite into the active mode as you go.",     opts: [{ value: "live", label: "Live" }, { value: "pause", label: "On pause" }, { value: "off", label: "Off" }] },
      ] as { label: string; k: keyof PrefsState; hint: string; opts: { value: string; label: string }[] }[]).map(({ label, k, hint, opts }) => (
        <div className="cz-pref-row" key={label}>
          <div className="cz-pref-label">{label}<small>{hint}</small></div>
          <div className="cz-pref-control"><SegCtl prefs={prefs} setPrefs={setPrefs} k={k} opts={opts} /></div>
        </div>
      ))}
    </>
  );
}

function CzImportPane() {
  return (
    <>
      <h2 className="cz-modal-pane-h">Import &amp; export</h2>
      <p className="cz-modal-pane-sub">Drag a file onto the page anywhere. Czar reads it, transcribes audio, and offers a tidy place to put it.</p>
      <div className="cz-pref-row">
        <div className="cz-pref-label">Accepts<small>Drop anywhere on the paper to import.</small></div>
        <div className="cz-pref-control" style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {[".txt", ".md", ".docx", ".pdf", ".rtf", ".html", ".epub", ".mp3", ".wav", ".m4a"].map((t) => (
            <span key={t} className="cz-doc-mode-pill" style={{ background: "transparent" }}>{t}</span>
          ))}
        </div>
      </div>
      <div className="cz-pref-row">
        <div className="cz-pref-label">Default export<small>Format that ⌘E reaches for first.</small></div>
        <div className="cz-pref-control">
          <div className="cz-pref-segctl">
            {["Markdown", "DOCX", "PDF", "HTML"].map((l) => (
              <button key={l} data-active={l === "Markdown" ? "true" : "false"}>{l}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="cz-pref-row">
        <div className="cz-pref-label">On import<small>What Czar does with the dropped file.</small></div>
        <div className="cz-pref-control">
          <div className="cz-pref-segctl">
            {[{ value: "cursor", label: "Insert at cursor" }, { value: "piece", label: "New piece" }, { value: "side", label: "Side-by-side" }].map((o) => (
              <button key={o.value} data-active={o.value === "piece" ? "true" : "false"}>{o.label}</button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function CzShortcutsPane() {
  const rows: [string, string][] = [
    ["Tighten paragraph", "⌘ ⇧ T"], ["Shift voice", "⌘ ⇧ V"], ["Continue from here", "⌘ ↵"],
    ["Dictate", "⌥ Space"], ["Quick import", "⌘ I"], ["Toggle focus mode", "⌘ ."],
    ["Save", "⌘ S"], ["Search piece", "⌘ F"],
  ];
  return (
    <>
      <h2 className="cz-modal-pane-h">Keyboard</h2>
      <p className="cz-modal-pane-sub">All shortcuts respect your OS modifier conventions.</p>
      {rows.map(([label, keys]) => (
        <div className="cz-pref-row" key={label}>
          <div className="cz-pref-label">{label}</div>
          <div className="cz-pref-control">
            <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, padding: "6px 10px", background: "var(--paper-2)", border: "1px solid var(--rule)", borderRadius: 6, color: "var(--ink)", letterSpacing: "0.06em" }}>{keys}</span>
          </div>
        </div>
      ))}
    </>
  );
}

function CzAccountPane() {
  return (
    <>
      <h2 className="cz-modal-pane-h">Account</h2>
      <p className="cz-modal-pane-sub">The bookkeeping bits.</p>
      <div className="cz-pref-row">
        <div className="cz-pref-label">Email</div>
        <div className="cz-pref-control"><input className="cz-pref-text" defaultValue="margaret@paperstudio.app" /></div>
      </div>
      <div className="cz-pref-row">
        <div className="cz-pref-label">Plan</div>
        <div className="cz-pref-control"><span className="cz-doc-mode-pill" style={{ width: "fit-content" }}>Studio · annual</span></div>
      </div>
    </>
  );
}

// ── Settings Modal ────────────────────────────────────────────────
interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  activeVoice: string;
  setVoice: (id: string) => void;
  initialSection?: string;
}
export function CzSettingsModal({ open, onClose, activeVoice, setVoice, initialSection = "modes" }: SettingsModalProps) {
  const [section, setSection] = useState(initialSection);
  const [prefs, setPrefs] = useState<PrefsState>({
    width: "medium", cursor: "blink", spell: "on", focus: "off", autosave: "30s",
    lang: "en-us", punct: "auto", filler: "trim", apply: "pause",
  });

  useEffect(() => { if (open) setSection(initialSection); }, [open, initialSection]);

  if (!open) return null;

  const groups: { label: string; key: "voice" | "app" | "meta" }[] = [
    { label: "Voice", key: "voice" },
    { label: "Application", key: "app" },
    { label: "Account", key: "meta" },
  ];

  return (
    <div className="cz-modal-backdrop" onClick={onClose}>
      <div className="cz-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cz-modal-bar">
          <div className="cz-modal-title">
            <span className="cz-modal-title-mark">Settings</span>
            <span className="cz-modal-title-sub">czar · drafting room</span>
          </div>
          <button className="cz-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="cz-modal-body">
          <nav className="cz-modal-nav">
            {groups.map((g) => (
              <React.Fragment key={g.key}>
                <div className="cz-modal-nav-sep">{g.label}</div>
                {CZ_SETTINGS_SECTIONS.filter((s) => s.group === g.key).map((s) => (
                  <div key={s.id} className="cz-modal-nav-item"
                    data-active={section === s.id ? "true" : "false"}
                    onClick={() => setSection(s.id)}>
                    <span className="cz-mn-glyph">{s.glyph}</span>
                    <span>{s.label}</span>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </nav>
          <div className="cz-modal-pane">
            {(section === "modes" || section === "train") && <CzModesPane activeVoice={activeVoice} setVoice={setVoice} />}
            {section === "editor"    && <CzEditorPane prefs={prefs} setPrefs={setPrefs} />}
            {section === "dictation" && <CzDictationPane prefs={prefs} setPrefs={setPrefs} />}
            {section === "import"    && <CzImportPane />}
            {section === "shortcuts" && <CzShortcutsPane />}
            {section === "account"   && <CzAccountPane />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Mobile Settings Sheet ─────────────────────────────────────────
interface MobileSettingsProps {
  open: boolean;
  onClose: () => void;
  activeVoice: string;
  setVoice: (id: string) => void;
}
export function CzMobileSettings({ open, onClose, activeVoice, setVoice }: MobileSettingsProps) {
  const [tab, setTab] = useState<"modes" | "editor" | "dictation">("modes");
  if (!open) return null;

  return (
    <div className="cz-m-sheet-backdrop" onClick={onClose}>
      <div className="cz-m-sheet" onClick={(e) => e.stopPropagation()}>
        <span className="cz-m-sheet-handle" />
        <div className="cz-m-sheet-h">
          <span>Settings</span>
          <button className="cz-m-sheet-close" onClick={onClose}>Done</button>
        </div>
        <div className="cz-m-sheet-tabs">
          {(["modes", "editor", "dictation"] as const).map((v) => (
            <button key={v} data-active={tab === v ? "true" : "false"} onClick={() => setTab(v)}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {tab === "modes" && (
          <>
            {CZ_VOICES.map((v) => (
              <div key={v.id} className="cz-voice-chip"
                data-active={activeVoice === v.id ? "true" : "false"}
                onClick={() => setVoice(v.id)}
                style={{ padding: "10px 12px", marginBottom: 7 }}>
                <span className="cz-voice-glyph" style={{ width: 28, height: 28, fontSize: 17 }}>{v.glyph}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cz-voice-name" style={{ fontSize: 13.5 }}>{v.name}</div>
                  <div className="cz-voice-tag" style={{ marginTop: 2 }}>{v.desc}</div>
                </div>
              </div>
            ))}
            <div className="cz-mode-train" style={{ marginTop: 14, padding: 12 }}>
              <span className="cz-mode-train-icon" style={{ width: 32, height: 32, fontSize: 18 }}>+</span>
              <div className="cz-mode-train-body">
                <p className="cz-mode-train-h" style={{ fontSize: 13 }}>Train a new mode</p>
                <p className="cz-mode-train-p" style={{ fontSize: 11 }}>Tap to upload writing samples.</p>
              </div>
              <button style={{ padding: "7px 12px", fontSize: 12 }}>Train</button>
            </div>
          </>
        )}

        {tab === "editor" && (
          <>
            {([
              { label: "Paper width", opts: ["narrow", "medium", "wide"],        active: "medium" },
              { label: "Spell check", opts: ["on", "soft", "off"],               active: "on" },
              { label: "Focus line",  opts: ["off", "line", "paragraph"],        active: "paragraph" },
              { label: "Autosave",    opts: ["live", "30s", "manual"],           active: "30s" },
              { label: "Theme",       opts: ["dark", "light"],                   active: "dark" },
            ]).map((p) => (
              <div className="cz-m-pref-row" key={p.label}>
                <div><div className="cz-m-pref-label">{p.label}</div></div>
                <div className="cz-pref-segctl" style={{ padding: 2 }}>
                  {p.opts.map((o) => <button key={o} data-active={o === p.active ? "true" : "false"}>{o}</button>)}
                </div>
              </div>
            ))}
          </>
        )}

        {tab === "dictation" && (
          <>
            {([
              { label: "Language",     opts: ["EN-US", "EN-GB", "ES", "FR"], active: "EN-US" },
              { label: "Punctuation",  opts: ["inferred", "spoken"],         active: "inferred" },
              { label: "Filler words", opts: ["keep", "trim", "cut"],        active: "trim" },
              { label: "Apply voice",  opts: ["live", "pause", "off"],       active: "pause" },
            ]).map((p) => (
              <div className="cz-m-pref-row" key={p.label}>
                <div><div className="cz-m-pref-label">{p.label}</div></div>
                <div className="cz-pref-segctl" style={{ padding: 2 }}>
                  {p.opts.map((o) => <button key={o} data-active={o === p.active ? "true" : "false"}>{o}</button>)}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ── Mobile Mic Panel ──────────────────────────────────────────────
interface MobileMicProps {
  open: boolean;
  dict: DictationState;
  onClose: () => void;
  onInsert?: (text: string) => void;
}
export function CzMobileMic({ open, dict, onClose, onInsert }: MobileMicProps) {
  if (!open) return null;
  const mm = String(Math.floor(dict.seconds / 60)).padStart(2, "0");
  const ss = String(dict.seconds % 60).padStart(2, "0");
  return (
    <div className="cz-m-mic">
      <div className="cz-m-mic-bar">
        <span className="cz-mic-dot" />
        <span className="cz-m-mic-h">Listening · <strong>{mm}:{ss}</strong></span>
        <button className="cz-m-mic-close" onClick={onClose}>×</button>
      </div>
      <div className="cz-m-mic-wave">
        {Array.from({ length: 22 }).map((_, i) => (
          <span key={i} className="cz-m-mic-wave-bar"
            style={{ animationDelay: `${i * 0.05}s`, height: `${30 + (i * 41) % 60}%` }} />
        ))}
      </div>
      <p className="cz-m-mic-transcript">
        <span>{dict.final}</span>
        <span className="cz-mic-interim">{dict.interim}</span>
      </p>
      <div className="cz-m-mic-actions">
        <button onClick={onClose}>Cancel</button>
        <button data-tone="primary" onClick={() => { onInsert?.(dict.final); onClose(); }}>Insert</button>
      </div>
    </div>
  );
}
