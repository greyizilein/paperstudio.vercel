import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CZ_VOICES } from './editorData';
import { useCzarEditor, type CzPiece, type CzOutlineItem, type CzSuggestion } from './useCzarEditor';
import { useCzDictation, useCzDropZone } from './editorHooks';
import { CzDropOverlay, CzImportedChip, CzMicPopover, CzSettingsModal } from './EditorExtras';
import { useAuth } from '@/contexts/AuthContext';

// ── Types ──────────────────────────────────────────────────────
interface FormatState {
  block: string; font: string; size: string;
  b: boolean; i: boolean; u: boolean; s: boolean;
  align: 'left' | 'center' | 'right' | 'justify';
  lh: string;
}

type SectionId = 'modes' | 'train' | 'editor' | 'dictation' | 'import' | 'shortcuts' | 'account';

const LANG_MAP: Record<string, string> = {
  'en-us': 'en-US', 'en-gb': 'en-GB', 'es': 'es-ES', 'fr': 'fr-FR',
};

function downloadDoc(title: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (title || 'untitled').replace(/[^a-zA-Z0-9 ._-]/g, '_') + '.md';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function relTime(date: Date | null): string {
  if (!date) return '';
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 8) return 'just now';
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

// ── Title Bar ────────────────────────────────────────────────
function CzTitlebar({ docTitle, setDocTitle, mode, setMode, onOpenSettings, onDownload, saving }: {
  docTitle: string;
  setDocTitle: (t: string) => void;
  mode: string;
  setMode: (m: string) => void;
  onOpenSettings: (section?: SectionId) => void;
  onDownload: () => void;
  saving: boolean;
}) {
  return (
    <div className="cz-titlebar">
      <div className="cz-brand">
        <div className="cz-brand-mark">czar</div>
        <div className="cz-brand-meta">drafting room</div>
      </div>
      <div className="cz-doc-title">
        <span
          className="cz-doc-name"
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => {
            const t = e.currentTarget.textContent?.trim();
            if (t && t !== docTitle) setDocTitle(t);
          }}
        >{docTitle}</span>
        <span className="cz-doc-sep">·</span>
        <span className="cz-doc-mode-pill">draft</span>
      </div>
      <div className="cz-titlebar-actions">
        <div className="cz-mode-tabs">
          {['Edit', 'Read', 'Voice'].map((m) => (
            <button key={m} data-active={mode === m.toLowerCase() ? 'true' : undefined}
              onClick={() => setMode(m.toLowerCase())}>{m}</button>
          ))}
        </div>
        <button className="cz-cbtn" style={{ height: 30, fontSize: 13 }}
                title="Download (⌘E)" onClick={onDownload}>↓</button>
        <button className="cz-cbtn" style={{ height: 30, fontSize: 15 }} title="Settings"
          onClick={() => onOpenSettings('modes')}>⚙</button>
        <button className="cz-cbtn" style={{
          height: 30, background: 'var(--primary)', color: 'var(--primary-ink)',
          fontWeight: 600, padding: '0 14px', borderColor: 'var(--primary)',
          opacity: saving ? 0.7 : 1,
        }}>Share</button>
      </div>
    </div>
  );
}

// ── Ribbon ────────────────────────────────────────────────────
function CzCGroup({ label, ai = false, children }: { label: string; ai?: boolean; children: React.ReactNode }) {
  return (
    <div className={'cz-cgroup' + (ai ? ' cz-cgroup-ai' : '')}>
      <div className="cz-cgroup-row">{children}</div>
      <div className="cz-cgroup-label">{label}</div>
    </div>
  );
}

function CzComposer({ format, setFormat, dictLive, onMicToggle, onOpenSettings, onTighten, onContinue, onStop, streaming, langLabel }: {
  format: FormatState;
  setFormat: (f: FormatState) => void;
  dictLive: boolean;
  onMicToggle: () => void;
  onOpenSettings: (section?: SectionId) => void;
  onTighten: () => void;
  onContinue: () => void;
  onStop: () => void;
  streaming: boolean;
  langLabel: string;
}) {
  const tog = (k: keyof FormatState) => setFormat({ ...format, [k]: !(format[k] as boolean) });
  const set = (k: keyof FormatState, v: string) => setFormat({ ...format, [k]: v });

  return (
    <div className="cz-composer">
      <CzCGroup label="Style">
        <select className="cz-csel cz-csel-wide" value={format.block} onChange={(e) => set('block', e.target.value)}>
          <option>Body — Fraunces 16</option>
          <option>Heading 1</option><option>Heading 2</option><option>Heading 3</option>
          <option>Pull quote</option><option>Lede paragraph</option>
        </select>
      </CzCGroup>
      <CzCGroup label="Font">
        <select className="cz-csel cz-csel-wide" value={format.font} onChange={(e) => set('font', e.target.value)}>
          <option>Fraunces</option><option>Inter</option><option>JetBrains Mono</option>
          <option>Georgia</option><option>Söhne</option>
        </select>
        <select className="cz-csel cz-csel-narrow" value={format.size} onChange={(e) => set('size', e.target.value)}>
          {['10','11','12','13','14','15','16','17','18','20','24','28','32'].map(s => <option key={s}>{s}</option>)}
        </select>
      </CzCGroup>
      <CzCGroup label="Format">
        <button className="cz-cbtn cz-cbtn-bold"   data-active={format.b ? 'true' : undefined} onClick={() => tog('b')}>B</button>
        <button className="cz-cbtn cz-cbtn-italic" data-active={format.i ? 'true' : undefined} onClick={() => tog('i')}>I</button>
        <button className="cz-cbtn cz-cbtn-under"  data-active={format.u ? 'true' : undefined} onClick={() => tog('u')}>U</button>
        <button className="cz-cbtn cz-cbtn-strike" data-active={format.s ? 'true' : undefined} onClick={() => tog('s')}>S</button>
        <button className="cz-cbtn" title="Small caps" style={{ fontVariant: 'small-caps', fontWeight: 600, fontSize: 11 }}>sc</button>
        <button className="cz-cbtn" title="Superscript" style={{ fontSize: 10 }}>x²</button>
      </CzCGroup>
      <CzCGroup label="Color">
        <button className="cz-cbtn cz-cbtn-color" title="Text color"
                style={{ '--swatch': 'var(--primary)' } as React.CSSProperties}>A</button>
        <button className="cz-cbtn cz-cbtn-color" title="Highlight"
                style={{ '--swatch': 'hsl(50 95% 70%)' } as React.CSSProperties}>
          <span style={{ background: 'hsl(50 95% 70% / 0.4)', padding: '0 3px', borderRadius: 2 }}>a</span>
        </button>
      </CzCGroup>
      <CzCGroup label="Align">
        <button className="cz-cbtn" data-active={format.align === 'left' ? 'true' : undefined}    onClick={() => set('align', 'left')}    title="Left">⫷</button>
        <button className="cz-cbtn" data-active={format.align === 'center' ? 'true' : undefined}  onClick={() => set('align', 'center')}  title="Center">⫶</button>
        <button className="cz-cbtn" data-active={format.align === 'right' ? 'true' : undefined}   onClick={() => set('align', 'right')}   title="Right">⫸</button>
        <button className="cz-cbtn" data-active={format.align === 'justify' ? 'true' : undefined} onClick={() => set('align', 'justify')} title="Justify">≡</button>
      </CzCGroup>
      <CzCGroup label="Flow">
        <select className="cz-csel cz-csel-narrow" value={format.lh} onChange={(e) => set('lh', e.target.value)} title="Line height">
          <option>1.4</option><option>1.5</option><option>1.65</option><option>1.8</option><option>2.0</option>
        </select>
        <button className="cz-cbtn" title="Indent">→|</button>
        <button className="cz-cbtn" title="Outdent">|←</button>
      </CzCGroup>
      <CzCGroup label="List">
        <button className="cz-cbtn" title="Bulleted">•</button>
        <button className="cz-cbtn" title="Numbered">1.</button>
        <button className="cz-cbtn" title="Quote">❝</button>
      </CzCGroup>
      <CzCGroup label="Insert">
        <button className="cz-cbtn" title="Link">↗</button>
        <button className="cz-cbtn" title="Footnote">†</button>
        <button className="cz-cbtn" title="Image">▣</button>
        <button className="cz-cbtn" title="Em-dash">—</button>
      </CzCGroup>
      <CzCGroup label="Czar AI" ai>
        {streaming ? (
          <button className="cz-cbtn" title="Stop" onClick={onStop}
                  style={{ color: 'var(--primary)', fontWeight: 700 }}>◼ Stop</button>
        ) : (
          <>
            <button className="cz-cbtn" title="Tighten" onClick={onTighten}><i>§</i> Tighten</button>
            <button className="cz-cbtn" title="Voice" onClick={() => onOpenSettings('modes')}><i>§</i> Voice…</button>
            <button className="cz-cbtn" title="Continue" onClick={onContinue}><i>§</i> Continue</button>
          </>
        )}
      </CzCGroup>
      <CzCGroup label="Dictate">
        <button className="cz-cbtn" data-live={dictLive ? 'true' : undefined}
                title="Dictate (⌥ Space)" onClick={onMicToggle} style={{ minWidth: 30, fontSize: 14 }}>
          {dictLive ? '◉' : '◎'}
        </button>
        <button className="cz-cbtn" title="Dictation settings"
                onClick={() => onOpenSettings('dictation')} style={{ fontSize: 11 }}>
          {langLabel}
        </button>
      </CzCGroup>
      <CzCGroup label="Import">
        <button className="cz-cbtn" title="Import file…" onClick={() => onOpenSettings('import')}>↓</button>
      </CzCGroup>
      <div className="cz-composer-spacer" />
      <CzCGroup label="Find">
        <button className="cz-cbtn" title="Find">⌕</button>
      </CzCGroup>
    </div>
  );
}

// ── Left rail ─────────────────────────────────────────────────
function CzRail({
  pieces, piecesLoading, piecesError, activePieceId, onSelectPiece, onCreatePiece,
  outline, onScrollTo, activeVoice, setVoice,
}: {
  pieces: CzPiece[];
  piecesLoading: boolean;
  piecesError: string | null;
  activePieceId: string | null;
  onSelectPiece: (id: string) => void;
  onCreatePiece: () => void;
  outline: CzOutlineItem[];
  onScrollTo: (offset: number) => void;
  activeVoice: string;
  setVoice: (id: string) => void;
}) {
  return (
    <aside className="cz-rail">
      <div className="cz-rail-section">
        <div className="cz-rail-heading">
          Pieces
          <button className="cz-rail-add" title="New piece" onClick={onCreatePiece}>+</button>
        </div>
        {piecesLoading && (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="cz-piece cz-piece-skeleton">
                <span className="cz-piece-dot" />
                <span className="cz-piece-name" style={{ width: `${60 + i * 15}%` }} />
              </div>
            ))}
          </>
        )}
        {!piecesLoading && piecesError && (
          <div style={{ fontSize: 11, color: 'var(--primary)', padding: '6px 0' }}>
            Couldn't load pieces
          </div>
        )}
        {!piecesLoading && !piecesError && pieces.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', padding: '6px 0' }}>
            No pieces yet
          </div>
        )}
        {!piecesLoading && pieces.map((p) => (
          <div key={p.id} className="cz-piece"
               data-active={p.id === activePieceId ? 'true' : undefined}
               onClick={() => !p.isPending && onSelectPiece(p.id)}
               style={{ opacity: p.isPending ? 0.5 : 1 }}>
            <span className="cz-piece-dot" />
            <span className="cz-piece-name">{p.name}</span>
            <span className="cz-piece-meta">{p.meta}</span>
          </div>
        ))}
      </div>

      {outline.length > 0 && (
        <div className="cz-rail-section">
          <div className="cz-rail-heading">Outline</div>
          {outline.map((o) => (
            <div key={o.id} className="cz-outline-item"
                 data-level={o.level} data-current={o.current ? 'true' : undefined}
                 onClick={() => onScrollTo(o.charOffset)}
                 style={{ cursor: 'pointer' }}>
              {o.text}
            </div>
          ))}
        </div>
      )}

      <div className="cz-rail-section">
        <div className="cz-rail-heading">
          Voice library
          <button className="cz-rail-add" title="Train new voice">+</button>
        </div>
        {CZ_VOICES.map((v) => (
          <div key={v.id} className="cz-voice-chip"
               data-active={activeVoice === v.id ? 'true' : undefined}
               onClick={() => setVoice(v.id)}>
            <span className="cz-voice-glyph">{v.glyph}</span>
            <span className="cz-voice-name">{v.name}</span>
            <span className="cz-voice-tag">{v.tag}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

// ── Canvas / leaf ─────────────────────────────────────────────
function CzLeaf({
  content, onChange, mode, docLoading, streaming, drop, textareaRef,
}: {
  content: string;
  onChange: (v: string) => void;
  mode: string;
  docLoading: boolean;
  streaming: boolean;
  drop: ReturnType<typeof useCzDropZone>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}) {
  return (
    <main className="cz-canvas" {...drop.handlers}>
      <CzDropOverlay visible={drop.dragOver} />
      <CzImportedChip file={drop.imported} onClose={() => drop.setImported(null)} />
      <article className="cz-leaf" data-streaming={streaming ? 'true' : undefined}>
        <div className="cz-leaf-runhead">
          <span>czar — drafting room</span>
          <span>{content ? `${content.trim().split(/\s+/).filter(Boolean).length} words` : 'empty'}</span>
        </div>

        {docLoading ? (
          <div className="cz-leaf-skeleton">
            <div style={{ width: '75%', height: 28, marginBottom: 16 }} />
            <div style={{ width: '55%', height: 18, marginBottom: 28 }} />
            <div style={{ width: '100%', height: 14, marginBottom: 8 }} />
            <div style={{ width: '97%', height: 14, marginBottom: 8 }} />
            <div style={{ width: '92%', height: 14, marginBottom: 8 }} />
            <div style={{ width: '85%', height: 14, marginBottom: 28 }} />
            <div style={{ width: '100%', height: 14, marginBottom: 8 }} />
            <div style={{ width: '94%', height: 14, marginBottom: 8 }} />
            <div style={{ width: '78%', height: 14, marginBottom: 8 }} />
          </div>
        ) : mode === 'edit' ? (
          content === '' ? (
            <div style={{ position: 'relative' }}>
              <textarea
                ref={textareaRef}
                className="cz-leaf-textarea"
                value={content}
                onChange={(e) => onChange(e.target.value)}
                spellCheck
                placeholder="Start writing, or click § Continue to let Czar begin for you."
              />
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              className="cz-leaf-textarea"
              value={content}
              onChange={(e) => onChange(e.target.value)}
              spellCheck
            />
          )
        ) : (
          <div className="cz-leaf-render">
            {content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            ) : (
              <p style={{ color: 'var(--ink-faint)', fontStyle: 'italic' }}>
                Nothing here yet. Switch to Edit mode to start writing.
              </p>
            )}
          </div>
        )}
      </article>
    </main>
  );
}

// ── Inspector ─────────────────────────────────────────────────
function CzMeter({ label, value }: { label: string; value: number }) {
  return (
    <div className="cz-meter">
      <span className="cz-meter-label">{label}</span>
      <span className="cz-meter-bar" style={{ '--v': value + '%' } as React.CSSProperties}>
        <span className="cz-meter-tick" style={{ left: '50%' }} />
      </span>
      <span className="cz-meter-val">{value}</span>
    </div>
  );
}

function CzInspector({
  voice, length, setLength, audience, setAudience,
  suggestions, suggestionsLoading, wordCount, readingTime,
  onAcceptSuggestion, onDismissSuggestion, onTriggerSuggest,
}: {
  voice: string;
  length: string;
  setLength: (l: string) => void;
  audience: string;
  setAudience: (a: string) => void;
  suggestions: CzSuggestion[];
  suggestionsLoading: boolean;
  wordCount: number;
  readingTime: string;
  onAcceptSuggestion: (id: string) => void;
  onDismissSuggestion: (id: string) => void;
  onTriggerSuggest: () => void;
}) {
  const v = CZ_VOICES.find((x) => x.id === voice) || CZ_VOICES[0];
  const pending = suggestions.filter((s) => s.status === 'pending');

  return (
    <aside className="cz-inspector">
      <div className="cz-insp-section">
        <div className="cz-insp-h">
          The voice
          <button className="cz-insp-h-action">tune</button>
        </div>
        <div className="cz-voice-card">
          <div className="cz-voice-card-head">
            <span className="cz-voice-card-name">{v.name}</span>
            <span className="cz-voice-card-tag">{v.tag}</span>
          </div>
          <p className="cz-voice-card-desc">{v.desc}</p>
          <CzMeter label="Warmth"    value={v.meters.warmth} />
          <CzMeter label="Formality" value={v.meters.formality} />
          <CzMeter label="Brevity"   value={v.meters.brevity} />
          <CzMeter label="Wit"       value={v.meters.wit} />
        </div>
      </div>
      <div className="cz-insp-section">
        <div className="cz-insp-h">Audience &amp; length</div>
        <div className="cz-insp-row">
          <label>Writing for</label>
          <input type="text" value={audience} onChange={(e) => setAudience(e.target.value)}
                 placeholder="Who are you writing for?" />
        </div>
        <div className="cz-insp-row">
          <label>Target length</label>
          <div className="cz-length-pill">
            {(['short', 'medium', 'long', 'epic'] as const).map((l) => (
              <button key={l} data-active={length === l ? 'true' : undefined} onClick={() => setLength(l)}>{l}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="cz-insp-section">
        <div className="cz-insp-h">
          Czar is reading
          <button className="cz-insp-h-action" onClick={onTriggerSuggest}>
            {suggestionsLoading ? '…' : String(pending.length) || 'scan'}
          </button>
        </div>
        {suggestionsLoading && (
          <>
            {[1, 2].map((i) => (
              <div key={i} className="cz-sugg cz-sugg-skeleton">
                <div style={{ width: '60%', height: 12, marginBottom: 6 }} />
                <div style={{ width: '90%', height: 12, marginBottom: 4 }} />
                <div style={{ width: '80%', height: 12 }} />
              </div>
            ))}
          </>
        )}
        {!suggestionsLoading && pending.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-2)', flexShrink: 0, display: 'inline-block' }} />
            No suggestions · your writing is clean
          </div>
        )}
        {!suggestionsLoading && pending.map((s) => (
          <div key={s.id} className="cz-sugg" data-tone={s.kind}>
            <div className="cz-sugg-kind">
              <span>{s.kind === 'voice' ? 'Voice shift' : s.kind === 'grammar' ? 'Grammar' : 'Cut'}</span>
              <span className="cz-sugg-tone-tag">{s.tone}</span>
            </div>
            <p className="cz-sugg-was">{s.was}</p>
            <p className="cz-sugg-now">{s.now}</p>
            <div className="cz-sugg-actions">
              <button className="cz-sugg-yes" onClick={() => onAcceptSuggestion(s.id)}>Accept</button>
              <button onClick={() => onDismissSuggestion(s.id)}>Dismiss</button>
            </div>
          </div>
        ))}
      </div>
      <div className="cz-insp-section">
        <div className="cz-insp-h">The shape of it</div>
        <div className="cz-stats">
          <div className="cz-stat">
            <div className="cz-stat-val">{wordCount > 0 ? wordCount.toLocaleString() : '—'}</div>
            <div className="cz-stat-lbl">words</div>
          </div>
          <div className="cz-stat">
            <div className="cz-stat-val">{wordCount > 0 ? readingTime : '—'}</div>
            <div className="cz-stat-lbl">to read</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ── Status bar ────────────────────────────────────────────────
function CzStatus({ wordCount, saveStatus, savedAt, onManualSave, spell, focus }: {
  wordCount: number;
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'error';
  savedAt: Date | null;
  onManualSave: () => void;
  spell: string;
  focus: string;
}) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (saveStatus !== 'saved') return;
    const t = setInterval(() => tick(n => n + 1), 15_000);
    return () => clearInterval(t);
  }, [saveStatus]);

  const saveLabel = saveStatus === 'saving' ? 'Saving…'
    : saveStatus === 'error' ? 'Save failed'
    : saveStatus === 'unsaved' ? 'Unsaved changes'
    : savedAt ? `Saved · ${relTime(savedAt)}`
    : 'Saved';

  return (
    <div className="cz-status">
      <span>
        <span className="cz-status-dot"
              style={{ background: saveStatus === 'error' ? 'hsl(0 60% 55%)' : saveStatus === 'saving' ? 'var(--accent-1)' : undefined }} />
        {' '}
        {saveStatus === 'error'
          ? <><span style={{ color: 'hsl(0 60% 65%)' }}>{saveLabel}</span>{' '}·{' '}<button style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={onManualSave}>retry</button></>
          : saveLabel}
      </span>
      <span>{wordCount > 0 ? `${wordCount.toLocaleString()} words` : 'empty'}</span>
      <div className="cz-status-spacer" />
      <div className="cz-status-cluster">
        <span>spell · {spell}</span>
        <span>focus · {focus}</span>
        <span>100%</span>
      </div>
    </div>
  );
}

// ── Desktop editor ────────────────────────────────────────────
export function CzarDesktop() {
  const { user } = useAuth();
  const editor = useCzarEditor();

  const [mode, setMode] = useState('edit');
  const [format, setFormat] = useState<FormatState>({
    block: 'Body — Fraunces 16', font: 'Fraunces', size: '16',
    b: false, i: true, u: false, s: false, align: 'left', lh: '1.65',
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SectionId>('modes');
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const dictLang = LANG_MAP[editor.prefs.lang] || 'en-US';
  const dict = useCzDictation(dictLang);
  const drop = useCzDropZone(user?.id ?? undefined, editor.importFile);

  // Track saved timestamp
  useEffect(() => {
    if (editor.saveStatus === 'saved') setSavedAt(new Date());
  }, [editor.saveStatus]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === 's') {
        e.preventDefault();
        editor.manualSave();
      }
      if (e.key === 'e') {
        e.preventDefault();
        downloadDoc(editor.docTitle, editor.docContent);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editor.docTitle, editor.docContent, editor.manualSave]);

  const openSettings = useCallback((section: SectionId = 'modes') => {
    setSettingsSection(section);
    setSettingsOpen(true);
  }, []);

  const handleScrollTo = useCallback((charOffset: number) => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(charOffset, charOffset);
    // Approximate scroll position
    const lineHeight = 24;
    const charsPerLine = 60;
    const approxLine = Math.floor(charOffset / charsPerLine);
    ta.scrollTop = approxLine * lineHeight - 40;
  }, []);

  const handleMicInsert = useCallback((text: string) => {
    if (!text.trim()) return;
    const result = dict.insertAt(text, textareaRef.current);
    editor.setDocContent(result);
  }, [dict, editor]);

  const langLabel = editor.prefs.lang.toUpperCase().replace('-', '-');

  return (
    <div className="cz-app" data-spell={editor.prefs.spell} data-focus={editor.prefs.focus}>
      <CzTitlebar
        docTitle={editor.docTitle}
        setDocTitle={(t) => editor.setDocTitle(t)}
        mode={mode}
        setMode={setMode}
        onOpenSettings={openSettings}
        onDownload={() => downloadDoc(editor.docTitle, editor.docContent)}
        saving={editor.saveStatus === 'saving'}
      />
      <CzComposer
        format={format}
        setFormat={setFormat}
        dictLive={dict.live}
        onMicToggle={() => dict.live ? dict.stop() : dict.start()}
        onOpenSettings={openSettings}
        onTighten={editor.tighten}
        onContinue={editor.continueDoc}
        onStop={editor.stopStream}
        streaming={editor.streamingDoc}
        langLabel={langLabel}
      />
      <div className="cz-stage">
        <CzRail
          pieces={editor.pieces}
          piecesLoading={editor.piecesLoading}
          piecesError={editor.piecesError}
          activePieceId={editor.activePieceId}
          onSelectPiece={editor.selectPiece}
          onCreatePiece={editor.createPiece}
          outline={editor.outline}
          onScrollTo={handleScrollTo}
          activeVoice={editor.activeVoice}
          setVoice={editor.setActiveVoice}
        />
        <CzLeaf
          content={editor.docContent}
          onChange={editor.setDocContent}
          mode={mode}
          docLoading={editor.docLoading}
          streaming={editor.streamingDoc}
          drop={drop}
          textareaRef={textareaRef}
        />
        <CzInspector
          voice={editor.activeVoice}
          length={editor.targetLength}
          setLength={(l) => editor.setTargetLength(l as any)}
          audience={editor.audience}
          setAudience={editor.setAudience}
          suggestions={editor.suggestions}
          suggestionsLoading={editor.suggestionsLoading}
          wordCount={editor.wordCount}
          readingTime={editor.readingTime}
          onAcceptSuggestion={editor.acceptSuggestion}
          onDismissSuggestion={editor.dismissSuggestion}
          onTriggerSuggest={editor.triggerSuggest}
        />
      </div>
      <CzStatus
        wordCount={editor.wordCount}
        saveStatus={editor.saveStatus}
        savedAt={savedAt}
        onManualSave={editor.manualSave}
        spell={editor.prefs.spell}
        focus={editor.prefs.focus}
      />
      <CzMicPopover
        open={dict.live}
        live={dict.live}
        seconds={dict.seconds}
        final={dict.final}
        interim={dict.interim}
        onClose={() => dict.stop()}
        onInsert={handleMicInsert}
        style={{ right: 300, bottom: 60 }}
      />
      {editor.error && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: 'hsl(0 50% 25%)', color: '#fff', padding: '10px 20px',
          borderRadius: 8, fontSize: 13, zIndex: 1000, display: 'flex', gap: 12, alignItems: 'center',
        }}>
          {editor.error}
          <button onClick={editor.clearError}
                  style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.4)',
                           color: '#fff', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 11 }}>
            dismiss
          </button>
        </div>
      )}
      <CzSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        activeVoice={editor.activeVoice}
        setVoice={editor.setActiveVoice}
        initialSection={settingsSection}
        prefs={editor.prefs}
        setPrefs={editor.setPrefs}
        userEmail={user?.email}
      />
    </div>
  );
}
