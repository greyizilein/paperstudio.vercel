import React, { useState, useRef, useCallback } from 'react';
import { CZ_VOICES } from './editorData';
import { useCzarEditor } from './useCzarEditor';
import { useCzDictation, useCzDropZone } from './editorHooks';
import { CzMobileSettings, CzMobileMic } from './EditorExtras';
import { useAuth } from '@/contexts/AuthContext';

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

function CzMobileVoiceSheet({ open, onClose, voice, setVoice }: {
  open: boolean; onClose: () => void; voice: string; setVoice: (id: string) => void;
}) {
  if (!open) return null;
  return (
    <div className="cz-m-sheet-backdrop" onClick={onClose}>
      <div className="cz-m-sheet" onClick={(e) => e.stopPropagation()}>
        <span className="cz-m-sheet-handle" />
        <div className="cz-m-sheet-h">
          <span>Voice library</span>
          <button className="cz-m-sheet-close" onClick={onClose}>Done</button>
        </div>
        {CZ_VOICES.map((v) => (
          <div key={v.id} className="cz-voice-chip"
               data-active={voice === v.id ? 'true' : undefined}
               onClick={() => { setVoice(v.id); onClose(); }}>
            <span className="cz-voice-glyph">{v.glyph}</span>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <span className="cz-voice-name">{v.name}</span>
              <span className="cz-voice-tag" style={{ marginTop: 2 }}>{v.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CzMobilePiecesSheet({ open, onClose, pieces, activePieceId, onSelectPiece, onCreatePiece }: {
  open: boolean; onClose: () => void;
  pieces: ReturnType<typeof useCzarEditor>['pieces'];
  activePieceId: string | null;
  onSelectPiece: (id: string) => void;
  onCreatePiece: () => void;
}) {
  if (!open) return null;
  return (
    <div className="cz-m-sheet-backdrop" onClick={onClose}>
      <div className="cz-m-sheet" onClick={(e) => e.stopPropagation()}>
        <span className="cz-m-sheet-handle" />
        <div className="cz-m-sheet-h">
          <span>Pieces</span>
          <button className="cz-m-sheet-close" onClick={() => { onCreatePiece(); onClose(); }}
                  style={{ fontFamily: 'var(--f-mono)', fontSize: 18, lineHeight: 1 }}>+</button>
        </div>
        {pieces.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--ink-faint)', padding: '8px 0' }}>No pieces yet.</p>
        )}
        {pieces.map((p) => (
          <div key={p.id} className="cz-piece"
               data-active={p.id === activePieceId ? 'true' : undefined}
               onClick={() => { if (!p.isPending) { onSelectPiece(p.id); onClose(); } }}
               style={{ padding: '10px 12px', opacity: p.isPending ? 0.5 : 1 }}>
            <span className="cz-piece-dot" />
            <span className="cz-piece-name">{p.name}</span>
            <span className="cz-piece-meta">{p.meta}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CzarMobile() {
  const { user } = useAuth();
  const editor = useCzarEditor();

  const [voiceSheet, setVoiceSheet] = useState(false);
  const [piecesSheet, setPiecesSheet] = useState(false);
  const [settingsSheet, setSettingsSheet] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const dictLang = LANG_MAP[editor.prefs.lang] || 'en-US';
  const dict = useCzDictation(dictLang);
  const drop = useCzDropZone(user?.id ?? undefined, editor.importFile);

  const v = CZ_VOICES.find((x) => x.id === editor.activeVoice) || CZ_VOICES[0];

  const handleMicInsert = useCallback((text: string) => {
    if (!text.trim()) return;
    const result = dict.insertAt(text, textareaRef.current);
    editor.setDocContent(result);
  }, [dict, editor]);

  const saveLabel = editor.saveStatus === 'saving' ? 'saving…'
    : editor.saveStatus === 'error' ? 'save failed'
    : editor.saveStatus === 'unsaved' ? 'unsaved'
    : 'saved';

  return (
    <div className="cz-m">
      <div className="cz-m-bar">
        <button className="cz-m-iconbtn" title="Pieces" onClick={() => setPiecesSheet(true)}>≡</button>
        <div className="cz-m-bar-title">
          <span className="cz-m-brand">czar</span>
          <span className="cz-m-doc"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => {
                  const t = e.currentTarget.textContent?.trim();
                  if (t && t !== editor.docTitle) editor.setDocTitle(t);
                }}>
            {editor.docTitle}
          </span>
        </div>
        <button className="cz-m-iconbtn" title="Download"
                onClick={() => downloadDoc(editor.docTitle, editor.docContent)}
                style={{ fontSize: 18 }}>↓</button>
        <button className="cz-m-iconbtn" title="Settings"
                onClick={() => setSettingsSheet(true)} style={{ fontSize: 16 }}>⚙</button>
      </div>

      <div className="cz-m-voice">
        <span className="cz-voice-glyph">{v.glyph}</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="cz-m-voice-name">{v.name}</span>
          <span className="cz-m-voice-tag">{v.tag} · writing mode</span>
        </div>
        <button className="cz-m-voice-switch" onClick={() => setVoiceSheet(true)}>switch</button>
      </div>

      <div className="cz-m-canvas" {...drop.handlers} style={{ position: 'relative' }}>
        {drop.dragOver && (
          <div className="cz-m-dropzone">
            <span style={{
              fontFamily: 'var(--f-display)', fontStyle: 'italic',
              fontWeight: 700, fontSize: 48, color: 'var(--primary)', lineHeight: 1,
            }}>§</span>
            <p style={{
              fontFamily: 'var(--f-display)', fontStyle: 'italic', fontWeight: 600,
              fontSize: 18, color: 'var(--ink)', margin: 0,
            }}>Drop to import</p>
            <p style={{
              fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '0.16em',
              textTransform: 'uppercase', color: 'var(--ink-faint)', margin: 0,
            }}>.txt · .md · .docx · audio</p>
          </div>
        )}
        {drop.imported && (
          <div className="cz-imported" style={{ position: 'absolute', left: 16, bottom: 16, right: 16 }}>
            <span className="cz-imported-icon">
              {drop.imported.status === 'uploading' ? '↑' : drop.imported.status === 'error' ? '!' : '§'}
            </span>
            <div className="cz-imported-body">
              <span className="cz-imported-name">
                {drop.imported.status === 'uploading' ? 'Uploading…' : 'Imported'} · {drop.imported.name}
              </span>
              <span className="cz-imported-meta">{drop.imported.kind} · {drop.imported.words}w</span>
            </div>
            {drop.imported.status !== 'uploading' && (
              <button className="cz-imported-close" onClick={() => drop.setImported(null)}>×</button>
            )}
          </div>
        )}

        {editor.docLoading ? (
          <div className="cz-leaf-skeleton" style={{ padding: '20px 0' }}>
            <div style={{ width: '80%', height: 22, marginBottom: 12 }} />
            <div style={{ width: '55%', height: 14, marginBottom: 20 }} />
            <div style={{ width: '100%', height: 14, marginBottom: 8 }} />
            <div style={{ width: '95%', height: 14, marginBottom: 8 }} />
            <div style={{ width: '88%', height: 14 }} />
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            className="cz-leaf-textarea"
            value={editor.docContent}
            onChange={(e) => editor.setDocContent(e.target.value)}
            placeholder="Start writing…"
            spellCheck
            style={{ minHeight: '100%' }}
          />
        )}
      </div>

      <div className="cz-m-status">
        <span>{editor.wordCount > 0 ? `${editor.wordCount.toLocaleString()} words` : 'empty'}</span>
        <span><strong>{saveLabel}</strong></span>
        <span>{editor.wordCount > 0 ? `${editor.readingTime} read` : '—'}</span>
      </div>

      <div className="cz-m-tools">
        <button className="cz-m-tool cz-m-tool-bold"
                data-active={active === 'b' ? 'true' : undefined}
                onClick={() => setActive(active === 'b' ? null : 'b')}>B</button>
        <button className="cz-m-tool cz-m-tool-italic"
                data-active={active === 'i' ? 'true' : undefined}
                onClick={() => setActive(active === 'i' ? null : 'i')}>I</button>
        <button className="cz-m-tool" title="Style"
                style={{ fontFamily: 'var(--f-display)', fontStyle: 'italic', fontWeight: 600 }}>Aa</button>
        <button className="cz-m-tool"
                data-live={dict.live ? 'true' : undefined}
                title="Dictate"
                onClick={() => dict.live ? dict.stop() : dict.start()}
                style={{ fontSize: 16 }}>
          {dict.live ? '◉' : '◎'}
        </button>
        <button className="cz-m-tool cz-m-tool-ai" title="Continue"
                onClick={editor.streamingDoc ? editor.stopStream : editor.continueDoc}
                style={{ color: editor.streamingDoc ? 'var(--primary)' : undefined }}>
          {editor.streamingDoc ? '◼' : '§'}
        </button>
      </div>

      <CzMobileVoiceSheet open={voiceSheet} onClose={() => setVoiceSheet(false)}
                          voice={editor.activeVoice} setVoice={editor.setActiveVoice} />
      <CzMobilePiecesSheet open={piecesSheet} onClose={() => setPiecesSheet(false)}
                           pieces={editor.pieces} activePieceId={editor.activePieceId}
                           onSelectPiece={editor.selectPiece} onCreatePiece={editor.createPiece} />
      <CzMobileSettings open={settingsSheet} onClose={() => setSettingsSheet(false)}
                        activeVoice={editor.activeVoice} setVoice={editor.setActiveVoice}
                        prefs={editor.prefs} setPrefs={editor.setPrefs} />
      <CzMobileMic open={dict.live} seconds={dict.seconds}
                   final={dict.final} interim={dict.interim}
                   onClose={() => dict.stop()} onInsert={handleMicInsert} />
    </div>
  );
}
