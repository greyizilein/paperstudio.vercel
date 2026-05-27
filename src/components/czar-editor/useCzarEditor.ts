import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  streamCzar, loadConversations, loadMessages,
  type CzarRequest,
} from '@/lib/czarStream';
import type { CzVoice } from './editorData';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CzPiece {
  id: string;
  name: string;
  meta: string;        // e.g. "1,842w"
  updatedAt: string;
  isDraft: boolean;
  isPending?: boolean;
}

export interface CzOutlineItem {
  id: string;
  text: string;
  level: 1 | 2;
  charOffset: number;
  current?: boolean;
}

export interface CzSuggestion {
  id: string;
  kind: 'voice' | 'grammar' | 'cut';
  tone: string;
  was: string;
  now: string;
  status: 'pending' | 'accepted' | 'dismissed';
}

export type StreamOp = 'tighten' | 'continue' | 'suggest' | null;
export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export interface CzEditorPrefs {
  width: 'narrow' | 'medium' | 'wide';
  cursor: 'blink' | 'steady' | 'typewriter';
  spell: 'on' | 'soft' | 'off';
  focus: 'off' | 'line' | 'paragraph';
  autosave: 'live' | '30s' | 'manual';
  lang: 'en-us' | 'en-gb' | 'es' | 'fr';
  punct: 'auto' | 'spoken';
  filler: 'keep' | 'trim' | 'cut';
  apply: 'live' | 'pause' | 'off';
}

const DEFAULT_PREFS: CzEditorPrefs = {
  width: 'medium', cursor: 'blink', spell: 'on', focus: 'off', autosave: 'live',
  lang: 'en-us', punct: 'auto', filler: 'keep', apply: 'live',
};

const PREFS_KEY = 'czar-editor-prefs-v1';

function loadPrefs(): CzEditorPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_PREFS;
}

export interface UseCzarEditorReturn {
  // Pieces
  pieces: CzPiece[];
  piecesLoading: boolean;
  piecesError: string | null;
  activePieceId: string | null;
  selectPiece: (id: string) => void;
  createPiece: () => Promise<void>;
  deletePiece: (id: string) => Promise<void>;
  retryLoadPieces: () => void;

  // Document
  docContent: string;
  setDocContent: (text: string) => void;
  docTitle: string;
  setDocTitle: (t: string) => Promise<void>;
  docLoading: boolean;
  docError: string | null;
  retryLoadDoc: () => void;

  // Derived
  wordCount: number;
  readingTime: string;
  outline: CzOutlineItem[];

  // Per-piece settings
  activeVoice: string;
  setActiveVoice: (id: string) => void;
  audience: string;
  setAudience: (a: string) => void;
  targetLength: 'short' | 'medium' | 'long' | 'epic';
  setTargetLength: (l: 'short' | 'medium' | 'long' | 'epic') => void;

  // Save state
  saveStatus: SaveStatus;
  manualSave: () => Promise<void>;

  // Suggestions
  suggestions: CzSuggestion[];
  suggestionsLoading: boolean;
  acceptSuggestion: (id: string) => void;
  dismissSuggestion: (id: string) => void;
  triggerSuggest: () => void;

  // AI operations
  streamOp: StreamOp;
  streamingDoc: boolean;
  tighten: () => void;
  continueDoc: () => void;
  stopStream: () => void;

  // Import file (called after upload)
  importFile: (attachment: CzarRequest['attachments'] extends (infer T)[] ? T : never) => void;

  // Prefs
  prefs: CzEditorPrefs;
  setPrefs: (patch: Partial<CzEditorPrefs>) => void;

  // Global error
  error: string | null;
  clearError: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function formatReadingTime(words: number): string {
  const minutes = Math.max(1, Math.round(words / 238));
  return `${minutes}:00`;
}

function parseOutline(text: string): CzOutlineItem[] {
  const items: CzOutlineItem[] = [];
  const lines = text.split('\n');
  let offset = 0;
  for (const line of lines) {
    const h1 = line.match(/^# (.+)/);
    const h2 = line.match(/^## (.+)/);
    if (h1 || h2) {
      const raw = h1 ? h1[1] : h2![1];
      items.push({
        id: `h-${offset}`,
        text: raw.trim(),
        level: h1 ? 1 : 2,
        charOffset: offset,
        current: items.length === 0,
      });
    }
    offset += line.length + 1; // +1 for the \n
  }
  return items;
}

function mapCorrectionKind(type: string): CzSuggestion['kind'] {
  if (type === 'grammar') return 'grammar';
  if (type === 'structure' || type === 'argument') return 'cut';
  return 'voice';
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useCzarEditor(): UseCzarEditorReturn {
  const { user } = useAuth();

  // ── Prefs (localStorage) ─────────────────────────────────────────────────
  const [prefs, setPrefsRaw] = useState<CzEditorPrefs>(loadPrefs);
  const setPrefs = useCallback((patch: Partial<CzEditorPrefs>) => {
    setPrefsRaw(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // ── Pieces ───────────────────────────────────────────────────────────────
  const [pieces, setPieces] = useState<CzPiece[]>([]);
  const [piecesLoading, setPiecesLoading] = useState(true);
  const [piecesError, setPiecesError] = useState<string | null>(null);
  const [activePieceId, setActivePieceId] = useState<string | null>(null);

  const loadPieces = useCallback(async () => {
    setPiecesLoading(true);
    setPiecesError(null);
    try {
      const convs = await loadConversations();
      const mapped: CzPiece[] = convs.map((c: any) => {
        const wc = c.last_message ? countWords(c.last_message) : 0;
        return {
          id: c.id,
          name: c.title || 'Untitled',
          meta: wc > 0 ? `${wc.toLocaleString()}w` : 'empty',
          updatedAt: c.updated_at,
          isDraft: wc < 100,
        };
      });
      setPieces(mapped);
      if (mapped.length > 0 && !activePieceId) {
        setActivePieceId(mapped[0].id);
      }
    } catch (e: any) {
      setPiecesError(e?.message ?? 'Failed to load pieces');
    } finally {
      setPiecesLoading(false);
    }
  }, [activePieceId]);

  useEffect(() => {
    if (user) loadPieces();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Document ─────────────────────────────────────────────────────────────
  const [docContent, setDocContentRaw] = useState('');
  const [docTitle, setDocTitleRaw] = useState('Untitled');
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [activeVoice, setActiveVoiceRaw] = useState('newsletter');
  const [audience, setAudienceRaw] = useState('');
  const [targetLength, setTargetLengthRaw] = useState<'short' | 'medium' | 'long' | 'epic'>('medium');

  const activeMessageIdRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thirtySecTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const persistContent = useCallback(async (content: string) => {
    if (!activePieceId || !user) return;
    setSaveStatus('saving');
    try {
      if (activeMessageIdRef.current) {
        const { error } = await supabase
          .from('czar_messages')
          .update({ content })
          .eq('id', activeMessageIdRef.current);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('czar_messages')
          .insert({ conversation_id: activePieceId, user_id: user.id, role: 'assistant', content })
          .select('id')
          .single();
        if (error) throw error;
        activeMessageIdRef.current = data.id;
      }
      // Update conversation updated_at + word count preview
      await supabase
        .from('czar_conversations')
        .update({ updated_at: new Date().toISOString(), last_message: content.slice(0, 200) })
        .eq('id', activePieceId);
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  }, [activePieceId, user]);

  const setDocContent = useCallback((text: string) => {
    setDocContentRaw(text);
    setSaveStatus('unsaved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (prefs.autosave === 'live') {
      saveTimerRef.current = setTimeout(() => persistContent(text), 2000);
    }
  }, [prefs.autosave, persistContent]);

  const manualSave = useCallback(async () => {
    await persistContent(docContent);
  }, [docContent, persistContent]);

  // 30s autosave interval
  useEffect(() => {
    if (thirtySecTimerRef.current) clearInterval(thirtySecTimerRef.current);
    if (prefs.autosave === '30s' && activePieceId) {
      thirtySecTimerRef.current = setInterval(() => {
        persistContent(docContent);
      }, 30_000);
    }
    return () => { if (thirtySecTimerRef.current) clearInterval(thirtySecTimerRef.current); };
  }, [prefs.autosave, activePieceId, docContent, persistContent]);

  const loadDoc = useCallback(async (convId: string) => {
    setDocLoading(true);
    setDocError(null);
    activeMessageIdRef.current = null;
    try {
      const msgs = await loadMessages(convId);
      const lastAssistant = [...msgs].reverse().find((m: any) => m.role === 'assistant');
      setDocContentRaw(lastAssistant?.content ?? '');
      if (lastAssistant) activeMessageIdRef.current = lastAssistant.id;

      // Load conversation metadata (title, voice, audience, length)
      const { data: conv } = await supabase
        .from('czar_conversations')
        .select('title, checkpoint_data')
        .eq('id', convId)
        .single();
      if (conv) {
        setDocTitleRaw(conv.title || 'Untitled');
        const meta = (conv.checkpoint_data as any) ?? {};
        if (meta.voice_id) setActiveVoiceRaw(meta.voice_id);
        if (meta.audience) setAudienceRaw(meta.audience);
        if (meta.length) setTargetLengthRaw(meta.length);
      }
      setSaveStatus('saved');
    } catch (e: any) {
      setDocError(e?.message ?? 'Failed to load document');
    } finally {
      setDocLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activePieceId) loadDoc(activePieceId);
  }, [activePieceId, loadDoc]);

  const setDocTitle = useCallback(async (t: string) => {
    setDocTitleRaw(t);
    if (!activePieceId) return;
    await supabase.from('czar_conversations').update({ title: t }).eq('id', activePieceId);
    setPieces(prev => prev.map(p => p.id === activePieceId ? { ...p, name: t } : p));
  }, [activePieceId]);

  const setActiveVoice = useCallback((id: string) => {
    setActiveVoiceRaw(id);
    try { localStorage.setItem('czar-voice', id); } catch {}
    if (activePieceId) {
      supabase.from('czar_conversations')
        .update({ checkpoint_data: { voice_id: id, audience, length: targetLength } })
        .eq('id', activePieceId)
        .then(() => {});
    }
  }, [activePieceId, audience, targetLength]);

  const setAudience = useCallback((a: string) => {
    setAudienceRaw(a);
    if (activePieceId) {
      supabase.from('czar_conversations')
        .update({ checkpoint_data: { voice_id: activeVoice, audience: a, length: targetLength } })
        .eq('id', activePieceId)
        .then(() => {});
    }
  }, [activePieceId, activeVoice, targetLength]);

  const setTargetLength = useCallback((l: 'short' | 'medium' | 'long' | 'epic') => {
    setTargetLengthRaw(l);
    if (activePieceId) {
      supabase.from('czar_conversations')
        .update({ checkpoint_data: { voice_id: activeVoice, audience, length: l } })
        .eq('id', activePieceId)
        .then(() => {});
    }
  }, [activePieceId, activeVoice, audience]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const wordCount = useMemo(() => countWords(docContent), [docContent]);
  const readingTime = useMemo(() => formatReadingTime(wordCount), [wordCount]);
  const outline = useMemo(() => parseOutline(docContent), [docContent]);

  // ── Suggestions ──────────────────────────────────────────────────────────
  const [suggestions, setSuggestions] = useState<CzSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const acceptSuggestion = useCallback((id: string) => {
    setSuggestions(prev => {
      const sugg = prev.find(s => s.id === id);
      if (!sugg) return prev;
      // Apply the change to the document
      setDocContentRaw(doc => {
        const idx = doc.indexOf(sugg.was);
        if (idx === -1) return doc;
        return doc.slice(0, idx) + sugg.now + doc.slice(idx + sugg.was.length);
      });
      return prev.map(s => s.id === id ? { ...s, status: 'accepted' as const } : s);
    });
  }, []);

  const dismissSuggestion = useCallback((id: string) => {
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'dismissed' as const } : s));
  }, []);

  // ── AI Operations ────────────────────────────────────────────────────────
  const [streamOp, setStreamOp] = useState<StreamOp>(null);
  const [streamingDoc, setStreamingDoc] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    setStreamingDoc(false);
    setStreamOp(null);
    setSuggestionsLoading(false);
  }, []);

  const triggerSuggest = useCallback(() => {
    if (!activePieceId || wordCount < 50 || streamingDoc) return;
    setStreamOp('suggest');
    setSuggestionsLoading(true);
    const newSuggs: CzSuggestion[] = [];
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    streamCzar(
      { conversation_id: activePieceId, user_message: docContent, mode: 'correct' },
      {
        onCorrectionChange: (e) => {
          newSuggs.push({
            id: e.id,
            kind: mapCorrectionKind(e.type),
            tone: e.explanation.slice(0, 60),
            was: e.original,
            now: e.corrected,
            status: 'pending',
          });
        },
        onDone: () => {
          setSuggestions(newSuggs);
          setSuggestionsLoading(false);
          setStreamOp(null);
        },
        onError: () => {
          setSuggestionsLoading(false);
          setStreamOp(null);
        },
      },
      ctrl.signal,
    );
  }, [activePieceId, docContent, wordCount, streamingDoc]);

  // Auto-suggest debounce (30s after last content change, min 200 words)
  useEffect(() => {
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    if (wordCount >= 200 && !streamingDoc && activePieceId) {
      suggestTimerRef.current = setTimeout(triggerSuggest, 30_000);
    }
    return () => { if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current); };
  }, [docContent]); // eslint-disable-line react-hooks/exhaustive-deps

  const tighten = useCallback(() => {
    if (!activePieceId || !docContent.trim() || streamingDoc) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStreamingDoc(true);
    setStreamOp('tighten');
    let buffer = '';

    streamCzar(
      {
        conversation_id: activePieceId,
        user_message: `Tighten this document. Maintain the voice and meaning — cut unnecessary words, improve sentence rhythm, sharpen the prose:\n\n${docContent}`,
        mode: 'write',
        settings: { voice_id: activeVoice },
      },
      {
        onDelta: (text) => { buffer += text; setDocContentRaw(buffer); },
        onReplace: (e) => { buffer = e.content; setDocContentRaw(buffer); },
        onDone: () => {
          setStreamingDoc(false);
          setStreamOp(null);
          persistContent(buffer);
        },
        onError: (msg) => {
          setStreamingDoc(false);
          setStreamOp(null);
          setError(msg ?? 'Tighten failed');
        },
      },
      ctrl.signal,
    );
  }, [activePieceId, docContent, streamingDoc, activeVoice, persistContent]);

  const continueDoc = useCallback(() => {
    if (!activePieceId || streamingDoc) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStreamingDoc(true);
    setStreamOp('continue');
    const base = docContent;
    let appended = '';

    streamCzar(
      {
        conversation_id: activePieceId,
        user_message: `Continue this document from where it ends. Match the established voice and style:\n\n${base}`,
        mode: 'write',
        settings: { voice_id: activeVoice },
      },
      {
        onDelta: (text) => {
          appended += text;
          setDocContentRaw(base + (appended ? '\n\n' + appended : ''));
        },
        onDone: () => {
          setStreamingDoc(false);
          setStreamOp(null);
          persistContent(base + '\n\n' + appended);
        },
        onError: (msg) => {
          setStreamingDoc(false);
          setStreamOp(null);
          setError(msg ?? 'Continue failed');
        },
      },
      ctrl.signal,
    );
  }, [activePieceId, docContent, streamingDoc, activeVoice, persistContent]);

  const importFile = useCallback((attachment: any) => {
    if (!activePieceId) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStreamingDoc(true);
    setStreamOp('continue');
    const base = docContent;
    let appended = '';

    streamCzar(
      {
        conversation_id: activePieceId,
        user_message: 'Extract and format the content of this file. Integrate it naturally into the existing document or start fresh if the document is empty.',
        attachments: [attachment],
        mode: 'write',
      },
      {
        onDelta: (text) => {
          appended += text;
          setDocContentRaw((base ? base + '\n\n' : '') + appended);
        },
        onDone: () => {
          setStreamingDoc(false);
          setStreamOp(null);
          persistContent((base ? base + '\n\n' : '') + appended);
        },
        onError: (msg) => {
          setStreamingDoc(false);
          setStreamOp(null);
          setError(msg ?? 'File import failed');
        },
      },
      ctrl.signal,
    );
  }, [activePieceId, docContent, streamingDoc, persistContent]);

  // ── Piece operations ─────────────────────────────────────────────────────
  const selectPiece = useCallback((id: string) => {
    setActivePieceId(id);
    setSuggestions([]);
    stopStream();
  }, [stopStream]);

  const createPiece = useCallback(async () => {
    if (!user) return;
    const pendingId = 'pending_' + Date.now();
    const optimistic: CzPiece = { id: pendingId, name: 'Untitled', meta: 'empty', updatedAt: new Date().toISOString(), isDraft: true, isPending: true };
    setPieces(prev => [optimistic, ...prev]);
    setActivePieceId(pendingId);

    const { data, error: err } = await supabase
      .from('czar_conversations')
      .insert({ user_id: user.id, title: 'Untitled', mode: 'write' })
      .select('id')
      .single();

    if (err || !data) {
      setPieces(prev => prev.filter(p => p.id !== pendingId));
      setActivePieceId(pieces[0]?.id ?? null);
      setError('Could not create piece');
      return;
    }
    setPieces(prev => prev.map(p => p.id === pendingId ? { ...p, id: data.id, isPending: false } : p));
    setActivePieceId(data.id);
    setDocContentRaw('');
    setDocTitleRaw('Untitled');
    activeMessageIdRef.current = null;
  }, [user, pieces]);

  const deletePiece = useCallback(async (id: string) => {
    setPieces(prev => prev.filter(p => p.id !== id));
    if (activePieceId === id) {
      const remaining = pieces.filter(p => p.id !== id);
      setActivePieceId(remaining[0]?.id ?? null);
    }
    await supabase.from('czar_conversations').delete().eq('id', id);
  }, [activePieceId, pieces]);

  const retryLoadPieces = useCallback(() => { loadPieces(); }, [loadPieces]);
  const retryLoadDoc = useCallback(() => { if (activePieceId) loadDoc(activePieceId); }, [activePieceId, loadDoc]);

  return {
    pieces, piecesLoading, piecesError, activePieceId,
    selectPiece, createPiece, deletePiece, retryLoadPieces,
    docContent, setDocContent, docTitle, setDocTitle, docLoading, docError, retryLoadDoc,
    wordCount, readingTime, outline,
    activeVoice, setActiveVoice, audience, setAudience, targetLength, setTargetLength,
    saveStatus, manualSave,
    suggestions, suggestionsLoading, acceptSuggestion, dismissSuggestion, triggerSuggest,
    streamOp, streamingDoc, tighten, continueDoc, stopStream, importFile,
    prefs, setPrefs,
    error, clearError: () => setError(null),
  };
}
