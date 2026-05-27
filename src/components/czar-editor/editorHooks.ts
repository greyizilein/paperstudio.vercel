import { useState, useEffect, useRef } from "react";

export interface ImportedFile {
  name: string;
  kind: string;
  size: string;
  words: string;
}

export interface DictationState {
  live: boolean;
  seconds: number;
  final: string;
  interim: string;
  start: () => void;
  stop: () => void;
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

const FAKE_SCRIPT: [string, string][] = [
  ["I want to say", "I want to say something"],
  ["I want to say something about", "I want to say something about Wednesday"],
  ["I want to say something about Wednesday", "I want to say something about Wednesday — about"],
  ["I want to say something about Wednesday — about", "I want to say something about Wednesday — about the long meeting"],
  ["I want to say something about Wednesday — about the long meeting", "I want to say something about Wednesday — about the long meeting and the lights going off,"],
  ["I want to say something about Wednesday — about the long meeting and the lights going off,", "I want to say something about Wednesday — about the long meeting and the lights going off, and how Margaret stayed."],
];

export function useCzDictation(): DictationState {
  const [live, setLive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<"interim" | "final">("interim");

  useEffect(() => {
    if (!live) return;
    setStep(0);
    setSeconds(0);
    setPhase("interim");

    const tick = setInterval(() => setSeconds((s) => s + 1), 1000);
    let i = 0;
    const advance = () => {
      i += 1;
      if (i >= FAKE_SCRIPT.length) return;
      setStep(i);
      setPhase("interim");
      setTimeout(() => setPhase("final"), 380);
    };
    const grow = setInterval(advance, 900);
    return () => {
      clearInterval(tick);
      clearInterval(grow);
    };
  }, [live]);

  const pair = FAKE_SCRIPT[Math.min(step, FAKE_SCRIPT.length - 1)];
  const finalText = phase === "final" ? pair[1] : pair[0];
  const interimText = phase === "interim" ? pair[1].slice(pair[0].length) : "";

  return {
    live,
    seconds,
    final: finalText,
    interim: interimText,
    start: () => setLive(true),
    stop: () => setLive(false),
  };
}

export function useCzDropZone(): DropZoneState {
  const [dragOver, setDragOver] = useState(false);
  const [imported, setImported] = useState<ImportedFile | null>(null);
  const counter = useRef(0);

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    counter.current += 1;
    if (e.dataTransfer?.types?.includes("Files")) {
      setDragOver(true);
    }
  };
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const onDragLeave = () => {
    counter.current -= 1;
    if (counter.current <= 0) {
      counter.current = 0;
      setDragOver(false);
    }
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    counter.current = 0;
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) {
      const ext = (f.name.split(".").pop() ?? "").toLowerCase();
      const kb = (f.size / 1024).toFixed(1) + " KB";
      const words = Math.max(40, Math.floor(f.size / 6));
      const file: ImportedFile = { name: f.name, kind: ext.toUpperCase(), size: kb, words: words.toLocaleString() };
      setImported(file);
      setTimeout(() => setImported(null), 6000);
    } else {
      setImported({ name: "notes.md", kind: "MD", size: "12.4 KB", words: "1,840" });
      setTimeout(() => setImported(null), 6000);
    }
  };

  return {
    dragOver,
    imported,
    setImported,
    handlers: { onDragEnter, onDragOver, onDragLeave, onDrop },
  };
}
