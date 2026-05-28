import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CZ_VOICES } from './editorData';
import { useCzarEditor } from './useCzarEditor';
import { useCzDictation, useCzDropZone } from './editorHooks';
import { CzMobileSettings, CzMobileMic } from './EditorExtras';
import { useAuth } from '@/contexts/AuthContext';
import { CorrectionModal } from '@/components/czar/CorrectionModal';
import { buildDocx, docxFilename } from '@/lib/czarDocUtils';
import { Packer } from 'docx';
import { supabase } from '@/integrations/supabase/client';
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

// ─── BOTTOM SHEET WITH SWIPE-TO-DISMISS ───────────────────────────────────────

const BottomSheet = ({ open, onClose, title, actionText, onAction, children }: any) => {
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);
  const isDragging = useRef(false);

  const onHandleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  };
  const onHandleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || startY.current === null) return;
    setDragY(Math.max(0, e.touches[0].clientY - startY.current));
  };
  const onHandleTouchEnd = () => {
    isDragging.current = false;
    if (dragY > 100) { setDragY(0); onClose(); }
    else setDragY(0);
    startY.current = null;
  };

  useEffect(() => { if (!open) { setDragY(0); isDragging.current = false; } }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex flex-col justify-end animate-in fade-in duration-200" onClick={onClose}>
      <div
        style={{ transform: `translateY(${dragY}px)`, transition: isDragging.current ? 'none' : 'transform 0.25s ease' }}
        className="w-full bg-white dark:bg-zinc-950 rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.3)] border-t border-zinc-200 dark:border-zinc-800 p-5 pb-safe overflow-y-auto max-h-[85vh] relative z-[100000]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle — pull down to dismiss */}
        <div
          className="w-full flex justify-center pb-4 pt-1 -mt-2 cursor-grab active:cursor-grabbing select-none"
          onTouchStart={onHandleTouchStart}
          onTouchMove={onHandleTouchMove}
          onTouchEnd={onHandleTouchEnd}
        >
          <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
        </div>
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

// ─── VOICE SHEET ──────────────────────────────────────────────────────────────

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

// ─── PIECES SHEET WITH DELETE + RENAME + SWIPE ────────────────────────────────

function CzMobilePiecesSheet({ open, onClose, pieces, activePieceId, onSelectPiece, onCreatePiece, onDeletePiece, onRenamePiece }: any) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [swipedLeftId, setSwipedLeftId] = useState<string | null>(null);
  const touchStart = useRef<{ x: number; y: number; id: string } | null>(null);
  // Used to prevent blur-save when the cancel button is tapped
  const cancellingRef = useRef(false);

  const startSwipe = (e: React.TouchEvent, id: string) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, id };
  };

  const endSwipe = (e: React.TouchEvent, id: string) => {
    if (!touchStart.current || touchStart.current.id !== id) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStart.current.y);
    touchStart.current = null;
    if (dy > 30) return;
    if (dx < -40) {
      setSwipedLeftId(id);
      setRenamingId(null);
    } else if (dx > 40) {
      const piece = pieces.find((p: any) => p.id === id);
      if (piece) { setRenamingId(id); setRenameValue(piece.name); setSwipedLeftId(null); }
    } else if (swipedLeftId === id) {
      setSwipedLeftId(null);
    }
  };

  const commitRename = (id: string) => {
    if (renameValue.trim()) onRenamePiece(id, renameValue.trim());
    setRenamingId(null);
    setRenameValue('');
  };

  const handleClose = () => { setSwipedLeftId(null); setRenamingId(null); onClose(); };

  return (
    <BottomSheet open={open} onClose={handleClose} title="Pieces" actionText="+ New" onAction={() => { onCreatePiece(); handleClose(); }}>
      {pieces.length === 0 && <p className="text-[13px] text-zinc-500 py-2">No pieces yet.</p>}
      {pieces.map((p: any) => (
        <div key={p.id} className="relative mb-1 overflow-hidden rounded-lg">
          {/* Swipe-left delete action (revealed behind) */}
          <div className="absolute inset-y-0 right-0 flex">
            <button
              className="h-full px-5 bg-red-500 text-white text-[12px] font-bold rounded-r-lg"
              onClick={() => { onDeletePiece(p.id); setSwipedLeftId(null); if (p.id === activePieceId) handleClose(); }}>
              Delete
            </button>
          </div>

          {renamingId === p.id ? (
            // Inline rename input — saves on blur (tap away) or Enter; cancel with ✕
            <div className={`flex items-center gap-2 p-3 rounded-lg border ${p.id === activePieceId ? 'border-[#e85d3f]/40 bg-[#e85d3f]/5' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950'}`}>
              <input
                autoFocus
                className="flex-1 bg-transparent border-none outline-none font-sans text-[13px] text-zinc-900 dark:text-zinc-100 min-w-0"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitRename(p.id); } }}
                onBlur={() => {
                  if (!cancellingRef.current) commitRename(p.id);
                  cancellingRef.current = false;
                }}
              />
              <button
                className="w-9 h-9 flex items-center justify-center text-[#e85d3f] text-[15px] font-bold flex-shrink-0"
                onPointerDown={() => { cancellingRef.current = false; }}
                onClick={() => commitRename(p.id)}>✓</button>
              <button
                className="w-9 h-9 flex items-center justify-center text-zinc-400 text-[17px] flex-shrink-0"
                onPointerDown={() => { cancellingRef.current = true; }}
                onClick={() => { setRenamingId(null); setRenameValue(''); }}>×</button>
            </div>
          ) : (
            // Normal row — touch-action: pan-y so browser handles vertical scroll
            // but our handlers receive horizontal swipe events
            <div
              style={{
                transform: swipedLeftId === p.id ? 'translateX(-80px)' : 'translateX(0)',
                transition: 'transform 0.22s ease',
                opacity: p.isPending ? 0.5 : 1,
                touchAction: 'pan-y',
              }}
              className={`flex items-center gap-2.5 p-3 rounded-lg cursor-pointer ${p.id === activePieceId ? 'bg-[#e85d3f]/10' : 'bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900'}`}
              onClick={() => {
                if (swipedLeftId) { setSwipedLeftId(null); return; }
                if (!p.isPending) { onSelectPiece(p.id); handleClose(); }
              }}
              onTouchStart={(e) => startSwipe(e, p.id)}
              onTouchEnd={(e) => endSwipe(e, p.id)}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.id === activePieceId ? 'bg-[#e85d3f]' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
              <span className="font-sans text-[13px] font-medium text-zinc-900 dark:text-zinc-100 flex-1 truncate">{p.name}</span>
              <span className="font-mono text-[9px] tracking-widest uppercase text-zinc-500 mr-1">{p.meta}</span>
              <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                <button
                  className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-[#e85d3f] rounded text-[14px]"
                  onClick={() => { setRenamingId(p.id); setRenameValue(p.name); setSwipedLeftId(null); }}>
                  ✎
                </button>
                <button
                  className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-red-500 rounded text-[13px]"
                  onClick={() => { onDeletePiece(p.id); if (p.id === activePieceId) handleClose(); }}>
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
      <p className="font-mono text-[9px] text-zinc-400 text-center mt-3 tracking-widest uppercase">← swipe left to delete · swipe right to rename →</p>
    </BottomSheet>
  );
}

// ─── WRITE PANEL ──────────────────────────────────────────────────────────────

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

// ─── DOWNLOAD SHEET ───────────────────────────────────────────────────────────

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

// ─── UPLOAD PROGRESS MODAL ────────────────────────────────────────────────────

const UPLOAD_STEPS = [
  { label: 'Reading', desc: 'Loading your document…' },
  { label: 'Analysing', desc: 'Understanding the content and structure…' },
  { label: 'Thinking', desc: 'Czar is forming a response…' },
];

function CzMobileUploadModal({ open, onClose, info, step }: { open: boolean; onClose: () => void; info: { name: string; kind: string; size: string } | null; step: number }) {
  if (!open || !info) return null;
  const done = step >= UPLOAD_STEPS.length;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[99999] flex items-end justify-center">
      <div className="w-full bg-white dark:bg-zinc-950 rounded-t-3xl p-6 border-t border-zinc-200 dark:border-zinc-800 shadow-[0_-12px_48px_rgba(0,0,0,0.35)]" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-6" />
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#e85d3f]/10 border border-[#e85d3f]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[#e85d3f] text-lg">↑</span>
          </div>
          <div className="min-w-0">
            <div className="font-serif italic font-bold text-[16px] text-zinc-900 dark:text-zinc-100 truncate">{info.name}</div>
            <div className="font-mono text-[9px] tracking-widest uppercase text-zinc-400 mt-0.5">{info.kind} · {info.size}</div>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-6">
          {UPLOAD_STEPS.map((s, i) => {
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div key={s.label} className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${isActive ? 'border-[#e85d3f]/40 bg-[#e85d3f]/5' : isDone ? 'border-zinc-200 dark:border-zinc-800 opacity-60' : 'border-zinc-100 dark:border-zinc-900 opacity-25'}`}>
                <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold transition-all ${isActive ? 'bg-[#e85d3f] text-white animate-pulse' : isDone ? 'bg-zinc-400 dark:bg-zinc-600 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'}`}>
                  {isDone ? '✓' : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-sans text-[13px] font-semibold ${isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400'}`}>{s.label}</div>
                  {isActive && <div className="font-mono text-[9px] tracking-wide text-zinc-400 mt-0.5">{s.desc}</div>}
                </div>
                {isActive && (
                  <div className="flex gap-0.5 flex-shrink-0">
                    {[0,1,2].map(j => <span key={j} className="w-1 h-1 rounded-full bg-[#e85d3f]" style={{ animationDelay: `${j * 0.15}s`, animation: 'pulse 1s ease-in-out infinite' }} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {done ? (
          <button className="w-full h-12 bg-[#e85d3f] hover:bg-[#d65135] text-white rounded-xl font-serif italic font-bold text-[16px] flex items-center justify-center gap-2" onClick={onClose}>
            <span>Done</span><span>✓</span>
          </button>
        ) : (
          <div className="text-center font-mono text-[9px] tracking-widest uppercase text-zinc-400">Processing…</div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN EDITOR COMPONENT (FLEXBOX SANDWICH) ─────────────────────────────────

export function CzarMobile() {
  const { user } = useAuth();
  const editor = useCzarEditor();

  const [piecesSheet, setPiecesSheet] = useState(false);
  const [settingsSheet, setSettingsSheet] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'voices' | 'academic' | 'rules'>('voices');
  const [writePanel, setWritePanel] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [downloadSheet, setDownloadSheet] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState(0);
  const [uploadInfo, setUploadInfo] = useState<{ name: string; kind: string; size: string } | null>(null);
  const [uploadStreamingStarted, setUploadStreamingStarted] = useState(false);

  // Track when streaming starts (after import is triggered)
  useEffect(() => {
    if (uploadModalOpen && uploadStep === 2 && editor.streamingDoc) {
      setUploadStreamingStarted(true);
    }
  }, [uploadModalOpen, uploadStep, editor.streamingDoc]);

  // Advance to "Done" only after streaming has started AND stopped
  useEffect(() => {
    if (uploadModalOpen && uploadStep === 2 && uploadStreamingStarted && !editor.streamingDoc) {
      const t = setTimeout(() => { setUploadStep(3); setUploadStreamingStarted(false); }, 400);
      return () => clearTimeout(t);
    }
  }, [editor.streamingDoc, uploadStep, uploadModalOpen, uploadStreamingStarted]);

  // Safety fallback: show Done after 60s regardless
  useEffect(() => {
    if (!uploadModalOpen || uploadStep !== 2) return;
    const t = setTimeout(() => setUploadStep(3), 60_000);
    return () => clearTimeout(t);
  }, [uploadModalOpen, uploadStep]);

  useEffect(() => {
    if (!editor.streamingDoc && editor.docContent) setEditMode(false);
  }, [editor.streamingDoc, editor.docContent]);

  // Fix: iOS Safari ignores autoFocus on programmatically-mounted elements.
  // Explicit imperative focus with a tiny delay for the DOM to settle.
  useEffect(() => {
    if (editMode) {
      const t = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [editMode]);

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

  // Upload with 3-step progress modal
  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';

    const ext = (f.name.split('.').pop() || '').toLowerCase();
    const kindLabel = ext.toUpperCase();
    setUploadInfo({ name: f.name, kind: kindLabel, size: (f.size / 1024).toFixed(1) + ' KB' });
    setUploadStreamingStarted(false);
    setUploadStep(0);
    setUploadModalOpen(true);

    await new Promise<void>(r => setTimeout(r, 750));
    setUploadStep(1);
    await new Promise<void>(r => setTimeout(r, 750));
    setUploadStep(2);

    // ── Text files: extract in-browser, send as message ──────────────────
    if (ext === 'txt' || ext === 'md') {
      const text = await f.text();
      editor.writeFromPrompt(
        `I've uploaded a file called "${f.name}". Here is its content:\n\n${text}\n\nPlease read it carefully, tell me what it's about, and ask what you'd like to do with it.`,
        { mode: 'chat' },
      );
      return;
    }

    // ── .docx: extract text using mammoth (lazy-loaded), send as message ─
    if (ext === 'docx') {
      const arrayBuffer = await f.arrayBuffer();
      const mammoth = await import('mammoth');
      const { value: text } = await mammoth.extractRawText({ arrayBuffer });
      editor.writeFromPrompt(
        `I've uploaded a Word document called "${f.name}". Here is its full text content:\n\n${text}\n\nPlease read it carefully, tell me what this document is about, and ask what you'd like to do with it.`,
        { mode: 'chat' },
      );
      return;
    }

    // ── Binary files (images, audio, PDF): upload to storage ─────────────
    // Normalise audio MIME types — iOS sends audio/x-m4a which Gemini rejects
    let mime = f.type || 'application/octet-stream';
    if (mime === 'audio/x-m4a' || (ext === 'm4a' && !mime.startsWith('audio/'))) mime = 'audio/mp4';
    if (mime === 'audio/mpeg' && ext === 'mp3') mime = 'audio/mp3';

    if (!user?.id) {
      // Not logged in — can't upload to storage
      editor.writeFromPrompt(
        `I tried to upload "${f.name}" but need to be signed in to process binary files. Please log in and try again.`,
        { mode: 'chat' },
      );
      return;
    }

    const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${user.id}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from('czar-uploads').upload(path, f, { contentType: mime });
    if (error) {
      editor.writeFromPrompt(
        `Upload failed for "${f.name}": ${error.message}. Please try again.`,
        { mode: 'chat' },
      );
      return;
    }
    editor.importFile({ storage_path: path, filename: f.name, size: f.size, mime });
  }, [user?.id, editor, setUploadStreamingStarted]);

  const saveLabel = editor.saveStatus === 'saving' ? 'saving…' : editor.saveStatus === 'error' ? 'save failed' : editor.saveStatus === 'unsaved' ? 'unsaved' : 'saved';

  return (
    // cz-m-vars: provides CSS custom properties for CzMobileSettings and CzMobileMic (EditorExtras)
    <div className="cz-m-vars flex flex-col w-full h-[100dvh] fixed inset-0 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans z-[9000] overflow-hidden">

      {/* ── TOP BAR ── */}
      <div className="flex-shrink-0 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 z-20 px-3 pt-safe relative shadow-sm">
        <div className="flex items-center justify-between h-14">
          <button className="w-10 h-10 flex items-center justify-center text-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg" onClick={() => setPiecesSheet(true)}>≡</button>

          <div className="flex flex-col items-center flex-1 min-w-0 px-2">
            <div className="font-serif italic font-bold text-[16px] text-[#e85d3f]">czar<span className="text-zinc-900 dark:text-white">.</span></div>
            <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-zinc-500 mt-0.5 truncate w-full text-center"
                  contentEditable suppressContentEditableWarning onBlur={(e) => { const t = e.currentTarget.textContent?.trim(); if (t && t !== editor.docTitle) editor.setDocTitle(t); }}>
              {editor.docTitle}
            </span>
            {/* Voice chip — tap to open Settings → Voices */}
            <button
              className="font-mono text-[8px] tracking-widest uppercase text-[#e85d3f]/60 hover:text-[#e85d3f] mt-0.5"
              onClick={() => { setSettingsTab('voices'); setSettingsSheet(true); }}>
              {v.glyph} {v.name}
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button className="w-9 h-9 flex items-center justify-center text-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg" onClick={() => setDownloadSheet(true)}>↓</button>
            <button className="w-9 h-9 flex items-center justify-center text-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg" onClick={() => { setSettingsTab('academic'); setSettingsSheet(true); }}>⚙</button>
          </div>
        </div>
      </div>

      {/* ── SCROLLABLE CANVAS ── */}
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
        ) : !editMode && editor.docContent ? (
          <div
            className="prose prose-zinc dark:prose-invert max-w-none prose-headings:font-serif prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-p:font-serif prose-p:text-[17px] prose-p:leading-[1.8] pb-6"
            onClick={() => setEditMode(true)}>
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
          />
        )}
      </div>

      {/* ── BOTTOM TOOLS ── */}
      <div className="flex-shrink-0 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 z-20 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] pb-safe relative">

        {/* Status Bar — tap to exit edit mode */}
        <div
          className={`flex justify-between items-center px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 font-mono text-[9px] tracking-widest uppercase transition-colors ${editMode ? 'bg-[#e85d3f]/8 cursor-pointer active:bg-[#e85d3f]/15' : 'bg-zinc-50 dark:bg-zinc-900'}`}
          onClick={() => { if (editMode) setEditMode(false); }}>
          <span className="text-zinc-500">{editor.wordCount > 0 ? `${editor.wordCount.toLocaleString()} words` : 'empty'}</span>
          {editMode
            ? <span className="text-[#e85d3f] font-bold tracking-[0.2em]">Done editing ↑</span>
            : <strong className="text-zinc-800 dark:text-zinc-200">{saveLabel}</strong>}
          <span className="text-zinc-500">{editor.wordCount > 0 ? `${editor.readingTime} read` : '—'}</span>
        </div>

        {/* Buttons Row: Upload · Continue · Correct · Dictate · Write */}
        <div className="flex items-center gap-2 p-2 px-3">
          {/* Upload */}
          <button
            className="flex-1 h-12 flex flex-col items-center justify-center bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300"
            onClick={() => fileInputRef.current?.click()}>
            <span className="text-[16px]">↑</span>
            <span className="font-mono text-[8px] uppercase tracking-wider opacity-70 mt-0.5">Upload</span>
          </button>

          {/* Tighten */}
          <button
            className="flex-1 h-12 flex flex-col items-center justify-center bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300 disabled:opacity-40"
            onClick={() => editor.tighten()}
            disabled={editor.streamingDoc || !editor.docContent}>
            <span className="font-serif italic text-[14px]">§</span>
            <span className="font-mono text-[8px] uppercase tracking-wider opacity-70 mt-0.5">Tighten</span>
          </button>

          {/* Correct */}
          <button
            className="flex-1 h-12 flex flex-col items-center justify-center bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300"
            onClick={() => setCorrectionOpen(true)}>
            <span className="text-[14px]">✓</span>
            <span className="font-mono text-[8px] uppercase tracking-wider opacity-70 mt-0.5">Correct</span>
          </button>

          {/* Dictate */}
          <button
            className={`flex-1 h-12 flex flex-col items-center justify-center border rounded-lg ${dict.live ? 'bg-red-500 border-red-500 text-white animate-pulse' : 'bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'}`}
            onClick={() => dict.live ? dict.stop() : dict.start()}>
            <span className="text-[14px]">{dict.live ? '◉' : '◎'}</span>
            <span className="font-mono text-[8px] uppercase tracking-wider opacity-70 mt-0.5">Dictate</span>
          </button>

          {/* Write / Stop */}
          <button
            className="flex-[1.5] h-12 flex flex-col items-center justify-center bg-[#e85d3f] border border-[#e85d3f] rounded-lg text-white"
            onClick={editor.streamingDoc ? editor.stopStream : () => setWritePanel(true)}>
            <span className="font-serif italic font-bold text-[16px]">{editor.streamingDoc ? '◼' : '§'}</span>
            <span className="font-mono text-[8px] uppercase tracking-wider opacity-90 mt-0.5">{editor.streamingDoc ? 'Stop' : 'Write'}</span>
          </button>
        </div>
      </div>

      {/* ── HIDDEN FILE INPUT ── */}
      <input ref={fileInputRef} type="file" accept=".txt,.md,.docx,.pdf,.mp3,.wav,.m4a,.jpg,.jpeg,.png,.gif,.webp" className="hidden" onChange={handleFileInput} />

      {/* ── INLINE BOTTOM SHEETS ── */}
      <CzMobilePiecesSheet
        open={piecesSheet} onClose={() => setPiecesSheet(false)}
        pieces={editor.pieces} activePieceId={editor.activePieceId}
        onSelectPiece={editor.selectPiece} onCreatePiece={editor.createPiece}
        onDeletePiece={editor.deletePiece} onRenamePiece={editor.renamePiece}
      />
      <CzMobileWritePanel open={writePanel} onClose={() => setWritePanel(false)} onSubmit={(instruction: string, settings: any) => editor.writeFromPrompt(instruction, settings)} onCorrect={() => { setCorrectionOpen(true); setWritePanel(false); }} defaultPrefs={{ citation_style: editor.prefs.citation_style, writing_level: editor.prefs.writing_level }} />
      <CzMobileDownloadSheet open={downloadSheet} onClose={() => setDownloadSheet(false)} onDocx={() => downloadAsWord(editor.docContent)} onMarkdown={() => downloadMarkdown(editor.docTitle, editor.docContent)} />

      {/* ── UPLOAD PROGRESS MODAL ── */}
      <CzMobileUploadModal open={uploadModalOpen} onClose={() => setUploadModalOpen(false)} info={uploadInfo} step={uploadStep} />

      {/* ── EXTERNAL COMPONENTS (Settings / Mic / Correction) ── */}
      <div className="fixed inset-0 z-[100000] pointer-events-none">
        <div className="pointer-events-auto">
          <CzMobileSettings open={settingsSheet} onClose={() => setSettingsSheet(false)} initialTab={settingsTab} activeVoice={editor.activeVoice} setVoice={editor.setActiveVoice} prefs={editor.prefs} setPrefs={editor.setPrefs} />
          <CzMobileMic open={dict.live} seconds={dict.seconds} final={dict.final} interim={dict.interim} onClose={() => dict.stop()} onInsert={handleMicInsert} />
          <CorrectionModal open={correctionOpen} onClose={() => setCorrectionOpen(false)} onApplied={(content) => { editor.setDocContent(content); editor.manualSave(); }} />
        </div>
      </div>
    </div>
  );
}
