import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CZ_VOICES } from './editorData';
import { useCzarEditor } from './useCzarEditor';
import { useCzDictation, useCzDropZone } from './editorHooks';
import { CzMobileSettings, CzMobileMic } from './EditorExtras';
import { useAuth } from '@/contexts/AuthContext';
import { CorrectionModal } from '@/components/czar/CorrectionModal';
// BUG FIX: Removed .tsx extension from this import!
import { buildDocx, docxFilename } from '@/lib/czarDocUtils';
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

// ─── PURE TAILWIND OVERLAY SHEETS ─────────────────────────────────────────────

const BottomSheet = ({ open, onClose, title, actionText, onAction, children }: any) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex flex-col justify-end animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="w-full bg-white dark:bg-zinc-950 rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.3)] border-t border-zinc-200 dark:border-zinc-800 p-5 pb-safe overflow-y-auto max-h-[85vh] animate-in slide-in-from-bottom duration-300 relative z-[100000]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-5" />
        <div className="flex justify-between items-center mb-5 font-mono text-[10px] tracking-[0.2em] uppercase text-zinc-500">
          <span>{title}</span>
          <button className="text-[#e85d3f] font-bold py-1 px-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" onClick={onAction || onClose}>
            {actionText || 'Close'}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

function CzMobileVoiceSheet({ open, onClose, voice, setVoice }: any) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Voice Library" actionText="Done">
      {CZ_VOICES.map((v) => (
        <div key={v.id} 
          className={`flex items-center gap-3 p-3 rounded-lg border mb-2 cursor-pointer transition-colors ${voice === v.id ? 'border-[#e85d3f] bg-[#e85d3f]/10' : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50'}`}
          onClick={() => { setVoice(v.id); onClose(); }}>
          <span className="font-serif italic font-bold text-lg text-[#e85d3f] w-8 flex-shrink-0 text-center">{v.glyph}</span>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-sans text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">{v.name}</span>
            <span className="font-mono text-[9px] tracking-widest uppercase text-zinc-500 mt-0.5">{v.desc}</span>
          </div>
        </div>
      ))}
    </BottomSheet>
  );
}

function CzMobilePiecesSheet({ open, onClose, pieces, activePieceId, onSelectPiece, onCreatePiece }: any) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Pieces" actionText="+" onAction={() => { onCreatePiece(); onClose(); }}>
      {pieces.length === 0 && <p className="text-[13px] text-zinc-500 py-2">No pieces yet.</p>}
      {pieces.map((p: any) => (
        <div key={p.id} 
             className={`flex items-center gap-2.5 p-3 rounded-lg cursor-pointer mb-1 ${p.id === activePieceId ? 'bg-[#e85d3f]/10' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
             onClick={() => { if (!p.isPending) { onSelectPiece(p.id); onClose(); } }}
             style={{ opacity: p.isPending ? 0.5 : 1 }}>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.id === activePieceId ? 'bg-[#e85d3f]' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
          <span className="font-sans text-[13px] font-medium text-zinc-900 dark:text-zinc-100 flex-1 truncate">{p.name}</span>
          <span className="font-mono text-[9px] tracking-widest uppercase text-zinc-500">{p.meta}</span>
        </div>
      ))}
    </BottomSheet>
  );
}

function CzMobileWritePanel({ open, onClose, onSubmit, onCorrect, defaultPrefs }: any) {
  const [mode, setMode] = useState<CzPanelSettings['mode']>('write');
  const [citation, setCitation] = useState(defaultPrefs.citation_style);
  const [level, setLevel] = useState(defaultPrefs.writing_level);
  const [instruction, setInstruction] = useState('');

  const ACADEMIC = ['write', 'research', 'plan', 'literature_review', 'legal'];
  const showAcademic = ACADEMIC.includes(mode);

  const handleSubmit = () => {
    if (mode === 'correct') { onCorrect(); onClose(); return; }
    if (!instruction.trim()) return;
    onSubmit(instruction.trim(), { mode, citation_style: showAcademic ? citation : undefined, writing_level: showAcademic ? level : undefined });
    setInstruction('');
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Ask Czar to write" actionText="×">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <select className="flex-1 min-w-[100px] h-9 px-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none" 
                  value={mode} onChange={(e) => setMode(e.target.value as any)}>
            <option value="write">Write</option>
            <option value="research">Research</option>
            <option value="plan">Plan</option>
            <option value="literature_review">Lit. Review</option>
            <option value="screenplay">Screenplay</option>
            <option value="legal">Legal</option>
            <option value="chat">Chat · Images</option>
            <option value="correct">Correct →</option>
          </select>
          {showAcademic && (
            <select className="flex-1 min-w-[100px] h-9 px-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs outline-none" 
                    value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="undergrad">Undergraduate</option>
              <option value="grad">Graduate</option>
              <option value="phd">PhD</option>
              <option value="professional">Professional</option>
            </select>
          )}
        </div>
        <textarea
          className="w-full min-h-[80px] p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl font-serif italic text-[15px] text-zinc-900 dark:text-zinc-100 outline-none resize-none"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder={mode === 'correct' ? 'Tap § Correct → to open workflow…' : 'Tell Czar what to write — e.g. "2,000-word essay on AI ethics..."'}
        />
        <button 
          className="w-full h-12 bg-[#e85d3f] hover:bg-[#d65135] text-white rounded-xl font-serif italic font-bold text-[16px] disabled:opacity-50"
          onClick={handleSubmit} disabled={mode !== 'correct' && !instruction.trim()}>
          {mode === 'correct' ? '§ Correct →' : '§ Write →'}
        </button>
      </div>
    </BottomSheet>
  );
}

function CzMobileDownloadSheet({ open, onClose, onDocx, onMarkdown }: any) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Download" actionText="×">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-4 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer" onClick={() => { onDocx(); onClose(); }}>
          <span className="font-serif italic text-[#e85d3f] text-2xl w-8 text-center">W</span>
          <div>
            <div className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">Word document (.docx)</div>
            <div className="text-[12px] text-zinc-500 mt-0.5">Fully formatted — headings, bold, tables</div>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer" onClick={() => { onMarkdown(); onClose(); }}>
          <span className="font-serif italic text-[#e85d3f] text-2xl w-8 text-center">§</span>
          <div>
            <div className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">Markdown (.md)</div>
            <div className="text-[12px] text-zinc-500 mt-0.5">Plain text with markup</div>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}


// ─── MAIN EDITOR COMPONENT (FLEXBOX SANDWICH) ────────────────────────────────

export function CzarMobile() {
  const { user } = useAuth();
  const editor = useCzarEditor();

  const [voiceSheet, setVoiceSheet] = useState(false);
  const [piecesSheet, setPiecesSheet] = useState(false);
  const [settingsSheet, setSettingsSheet] = useState(false);
  const [writePanel, setWritePanel] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [downloadSheet, setDownloadSheet] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (!editor.streamingDoc && editor.docContent) setEditMode(false);
  }, [editor.streamingDoc, editor.docContent]);

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

  const saveLabel = editor.saveStatus === 'saving' ? 'saving…' : editor.saveStatus === 'error' ? 'save failed' : editor.saveStatus === 'unsaved' ? 'unsaved' : 'saved';

  return (
    // 1. ROOT CONTAINER: 100dvh flex column. Overrides any external body scrolling.
    // cz-m-vars: provides CSS custom properties (--paper, --ink, --primary etc.) so that
    // CzMobileSettings and CzMobileMic (EditorExtras) can inherit them via var().
    <div className="cz-m-vars flex flex-col w-full h-[100dvh] fixed inset-0 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans z-[9000] overflow-hidden">
      
      {/* ── TOP BAR (FLEX-SHRINK-0 = Stays at top) ── */}
      <div className="flex-shrink-0 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 z-20 px-3 pt-safe relative shadow-sm">
        <div className="flex items-center justify-between h-14">
          <button className="w-10 h-10 flex items-center justify-center text-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg" onClick={() => setPiecesSheet(true)}>≡</button>
          
          <div className="flex flex-col items-center flex-1 min-w-0 px-2">
            <div className="font-serif italic font-bold text-[16px] text-[#e85d3f]">czar<span className="text-zinc-900 dark:text-white">.</span></div>
            <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-zinc-500 mt-0.5 truncate w-full text-center" 
                  contentEditable suppressContentEditableWarning onBlur={(e) => { const t = e.currentTarget.textContent?.trim(); if (t && t !== editor.docTitle) editor.setDocTitle(t); }}>
              {editor.docTitle}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button className="w-9 h-9 flex items-center justify-center text-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg" onClick={() => setDownloadSheet(true)}>↓</button>
            <button className="w-9 h-9 flex items-center justify-center text-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg" onClick={() => setSettingsSheet(true)}>⚙</button>
          </div>
        </div>
        
        {/* Voice Strip */}
        <div className="flex items-center gap-3 py-3 border-t border-zinc-100 dark:border-zinc-900">
          <span className="font-serif italic font-bold text-lg text-[#e85d3f] w-6 text-center">{v.glyph}</span>
          <div className="flex flex-col flex-1">
            <span className="font-serif italic font-bold text-[15px]">{v.name}</span>
            <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-zinc-500">{v.tag} · writing mode</span>
          </div>
          <button className="text-[10px] font-mono uppercase tracking-widest text-[#e85d3f] px-3 py-1.5 border border-[#e85d3f]/30 rounded-full" onClick={() => setVoiceSheet(true)}>switch</button>
        </div>
      </div>

      {/* ── SCROLLABLE CANVAS (FLEX-1 = Fills remaining middle space, clips overflow) ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#fcfbf9] dark:bg-[#121212] p-5 relative z-0" {...drop.handlers}>
        
        {editor.streamingDoc && editor.currentAgent && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 bg-[#e85d3f]/10 border border-[#e85d3f]/20 rounded-md">
            <span className="w-2 h-2 rounded-full bg-[#e85d3f] animate-pulse" />
            <span className="font-mono text-[9px] tracking-widest uppercase text-[#e85d3f]">{editor.currentAgent}</span>
          </div>
        )}

        {editor.docLoading ? (
          <div className="space-y-4 animate-pulse opacity-50 py-4">
            <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4"></div>
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2 mb-6"></div>
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-5/6"></div>
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
          </div>
        ) : editor.docContent === '' ? (
          <div className="flex flex-col gap-3 pt-4">
            <p className="font-serif italic text-zinc-400 text-sm mb-2">What would you like to write?</p>
            <button onClick={() => setWritePanel(true)} className="bg-[#e85d3f]/10 border border-[#e85d3f]/20 p-4 rounded-xl text-left font-serif italic font-bold text-[15px] text-[#e85d3f]">
              § Ask Czar to write →
            </button>
            <button onClick={() => setCorrectionOpen(true)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl text-left font-sans text-[14px] text-zinc-600 dark:text-zinc-400">
              ✓ Correct a draft
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl text-left font-sans text-[14px] text-zinc-600 dark:text-zinc-400">
              ↑ Upload a document
            </button>
            <textarea
              ref={textareaRef}
              className="w-full min-h-[120px] mt-4 bg-transparent border-none outline-none font-serif text-[17px] leading-relaxed resize-none text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 placeholder:italic"
              value={editor.docContent}
              onChange={(e) => editor.setDocContent(e.target.value)}
              placeholder="Or start writing freely…"
            />
          </div>
        ) : !editMode ? (
          <div className="prose prose-zinc dark:prose-invert max-w-none font-serif text-[17px] leading-[1.8] text-zinc-800 dark:text-zinc-200 pb-6" onClick={() => setEditMode(true)}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{editor.docContent}</ReactMarkdown>
            {!editor.streamingDoc && <p className="text-center font-mono text-[10px] tracking-widest text-zinc-400 mt-8 uppercase opacity-60">Tap to edit</p>}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            className="w-full min-h-full bg-transparent border-none outline-none font-serif text-[17px] leading-[1.8] resize-none text-zinc-800 dark:text-zinc-200 pb-6"
            value={editor.docContent}
            onChange={(e) => editor.setDocContent(e.target.value)}
            autoFocus
            onBlur={() => { if (editor.docContent && !editor.streamingDoc) setEditMode(false); }}
          />
        )}
      </div>

      {/* ── BOTTOM TOOLS (FLEX-SHRINK-0 = Forced into flow at the bottom, CANNOT overlap) ── */}
      <div className="flex-shrink-0 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 z-20 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] pb-safe relative">
        
        {/* Status Bar */}
        <div className="flex justify-between items-center px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 font-mono text-[9px] tracking-widest uppercase text-zinc-500">
          <span>{editor.wordCount > 0 ? `${editor.wordCount.toLocaleString()} words` : 'empty'}</span>
          <strong className="text-zinc-800 dark:text-zinc-200">{saveLabel}</strong>
          <span>{editor.wordCount > 0 ? `${editor.readingTime} read` : '—'}</span>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center gap-2 p-2 px-3">
          <button className="flex-1 h-12 flex flex-col items-center justify-center bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300"
                  onClick={() => {
                    setEditMode(true);
                    const ta = textareaRef.current; if (!ta) return;
                    const { selectionStart: s, selectionEnd: e, value } = ta;
                    const sel = value.slice(s, e) || 'text';
                    const rep = sel.startsWith('**') && sel.endsWith('**') ? sel.slice(2, -2) : `**${sel}**`;
                    editor.setDocContent(value.slice(0, s) + rep + value.slice(e));
                  }}>
            <span className="font-serif font-bold text-[16px]">B</span>
            <span className="font-mono text-[8px] uppercase tracking-wider opacity-70 mt-0.5">Bold</span>
          </button>
          
          <button className="flex-1 h-12 flex flex-col items-center justify-center bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300"
                  onClick={() => {
                    setEditMode(true);
                    const ta = textareaRef.current; if (!ta) return;
                    const { selectionStart: s, selectionEnd: e, value } = ta;
                    const sel = value.slice(s, e) || 'text';
                    const isBold = sel.startsWith('**');
                    const rep = !isBold && sel.startsWith('*') && sel.endsWith('*') ? sel.slice(1, -1) : `*${sel}*`;
                    editor.setDocContent(value.slice(0, s) + rep + value.slice(e));
                  }}>
            <span className="font-serif italic text-[16px]">I</span>
            <span className="font-mono text-[8px] uppercase tracking-wider opacity-70 mt-0.5">Italic</span>
          </button>
          
          <button className="flex-1 h-12 flex flex-col items-center justify-center bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300" onClick={() => setCorrectionOpen(true)}>
            <span className="text-[14px]">✓</span>
            <span className="font-mono text-[8px] uppercase tracking-wider opacity-70 mt-0.5">Correct</span>
          </button>
          
          <button className={`flex-1 h-12 flex flex-col items-center justify-center border rounded-lg ${dict.live ? 'bg-red-500 border-red-500 text-white animate-pulse' : 'bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'}`}
                  onClick={() => dict.live ? dict.stop() : dict.start()}>
            <span className="text-[14px]">{dict.live ? '◉' : '◎'}</span>
            <span className="font-mono text-[8px] uppercase tracking-wider opacity-70 mt-0.5">Dictate</span>
          </button>
          
          <button className="flex-[1.5] h-12 flex flex-col items-center justify-center bg-[#e85d3f] border border-[#e85d3f] rounded-lg text-white"
                  onClick={editor.streamingDoc ? editor.stopStream : () => setWritePanel(true)}>
            <span className="font-serif italic font-bold text-[16px]">{editor.streamingDoc ? '◼' : '§'}</span>
            <span className="font-mono text-[8px] uppercase tracking-wider opacity-90 mt-0.5">{editor.streamingDoc ? 'Stop' : 'Write'}</span>
          </button>
        </div>
      </div>

      {/* ── HIDDEN INPUTS & MODALS ── */}
      <input ref={fileInputRef} type="file" accept=".txt,.md,.docx,.pdf" className="hidden" onChange={handleFileInput} />
      
      <CzMobileVoiceSheet open={voiceSheet} onClose={() => setVoiceSheet(false)} voice={editor.activeVoice} setVoice={editor.setActiveVoice} />
      <CzMobilePiecesSheet open={piecesSheet} onClose={() => setPiecesSheet(false)} pieces={editor.pieces} activePieceId={editor.activePieceId} onSelectPiece={editor.selectPiece} onCreatePiece={editor.createPiece} />
      <CzMobileWritePanel open={writePanel} onClose={() => setWritePanel(false)} onSubmit={(instruction: string, settings: any) => editor.writeFromPrompt(instruction, settings)} onCorrect={() => { setCorrectionOpen(true); setWritePanel(false); }} defaultPrefs={{ citation_style: editor.prefs.citation_style, writing_level: editor.prefs.writing_level }} />
      <CzMobileDownloadSheet open={downloadSheet} onClose={() => setDownloadSheet(false)} onDocx={() => downloadAsWord(editor.docContent)} onMarkdown={() => downloadMarkdown(editor.docTitle, editor.docContent)} />
      
      {/* External Extras Container - Pushed to absolute top layer */}
      <div className="fixed inset-0 z-[100000] pointer-events-none">
        <div className="pointer-events-auto">
          <CzMobileSettings open={settingsSheet} onClose={() => setSettingsSheet(false)} activeVoice={editor.activeVoice} setVoice={editor.setActiveVoice} prefs={editor.prefs} setPrefs={editor.setPrefs} />
          <CzMobileMic open={dict.live} seconds={dict.seconds} final={dict.final} interim={dict.interim} onClose={() => dict.stop()} onInsert={handleMicInsert} />
          <CorrectionModal open={correctionOpen} onClose={() => setCorrectionOpen(false)} onApplied={(content) => { editor.setDocContent(content); editor.manualSave(); }} />
        </div>
      </div>
    </div>
  );
}
