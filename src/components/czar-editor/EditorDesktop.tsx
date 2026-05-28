import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CZ_VOICES } from './editorData';
import { useCzarEditor, type CzPiece, type CzOutlineItem, type CzSuggestion, type CzPanelSettings } from './useCzarEditor';
import { useCzDictation, useCzDropZone } from './editorHooks';
import {
  CzDropOverlay, CzImportedChip, CzMicPopover, CzSettingsModal,
  CzWritePanel, CzDownloadMenu,
} from './EditorExtras';
import { useAuth } from '@/contexts/AuthContext';
import { CorrectionModal } from '@/components/czar/CorrectionModal';
import { buildDocx, docxFilename, stripMarkdown } from '@/lib/czarDocUtils.tsx';
import { Packer } from 'docx';

type SectionId = 'modes' | 'train' | 'academic' | 'toggles' | 'editor' | 'dictation' | 'import' | 'shortcuts' | 'account';

const LANG_MAP: Record<string, string> = {
  'en-us': 'en-US', 'en-gb': 'en-GB', 'es': 'es-ES', 'fr': 'fr-FR',
};

async function downloadAsWord(content: string) {
  const doc = buildDocx(content);
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = docxFilename(content);
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadMarkdown(title: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (title || 'untitled').replace(/[^a-zA-Z0-9 ._-]/g, '_') + '.md';
  document.body.appendChild(a); a.click();
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
function CzTitlebar({ docTitle, setDocTitle, mode, setMode, onOpenSettings, onDownloadDocx, onDownloadMd, saving }: {
  docTitle: string; setDocTitle: (t: string) => void;
  mode: string; setMode: (m: string) => void;
  onOpenSettings: (section?: SectionId) => void;
  onDownloadDocx: () => void; onDownloadMd: () => void;
  saving: boolean;
}) {
  return (
    <div className="cz-titlebar">
      <div className="cz-brand">
        <div className="cz-brand-mark">czar</div>
        <div className="cz-brand-meta">drafting room</div>
      </div>
      <div className="cz-doc-title">
        <span className="cz-doc-name" contentEditable suppressContentEditableWarning
              onBlur={(e) => { const t = e.currentTarget.textContent?.trim(); if (t && t !== docTitle) setDocTitle(t); }}>
          {docTitle}
        </span>
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
        <CzDownloadMenu onDocx={onDownloadDocx} onMarkdown={onDownloadMd} />
        <button className="cz-cbtn" style={{ height: 30, fontSize: 15 }} title="Settings (⌘,)"
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

function CzComposer({
  textareaRef, dictLive, onMicToggle, onOpenSettings,
  onTighten, onContinue, onStop, onCorrect, onAskCzar, onImport,
  streaming, langLabel, onSetDocContent, onSwitchToEdit,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  dictLive: boolean; onMicToggle: () => void;
  onOpenSettings: (section?: SectionId) => void;
  onTighten: () => void; onContinue: () => void; onStop: () => void;
  onCorrect: () => void; onAskCzar: () => void; onImport: () => void;
  streaming: boolean; langLabel: string;
  onSetDocContent: (text: string) => void;
  onSwitchToEdit: () => void;
}) {
  const [styleOpen, setStyleOpen] = useState(false);

  function toggleMd(wrap: string) {
    onSwitchToEdit();
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const sel = value.slice(s, e) || 'text';
    const already = sel.startsWith(wrap) && sel.endsWith(wrap);
    const rep = already ? sel.slice(wrap.length, -wrap.length) : `${wrap}${sel}${wrap}`;
    const next = value.slice(0, s) + rep + value.slice(e);
    onSetDocContent(next);
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(s, s + rep.length); });
  }

  function insertLinePrefix(prefix: string) {
    onSwitchToEdit();
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, value } = ta;
    const lineStart = value.lastIndexOf('\n', s - 1) + 1;
    const lineEndRaw = value.indexOf('\n', s);
    const lineEnd = lineEndRaw === -1 ? value.length : lineEndRaw;
    const line = value.slice(lineStart, lineEnd);
    const stripped = line.replace(/^(#{1,2} |> )/, '');
    const newLine = prefix ? prefix + stripped : stripped;
    const next = value.slice(0, lineStart) + newLine + value.slice(lineEnd);
    onSetDocContent(next);
    requestAnimationFrame(() => ta.focus());
  }

  function insertAt(text: string) {
    onSwitchToEdit();
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const next = value.slice(0, s) + text + value.slice(e);
    onSetDocContent(next);
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(s + text.length, s + text.length); });
  }

  return (
    <div className="cz-composer">
      <CzCGroup label="Format">
        <button className="cz-cbtn cz-cbtn-bold" title="Bold (**text**)" onClick={() => toggleMd('**')}>B</button>
        <button className="cz-cbtn cz-cbtn-italic" title="Italic (*text*)" onClick={() => toggleMd('*')}>I</button>
        <button className="cz-cbtn cz-cbtn-strike" title="Strikethrough (~~text~~)" onClick={() => toggleMd('~~')}>S</button>
        <div style={{ position: 'relative' }}>
          <button className="cz-cbtn" title="Heading / block style"
                  style={{ fontFamily: 'var(--f-display)', fontStyle: 'italic', fontWeight: 600, fontSize: 13 }}
                  onClick={() => setStyleOpen(!styleOpen)}>Aa ▾</button>
          {styleOpen && (
            <div className="cz-dl-menu" style={{ minWidth: 144, left: 0, right: 'auto' }}>
              {[['Normal', ''], ['Heading 1', '# '], ['Heading 2', '## '], ['Blockquote', '> ']].map(([label, prefix]) => (
                <div key={label} className="cz-dl-item" onClick={() => { insertLinePrefix(prefix); setStyleOpen(false); }}>
                  {label}
                </div>
              ))}
            </div>
          )}
        </div>
      </CzCGroup>
      <CzCGroup label="Insert">
        <button className="cz-cbtn" title="Em dash ( — )" onClick={() => insertAt(' — ')}>—</button>
        <button className="cz-cbtn" title="Section mark (§)" onClick={() => insertAt('§')}>§</button>
      </CzCGroup>
      <CzCGroup label="Czar AI" ai>
        {streaming ? (
          <button className="cz-cbtn" title="Stop" onClick={onStop}
                  style={{ color: 'var(--primary)', fontWeight: 700 }}>◼ Stop</button>
        ) : (
          <>
            <button className="cz-cbtn" title="Tighten prose" onClick={onTighten}><i>§</i> Tighten</button>
            <button className="cz-cbtn" title="Open correction workflow (⌘⇧C)" onClick={onCorrect}><i>§</i> Correct →</button>
            <button className="cz-cbtn" title="Continue writing (⌘↩)" onClick={onContinue}><i>§</i> Continue</button>
            <button className="cz-cbtn" title="Open write panel (⌘⇧A)" onClick={onAskCzar}><i>§</i> Ask Czar</button>
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
        <button className="cz-cbtn" title="Import file (⌘I)" onClick={onImport} style={{ fontSize: 13 }}>↑ Import</button>
      </CzCGroup>
      <div className="cz-composer-spacer" />
      <CzCGroup label="Settings">
        <button className="cz-cbtn" title="Academic settings" onClick={() => onOpenSettings('academic')} style={{ fontSize: 10 }}>°</button>
        <button className="cz-cbtn" title="Writing rules" onClick={() => onOpenSettings('toggles')} style={{ fontSize: 12 }}>≡</button>
      </CzCGroup>
    </div>
  );
}

// ── Selection toolbar ─────────────────────────────────────────
function CzSelectionToolbar({ textareaRef, onAction }: {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onAction: (action: string, selected: string) => void;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const check = () => {
      const { selectionStart: s, selectionEnd: e, value } = ta;
      const sel = value.slice(s, e).trim();
      if (sel.length > 3) {
        setSelected(sel);
        const rect = ta.getBoundingClientRect();
        setPos({ x: rect.left + 8, y: rect.top - 46 });
      } else {
        setPos(null);
      }
    };
    const hide = () => setPos(null);
    ta.addEventListener('mouseup', check);
    ta.addEventListener('keyup', check);
    ta.addEventListener('blur', hide);
    return () => {
      ta.removeEventListener('mouseup', check);
      ta.removeEventListener('keyup', check);
      ta.removeEventListener('blur', hide);
    };
  }, [textareaRef]);

  if (!pos) return null;
  return (
    <div className="cz-sel-toolbar" style={{ top: pos.y, left: pos.x }}>
      {['Improve', 'Shorten', 'Expand', 'Rewrite'].map((a) => (
        <button key={a} onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onAction(a, selected); setPos(null); }}>{a}</button>
      ))}
    </div>
  );
}

// ── Left rail ─────────────────────────────────────────────────
function CzRail({
  pieces, piecesLoading, piecesError, activePieceId, onSelectPiece, onCreatePiece,
  outline, onScrollTo, activeVoice, setVoice,
}: {
  pieces: CzPiece[]; piecesLoading: boolean; piecesError: string | null;
  activePieceId: string | null; onSelectPiece: (id: string) => void; onCreatePiece: () => void;
  outline: CzOutlineItem[]; onScrollTo: (offset: number) => void;
  activeVoice: string; setVoice: (id: string) => void;
}) {
  return (
    <aside className="cz-rail">
      <div className="cz-rail-section">
        <div className="cz-rail-heading">
          Pieces
          <button className="cz-rail-add" title="New piece" onClick={onCreatePiece}>+</button>
        </div>
        {piecesLoading && (
          <>{[1, 2, 3].map((i) => (
            <div key={i} className="cz-piece cz-piece-skeleton">
              <span className="cz-piece-dot" />
              <span className="cz-piece-name" style={{ width: `${60 + i * 15}%` }} />
            </div>
          ))}</>
        )}
        {!piecesLoading && piecesError && (
          <div style={{ fontSize: 11, color: 'var(--primary)', padding: '6px 0' }}>Couldn't load pieces</div>
        )}
        {!piecesLoading && !piecesError && pieces.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', padding: '6px 0' }}>No pieces yet</div>
        )}
        {!piecesLoading && pieces.map((p) => (
          <div key={p.id} className="cz-piece" data-active={p.id === activePieceId ? 'true' : undefined}
               onClick={() => !p.isPending && onSelectPiece(p.id)} style={{ opacity: p.isPending ? 0.5 : 1 }}>
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
            <div key={o.id} className="cz-outline-item" data-level={o.level} data-current={o.current ? 'true' : undefined}
                 onClick={() => onScrollTo(o.charOffset)} style={{ cursor: 'pointer' }}>
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
          <div key={v.id} className="cz-voice-chip" data-active={activeVoice === v.id ? 'true' : undefined}
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
  content, onChange, mode, docLoading, streaming, currentAgent, drop, textareaRef,
  activePieceId, onAskCzar, onCorrect, onImport, onSwitchToEdit,
}: {
  content: string; onChange: (v: string) => void;
  mode: string; docLoading: boolean; streaming: boolean; currentAgent: string | null;
  drop: ReturnType<typeof useCzDropZone>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  activePieceId: string | null;
  onAskCzar: () => void; onCorrect: () => void; onImport: () => void;
  onSwitchToEdit: () => void;
}) {
  const showWelcome = !docLoading && content === '' && activePieceId !== null;

  return (
    <main className="cz-canvas" {...drop.handlers}>
      <CzDropOverlay visible={drop.dragOver} />
      <CzImportedChip file={drop.imported} onClose={() => drop.setImported(null)} />
      <article className="cz-leaf" data-streaming={streaming ? 'true' : undefined}>
        <div className="cz-leaf-runhead">
          <span>czar — drafting room</span>
          <span>{content ? `${content.trim().split(/\s+/).filter(Boolean).length} words` : 'empty'}</span>
        </div>

        {streaming && currentAgent && (
          <div className="cz-agent-step">
            <span className="cz-agent-step-dot" />
            <span className="cz-agent-step-label">{currentAgent}</span>
          </div>
        )}

        {docLoading ? (
          <div className="cz-leaf-skeleton">
            <div style={{ width: '75%', height: 28, marginBottom: 16 }} />
            <div style={{ width: '55%', height: 18, marginBottom: 28 }} />
            <div style={{ width: '100%', height: 14, marginBottom: 8 }} />
            <div style={{ width: '97%', height: 14, marginBottom: 8 }} />
            <div style={{ width: '92%', height: 14, marginBottom: 8 }} />
            <div style={{ width: '85%', height: 14, marginBottom: 28 }} />
            <div style={{ width: '100%', height: 14, marginBottom: 8 }} />
            <div style={{ width: '94%', height: 14 }} />
          </div>
        ) : showWelcome ? (
          <div className="cz-welcome">
            <div className="cz-welcome-eyebrow">czar · drafting room</div>
            <h2 className="cz-welcome-h">What would you like to write today?</h2>
            <div className="cz-welcome-grid">
              <div className="cz-welcome-card" onClick={() => { onSwitchToEdit(); setTimeout(() => textareaRef.current?.focus(), 50); }}>
                <div className="cz-welcome-card-icon">✏</div>
                <div className="cz-welcome-card-title">Write freely</div>
                <div className="cz-welcome-card-desc">Start typing — blank page, your pace</div>
              </div>
              <div className="cz-welcome-card" onClick={onAskCzar}>
                <div className="cz-welcome-card-icon">§</div>
                <div className="cz-welcome-card-title">Ask Czar to write</div>
                <div className="cz-welcome-card-desc">Essays, reports, lit. reviews, scripts…</div>
              </div>
              <div className="cz-welcome-card" onClick={onCorrect}>
                <div className="cz-welcome-card-icon">✓</div>
                <div className="cz-welcome-card-title">Correct a draft</div>
                <div className="cz-welcome-card-desc">Upload a document for AI correction</div>
              </div>
              <div className="cz-welcome-card" onClick={onImport}>
                <div className="cz-welcome-card-icon">↑</div>
                <div className="cz-welcome-card-title">Upload a document</div>
                <div className="cz-welcome-card-desc">.docx · .pdf · .txt · audio</div>
              </div>
            </div>
          </div>
        ) : null}

        {!docLoading && !showWelcome && mode === 'edit' && (
          <textarea
            ref={textareaRef}
            className="cz-leaf-textarea"
            value={content}
            onChange={(e) => onChange(e.target.value)}
            spellCheck
            placeholder="Start writing, or click § Ask Czar to let Czar begin for you."
          />
        )}

        {!docLoading && !showWelcome && mode !== 'edit' && (
          <div className="cz-leaf-render">
            {content && (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                img: ({ node, ...props }: any) => (
                  <img {...props} style={{ maxWidth: '100%', borderRadius: 4, display: 'block', margin: '16px 0' }} />
                ),
              }}>{content}</ReactMarkdown>
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
  voice: string; length: string; setLength: (l: string) => void;
  audience: string; setAudience: (a: string) => void;
  suggestions: CzSuggestion[]; suggestionsLoading: boolean;
  wordCount: number; readingTime: string;
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
          <>{[1, 2].map((i) => (
            <div key={i} className="cz-sugg cz-sugg-skeleton">
              <div style={{ width: '60%', height: 12, marginBottom: 6 }} />
              <div style={{ width: '90%', height: 12, marginBottom: 4 }} />
              <div style={{ width: '80%', height: 12 }} />
            </div>
          ))}</>
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
  wordCount: number; saveStatus: 'saved' | 'saving' | 'unsaved' | 'error';
  savedAt: Date | null; onManualSave: () => void; spell: string; focus: string;
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

  const [mode, setMode] = useState('read');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SectionId>('modes');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [writePanelOpen, setWritePanelOpen] = useState(false);
  const [readAloud, setReadAloud] = useState(false);
  const [readRate, setReadRate] = useState(1.0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dictLang = LANG_MAP[editor.prefs.lang] || 'en-US';
  const dict = useCzDictation(dictLang);
  const drop = useCzDropZone(user?.id ?? undefined, editor.importFile);

  useEffect(() => { if (editor.saveStatus === 'saved') setSavedAt(new Date()); }, [editor.saveStatus]);

  // Stop TTS when leaving voice mode
  useEffect(() => {
    if (mode !== 'voice') {
      window.speechSynthesis?.cancel();
      setReadAloud(false);
    } else if (editor.docContent) {
      startReadAloud();
    }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-switch to read mode during/after streaming so content renders formatted
  useEffect(() => {
    if (editor.streamingDoc) setMode('read');
  }, [editor.streamingDoc]);

  function startReadAloud(rate?: number) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const r = rate ?? readRate;
    const utt = new SpeechSynthesisUtterance(stripMarkdown(editor.docContent));
    utt.rate = r;
    const voices = window.speechSynthesis.getVoices();
    const lang = editor.prefs.language_variant === 'british' ? 'en-GB'
      : editor.prefs.language_variant === 'australian' ? 'en-AU'
      : editor.prefs.language_variant === 'canadian' ? 'en-CA'
      : 'en-US';
    const preferred = voices.find(v => v.lang.startsWith(lang)) || voices[0];
    if (preferred) utt.voice = preferred;
    utt.onend = () => setReadAloud(false);
    utt.onerror = () => setReadAloud(false);
    window.speechSynthesis.speak(utt);
    setReadAloud(true);
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === 's') { e.preventDefault(); editor.manualSave(); }
      if (e.key === 'e') { e.preventDefault(); downloadAsWord(editor.docContent); }
      if (e.key === 'i') { e.preventDefault(); fileInputRef.current?.click(); }
      if (e.shiftKey) {
        if (e.key === 'A') { e.preventDefault(); setWritePanelOpen(v => !v); }
        if (e.key === 'C') { e.preventDefault(); setCorrectionOpen(true); }
        if (e.key === 'T') { e.preventDefault(); editor.tighten(); }
      }
      if (e.key === 'Enter') { e.preventDefault(); editor.continueDoc(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editor.docTitle, editor.docContent, editor.manualSave, editor.tighten, editor.continueDoc]);

  const openSettings = useCallback((section: SectionId = 'modes') => {
    setSettingsSection(section); setSettingsOpen(true);
  }, []);

  const handleScrollTo = useCallback((charOffset: number) => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    ta.setSelectionRange(charOffset, charOffset);
    ta.scrollTop = Math.floor(charOffset / 60) * 24 - 40;
  }, []);

  const handleMicInsert = useCallback((text: string) => {
    if (!text.trim()) return;
    const result = dict.insertAt(text, textareaRef.current);
    editor.setDocContent(result);
  }, [dict, editor]);

  const handleSelectionAction = useCallback((action: string, selected: string) => {
    const prompts: Record<string, string> = {
      'Improve': `Improve this text — make it clearer and more compelling: "${selected}"`,
      'Shorten': `Shorten this text while preserving all key information: "${selected}"`,
      'Expand': `Expand this text with more detail and depth: "${selected}"`,
      'Rewrite': `Rewrite this text in a fresh way, keeping the same meaning: "${selected}"`,
    };
    editor.writeFromPrompt(prompts[action] ?? `${action}: "${selected}"`, { mode: 'write' });
  }, [editor]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    editor.importFile({ storage_path: '', filename: f.name, size: f.size, mime: f.type || 'application/octet-stream' });
    e.target.value = '';
  }, [editor]);

  const langLabel = editor.prefs.lang.toUpperCase().replace('-', '-');

  return (
    <div className="cz-app" data-spell={editor.prefs.spell} data-focus={editor.prefs.focus}>
      <CzTitlebar
        docTitle={editor.docTitle}
        setDocTitle={(t) => editor.setDocTitle(t)}
        mode={mode} setMode={setMode}
        onOpenSettings={openSettings}
        onDownloadDocx={() => downloadAsWord(editor.docContent)}
        onDownloadMd={() => downloadMarkdown(editor.docTitle, editor.docContent)}
        saving={editor.saveStatus === 'saving'}
      />
      <CzComposer
        textareaRef={textareaRef}
        dictLive={dict.live}
        onMicToggle={() => dict.live ? dict.stop() : dict.start()}
        onOpenSettings={openSettings}
        onTighten={editor.tighten}
        onContinue={editor.continueDoc}
        onStop={editor.stopStream}
        onCorrect={() => setCorrectionOpen(true)}
        onAskCzar={() => setWritePanelOpen(v => !v)}
        onImport={() => fileInputRef.current?.click()}
        streaming={editor.streamingDoc}
        langLabel={langLabel}
        onSetDocContent={editor.setDocContent}
        onSwitchToEdit={() => setMode('edit')}
      />

      {writePanelOpen && (
        <CzWritePanel
          open={writePanelOpen}
          onClose={() => setWritePanelOpen(false)}
          onSubmit={(instruction, settings) => editor.writeFromPrompt(instruction, settings)}
          onCorrect={() => { setCorrectionOpen(true); setWritePanelOpen(false); }}
          defaultPrefs={{
            citation_style: editor.prefs.citation_style,
            writing_level: editor.prefs.writing_level,
            language_variant: editor.prefs.language_variant,
          }}
        />
      )}

      <div className="cz-stage">
        <CzRail
          pieces={editor.pieces} piecesLoading={editor.piecesLoading}
          piecesError={editor.piecesError} activePieceId={editor.activePieceId}
          onSelectPiece={editor.selectPiece} onCreatePiece={editor.createPiece}
          outline={editor.outline} onScrollTo={handleScrollTo}
          activeVoice={editor.activeVoice} setVoice={editor.setActiveVoice}
        />
        <CzLeaf
          content={editor.docContent} onChange={editor.setDocContent}
          mode={mode} docLoading={editor.docLoading}
          streaming={editor.streamingDoc} currentAgent={editor.currentAgent}
          drop={drop} textareaRef={textareaRef}
          activePieceId={editor.activePieceId}
          onAskCzar={() => setWritePanelOpen(true)}
          onCorrect={() => setCorrectionOpen(true)}
          onImport={() => fileInputRef.current?.click()}
          onSwitchToEdit={() => setMode('edit')}
        />
        <CzInspector
          voice={editor.activeVoice} length={editor.targetLength}
          setLength={(l) => editor.setTargetLength(l as any)}
          audience={editor.audience} setAudience={editor.setAudience}
          suggestions={editor.suggestions} suggestionsLoading={editor.suggestionsLoading}
          wordCount={editor.wordCount} readingTime={editor.readingTime}
          onAcceptSuggestion={editor.acceptSuggestion}
          onDismissSuggestion={editor.dismissSuggestion}
          onTriggerSuggest={editor.triggerSuggest}
        />
      </div>

      {mode === 'voice' && (
        <div className="cz-voice-player">
          <span className="cz-voice-player-label">Read aloud</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button className="cz-cbtn" onClick={readAloud ? () => { window.speechSynthesis.cancel(); setReadAloud(false); } : () => startReadAloud()}>
              {readAloud ? '◼ Stop' : '▶ Resume'}
            </button>
          </div>
          <div className="cz-voice-player-rates">
            {[0.8, 1.0, 1.25, 1.5].map((r) => (
              <button key={r} className="cz-voice-player-rate"
                      data-active={readRate === r ? 'true' : undefined}
                      onClick={() => { setReadRate(r); startReadAloud(r); }}>{r}×</button>
            ))}
          </div>
        </div>
      )}

      <CzStatus
        wordCount={editor.wordCount} saveStatus={editor.saveStatus}
        savedAt={savedAt} onManualSave={editor.manualSave}
        spell={editor.prefs.spell} focus={editor.prefs.focus}
      />

      <CzMicPopover
        open={dict.live} live={dict.live} seconds={dict.seconds}
        final={dict.final} interim={dict.interim}
        onClose={() => dict.stop()} onInsert={handleMicInsert}
        style={{ right: 300, bottom: 60 }}
      />

      {mode === 'edit' && (
        <CzSelectionToolbar textareaRef={textareaRef} onAction={handleSelectionAction} />
      )}

      {editor.error && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: 'hsl(0 50% 25%)', color: '#fff', padding: '10px 20px',
          borderRadius: 8, fontSize: 13, zIndex: 1000, display: 'flex', gap: 12, alignItems: 'center',
        }}>
          {editor.error}
          <button onClick={editor.clearError} style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.4)',
            color: '#fff', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 11,
          }}>dismiss</button>
        </div>
      )}

      <CzSettingsModal
        open={settingsOpen} onClose={() => setSettingsOpen(false)}
        activeVoice={editor.activeVoice} setVoice={editor.setActiveVoice}
        initialSection={settingsSection}
        prefs={editor.prefs} setPrefs={editor.setPrefs}
        userEmail={user?.email}
      />

      <CorrectionModal
        open={correctionOpen}
        onClose={() => setCorrectionOpen(false)}
        onApplied={(content) => { editor.setDocContent(content); editor.manualSave(); }}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.docx,.pdf,.mp3,.wav,.m4a,.jpg,.jpeg,.png"
        style={{ display: 'none' }}
        onChange={handleFileInput}
      />
    </div>
  );
}
