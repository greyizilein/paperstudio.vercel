import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ── Dictation ─────────────────────────────────────────────────────────────────

export interface DictationState {
  live: boolean;
  seconds: number;
  final: string;
  interim: string;
  supported: boolean;
  start: () => void;
  stop: () => void;
  insertAt: (text: string, textarea: HTMLTextAreaElement | null) => string;
}

declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  }
}

const CZ_FAKE_SCRIPT: [string, string][] = [
  ['I want to say', 'I want to say something'],
  ['I want to say something about', 'I want to say something about Wednesday'],
  ['I want to say something about Wednesday', 'I want to say something about Wednesday — about'],
  ['I want to say something about Wednesday — about', 'I want to say something about Wednesday — about the long meeting'],
  ['I want to say something about Wednesday — about the long meeting', 'I want to say something about Wednesday — about the long meeting and the lights going off,'],
  ['I want to say something about Wednesday — about the long meeting and the lights going off,', 'I want to say something about Wednesday — about the long meeting and the lights going off, and how Margaret stayed.'],
];

export function useCzDictation(lang = 'en-US'): DictationState {
  const SpeechAPI = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : undefined;
  const supported = !!SpeechAPI;

  const [live, setLive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [finalText, setFinalText] = useState('');
  const [interimText, setInterimText] = useState('');

  // Real Speech API refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fake fallback state
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<'interim' | 'final'>('interim');

  const stop = useCallback(() => {
    setLive(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }, []);

  const start = useCallback(() => {
    setFinalText('');
    setInterimText('');
    setSeconds(0);
    setStep(0);
    setPhase('interim');
    setLive(true);
  }, []);

  // Real Speech API effect
  useEffect(() => {
    if (!live || !supported || !SpeechAPI) return;

    const recognition = new SpeechAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let int = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          setFinalText(prev => (prev ? prev + ' ' : '') + result[0].transcript.trim());
        } else {
          int = result[0].transcript;
        }
      }
      setInterimText(int);
    };
    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error !== 'aborted') stop();
    };
    recognition.onend = () => setLive(false);

    recognition.start();
    tickRef.current = setInterval(() => setSeconds(s => s + 1), 1000);

    return () => {
      recognition.stop();
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [live, supported]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fake fallback effect
  useEffect(() => {
    if (!live || supported) return;
    const tick = setInterval(() => setSeconds(s => s + 1), 1000);
    let i = 0;
    const advance = () => {
      i += 1;
      if (i >= CZ_FAKE_SCRIPT.length) return;
      setStep(i); setPhase('interim');
      setTimeout(() => setPhase('final'), 380);
    };
    const grow = setInterval(advance, 900);
    return () => { clearInterval(tick); clearInterval(grow); };
  }, [live, supported]);

  const fakePair = CZ_FAKE_SCRIPT[Math.min(step, CZ_FAKE_SCRIPT.length - 1)];
  const displayFinal = supported ? finalText : (phase === 'final' ? fakePair[1] : fakePair[0]);
  const displayInterim = supported ? interimText : (phase === 'interim' ? fakePair[1].slice(fakePair[0].length) : '');

  const insertAt = useCallback((text: string, textarea: HTMLTextAreaElement | null): string => {
    if (!textarea) return text;
    const { selectionStart: start, selectionEnd: end, value } = textarea;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const sep = before.length > 0 && !before.endsWith('\n') ? ' ' : '';
    return before + sep + text + after;
  }, []);

  return {
    live, seconds,
    final: displayFinal,
    interim: displayInterim,
    supported, start, stop, insertAt,
  };
}

// ── Drop Zone ─────────────────────────────────────────────────────────────────

export interface ImportedFile {
  name: string;
  kind: string;
  size: string;
  words: string;
  status: 'uploading' | 'ready' | 'error';
  storagePath?: string;
}

export interface DropZoneState {
  dragOver: boolean;
  imported: ImportedFile | null;
  setImported: (f: ImportedFile | null) => void;
  handlers: {
    onDragEnter: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
}

export function useCzDropZone(
  userId?: string | null,
  onFileUploaded?: (attachment: { storage_path: string; filename: string; size: number; mime: string }) => void,
): DropZoneState {
  const [dragOver, setDragOver] = useState(false);
  const [imported, setImported] = useState<ImportedFile | null>(null);
  const counter = useRef(0);

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    counter.current += 1;
    if (e.dataTransfer?.types?.includes('Files')) setDragOver(true);
  };
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const onDragLeave = (_e: React.DragEvent) => {
    counter.current -= 1;
    if (counter.current <= 0) { counter.current = 0; setDragOver(false); }
  };

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    counter.current = 0;
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (!f) return;

    const ext = (f.name.split('.').pop() || '').toLowerCase();
    const estimatedWords = Math.max(40, Math.floor(f.size / 6));

    setImported({
      name: f.name,
      kind: ext.toUpperCase(),
      size: (f.size / 1024).toFixed(1) + ' KB',
      words: estimatedWords.toLocaleString(),
      status: 'uploading',
    });

    if (userId) {
      const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${userId}/${Date.now()}_${safeName}`;
      const { error } = await supabase.storage.from('czar-uploads').upload(path, f);
      if (error) {
        setImported(prev => prev ? { ...prev, status: 'error' } : null);
        setTimeout(() => setImported(null), 5000);
        return;
      }
      setImported(prev => prev ? { ...prev, status: 'ready', storagePath: path } : null);
      onFileUploaded?.({ storage_path: path, filename: f.name, size: f.size, mime: f.type || 'application/octet-stream' });
      setTimeout(() => setImported(null), 6000);
    } else {
      setImported(prev => prev ? { ...prev, status: 'ready' } : null);
      setTimeout(() => setImported(null), 6000);
    }
  }, [userId, onFileUploaded]);

  return { dragOver, imported, setImported, handlers: { onDragEnter, onDragOver, onDragLeave, onDrop } };
}
