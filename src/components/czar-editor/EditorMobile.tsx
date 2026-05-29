import React, { useState, useRef, useCallback, useEffect } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
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

// react-markdown strips data: URIs and unknown schemes by default (XSS guard),
// which blanks the src of inline generated images and our loading/error
// sentinels. Whitelist them so inline figures actually render.
const czarUrlTransform = (url: string): string => {
  if (
    url.startsWith('data:image/') ||
    url.startsWith('czar-loading://') ||
    url.startsWith('czar-error://')
  ) {
    return url;
  }
  return defaultUrlTransform(url);
};

// Custom image renderer — handles czar-loading:// and czar-error:// markers
const czarImgComponents: Components = {
  img: ({ src, alt }) => {
    if (src?.startsWith('czar-loading://')) {
      return (
        <div className="my-6 flex flex-col items-center justify-center py-10 rounded-2xl border border-zinc-200 bg-zinc-50 gap-2">
          <span className="font-serif italic font-bold text-[#e85d3f] text-5xl animate-pulse leading-none select-none">Ц</span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-400 mt-1">Drawing…</span>
          {alt && <span className="text-[11px] text-zinc-400 text-center px-6 max-w-xs leading-relaxed italic">{alt}</span>}
        </div>
      );
    }
    if (src?.startsWith('czar-error://')) {
      return (
        <div className="my-4 flex items-center justify-center py-6 rounded-xl border border-zinc-200 bg-zinc-50">
          <span className="text-[11px] text-zinc-400 italic">Image could not be generated</span>
        </div>
      );
    }
    return <img src={src} alt={alt} className="w-full rounded-xl border border-zinc-200 shadow-sm my-4 block" />;
  },
};

const LANG_MAP: Record<string, string> = {
  british: 'en-GB', american: 'en-US', australian: 'en-AU', canadian: 'en-CA',
  'en-us': 'en-US', 'en-gb': 'en-GB', 'en-au': 'en-AU', 'en-ca': 'en-CA',
  'es': 'es-ES', 'fr': 'fr-FR',
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

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function getGreeting(userName: string): [string, string, string] {
  const hour = new Date().getHours();
  const first = (userName || '').split(' ')[0] || '';
  const nameLine = first ? `Hi ${first}` : 'Hi there';
  const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const questions: Record<string, [string, string][]> = {
    morning: [
      ['How can I', 'help you today?'],
      ['What would you', 'like to write?'],
      ['Ready to', 'start writing?'],
      ['What shall we', 'create together?'],
    ],
    afternoon: [
      ['How can I', 'help you today?'],
      ['What would you', 'like to work on?'],
      ['What shall we', 'write together?'],
      ['Ready to', 'create something?'],
    ],
    evening: [
      ['How can I', 'help you tonight?'],
      ['What shall we', 'create tonight?'],
      ['Working on', 'something special?'],
      ["What's on", 'your mind?'],
    ],
  };
  const opts = questions[period];
  const [q1, q2] = opts[new Date().getDate() % opts.length];
  return [nameLine, q1, q2];
}

// ─── BOTTOM SHEET ─────────────────────────────────────────────────────────────

const BottomSheet = ({ open, onClose, title, actionText, onAction, children }: any) => {
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);
  const isDragging = useRef(false);

  const onHandleTouchStart = (e: React.TouchEvent) => { startY.current = e.touches[0].clientY; isDragging.current = true; };
  const onHandleTouchMove = (e: React.TouchEvent) => { if (!isDragging.current || startY.current === null) return; setDragY(Math.max(0, e.touches[0].clientY - startY.current)); };
  const onHandleTouchEnd = () => { isDragging.current = false; if (dragY > 100) { setDragY(0); onClose(); } else setDragY(0); startY.current = null; };

  useEffect(() => { if (!open) { setDragY(0); isDragging.current = false; } }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex flex-col justify-end animate-in fade-in duration-200" onClick={onClose}>
      <div
        style={{ transform: `translateY(${dragY}px)`, transition: isDragging.current ? 'none' : 'transform 0.25s ease' }}
        className="w-full bg-white dark:bg-zinc-950 rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.3)] border-t border-zinc-200 dark:border-zinc-800 p-5 pb-safe overflow-y-auto max-h-[85vh] relative z-[100000]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full flex justify-center pb-4 pt-1 -mt-2 cursor-grab" onTouchStart={onHandleTouchStart} onTouchMove={onHandleTouchMove} onTouchEnd={onHandleTouchEnd}>
          <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
        </div>
        <div className="flex justify-between items-center mb-5 font-mono text-[10px] tracking-[0.2em] uppercase text-zinc-500">
          <span>{title}</span>
          <button className="text-[#e85d3f] font-bold py-1 px-2 hover:bg-red-50 rounded" onClick={onAction || onClose}>{actionText || 'Close'}</button>
        </div>
        {children}
      </div>
    </div>
  );
};

// ─── PIECES SHEET ─────────────────────────────────────────────────────────────

function CzMobilePiecesSheet({ open, onClose, pieces, activePieceId, onSelectPiece, onCreatePiece, onDeletePiece, onRenamePiece }: any) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const cancellingRef = useRef(false);

  const commitRename = (id: string) => { if (renameValue.trim()) onRenamePiece(id, renameValue.trim()); setRenamingId(null); setRenameValue(''); };
  const handleClose = () => { setRenamingId(null); onClose(); };

  return (
    <BottomSheet open={open} onClose={handleClose} title="Conversations" actionText="+ New" onAction={() => { onCreatePiece(); handleClose(); }}>
      {pieces.length === 0 && <p className="text-[13px] text-zinc-500 py-2">No conversations yet.</p>}
      {pieces.map((p: any) => (
        <div key={p.id} className="mb-1">
          {renamingId === p.id ? (
            <div className={`flex items-center gap-2 p-3 rounded-lg border ${p.id === activePieceId ? 'border-[#e85d3f]/40 bg-[#e85d3f]/5' : 'border-zinc-200 bg-white'}`}>
              <input autoFocus className="flex-1 bg-transparent border-none outline-none font-sans text-[13px] text-zinc-900 min-w-0" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitRename(p.id); } }} onBlur={() => { if (!cancellingRef.current) commitRename(p.id); cancellingRef.current = false; }} />
              <button className="w-9 h-9 flex items-center justify-center text-[#e85d3f] text-[15px] font-bold flex-shrink-0" onPointerDown={() => { cancellingRef.current = false; }} onClick={() => commitRename(p.id)}>✓</button>
              <button className="w-9 h-9 flex items-center justify-center text-zinc-400 text-[17px] flex-shrink-0" onPointerDown={() => { cancellingRef.current = true; }} onClick={() => { setRenamingId(null); setRenameValue(''); }}>×</button>
            </div>
          ) : (
            <div
              className={`flex items-center gap-2.5 p-3 rounded-lg cursor-pointer ${p.id === activePieceId ? 'bg-[#e85d3f]/10' : 'bg-white hover:bg-zinc-50'}`}
              onClick={() => { if (!p.isPending) { onSelectPiece(p.id); handleClose(); } }}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.id === activePieceId ? 'bg-[#e85d3f]' : 'bg-zinc-300'}`} />
              <span className="font-sans text-[13px] font-medium text-zinc-900 flex-1 truncate">{p.name}</span>
              <span className="font-mono text-[9px] tracking-widest uppercase text-zinc-500 mr-1">{p.meta}</span>
              <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                <button className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-[#e85d3f] rounded text-[14px]" onClick={() => { setRenamingId(p.id); setRenameValue(p.name); }}>✎</button>
                <button className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-red-500 rounded text-[13px]" onClick={() => { onDeletePiece(p.id); if (p.id === activePieceId) handleClose(); }}>✕</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </BottomSheet>
  );
}

// ─── DOWNLOAD SHEET ───────────────────────────────────────────────────────────

function CzMobileDownloadSheet({ open, onClose, onDocx, onMarkdown }: any) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Download" actionText="×">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-4 p-4 rounded-xl border border-zinc-200 hover:bg-zinc-50 cursor-pointer" onClick={() => { onDocx(); onClose(); }}>
          <span className="font-serif italic text-[#e85d3f] text-2xl w-8 text-center">W</span>
          <div><div className="text-[15px] font-semibold text-zinc-900">Word document (.docx)</div><div className="text-[12px] text-zinc-500 mt-0.5">Fully formatted — headings, bold, tables</div></div>
        </div>
        <div className="flex items-center gap-4 p-4 rounded-xl border border-zinc-200 hover:bg-zinc-50 cursor-pointer" onClick={() => { onMarkdown(); onClose(); }}>
          <span className="font-serif italic text-[#e85d3f] text-2xl w-8 text-center">§</span>
          <div><div className="text-[15px] font-semibold text-zinc-900">Markdown (.md)</div><div className="text-[12px] text-zinc-500 mt-0.5">Plain text with markup</div></div>
        </div>
      </div>
    </BottomSheet>
  );
}

// ─── UPLOAD MODAL ─────────────────────────────────────────────────────────────

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
      <div className="w-full bg-white rounded-t-3xl p-6 border-t border-zinc-200 shadow-[0_-12px_48px_rgba(0,0,0,0.35)]" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <div className="w-12 h-1.5 bg-zinc-300 rounded-full mx-auto mb-6" />
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#e85d3f]/10 border border-[#e85d3f]/20 flex items-center justify-center flex-shrink-0"><span className="text-[#e85d3f] text-lg">↑</span></div>
          <div className="min-w-0"><div className="font-serif italic font-bold text-[16px] text-zinc-900 truncate">{info.name}</div><div className="font-mono text-[9px] tracking-widest uppercase text-zinc-400 mt-0.5">{info.kind} · {info.size}</div></div>
        </div>
        <div className="flex flex-col gap-2 mb-6">
          {UPLOAD_STEPS.map((s, i) => {
            const isActive = i === step; const isDone = i < step;
            return (
              <div key={s.label} className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${isActive ? 'border-[#e85d3f]/40 bg-[#e85d3f]/5' : isDone ? 'border-zinc-200 opacity-60' : 'border-zinc-100 opacity-25'}`}>
                <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold ${isActive ? 'bg-[#e85d3f] text-white animate-pulse' : isDone ? 'bg-zinc-400 text-white' : 'bg-zinc-200 text-zinc-400'}`}>{isDone ? '✓' : i + 1}</div>
                <div className="flex-1 min-w-0"><div className={`font-sans text-[13px] font-semibold ${isActive ? 'text-zinc-900' : 'text-zinc-500'}`}>{s.label}</div>{isActive && <div className="font-mono text-[9px] tracking-wide text-zinc-400 mt-0.5">{s.desc}</div>}</div>
              </div>
            );
          })}
        </div>
        {done ? <button className="w-full h-12 bg-[#e85d3f] text-white rounded-xl font-serif italic font-bold text-[16px] flex items-center justify-center gap-2" onClick={onClose}><span>Done</span><span>✓</span></button> : <div className="text-center font-mono text-[9px] tracking-widest uppercase text-zinc-400">Processing…</div>}
      </div>
    </div>
  );
}

// ─── MESSAGE COMPONENTS ───────────────────────────────────────────────────────

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end mb-4">
      <div className="max-w-[82%] bg-[#e85d3f]/10 border border-[#e85d3f]/15 rounded-2xl rounded-tr-md px-4 py-3">
        <p className="font-sans text-[15px] leading-[1.6] text-zinc-800 whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

function CzarChatMessage({ content, isStreaming, imageUrl }: { content: string; isStreaming?: boolean; imageUrl?: string }) {
  return (
    <div className="mb-5">
      {/* Brand mark sits above the message so content spans the full width */}
      <span className="block font-serif italic font-bold text-[#e85d3f] text-[15px] mb-1.5 leading-none">Ц</span>
      <div className="min-w-0">
        {isStreaming && !content && !imageUrl ? (
          <div className="flex gap-1 pt-1">
            {[0, 1, 2].map(i => <span key={i} className="w-2 h-2 rounded-full bg-[#e85d3f]/40" style={{ animation: `pulse 1s ease-in-out ${i * 0.2}s infinite` }} />)}
          </div>
        ) : (
          <>
            {content && (
              <div className="prose prose-zinc max-w-none prose-p:font-serif prose-p:text-[16px] prose-p:leading-[1.75] prose-headings:font-serif prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg">
                <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={czarUrlTransform} components={czarImgComponents}>{content}</ReactMarkdown>
                {isStreaming && <span className="inline-block w-0.5 h-4 bg-[#e85d3f] ml-0.5 animate-pulse align-middle" />}
              </div>
            )}
            {imageUrl && (
              <div className="mt-1">
                <img src={imageUrl} alt="Generated image" className="w-full rounded-xl border border-zinc-200 shadow-sm" />
                <a href={imageUrl} download="czar-image.png" className="inline-block mt-2 font-mono text-[10px] tracking-widest uppercase text-zinc-400 hover:text-[#e85d3f] transition-colors">↓ Download</a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── CHAT INPUT ───────────────────────────────────────────────────────────────

function CzChatInput({
  value, onChange, onSend, onStop, onUpload, onMic, onCorrect, onSettings, dictLive, streaming, disabled,
}: {
  value: string; onChange: (v: string) => void; onSend: () => void; onStop: () => void;
  onUpload: () => void; onMic: () => void; onCorrect: () => void; onSettings: () => void; dictLive: boolean; streaming: boolean; disabled?: boolean;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [value]);

  return (
    <div className="px-3 pb-3 pt-1" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
      <div className="bg-white rounded-2xl shadow-[0_2px_24px_rgba(0,0,0,0.10)] border border-zinc-200/60 overflow-hidden">
        {/* Borderless textarea */}
        <div className="px-4 pt-4 pb-2">
          <textarea
            ref={taRef}
            className="w-full bg-transparent border-none outline-none font-sans text-[16px] leading-[1.6] resize-none min-h-[28px] max-h-[160px] text-zinc-900 placeholder:text-zinc-400"
            placeholder="Ask Czar anything…"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            rows={1}
            disabled={disabled}
          />
        </div>

        {/* Icon row — no separator border */}
        <div className="flex items-center gap-1.5 px-3 pb-3">
          <button
            className="w-10 h-10 bg-zinc-100 hover:bg-zinc-200 rounded-full flex items-center justify-center text-zinc-900 text-[22px] font-light transition-colors"
            onPointerDown={(e) => e.preventDefault()}
            onClick={onUpload}>
            +
          </button>
          <button
            className={`w-10 h-10 flex items-center justify-center rounded-full text-[17px] transition-colors ${dictLive ? 'bg-red-100 text-red-600 animate-pulse' : 'text-zinc-800 hover:bg-zinc-100'}`}
            onPointerDown={(e) => e.preventDefault()}
            onClick={onMic}>
            {dictLive ? '◉' : '◎'}
          </button>
          <button
            className="w-10 h-10 flex items-center justify-center rounded-full text-zinc-800 hover:bg-zinc-100 text-[15px] transition-colors"
            onPointerDown={(e) => e.preventDefault()}
            onClick={onCorrect}
            title="Correct a draft">
            ✓
          </button>
          <button
            className="w-10 h-10 flex items-center justify-center rounded-full text-zinc-800 hover:bg-zinc-100 transition-colors"
            onPointerDown={(e) => e.preventDefault()}
            onClick={onSettings}
            title="Settings">
            <SlidersHorizontal size={17} strokeWidth={1.8} />
          </button>
          <div className="flex-1" />
          {streaming ? (
            <button
              className="w-10 h-10 bg-zinc-900 text-white rounded-full flex items-center justify-center text-[13px] font-bold transition-opacity"
              onClick={onStop}>
              ◼
            </button>
          ) : (
            <button
              className="w-10 h-10 bg-zinc-900 text-white rounded-full flex items-center justify-center font-serif italic font-bold text-[18px] disabled:opacity-30 transition-opacity"
              onClick={onSend}
              disabled={!value.trim()}>
              Ц
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────

function CzEmptyState({ userName }: { userName: string }) {
  const [nameLine, q1, q2] = getGreeting(userName);
  return (
    <div className="flex flex-col flex-1 px-6 pt-10">
      <p className="font-sans text-[15px] text-zinc-900 mb-2">{nameLine}</p>
      <p className="font-serif italic font-bold text-[32px] leading-[1.15] text-[#e85d3f]">{q1}</p>
      <p className="font-serif italic font-bold text-[32px] leading-[1.15] text-[#e85d3f]">{q2}</p>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function CzarMobile() {
  const { user } = useAuth();
  const editor = useCzarEditor();

  const [piecesSheet, setPiecesSheet] = useState(false);
  const [settingsSheet, setSettingsSheet] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'voices' | 'academic' | 'rules' | 'rubric'>('voices');
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [downloadSheet, setDownloadSheet] = useState(false);
  const [downloadContent, setDownloadContent] = useState('');

  const [input, setInput] = useState('');
  const [activeView, setActiveView] = useState<'chat' | 'writer'>('chat');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const writerScrollRef = useRef<HTMLDivElement>(null);
  const didSwitchRef = useRef(false);

  // Upload modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState(0);
  const [uploadInfo, setUploadInfo] = useState<{ name: string; kind: string; size: string } | null>(null);
  const [uploadStreamingStarted, setUploadStreamingStarted] = useState(false);

  useEffect(() => { if (uploadModalOpen && uploadStep === 2 && editor.streamingDoc) setUploadStreamingStarted(true); }, [uploadModalOpen, uploadStep, editor.streamingDoc]);
  useEffect(() => {
    if (uploadModalOpen && uploadStep === 2 && uploadStreamingStarted && !editor.streamingDoc) {
      const t = setTimeout(() => { setUploadStep(3); setUploadStreamingStarted(false); }, 400);
      return () => clearTimeout(t);
    }
  }, [editor.streamingDoc, uploadStep, uploadModalOpen, uploadStreamingStarted]);
  useEffect(() => { if (!uploadModalOpen || uploadStep !== 2) return; const t = setTimeout(() => setUploadStep(3), 60_000); return () => clearTimeout(t); }, [uploadModalOpen, uploadStep]);

  const dictLang = LANG_MAP[editor.prefs.language_variant] || 'en-GB';
  const dict = useCzDictation(dictLang);
  const drop = useCzDropZone(user?.id ?? undefined, editor.importFile);
  const v = CZ_VOICES.find((x) => x.id === editor.activeVoice) || CZ_VOICES[0];
  const userName: string = (user as any)?.user_metadata?.full_name || (user as any)?.user_metadata?.name || user?.email?.split('@')[0] || '';

  // Derive writer content from the streaming or last document message
  const streamingMsg = editor.messages.slice().reverse().find(m => m.isStreaming && m.role === 'assistant');
  const lastDocMsg = editor.messages.slice().reverse().find(m => m.isDocument && !m.isStreaming && m.role === 'assistant');
  const writerContent = streamingMsg?.content ?? lastDocMsg?.content ?? '';
  const writerStreaming = !!streamingMsg;

  // Auto-switch to Writer tab when a document starts streaming
  useEffect(() => {
    if (!didSwitchRef.current) {
      if ((streamingMsg && streamingMsg.content.length > 80) || lastDocMsg) {
        didSwitchRef.current = true;
        setActiveView('writer');
      }
    }
  }, [editor.messages]);

  // Reset to Chat tab when switching conversation
  useEffect(() => {
    didSwitchRef.current = false;
    setActiveView('chat');
  }, [editor.activePieceId]);

  // Auto-scroll chat to newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [editor.messages.length, editor.streamingDoc]);

  // Insert dictation transcript into input field
  const prevFinalRef = useRef('');
  const wasLiveRef = useRef(false);
  useEffect(() => {
    // Reset on session start (live false→true), not on end
    if (dict.live && !wasLiveRef.current) prevFinalRef.current = '';
    wasLiveRef.current = dict.live;

    if (!dict.live) return;
    const newText = dict.final.slice(prevFinalRef.current.length).trim();
    if (newText) {
      setInput(prev => (prev ? prev + ' ' : '') + newText);
      prevFinalRef.current = dict.final;
    }
  }, [dict.final, dict.live]);

  const handleSend = useCallback(() => {
    if (!input.trim() || editor.streamingDoc) return;
    editor.sendMessage(input.trim());
    setInput('');
  }, [input, editor]);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    setUploadInfo({ name: f.name, kind: ext.toUpperCase(), size: (f.size / 1024).toFixed(1) + ' KB' });
    setUploadStreamingStarted(false);
    setUploadStep(0);
    setUploadModalOpen(true);

    await new Promise<void>(r => setTimeout(r, 750));
    setUploadStep(1);
    await new Promise<void>(r => setTimeout(r, 750));
    setUploadStep(2);

    if (ext === 'txt' || ext === 'md') {
      const text = await f.text();
      editor.sendMessage(`I've uploaded a file called "${f.name}". Here is its content:\n\n${text}\n\nPlease read it carefully and tell me what it's about.`);
      return;
    }
    if (ext === 'docx') {
      const arrayBuffer = await f.arrayBuffer();
      const mammoth = await import('mammoth');
      const { value: text } = await mammoth.extractRawText({ arrayBuffer });
      editor.sendMessage(`I've uploaded a Word document called "${f.name}". Full text:\n\n${text}\n\nTell me what this document is about and ask what I'd like to do with it.`);
      return;
    }
    let mime = f.type || 'application/octet-stream';
    if (mime === 'audio/x-m4a' || (ext === 'm4a' && !mime.startsWith('audio/'))) mime = 'audio/mp4';
    if (!user?.id) { editor.sendMessage(`Upload failed — please sign in to upload binary files.`); return; }
    const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${user.id}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from('czar-uploads').upload(path, f, { contentType: mime });
    if (error) { editor.sendMessage(`Upload failed: ${error.message}`); return; }
    editor.importFile({ storage_path: path, filename: f.name, size: f.size, mime });
  }, [user?.id, editor]);

  return (
    <div className="cz-m-vars flex flex-col w-full h-[100dvh] fixed inset-0 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans z-[9000] overflow-hidden">

      {/* ── TOP BAR ── */}
      <div className="flex-shrink-0 bg-white border-b border-zinc-100 z-20 px-4 pt-safe">
        <div className="flex items-center h-14 gap-2">
          {/* LEFT: czar. branding */}
          <div className="flex-shrink-0">
            <div className="font-serif italic font-bold text-[22px] leading-none text-[#e85d3f]">czar<span className="text-zinc-900">.</span></div>
            <button
              className="font-mono text-[8px] tracking-widest uppercase text-[#e85d3f]/60 hover:text-[#e85d3f] mt-0.5 leading-none block"
              onClick={() => { setSettingsTab('voices'); setSettingsSheet(true); }}>
              {v.glyph} {v.name}
            </button>
          </div>

          {/* CENTER: document title */}
          <div className="flex-1 flex justify-center px-2 min-w-0">
            <input
              type="text"
              maxLength={120}
              className="font-mono text-[9px] tracking-[0.15em] uppercase text-zinc-400 text-center bg-transparent border-none outline-none w-full truncate"
              defaultValue={editor.docTitle}
              key={editor.docTitle}
              onBlur={(e) => { const t = e.target.value.trim(); if (t && t !== editor.docTitle) editor.setDocTitle(t); }}
            />
          </div>

          {/* RIGHT: menu */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button className="w-9 h-9 flex items-center justify-center text-zinc-900 text-[20px] font-bold hover:bg-zinc-100 rounded-lg" onClick={() => setPiecesSheet(true)}>≡</button>
          </div>
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div className="flex-shrink-0 flex items-stretch border-b border-zinc-100 bg-white">
        <button
          onClick={() => setActiveView('chat')}
          className={`flex-1 h-10 relative text-[11px] font-mono tracking-[0.15em] uppercase transition-colors ${activeView === 'chat' ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}>
          {activeView === 'chat' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#e85d3f] rounded-t-full" />}
          Chat
        </button>
        <button
          onClick={() => setActiveView('writer')}
          className={`flex-1 h-10 relative flex items-center justify-center gap-1.5 text-[11px] font-mono tracking-[0.15em] uppercase transition-colors ${activeView === 'writer' ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}>
          {activeView === 'writer' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#e85d3f] rounded-t-full" />}
          Writer
          {writerStreaming && <span className="w-1.5 h-1.5 rounded-full bg-[#e85d3f] animate-pulse flex-shrink-0" />}
        </button>
        {activeView === 'writer' && writerContent && (
          <button
            onClick={() => downloadAsWord(writerContent)}
            disabled={writerStreaming}
            className="px-4 h-10 border-l border-zinc-100 font-mono text-[11px] tracking-[0.15em] uppercase text-[#e85d3f] disabled:opacity-30 transition-opacity flex-shrink-0">
            ↓ word
          </button>
        )}
      </div>

      {/* ── WRITER VIEW ── */}
      {activeView === 'writer' ? (
        <div ref={writerScrollRef} className="flex-1 overflow-y-auto px-5 pt-6 pb-10" {...drop.handlers}>
          {writerContent ? (
            <div className="prose prose-zinc max-w-none prose-p:font-serif prose-p:text-[16px] prose-p:leading-[1.8] prose-headings:font-serif prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-[17px] [&_table]:text-sm [&_table]:w-full [&_th]:bg-zinc-100 [&_th]:px-2 [&_th]:py-1 [&_th]:border [&_th]:border-zinc-300 [&_td]:px-2 [&_td]:py-1 [&_td]:border [&_td]:border-zinc-200">
              <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={czarUrlTransform} components={czarImgComponents}>{writerContent}</ReactMarkdown>
              {writerStreaming && <span className="inline-block w-0.5 h-4 bg-[#e85d3f] ml-0.5 animate-pulse align-middle" />}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30">
              <span className="font-serif italic text-[#e85d3f] text-6xl leading-none">Ц</span>
              <span className="font-mono text-[10px] tracking-widest uppercase text-zinc-500">No document yet</span>
            </div>
          )}
        </div>
      ) : (
        /* ── CHAT VIEW ── */
        <div className="flex-1 overflow-y-auto overflow-x-hidden" {...drop.handlers}>
          {editor.messages.length === 0 && !editor.docLoading ? (
            <CzEmptyState userName={userName} />
          ) : (
            <div className="px-4 pt-4 pb-2">
              {editor.docLoading && (
                <div className="space-y-3 animate-pulse opacity-40 py-4">
                  <div className="h-4 bg-zinc-200 rounded w-2/3 ml-auto" />
                  <div className="h-20 bg-zinc-200 rounded w-full" />
                  <div className="h-4 bg-zinc-200 rounded w-1/2 ml-auto" />
                  <div className="h-32 bg-zinc-200 rounded w-full" />
                </div>
              )}
              {editor.messages.map((msg) => {
                if (msg.role === 'user') return <UserBubble key={msg.id} content={msg.content} />;
                return <CzarChatMessage key={msg.id} content={msg.content} isStreaming={msg.isStreaming} imageUrl={msg.imageUrl} />;
              })}

              {editor.streamingDoc && editor.currentAgent && (
                <div className="flex items-center gap-2 px-3 py-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#e85d3f] animate-pulse" />
                  <span className="font-mono text-[9px] tracking-widest uppercase text-zinc-400">{editor.currentAgent}</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      )}

      {/* ── INPUT BAR ── */}
      <div className="flex-shrink-0 bg-white z-20">
        <CzChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          onStop={editor.stopStream}
          onUpload={() => fileInputRef.current?.click()}
          onMic={() => dict.live ? dict.stop() : dict.start()}
          onCorrect={() => setCorrectionOpen(true)}
          onSettings={() => { setSettingsTab('academic'); setSettingsSheet(true); }}
          dictLive={dict.live}
          streaming={editor.streamingDoc}
        />
      </div>

      {/* ── HIDDEN FILE INPUT ── */}
      <input ref={fileInputRef} type="file" accept=".txt,.md,.docx,.pdf,.mp3,.wav,.m4a,.jpg,.jpeg,.png,.gif,.webp" className="hidden" onChange={handleFileInput} />

      {/* ── BOTTOM SHEETS ── */}
      <CzMobilePiecesSheet
        open={piecesSheet} onClose={() => setPiecesSheet(false)}
        pieces={editor.pieces} activePieceId={editor.activePieceId}
        onSelectPiece={editor.selectPiece} onCreatePiece={editor.createPiece}
        onDeletePiece={editor.deletePiece} onRenamePiece={editor.renamePiece}
      />
      <CzMobileDownloadSheet
        open={downloadSheet} onClose={() => setDownloadSheet(false)}
        onDocx={() => downloadAsWord(downloadContent || writerContent)}
        onMarkdown={() => downloadMarkdown(editor.docTitle, downloadContent || writerContent)}
      />
      <CzMobileUploadModal open={uploadModalOpen} onClose={() => setUploadModalOpen(false)} info={uploadInfo} step={uploadStep} />

      {/* ── EXTERNAL OVERLAYS ── */}
      <div className="fixed inset-0 z-[100000] pointer-events-none">
        <div className="pointer-events-auto">
          <CzMobileSettings open={settingsSheet} onClose={() => setSettingsSheet(false)} initialTab={settingsTab} activeVoice={editor.activeVoice} setVoice={editor.setActiveVoice} prefs={editor.prefs} setPrefs={editor.setPrefs} rubricCriteria={editor.rubricCriteria} setRubricCriteria={editor.setRubricCriteria} />
          <CzMobileMic open={dict.live} seconds={dict.seconds} final={dict.final} interim={dict.interim} onClose={() => { dict.stop(); }} onInsert={() => {}} />
          <CorrectionModal open={correctionOpen} onClose={() => setCorrectionOpen(false)} onApplied={(content) => { editor.setDocContent(content); editor.manualSave(); }} />
        </div>
      </div>
    </div>
  );
}
