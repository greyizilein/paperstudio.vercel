import React, { useState, useRef, useCallback } from 'react';
import { CZ_VOICES } from './editorData';
import { useCzarEditor } from './useCzarEditor';
import { useCzDictation, useCzDropZone } from './editorHooks';
import { CzMobileSettings, CzMobileMic } from './EditorExtras';
import { useAuth } from '@/contexts/AuthContext';
import { CorrectionModal } from '@/components/czar/CorrectionModal';
import { buildDocx, docxFilename } from '@/lib/czarDocUtils.tsx';
import { Packer } from 'docx';
import type { CzPanelSettings } from './useCzarEditor';

const LANG_MAP: Record<string, string> = {
  'en-us': 'en-US', 'en-gb': 'en-GB', 'es': 'es-ES', 'fr': 'fr-FR',
};

async function downloadAsWord(content: string) {
  const doc = buildDocx(content);
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = docxFilename(content);
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function downloadMarkdown(title: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (title || 'untitled').replace(/[^a-zA-Z0-9 ._-]/g, '_') + '.md';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
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

function CzMobileWritePanel({ open, onClose, onSubmit, onCorrect, defaultPrefs }: {
  open: boolean; onClose: () => void;
  onSubmit: (instruction: string, settings: CzPanelSettings) => void;
  onCorrect: () => void;
  defaultPrefs: { citation_style: string; writing_level: string };
}) {
  const [mode, setMode] = useState<CzPanelSettings['mode']>('write');
  const [citation, setCitation] = useState(defaultPrefs.citation_style);
  const [level, setLevel] = useState(defaultPrefs.writing_level);
  const [instruction, setInstruction] = useState('');

  if (!open) return null;

  const ACADEMIC = ['write', 'research', 'plan', 'literature_review', 'legal'];
  const showAcademic = ACADEMIC.includes(mode);

  const handleSubmit = () => {
    if (mode === 'correct') { onCorrect(); onClose(); return; }
    if (!instruction.trim()) return;
    onSubmit(instruction.trim(), {
      mode, citation_style: showAcademic ? citation : undefined,
      writing_level: showAcademic ? level : undefined,
    });
    setInstruction('');
    onClose();
  };

  return (
    <div className="cz-m-sheet-backdrop" onClick={onClose}>
      <div className="cz-m-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '85%' }}>
        <span className="cz-m-sheet-handle" />
        <div className="cz-m-sheet-h">
          <span>Ask Czar to write</span>
          <button className="cz-m-sheet-close" onClick={onClose}>×</button>
        </div>
        <div className="cz-m-write-panel">
          <div className="cz-m-write-selrow">
            <select className="cz-m-write-sel" value={mode}
                    onChange={(e) => setMode(e.target.value as CzPanelSettings['mode'])}>
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
              <select className="cz-m-write-sel" value={level} onChange={(e) => setLevel(e.target.value)}>
                <option value="undergrad">Undergraduate</option>
                <option value="grad">Graduate</option>
                <option value="phd">PhD</option>
                <option value="professional">Professional</option>
                <option value="alevel">A-Level</option>
                <option value="gcse">GCSE</option>
              </select>
            )}
            {showAcademic && (
              <select className="cz-m-write-sel" value={citation} onChange={(e) => setCitation(e.target.value)}>
                <option value="harvard">Harvard</option>
                <option value="apa">APA 7th</option>
                <option value="chicago">Chicago</option>
                <option value="mla">MLA</option>
                <option value="ieee">IEEE</option>
                <option value="vancouver">Vancouver</option>
                <option value="oscola">OSCOLA</option>
              </select>
            )}
          </div>
          <textarea
            className="cz-m-write-ta"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder={mode === 'correct'
              ? 'Tap § Correct → to open the correction workflow…'
              : 'Tell Czar what to write — e.g. "2,000-word essay on AI ethics. Harvard."'}
            rows={3}
          />
          <button className="cz-m-write-submit" onClick={handleSubmit}
                  disabled={mode !== 'correct' && !instruction.trim()}>
            {mode === 'correct' ? '§ Correct →' : '§ Write →'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CzMobileDownloadSheet({ open, onClose, onDocx, onMarkdown }: {
  open: boolean; onClose: () => void; onDocx: () => void; onMarkdown: () => void;
}) {
  if (!open) return null;
  return (
    <div className="cz-m-sheet-backdrop" onClick={onClose}>
      <div className="cz-m-sheet" onClick={(e) => e.stopPropagation()}>
        <span className="cz-m-sheet-handle" />
        <div className="cz-m-sheet-h">
          <span>Download</span>
          <button className="cz-m-sheet-close" onClick={onClose}>×</button>
        </div>
        <div className="cz-piece" onClick={() => { onDocx(); onClose(); }}
             style={{ padding: '14px 8px', cursor: 'pointer' }}>
          <span style={{ fontFamily: 'var(--f-display)', fontStyle: 'italic', color: 'var(--primary)', fontSize: 18, width: 24 }}>W</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Word document (.docx)</div>
            <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>Fully formatted — headings, bold, tables</div>
          </div>
        </div>
        <div className="cz-piece" onClick={() => { onMarkdown(); onClose(); }}
             style={{ padding: '14px 8px', cursor: 'pointer' }}>
          <span style={{ fontFamily: 'var(--f-display)', fontStyle: 'italic', color: 'var(--primary)', fontSize: 18, width: 24 }}>§</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Markdown (.md)</div>
            <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>Plain text with markup</div>
          </div>
        </div>
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
  const [writePanel, setWritePanel] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [downloadSheet, setDownloadSheet] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dictLang = LANG_MAP[editor.prefs.lang] || 'en-US';
  const dict = useCzDictation(dictLang);
  const drop = useCzDropZone(user?.id ?? undefined, editor.importFile);

  const v = CZ_VOICES.find((x) => x.id === editor.activeVoice) || CZ_VOICES[0];

  const handleMicInsert = useCallback((text: string) => {
    if (!text.trim()) return;
    const result = dict.insertAt(text, textareaRef.current);
    editor.setDocContent(result);
  }, [dict, editor]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    editor.importFile({ storage_path: '', filename: f.name, size: f.size, mime: f.type || 'application/octet-stream' });
    e.target.value = '';
  }, [editor]);

  const saveLabel = editor.saveStatus === 'saving' ? 'saving…'
    : editor.saveStatus === 'error' ? 'save failed'
    : editor.saveStatus === 'unsaved' ? 'unsaved'
    : 'saved';

  return (
    <div className="cz-m">
      <div className="cz-m-bar" style={{ gridTemplateColumns: '36px 1fr auto' }}>
        <button className="cz-m-iconbtn" title="Pieces" onClick={() => setPiecesSheet(true)}>≡</button>
        <div className="cz-m-bar-title">
          <span className="cz-m-brand">czar</span>
          <span className="cz-m-doc" contentEditable suppressContentEditableWarning
                onBlur={(e) => {
                  const t = e.currentTarget.textContent?.trim();
                  if (t && t !== editor.docTitle) editor.setDocTitle(t);
                }}>
            {editor.docTitle}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="cz-m-iconbtn" title="Download" onClick={() => setDownloadSheet(true)} style={{ fontSize: 18 }}>↓</button>
          <button className="cz-m-iconbtn" title="Settings" onClick={() => setSettingsSheet(true)} style={{ fontSize: 16 }}>⚙</button>
        </div>
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
            <span style={{ fontFamily: 'var(--f-display)', fontStyle: 'italic', fontWeight: 700, fontSize: 48, color: 'var(--primary)', lineHeight: 1 }}>§</span>
            <p style={{ fontFamily: 'var(--f-display)', fontStyle: 'italic', fontWeight: 600, fontSize: 18, color: 'var(--ink)', margin: 0 }}>Drop to import</p>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-faint)', margin: 0 }}>.txt · .md · .docx · audio</p>
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

        {editor.streamingDoc && editor.currentAgent && (
          <div className="cz-agent-step" style={{ margin: '8px 0' }}>
            <span className="cz-agent-step-dot" />
            <span className="cz-agent-step-label">{editor.currentAgent}</span>
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
        ) : editor.docContent === '' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12 }}>
            <p style={{ fontFamily: 'var(--f-display)', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-faint)', margin: '0 0 4px' }}>
              What would you like to write?
            </p>
            <button onClick={() => setWritePanel(true)} style={{
              background: 'var(--primary-pale)', border: '1px solid var(--primary-dim)',
              borderRadius: 8, padding: '12px 14px', cursor: 'pointer',
              fontFamily: 'var(--f-display)', fontStyle: 'italic', fontWeight: 600,
              fontSize: 14, color: 'var(--primary)', textAlign: 'left',
            }}>§ Ask Czar to write →</button>
            <button onClick={() => setCorrectionOpen(true)} style={{
              background: 'transparent', border: '1px solid var(--rule)',
              borderRadius: 8, padding: '12px 14px', cursor: 'pointer',
              fontFamily: 'var(--f-body)', fontSize: 13, color: 'var(--ink-soft)', textAlign: 'left',
            }}>✓ Correct a draft</button>
            <button onClick={() => fileInputRef.current?.click()} style={{
              background: 'transparent', border: '1px solid var(--rule)',
              borderRadius: 8, padding: '12px 14px', cursor: 'pointer',
              fontFamily: 'var(--f-body)', fontSize: 13, color: 'var(--ink-soft)', textAlign: 'left',
            }}>↑ Upload a document</button>
            <textarea
              ref={textareaRef}
              className="cz-leaf-textarea"
              value={editor.docContent}
              onChange={(e) => editor.setDocContent(e.target.value)}
              placeholder="Or start writing freely…"
              spellCheck
              style={{ minHeight: 80, marginTop: 8 }}
            />
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
        <button className="cz-m-tool cz-m-tool-bold" title="Bold"
                onClick={() => {
                  const ta = textareaRef.current; if (!ta) return;
                  const { selectionStart: s, selectionEnd: e, value } = ta;
                  const sel = value.slice(s, e) || 'text';
                  const rep = sel.startsWith('**') && sel.endsWith('**') ? sel.slice(2, -2) : `**${sel}**`;
                  editor.setDocContent(value.slice(0, s) + rep + value.slice(e));
                }}>B</button>
        <button className="cz-m-tool cz-m-tool-italic" title="Italic"
                onClick={() => {
                  const ta = textareaRef.current; if (!ta) return;
                  const { selectionStart: s, selectionEnd: e, value } = ta;
                  const sel = value.slice(s, e) || 'text';
                  const isBold = sel.startsWith('**');
                  const rep = !isBold && sel.startsWith('*') && sel.endsWith('*') ? sel.slice(1, -1) : `*${sel}*`;
                  editor.setDocContent(value.slice(0, s) + rep + value.slice(e));
                }}>I</button>
        <button className="cz-m-tool" title="Correct draft" onClick={() => setCorrectionOpen(true)}
                style={{ fontSize: 14 }}>✓</button>
        <button className="cz-m-tool" title="Upload file"
                onClick={() => fileInputRef.current?.click()} style={{ fontSize: 16 }}>↑</button>
        <button className="cz-m-tool" data-live={dict.live ? 'true' : undefined}
                title="Dictate" onClick={() => dict.live ? dict.stop() : dict.start()} style={{ fontSize: 16 }}>
          {dict.live ? '◉' : '◎'}
        </button>
        <button className="cz-m-tool cz-m-tool-ai" title="Ask Czar to write"
                onClick={editor.streamingDoc ? editor.stopStream : () => setWritePanel(true)}>
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
      <CzMobileWritePanel
        open={writePanel} onClose={() => setWritePanel(false)}
        onSubmit={(instruction, settings) => editor.writeFromPrompt(instruction, settings)}
        onCorrect={() => { setCorrectionOpen(true); setWritePanel(false); }}
        defaultPrefs={{ citation_style: editor.prefs.citation_style, writing_level: editor.prefs.writing_level }}
      />
      <CzMobileDownloadSheet
        open={downloadSheet} onClose={() => setDownloadSheet(false)}
        onDocx={() => downloadAsWord(editor.docContent)}
        onMarkdown={() => downloadMarkdown(editor.docTitle, editor.docContent)}
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
