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
  meta: string;
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

export type StreamOp = 'tighten' | 'continue' | 'suggest' | 'write' | null;
export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export interface CzEditorPrefs {
  // Editor UI
  width: 'narrow' | 'medium' | 'wide';
  cursor: 'blink' | 'steady' | 'typewriter';
  spell: 'on' | 'soft' | 'off';
  focus: 'off' | 'line' | 'paragraph';
  autosave: 'live' | '30s' | 'manual';
  // Dictation
  lang: 'en-us' | 'en-gb' | 'es' | 'fr';
  punct: 'auto' | 'spoken';
  filler: 'keep' | 'trim' | 'cut';
  apply: 'live' | 'pause' | 'off';
  // Academic pickers (sent to czar-chat settings)
  citation_style: 'harvard' | 'apa' | 'chicago' | 'mla' | 'ieee' | 'vancouver' | 'oscola';
  writing_level: 'gcse' | 'alevel' | 'undergrad' | 'grad' | 'phd' | 'professional';
  language_variant: 'british' | 'american' | 'australian' | 'canadian';
  tone: 'academic' | 'professional' | 'conversational' | 'creative';
  // Toggle rules — each maps 1:1 to a czar-chat rule name
  toggle_vary_sentence_length: boolean;
  toggle_prefer_active_voice: boolean;
  toggle_ban_filler: boolean;
  toggle_no_contractions: boolean;
  toggle_oxford_comma: boolean;
  toggle_formal_register: boolean;
  toggle_cite_every_claim: boolean;
  toggle_sources_only_2018_plus: boolean;
  toggle_spell_out_acronyms: boolean;
  toggle_double_check_numbers: boolean;
  toggle_show_outline_first: boolean;
  toggle_section_pause: boolean;
  toggle_include_executive_summary: boolean;
  toggle_include_keywords: boolean;
  toggle_include_word_count_per_section: boolean;
  toggle_auto_paragraph_break: boolean;
  toggle_online_lookup: boolean;
  toggle_thinking_mode: boolean;
  toggle_auto_detect_domain: boolean;
  toggle_save_checkpoints: boolean;
  toggle_british_spelling: boolean;
}

// Settings passed from the write panel — override prefs for this request
export interface CzPanelSettings {
  mode: 'write' | 'research' | 'plan' | 'literature_review' | 'screenplay' | 'legal' | 'chat' | 'correct';
  citation_style?: string;
  writing_level?: string;
  language?: 'british' | 'american' | 'australian' | 'canadian';
  formal?: boolean;
  section_pause?: boolean;
  online_lookup?: boolean;
}

const DEFAULT_PREFS: CzEditorPrefs = {
  width: 'medium', cursor: 'blink', spell: 'on', focus: 'off', autosave: 'live',
  lang: 'en-gb', punct: 'auto', filler: 'keep', apply: 'live',
  citation_style: 'harvard', writing_level: 'undergrad',
  language_variant: 'british', tone: 'academic',
  toggle_vary_sentence_length: false,
  toggle_prefer_active_voice: false,
  toggle_ban_filler: false,
  toggle_no_contractions: false,
  toggle_oxford_comma: false,
  toggle_formal_register: false,
  toggle_cite_every_claim: false,
  toggle_sources_only_2018_plus: false,
  toggle_spell_out_acronyms: false,
  toggle_double_check_numbers: false,
  toggle_show_outline_first: false,
  toggle_section_pause: false,
  toggle_include_executive_summary: false,
  toggle_include_keywords: false,
  toggle_include_word_count_per_section: false,
  toggle_auto_paragraph_break: false,
  toggle_online_lookup: false,
  toggle_thinking_mode: false,
  toggle_auto_detect_domain: true,
  toggle_save_checkpoints: false,
  toggle_british_spelling: false,
};

const PREFS_KEY = 'czar-editor-prefs-v1';

function loadPrefs(): CzEditorPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_PREFS;
}

const LANG_MAP: Record<string, string> = {
  british: 'UK', american: 'US', australian: 'AU', canadian: 'CA',
};

const TOGGLE_MAP: Record<string, string> = {
  toggle_vary_sentence_length: 'vary_sentence_length',
  toggle_prefer_active_voice: 'prefer_active_voice',
  toggle_ban_filler: 'ban_filler',
  toggle_no_contractions: 'no_contractions',
  toggle_oxford_comma: 'oxford_comma',
  toggle_formal_register: 'academic_register_lock',
  toggle_cite_every_claim: 'cite_every_claim',
  toggle_sources_only_2018_plus: 'sources_only_2018_plus',
  toggle_spell_out_acronyms: 'spell_out_acronyms',
  toggle_double_check_numbers: 'double_check_numbers',
  toggle_show_outline_first: 'show_outline_first',
  toggle_section_pause: 'section_pause',
  toggle_include_executive_summary: 'include_executive_summary',
  toggle_include_keywords: 'include_keywords',
  toggle_include_word_count_per_section: 'include_word_count_per_section',
  toggle_auto_paragraph_break: 'auto_paragraph_break',
  toggle_thinking_mode: 'thinking_mode',
  toggle_british_spelling: 'british_spelling',
};

function buildCzarSettings(
  prefs: CzEditorPrefs,
  activeVoice: string,
  audience: string,
  targetLength: string,
  override?: Partial<CzPanelSettings>,
): Record<string, unknown> {
  const activeToggles: Record<string, boolean> = {};
  for (const [prefKey, ruleKey] of Object.entries(TOGGLE_MAP)) {
    if (prefs[prefKey as keyof CzEditorPrefs]) activeToggles[ruleKey] = true;
  }
  if (override?.formal) activeToggles['academic_register_lock'] = true;
  if (override?.section_pause) activeToggles['section_pause'] = true;

  return {
    voice_id: activeVoice,
    language: LANG_MAP[override?.language ?? prefs.language_variant] ?? 'UK',
    citation_style: override?.citation_style ?? prefs.citation_style,
    writing_level: override?.writing_level ?? prefs.writing_level,
    tone: prefs.tone,
    audience: audience || undefined,
    target_length: targetLength,
    ...activeToggles,
    ...(prefs.toggle_online_lookup || override?.online_lookup ? { online_lookup: true } : {}),
    ...(prefs.toggle_auto_detect_domain ? { auto_detect_domain: true } : {}),
    ...(prefs.toggle_save_checkpoints ? { save_checkpoints: true } : {}),
  };
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
  renamePiece: (id: string, name: string) => Promise<void>;
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
  currentAgent: string | null;
  tighten: () => void;
  continueDoc: () => void;
  writeFromPrompt: (instruction: string, panelSettings: CzPanelSettings) => void;
  stopStream: () => void;

  // Import file
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
    offset += line.length + 1;
  }
  return items;
}

function mapCorrectionKind(type: string): CzSuggestion['kind'] {
  if (type === 'grammar') return 'grammar';
  if (type === 'structure' || type === 'argument') return 'cut';
  return 'voice';
}

// Image request detection — mirrors czar-chat's isImageRequest()
const IMAGE_ACTIONS = /\b(generate|create|make|draw|produce|show me|give me|render|build|design)\b/i;
const IMAGE_SUBJECTS = /\b(diagram|chart|flowchart|graph|table|timeline|mindmap|image|photo|picture|figure|visualization|infographic)\b/i;

function isImageRequest(text: string): boolean {
  return IMAGE_ACTIONS.test(text) && IMAGE_SUBJECTS.test(text);
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
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    setStreamingDoc(false);
    setStreamOp(null);
    setCurrentAgent(null);
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
      {
        conversation_id: activePieceId,
        user_message: docContent,
        mode: 'correct',
        settings: buildCzarSettings(prefs, activeVoice, audience, targetLength),
      },
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
  }, [activePieceId, docContent, wordCount, streamingDoc, prefs, activeVoice, audience, targetLength]);

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
        settings: buildCzarSettings(prefs, activeVoice, audience, targetLength),
      },
      {
        onAgentStep: (agent: string) => setCurrentAgent(agent),
        onDelta: (text) => { buffer += text; setDocContentRaw(buffer); },
        onReplace: (e) => { buffer = e.content; setDocContentRaw(buffer); },
        onDone: () => {
          setStreamingDoc(false);
          setStreamOp(null);
          setCurrentAgent(null);
          persistContent(buffer);
        },
        onError: (msg) => {
          setStreamingDoc(false);
          setStreamOp(null);
          setCurrentAgent(null);
          setError(msg ?? 'Tighten failed');
        },
      },
      ctrl.signal,
    );
  }, [activePieceId, docContent, streamingDoc, prefs, activeVoice, audience, targetLength, persistContent]);

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
        settings: buildCzarSettings(prefs, activeVoice, audience, targetLength),
      },
      {
        onAgentStep: (agent: string) => setCurrentAgent(agent),
        onDelta: (text) => {
          appended += text;
          setDocContentRaw(base + (appended ? '\n\n' + appended : ''));
        },
        onDone: () => {
          setStreamingDoc(false);
          setStreamOp(null);
          setCurrentAgent(null);
          persistContent(base + '\n\n' + appended);
        },
        onError: (msg) => {
          setStreamingDoc(false);
          setStreamOp(null);
          setCurrentAgent(null);
          setError(msg ?? 'Continue failed');
        },
      },
      ctrl.signal,
    );
  }, [activePieceId, docContent, streamingDoc, prefs, activeVoice, audience, targetLength, persistContent]);

  const writeFromPrompt = useCallback((instruction: string, panelSettings: CzPanelSettings) => {
    if (!activePieceId || streamingDoc || !instruction.trim()) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStreamingDoc(true);
    setStreamOp('write');

    // Auto-detect image requests and route to chat mode
    const effectiveMode = isImageRequest(instruction) ? 'chat' : panelSettings.mode;
    const base = docContent;
    let appended = '';

    streamCzar(
      {
        conversation_id: activePieceId,
        user_message: instruction,
        mode: effectiveMode as any,
        settings: buildCzarSettings(prefs, activeVoice, audience, targetLength, panelSettings),
      },
      {
        onAgentStep: (agent: string) => setCurrentAgent(agent),
        onDelta: (text) => {
          appended += text;
          setDocContentRaw(base + (appended ? (base ? '\n\n' : '') + appended : ''));
        },
        onReplace: (e) => {
          appended = e.content;
          setDocContentRaw(base + (base ? '\n\n' : '') + appended);
        },
        onDone: () => {
          setStreamingDoc(false);
          setStreamOp(null);
          setCurrentAgent(null);
          persistContent(base + (base && appended ? '\n\n' : '') + appended);
        },
        onError: (msg) => {
          setStreamingDoc(false);
          setStreamOp(null);
          setCurrentAgent(null);
          setError(msg ?? 'Write failed');
        },
      },
      ctrl.signal,
    );
  }, [activePieceId, docContent, streamingDoc, prefs, activeVoice, audience, targetLength, persistContent]);

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
        user_message: 'I have uploaded a document for you to read. Please read it carefully, tell me what you understand from it, and ask me what you would like to do with it.',
        attachments: [attachment],
        mode: 'chat',
        settings: buildCzarSettings(prefs, activeVoice, audience, targetLength),
      },
      {
        onAgentStep: (agent: string) => setCurrentAgent(agent),
        onDelta: (text) => {
          appended += text;
          setDocContentRaw((base ? base + '\n\n' : '') + appended);
        },
        onDone: () => {
          setStreamingDoc(false);
          setStreamOp(null);
          setCurrentAgent(null);
          persistContent((base ? base + '\n\n' : '') + appended);
        },
        onError: (msg) => {
          setStreamingDoc(false);
          setStreamOp(null);
          setCurrentAgent(null);
          setError(msg ?? 'File import failed');
        },
      },
      ctrl.signal,
    );
  }, [activePieceId, docContent, streamingDoc, prefs, activeVoice, audience, targetLength, persistContent]);

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

  const renamePiece = useCallback(async (id: string, name: string) => {
    setPieces(prev => prev.map(p => p.id === id ? { ...p, name } : p));
    if (id === activePieceId) setDocTitleRaw(name);
    await supabase.from('czar_conversations').update({ title: name }).eq('id', id);
  }, [activePieceId]);

  const retryLoadPieces = useCallback(() => { loadPieces(); }, [loadPieces]);
  const retryLoadDoc = useCallback(() => { if (activePieceId) loadDoc(activePieceId); }, [activePieceId, loadDoc]);

  return {
    pieces, piecesLoading, piecesError, activePieceId,
    selectPiece, createPiece, deletePiece, renamePiece, retryLoadPieces,
    docContent, setDocContent, docTitle, setDocTitle, docLoading, docError, retryLoadDoc,
    wordCount, readingTime, outline,
    activeVoice, setActiveVoice, audience, setAudience, targetLength, setTargetLength,
    saveStatus, manualSave,
    suggestions, suggestionsLoading, acceptSuggestion, dismissSuggestion, triggerSuggest,
    streamOp, streamingDoc, currentAgent, tighten, continueDoc, writeFromPrompt, stopStream, importFile,
    prefs, setPrefs,
    error, clearError: () => setError(null),
  };
}
