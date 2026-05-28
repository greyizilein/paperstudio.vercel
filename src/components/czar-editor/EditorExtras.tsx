import { useState, useEffect, useRef } from 'react';
import { CZ_VOICES } from './editorData';
import type { CzEditorPrefs, CzPanelSettings } from './useCzarEditor';
import type { ImportedFile } from './editorHooks';

// ── Mic wave ──────────────────────────────────────────────────
export function CzMicWave({ count = 28 }: { count?: number }) {
  return (
    <div className="cz-mic-wave">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="cz-mic-wave-bar"
              style={{ animationDelay: (i * 0.04) + 's', height: (20 + (i * 53) % 70) + '%' }} />
      ))}
    </div>
  );
}

// ── Mic popover (desktop) ──────────────────────────────────────
interface MicPopoverProps {
  open: boolean; live: boolean; seconds: number; final: string; interim: string;
  onClose: () => void; onInsert?: (text: string) => void; style?: React.CSSProperties;
}

export function CzMicPopover({ open, live: _live, seconds, final, interim, onClose, onInsert, style }: MicPopoverProps) {
  if (!open) return null;
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return (
    <div className="cz-mic-pop" style={style}>
      <div className="cz-mic-head">
        <span className="cz-mic-dot" />
        <span className="cz-mic-h">Listening · <strong>dictation</strong></span>
        <span className="cz-mic-time">{mm}:{ss}</span>
      </div>
      <CzMicWave />
      <p className="cz-mic-transcript">
        <span className="cz-mic-final">{final}</span>
        <span className="cz-mic-interim">{interim}</span>
        <span className="cz-cursor" />
      </p>
      <div className="cz-mic-actions">
        <span className="cz-mic-lang">EN-US · auto-punctuate</span>
        <span className="cz-mic-spacer" />
        <button className="cz-mic-btn" onClick={onClose}>Cancel</button>
        <button className="cz-mic-btn" data-tone="primary"
                onClick={() => { onInsert?.(final); onClose(); }}>Insert</button>
      </div>
    </div>
  );
}

// ── Drop zone overlay ──────────────────────────────────────────
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
  const isUploading = file.status === 'uploading';
  const isError = file.status === 'error';
  return (
    <div className="cz-imported" data-status={file.status}>
      <span className="cz-imported-icon">{isUploading ? '↑' : isError ? '!' : '§'}</span>
      <div className="cz-imported-body">
        <span className="cz-imported-name">
          {isUploading ? 'Uploading…' : isError ? 'Upload failed' : 'Imported'} · {file.name}
        </span>
        <span className="cz-imported-meta">
          {file.kind} · {file.size} · {isUploading ? 'processing…' : `${file.words}w`}
        </span>
      </div>
      {!isUploading && <button className="cz-imported-close" onClick={onClose}>×</button>}
    </div>
  );
}

// ── CzWritePanel — Instruction panel that exposes all CZAR modes ──────────────
interface WritePanelProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (instruction: string, settings: CzPanelSettings) => void;
  onCorrect: () => void;
  defaultPrefs: Pick<CzEditorPrefs, 'citation_style' | 'writing_level' | 'language_variant'>;
}

export function CzWritePanel({ open, onClose, onSubmit, onCorrect, defaultPrefs }: WritePanelProps) {
  const [mode, setMode] = useState<CzPanelSettings['mode']>('write');
  const [citation, setCitation] = useState(defaultPrefs.citation_style);
  const [level, setLevel] = useState(defaultPrefs.writing_level);
  const [language, setLanguage] = useState<CzPanelSettings['language']>(defaultPrefs.language_variant as any);
  const [formal, setFormal] = useState(false);
  const [sectionPause, setSectionPause] = useState(false);
  const [onlineLookup, setOnlineLookup] = useState(false);
  const [instruction, setInstruction] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => taRef.current?.focus(), 60);
  }, [open]);

  if (!open) return null;

  const ACADEMIC_MODES = ['write', 'research', 'plan', 'literature_review', 'legal'];
  const showAcademic = ACADEMIC_MODES.includes(mode);

  const placeholder =
    mode === 'correct' ? 'Click § Correct → to open the correction workflow…'
    : mode === 'screenplay' ? 'Describe the scene, story, characters, or act…'
    : mode === 'legal' ? 'Describe the legal matter, IRAC structure, or brief needed…'
    : mode === 'chat' ? 'Ask anything — or say "Generate a diagram of…" for images'
    : 'Tell Czar what to write — e.g. "2,500-word literature review on AI ethics. Harvard. PhD level."';

  const handleSubmit = () => {
    if (mode === 'correct') { onCorrect(); onClose(); return; }
    if (!instruction.trim()) return;
    onSubmit(instruction.trim(), {
      mode,
      citation_style: showAcademic ? citation : undefined,
      writing_level: showAcademic ? level : undefined,
      language,
      formal: formal || undefined,
      section_pause: sectionPause || undefined,
      online_lookup: onlineLookup || undefined,
    });
    setInstruction('');
    onClose();
  };

  return (
    <div className="cz-write-panel">
      <div className="cz-write-panel-header">
        <div className="cz-write-panel-selects">
          <select className="cz-write-panel-sel" value={mode} onChange={(e) => setMode(e.target.value as CzPanelSettings['mode'])}>
            <option value="write">Write</option>
            <option value="research">Research</option>
            <option value="plan">Plan</option>
            <option value="literature_review">Lit. Review</option>
            <option value="screenplay">Screenplay</option>
            <option value="legal">Legal</option>
            <option value="chat">Ask / Chat</option>
            <option value="correct">Correct →</option>
          </select>
          {showAcademic && (
            <select className="cz-write-panel-sel" value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="gcse">GCSE</option>
              <option value="alevel">A-Level</option>
              <option value="undergrad">Undergraduate</option>
              <option value="grad">Graduate</option>
              <option value="phd">PhD</option>
              <option value="professional">Professional</option>
            </select>
          )}
          {showAcademic && (
            <select className="cz-write-panel-sel" value={citation} onChange={(e) => setCitation(e.target.value)}>
              <option value="harvard">Harvard</option>
              <option value="apa">APA 7th</option>
              <option value="chicago">Chicago</option>
              <option value="mla">MLA</option>
              <option value="ieee">IEEE</option>
              <option value="vancouver">Vancouver</option>
              <option value="oscola">OSCOLA</option>
            </select>
          )}
          <select className="cz-write-panel-sel" value={language ?? 'british'} onChange={(e) => setLanguage(e.target.value as any)}>
            <option value="british">British English</option>
            <option value="american">American English</option>
            <option value="australian">Australian English</option>
            <option value="canadian">Canadian English</option>
          </select>
        </div>
        <div className="cz-write-panel-toggles">
          <button className="cz-write-panel-tog" data-active={formal ? 'true' : undefined}
                  title="No contractions, third person" onClick={() => setFormal(!formal)}>Formal</button>
          <button className="cz-write-panel-tog" data-active={sectionPause ? 'true' : undefined}
                  title="Write one section, then pause" onClick={() => setSectionPause(!sectionPause)}>§-by-§</button>
          <button className="cz-write-panel-tog" data-active={onlineLookup ? 'true' : undefined}
                  title="Enable web search" onClick={() => setOnlineLookup(!onlineLookup)}>Online</button>
          <button className="cz-write-panel-tog" onClick={onClose}
                  style={{ marginLeft: 6, fontWeight: 600, fontSize: 14, borderColor: 'transparent' }}>×</button>
        </div>
      </div>
      <div className="cz-write-panel-body">
        <textarea
          ref={taRef}
          className="cz-write-panel-ta"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder={placeholder}
          rows={2}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSubmit(); }}}
        />
        <button className="cz-write-panel-submit" onClick={handleSubmit}
                disabled={mode !== 'correct' && !instruction.trim()}>
          {mode === 'correct' ? '§ Correct →' : '§ Write →'}
        </button>
      </div>
    </div>
  );
}

// ── CzDownloadMenu — download format dropdown ─────────────────
export function CzDownloadMenu({ onDocx, onMarkdown }: { onDocx: () => void; onMarkdown: () => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="cz-dl-wrap" ref={wrapRef}>
      <button className="cz-cbtn" style={{ height: 30, fontSize: 13 }}
              title="Download" onClick={() => setOpen(!open)}>↓</button>
      {open && (
        <div className="cz-dl-menu">
          <div className="cz-dl-item" onClick={() => { onDocx(); setOpen(false); }}>
            <span className="cz-dl-item-glyph">W</span>
            <div>
              <div>Word document</div>
              <div className="cz-dl-item-sub">.docx · fully formatted</div>
            </div>
          </div>
          <div className="cz-dl-item" onClick={() => { onMarkdown(); setOpen(false); }}>
            <span className="cz-dl-item-glyph">§</span>
            <div>
              <div>Markdown</div>
              <div className="cz-dl-item-sub">.md · plain text</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Settings modal panes ──────────────────────────────────────
function CzModesPane({ activeVoice, setVoice }: { activeVoice: string; setVoice: (id: string) => void }) {
  return (
    <>
      <h2 className="cz-modal-pane-h">Writing voices</h2>
      <p className="cz-modal-pane-sub">
        A voice is a learned style — a way of building sentences. Pick one to set the
        baseline tone for AI writing. Czar reads against it as you type.
      </p>
      <div className="cz-mode-grid">
        {CZ_VOICES.map((v) => (
          <div key={v.id} className="cz-mode-card"
               data-active={activeVoice === v.id ? 'true' : undefined}
               onClick={() => setVoice(v.id)}>
            <div className="cz-mode-card-head">
              <span className="cz-mode-card-glyph">{v.glyph}</span>
              <span className="cz-mode-card-name">{v.name}</span>
              <span className="cz-mode-card-tag">{v.tag}</span>
            </div>
            <p className="cz-mode-card-desc">{v.desc}</p>
            <div className="cz-mode-card-meters">
              {(['warmth', 'formality', 'brevity', 'wit'] as const).map((k) => (
                <div key={k} className="cz-meter">
                  <span className="cz-meter-label" style={{ textTransform: 'capitalize' }}>{k}</span>
                  <span className="cz-meter-bar" style={{ '--v': v.meters[k] + '%' } as React.CSSProperties} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="cz-mode-train">
        <span className="cz-mode-train-icon">+</span>
        <div className="cz-mode-train-body">
          <p className="cz-mode-train-h">Train a new voice from your writing</p>
          <p className="cz-mode-train-p">Drop 3,000+ words and Czar will learn the rhythm — usually under a minute.</p>
        </div>
        <button>Train</button>
      </div>
    </>
  );
}

// ── Academic settings pane ────────────────────────────────────
function CzAcademicPane({ prefs, setPrefs }: { prefs: CzEditorPrefs; setPrefs: (patch: Partial<CzEditorPrefs>) => void }) {
  const AcSeg = ({ k, opts }: { k: keyof CzEditorPrefs; opts: { value: string; label: string }[] }) => (
    <div className="cz-academic-segctl">
      {opts.map((o) => (
        <button key={o.value} data-active={prefs[k] === o.value ? 'true' : undefined}
                onClick={() => setPrefs({ [k]: o.value } as Partial<CzEditorPrefs>)}>
          {o.label}
        </button>
      ))}
    </div>
  );
  return (
    <>
      <h2 className="cz-modal-pane-h">Academic settings</h2>
      <p className="cz-modal-pane-sub">
        Set your default citation style, writing level, and language. These apply to every
        AI writing operation and can be overridden per-prompt in the write panel.
      </p>
      {([
        { label: 'Writing level', sub: 'Calibrates complexity, vocabulary, and depth of argument.', k: 'writing_level' as const,
          opts: [{value:'gcse',label:'GCSE'},{value:'alevel',label:'A-Level'},{value:'undergrad',label:'Undergrad'},{value:'grad',label:'Grad'},{value:'phd',label:'PhD'},{value:'professional',label:'Professional'}] },
        { label: 'Citation style', sub: 'Reference format for all in-text and reference list citations.', k: 'citation_style' as const,
          opts: [{value:'harvard',label:'Harvard'},{value:'apa',label:'APA 7th'},{value:'chicago',label:'Chicago'},{value:'mla',label:'MLA'},{value:'ieee',label:'IEEE'},{value:'vancouver',label:'Vancouver'},{value:'oscola',label:'OSCOLA'}] },
        { label: 'Language variant', sub: 'Spelling conventions, idioms, and phrasing.', k: 'language_variant' as const,
          opts: [{value:'british',label:'British'},{value:'american',label:'American'},{value:'australian',label:'Australian'},{value:'canadian',label:'Canadian'}] },
        { label: 'Default tone', sub: 'Register Czar defaults to when generating text.', k: 'tone' as const,
          opts: [{value:'academic',label:'Academic'},{value:'professional',label:'Professional'},{value:'conversational',label:'Conversational'},{value:'creative',label:'Creative'}] },
      ] as const).map(({ label, sub, k, opts }) => (
        <div className="cz-pref-row" key={k}>
          <div className="cz-pref-label">{label}<small>{sub}</small></div>
          <div className="cz-pref-control"><AcSeg k={k} opts={opts as any} /></div>
        </div>
      ))}
    </>
  );
}

// ── Writing rules / toggles pane ──────────────────────────────
function CzTogglesPane({ prefs, setPrefs }: { prefs: CzEditorPrefs; setPrefs: (patch: Partial<CzEditorPrefs>) => void }) {
  const Toggle = ({ k, label, desc }: { k: keyof CzEditorPrefs; label: string; desc: string }) => (
    <div className="cz-toggle-row">
      <div className="cz-toggle-info">
        <div className="cz-toggle-row-label">{label}</div>
        <div className="cz-toggle-row-desc">{desc}</div>
      </div>
      <button className="cz-toggle-switch" data-active={prefs[k] ? 'true' : undefined}
              onClick={() => setPrefs({ [k]: !prefs[k] } as Partial<CzEditorPrefs>)} />
    </div>
  );

  const groups: { label: string; items: { k: keyof CzEditorPrefs; label: string; desc: string }[] }[] = [
    { label: 'Quality & Style', items: [
      { k: 'toggle_vary_sentence_length', label: 'Vary sentence length', desc: 'Mix short and long sentences; avoid robotic AI cadence' },
      { k: 'toggle_prefer_active_voice', label: 'Prefer active voice', desc: 'Use active voice; passive only when the agent is unknown' },
      { k: 'toggle_ban_filler', label: 'Ban filler phrases', desc: 'No "delve", "leverage", "plays a crucial role", "In conclusion"' },
      { k: 'toggle_no_contractions', label: 'No contractions', desc: 'Write "do not" not "don\'t"; "will not" not "won\'t"' },
      { k: 'toggle_oxford_comma', label: 'Oxford comma', desc: 'Use the serial comma in all lists' },
    ]},
    { label: 'Academic Rigour', items: [
      { k: 'toggle_formal_register', label: 'Formal register lock', desc: 'Academic register throughout; no casual asides or second-person' },
      { k: 'toggle_cite_every_claim', label: 'Cite every claim', desc: 'Every evidence-based claim must carry an in-text citation' },
      { k: 'toggle_sources_only_2018_plus', label: 'Recent sources only', desc: 'Cite only 2018+ sources (seminal works flagged as exceptions)' },
      { k: 'toggle_spell_out_acronyms', label: 'Spell out acronyms', desc: 'Write in full on first use: Artificial Intelligence (AI)' },
      { k: 'toggle_double_check_numbers', label: 'Double-check numbers', desc: 'Re-verify all statistics, percentages, and numerical claims' },
      { k: 'toggle_british_spelling', label: 'British spelling', desc: 'colour, organise, behaviour, centre (use with British language)' },
    ]},
    { label: 'Structure & Output', items: [
      { k: 'toggle_show_outline_first', label: 'Show outline first', desc: 'Display document outline before writing the body' },
      { k: 'toggle_section_pause', label: 'Section-by-section', desc: 'Write one section, then pause for your review' },
      { k: 'toggle_include_executive_summary', label: 'Executive summary', desc: 'Add 150–200 word executive summary before the main body' },
      { k: 'toggle_include_keywords', label: 'Keywords block', desc: 'Add 5–7 keyword terms beneath the abstract' },
      { k: 'toggle_include_word_count_per_section', label: 'Word count per section', desc: 'Append [400 words] to each section heading' },
      { k: 'toggle_auto_paragraph_break', label: 'Auto paragraph break', desc: 'Break paragraphs after 4–5 sentences' },
    ]},
    { label: 'Intelligence & Access', items: [
      { k: 'toggle_online_lookup', label: 'Online lookup', desc: 'Enable live web search for factual claims (chat mode)' },
      { k: 'toggle_thinking_mode', label: 'Deep thinking', desc: 'Use extended reasoning before drafting (premium — slower)' },
      { k: 'toggle_auto_detect_domain', label: 'Auto-detect domain', desc: 'Detect academic, legal, screenplay from context automatically' },
      { k: 'toggle_save_checkpoints', label: 'Save checkpoints', desc: 'Remember decisions and context across sessions' },
    ]},
  ];

  return (
    <>
      <h2 className="cz-modal-pane-h">Writing rules</h2>
      <p className="cz-modal-pane-sub">
        Fine-tune exactly how Czar writes. Each rule applies to every AI operation —
        or override them per-prompt in the write panel.
      </p>
      {groups.map((g) => (
        <div key={g.label}>
          <div className="cz-toggle-group-h">{g.label}</div>
          {g.items.map((item) => (
            <Toggle key={String(item.k)} k={item.k} label={item.label} desc={item.desc} />
          ))}
        </div>
      ))}
    </>
  );
}

function SegCtl({ k, prefs, setPrefs, opts }: {
  k: keyof CzEditorPrefs;
  prefs: CzEditorPrefs;
  setPrefs: (patch: Partial<CzEditorPrefs>) => void;
  opts: { value: string; label: string }[];
}) {
  return (
    <div className="cz-pref-segctl">
      {opts.map((o) => (
        <button key={o.value} data-active={prefs[k] === o.value ? 'true' : undefined}
                onClick={() => setPrefs({ [k]: o.value } as Partial<CzEditorPrefs>)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CzEditorPane({ prefs, setPrefs }: { prefs: CzEditorPrefs; setPrefs: (patch: Partial<CzEditorPrefs>) => void }) {
  return (
    <>
      <h2 className="cz-modal-pane-h">Editor</h2>
      <p className="cz-modal-pane-sub">The small choices that add up to how the paper feels under your hands.</p>
      {([
        { label: 'Paper width', sub: 'How wide the writing column is on the page.', k: 'width' as const,
          opts: [{ value: 'narrow', label: 'Narrow · 56ch' }, { value: 'medium', label: 'Medium · 68ch' }, { value: 'wide', label: 'Wide · 80ch' }] },
        { label: 'Cursor', sub: 'Blinking, steady, or the typewriter caret.', k: 'cursor' as const,
          opts: [{ value: 'blink', label: 'Blink' }, { value: 'steady', label: 'Steady' }, { value: 'typewriter', label: 'Typewriter' }] },
        { label: 'Spell check', sub: 'Underline what looks wrong. Czar still corrects under suggestions.', k: 'spell' as const,
          opts: [{ value: 'on', label: 'On' }, { value: 'soft', label: 'Soft' }, { value: 'off', label: 'Off' }] },
        { label: 'Focus line', sub: "Highlight the line you're typing on, dim the rest.", k: 'focus' as const,
          opts: [{ value: 'off', label: 'Off' }, { value: 'line', label: 'Line' }, { value: 'paragraph', label: 'Paragraph' }] },
        { label: 'Autosave', sub: 'When Czar writes to disk.', k: 'autosave' as const,
          opts: [{ value: 'live', label: 'Every keystroke' }, { value: '30s', label: 'Every 30s' }, { value: 'manual', label: 'Cmd-S only' }] },
      ] as const).map(({ label, sub, k, opts }) => (
        <div className="cz-pref-row" key={k}>
          <div className="cz-pref-label">{label}<small>{sub}</small></div>
          <div className="cz-pref-control"><SegCtl k={k} prefs={prefs} setPrefs={setPrefs} opts={opts as any} /></div>
        </div>
      ))}
    </>
  );
}

function CzDictationPane({ prefs, setPrefs }: { prefs: CzEditorPrefs; setPrefs: (patch: Partial<CzEditorPrefs>) => void }) {
  return (
    <>
      <h2 className="cz-modal-pane-h">Dictation</h2>
      <p className="cz-modal-pane-sub">Speak it. Czar transcribes in your voice's idiom — not in flat machine prose.</p>
      <div className="cz-pref-row">
        <div className="cz-pref-label">Hot-key<small>Hold to dictate from anywhere in the editor.</small></div>
        <div className="cz-pref-control"><input className="cz-pref-text" defaultValue="⌥ Space" /></div>
      </div>
      {([
        { label: 'Language', sub: 'Dialect matters. Czar adjusts cadence.', k: 'lang' as const,
          opts: [{ value: 'en-us', label: 'EN-US' }, { value: 'en-gb', label: 'EN-GB' }, { value: 'es', label: 'ES' }, { value: 'fr', label: 'FR' }] },
        { label: 'Punctuation', sub: 'Speak commas, or let Czar infer them.', k: 'punct' as const,
          opts: [{ value: 'auto', label: 'Inferred' }, { value: 'spoken', label: 'Spoken' }] },
        { label: 'Filler words', sub: '"um," "like," "you know" — keep or quietly drop?', k: 'filler' as const,
          opts: [{ value: 'keep', label: 'Keep' }, { value: 'trim', label: 'Trim' }, { value: 'cut', label: 'Cut' }] },
        { label: 'Apply voice while dictating', sub: 'Rewrite into the active writing mode as you go.', k: 'apply' as const,
          opts: [{ value: 'live', label: 'Live' }, { value: 'pause', label: 'On pause' }, { value: 'off', label: 'Off' }] },
      ] as const).map(({ label, sub, k, opts }) => (
        <div className="cz-pref-row" key={k}>
          <div className="cz-pref-label">{label}<small>{sub}</small></div>
          <div className="cz-pref-control"><SegCtl k={k} prefs={prefs} setPrefs={setPrefs} opts={opts as any} /></div>
        </div>
      ))}
    </>
  );
}

function CzImportPane() {
  return (
    <>
      <h2 className="cz-modal-pane-h">Import &amp; export</h2>
      <p className="cz-modal-pane-sub">Drag a file onto the page anywhere — or click the Import button in the ribbon. Czar reads it, transcribes audio if needed, and puts it in the document.</p>
      <div className="cz-pref-row">
        <div className="cz-pref-label">Accepts<small>Drop anywhere on the paper to import.</small></div>
        <div className="cz-pref-control" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {['.txt','.md','.docx','.pdf','.rtf','.html','.epub','.mp3','.wav','.m4a','.jpg','.png'].map((t) => (
            <span key={t} className="cz-doc-mode-pill" style={{ background: 'transparent' }}>{t}</span>
          ))}
        </div>
      </div>
      <div className="cz-pref-row">
        <div className="cz-pref-label">Primary export<small>What ↓ downloads first.</small></div>
        <div className="cz-pref-control">
          <div className="cz-pref-segctl">
            {['Word (.docx)','Markdown (.md)'].map((l) => (
              <button key={l} data-active={l === 'Word (.docx)' ? 'true' : undefined}>{l}</button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function CzShortcutsPane() {
  const rows: [string, string][] = [
    ['Tighten paragraph', '⌘ ⇧ T'], ['Open write panel', '⌘ ⇧ A'],
    ['Correct & improve', '⌘ ⇧ C'], ['Continue from here', '⌘ ⏎'],
    ['Dictate', '⌥ Space'], ['Save', '⌘ S'],
    ['Download', '⌘ E'], ['Settings', '⌘ ,'],
  ];
  return (
    <>
      <h2 className="cz-modal-pane-h">Keyboard</h2>
      <p className="cz-modal-pane-sub">All shortcuts respect your OS modifier conventions.</p>
      {rows.map(([label, keys]) => (
        <div className="cz-pref-row" key={label}>
          <div className="cz-pref-label">{label}</div>
          <div className="cz-pref-control">
            <span style={{
              fontFamily: 'var(--f-mono)', fontSize: 12, padding: '6px 10px',
              background: 'var(--paper-2)', border: '1px solid var(--rule)',
              borderRadius: 6, color: 'var(--ink)', width: 'fit-content', letterSpacing: '0.06em',
            }}>{keys}</span>
          </div>
        </div>
      ))}
    </>
  );
}

function CzAccountPane({ userEmail }: { userEmail?: string }) {
  return (
    <>
      <h2 className="cz-modal-pane-h">Account</h2>
      <p className="cz-modal-pane-sub">The bookkeeping bits.</p>
      <div className="cz-pref-row">
        <div className="cz-pref-label">Email</div>
        <div className="cz-pref-control">
          <input className="cz-pref-text" readOnly value={userEmail || '—'} />
        </div>
      </div>
      <div className="cz-pref-row">
        <div className="cz-pref-label">Plan</div>
        <div className="cz-pref-control">
          <span className="cz-doc-mode-pill" style={{ width: 'fit-content' }}>Studio · annual</span>
        </div>
      </div>
    </>
  );
}

const SECTIONS = [
  { id: 'modes',     label: 'Writing voices',  glyph: '§', group: 'voice' },
  { id: 'train',     label: 'Train a voice',   glyph: '+', group: 'voice' },
  { id: 'academic',  label: 'Academic',        glyph: '°', group: 'writing' },
  { id: 'toggles',   label: 'Writing rules',   glyph: '≡', group: 'writing' },
  { id: 'editor',    label: 'Editor',          glyph: '¶', group: 'app' },
  { id: 'dictation', label: 'Dictation',       glyph: '◉', group: 'app' },
  { id: 'import',    label: 'Import & export', glyph: '↓', group: 'app' },
  { id: 'shortcuts', label: 'Keyboard',        glyph: '⌘', group: 'app' },
  { id: 'account',   label: 'Account',         glyph: 'A', group: 'meta' },
] as const;

type SectionId = typeof SECTIONS[number]['id'];

interface SettingsModalProps {
  open: boolean; onClose: () => void;
  activeVoice: string; setVoice: (id: string) => void;
  initialSection?: SectionId;
  prefs: CzEditorPrefs; setPrefs: (patch: Partial<CzEditorPrefs>) => void;
  userEmail?: string;
}

export function CzSettingsModal({ open, onClose, activeVoice, setVoice, initialSection = 'modes', prefs, setPrefs, userEmail }: SettingsModalProps) {
  const [section, setSection] = useState<SectionId>(initialSection);
  useEffect(() => { if (open) setSection(initialSection); }, [open, initialSection]);
  if (!open) return null;

  const groups = [
    { label: 'Voice',       items: SECTIONS.filter((s) => s.group === 'voice') },
    { label: 'Writing',     items: SECTIONS.filter((s) => s.group === 'writing') },
    { label: 'Application', items: SECTIONS.filter((s) => s.group === 'app') },
    { label: 'Account',     items: SECTIONS.filter((s) => s.group === 'meta') },
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
              <div key={g.label}>
                <div className="cz-modal-nav-sep">{g.label}</div>
                {g.items.map((s) => (
                  <div key={s.id} className="cz-modal-nav-item"
                       data-active={section === s.id ? 'true' : undefined}
                       onClick={() => setSection(s.id as SectionId)}>
                    <span className="cz-mn-glyph">{s.glyph}</span>
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>
            ))}
          </nav>
          <div className="cz-modal-pane">
            {(section === 'modes' || section === 'train') && <CzModesPane activeVoice={activeVoice} setVoice={setVoice} />}
            {section === 'academic'  && <CzAcademicPane prefs={prefs} setPrefs={setPrefs} />}
            {section === 'toggles'   && <CzTogglesPane prefs={prefs} setPrefs={setPrefs} />}
            {section === 'editor'    && <CzEditorPane prefs={prefs} setPrefs={setPrefs} />}
            {section === 'dictation' && <CzDictationPane prefs={prefs} setPrefs={setPrefs} />}
            {section === 'import'    && <CzImportPane />}
            {section === 'shortcuts' && <CzShortcutsPane />}
            {section === 'account'   && <CzAccountPane userEmail={userEmail} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Mobile settings sheet ─────────────────────────────────────
interface MobileSettingsProps {
  open: boolean; onClose: () => void;
  activeVoice: string; setVoice: (id: string) => void;
  prefs: CzEditorPrefs; setPrefs: (patch: Partial<CzEditorPrefs>) => void;
}

export function CzMobileSettings({ open, onClose, activeVoice, setVoice, prefs, setPrefs }: MobileSettingsProps) {
  const [tab, setTab] = useState<'voices' | 'academic' | 'editor'>('voices');
  if (!open) return null;

  const prefRow = (label: string, k: keyof CzEditorPrefs, opts: string[]) => (
    <div className="cz-m-pref-row" key={label}>
      <div><div className="cz-m-pref-label">{label}</div></div>
      <div className="cz-pref-segctl" style={{ padding: 2 }}>
        {opts.map((o) => (
          <button key={o} data-active={prefs[k] === o ? 'true' : undefined}
                  onClick={() => setPrefs({ [k]: o } as Partial<CzEditorPrefs>)}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="cz-m-sheet-backdrop" onClick={onClose}>
      <div className="cz-m-sheet" onClick={(e) => e.stopPropagation()}>
        <span className="cz-m-sheet-handle" />
        <div className="cz-m-sheet-h">
          <span>Settings</span>
          <button className="cz-m-sheet-close" onClick={onClose}>Done</button>
        </div>
        <div className="cz-m-sheet-tabs">
          {(['voices', 'academic', 'editor'] as const).map((v) => (
            <button key={v} data-active={tab === v ? 'true' : undefined} onClick={() => setTab(v)}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'voices' && (
          <>
            {CZ_VOICES.map((v) => (
              <div key={v.id} className="cz-voice-chip" data-active={activeVoice === v.id ? 'true' : undefined}
                   onClick={() => setVoice(v.id)} style={{ padding: '10px 12px', marginBottom: 7 }}>
                <span className="cz-voice-glyph" style={{ width: 28, height: 28, fontSize: 17 }}>{v.glyph}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cz-voice-name" style={{ fontSize: 13.5 }}>{v.name}</div>
                  <div className="cz-voice-tag" style={{ marginTop: 2, fontSize: 11 }}>{v.desc}</div>
                </div>
              </div>
            ))}
            <div className="cz-mode-train" style={{ marginTop: 14, padding: 12 }}>
              <span className="cz-mode-train-icon" style={{ width: 32, height: 32, fontSize: 18 }}>+</span>
              <div className="cz-mode-train-body">
                <p className="cz-mode-train-h" style={{ fontSize: 13 }}>Train a new voice</p>
                <p className="cz-mode-train-p" style={{ fontSize: 11 }}>Tap to upload writing samples.</p>
              </div>
              <button style={{ padding: '7px 12px', fontSize: 12 }}>Train</button>
            </div>
          </>
        )}

        {tab === 'academic' && (
          <>
            {prefRow('Level', 'writing_level', ['gcse', 'alevel', 'undergrad', 'grad', 'phd', 'professional'])}
            {prefRow('Citation', 'citation_style', ['harvard', 'apa', 'chicago', 'mla', 'ieee', 'vancouver', 'oscola'])}
            {prefRow('Language', 'language_variant', ['british', 'american', 'australian', 'canadian'])}
            {prefRow('Tone', 'tone', ['academic', 'professional', 'conversational', 'creative'])}
          </>
        )}

        {tab === 'editor' && (
          <>
            {prefRow('Paper width', 'width', ['narrow', 'medium', 'wide'])}
            {prefRow('Spell check', 'spell', ['on', 'soft', 'off'])}
            {prefRow('Focus line', 'focus', ['off', 'line', 'paragraph'])}
            {prefRow('Autosave', 'autosave', ['live', '30s', 'manual'])}
            {prefRow('Language', 'lang', ['en-us', 'en-gb', 'es', 'fr'])}
          </>
        )}
      </div>
    </div>
  );
}

// ── Mobile fullscreen mic ─────────────────────────────────────
interface MobileMicProps {
  open: boolean; seconds: number; final: string; interim: string;
  onClose: () => void; onInsert?: (text: string) => void;
}

export function CzMobileMic({ open, seconds, final, interim, onClose, onInsert }: MobileMicProps) {
  if (!open) return null;
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
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
                style={{ animationDelay: (i * 0.05) + 's', height: (30 + (i * 41) % 60) + '%' }} />
        ))}
      </div>
      <p className="cz-m-mic-transcript">
        <span>{final}</span>
        <span className="cz-mic-interim">{interim}</span>
      </p>
      <div className="cz-m-mic-actions">
        <button onClick={onClose}>Cancel</button>
        <button data-tone="primary" onClick={() => { onInsert?.(final); onClose(); }}>Insert</button>
      </div>
    </div>
  );
}
