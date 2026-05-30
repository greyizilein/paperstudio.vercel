// HumaniserDocPanel — Self-contained academic humaniser panel
// Completely separate ecosystem. Safe to improve or delete independently.
// Reads files (txt, md, docx), sends to czar-humanise-doc edge function via SSE,
// preserves headings / citations / reference lists — only rewrites body prose.

import React, { useState, useRef, useCallback } from "react";
import { X, Upload, Copy, Check, RotateCcw, Download } from "lucide-react";
import { Packer } from "docx";
import { fetchEdge } from "@/lib/edgeFetch";
import { buildDocx, docxFilename } from "@/lib/czarDocUtils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface StageState {
  label: string;
  status: "idle" | "active" | "done";
  words?: number;
}

type PanelPhase = "input" | "running" | "done" | "error";

const STAGE_COLORS = [
  "#60a5fa", // stage 0 — blue
  "#4ade80", // stage 1 — green
  "#e85d3f", // stage 2 — czar red
  "#c084fc", // stage 3 — purple
  "#94a3b8", // stage 4 — gray
];

// Opaque names — do not reveal what each stage actually does
const STAGE_LABELS = [
  "Analysis",
  "Preparation",
  "Pass I",
  "Pass II",
  "Calibration",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function readFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "docx" || ext === "doc") {
    const mammoth = await import("mammoth");
    const buf = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
    return value;
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) ?? "");
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsText(file);
  });
}

function countWords(s: string): number {
  return (s || "").trim().split(/\s+/).filter(Boolean).length;
}

async function downloadDocx(text: string, fallbackFilename: string) {
  const doc = buildDocx(text);
  const blob = await Packer.toBlob(doc);
  const name = docxFilename(text) || fallbackFilename;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

export function HumaniserDocPanel({ open, onClose }: Props) {
  const [phase,       setPhase]       = useState<PanelPhase>("input");
  const [inputText,   setInputText]   = useState("");
  const [filename,    setFilename]    = useState("");
  const [stages,      setStages]      = useState<StageState[]>(
    STAGE_LABELS.map((label) => ({ label, status: "idle" }))
  );
  const [result,      setResult]      = useState("");
  const [error,       setError]       = useState("");
  const [copied,      setCopied]      = useState(false);
  const [wordsBefore, setWordsBefore] = useState(0);
  const [wordsAfter,  setWordsAfter]  = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef     = useRef<AbortController | null>(null);

  // ── Reset ──────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setPhase("input");
    setInputText("");
    setFilename("");
    setStages(STAGE_LABELS.map((label) => ({ label, status: "idle" })));
    setResult("");
    setError("");
    setCopied(false);
    setWordsBefore(0);
    setWordsAfter(0);
  }, []);

  const handleClose = useCallback(() => {
    abortRef.current?.abort();
    onClose();
  }, [onClose]);

  // ── File upload ────────────────────────────────────────────────────────────

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await readFile(file);
      setInputText(text);
      setFilename(file.name);
    } catch (err) {
      setError(`Could not read file: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }, []);

  // ── Run pipeline ───────────────────────────────────────────────────────────

  const run = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setPhase("running");
    setStages(STAGE_LABELS.map((label) => ({ label, status: "idle" })));
    setResult("");
    setError("");
    const originalWords = countWords(text);
    setWordsBefore(originalWords);

    const updateStage = (idx: number, patch: Partial<StageState>) =>
      setStages((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

    const callStage = async (body: Record<string, unknown>) => {
      const resp = await fetchEdge("czar-humanise-doc", body, { signal: ac.signal });
      if (!resp.ok) {
        const msg = await resp.text().catch(() => "Request failed");
        throw new Error(msg.slice(0, 200));
      }
      return resp.json() as Promise<{ text: string; discipline?: unknown; words?: number; skipped?: boolean }>;
    };

    try {
      let current = text;
      let discipline: unknown = undefined;

      // Stage 0: Analysis
      updateStage(0, { status: "active" });
      const s0 = await callStage({ stage: 0, text: current });
      discipline = s0.discipline;
      updateStage(0, { status: "done" });

      // Stage 1: Preparation
      updateStage(1, { status: "active" });
      const s1 = await callStage({ stage: 1, text: current });
      current = s1.text;
      updateStage(1, { status: "done", words: s1.words });

      // Stage 2: Pass I
      updateStage(2, { status: "active" });
      const s2 = await callStage({ stage: 2, text: current, discipline });
      current = s2.text;
      updateStage(2, { status: "done", words: s2.words });

      // Stage 3: Pass II
      updateStage(3, { status: "active" });
      const s3 = await callStage({ stage: 3, text: current, discipline });
      current = s3.text;
      updateStage(3, { status: "done", words: s3.words });

      // Stage 4: Calibration (only if over limit)
      const afterWords = countWords(current);
      if (afterWords > Math.ceil(originalWords * 1.01)) {
        updateStage(4, { status: "active" });
        const s4 = await callStage({ stage: 4, text: current, discipline, originalWords });
        current = s4.text;
        updateStage(4, { status: "done", words: s4.words });
      }

      setResult(current);
      setWordsAfter(countWords(current));
      setPhase("done");
    } catch (err) {
      if (ac.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("error");
    }
  }, [inputText]);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const download = useCallback(() => {
    const base = filename ? filename.replace(/\.[^.]+$/, "") + "_humanised.docx" : "humanised.docx";
    downloadDocx(result, base);
  }, [result, filename]);

  if (!open) return null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-white">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 border-b border-zinc-100 h-14 flex-shrink-0" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <button
          onClick={handleClose}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors text-zinc-600"
        >
          <X size={20} />
        </button>
        <span className="flex-1 font-serif italic font-bold text-[19px] text-[#e85d3f] leading-none">Humanise</span>
        {phase !== "input" && (
          <button
            onClick={reset}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors text-zinc-400"
            title="Start over"
          >
            <RotateCcw size={16} />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">

        {/* ── INPUT PHASE ── */}
        {phase === "input" && (
          <div className="px-4 pt-5 pb-4 flex flex-col gap-4">

            {/* File upload */}
            <button
              className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-zinc-300 hover:border-[#e85d3f] hover:bg-red-50/30 transition-colors w-full text-left"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={20} className="text-zinc-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-zinc-700">
                  {filename ? filename : "Upload file"}
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  {filename ? `${countWords(inputText).toLocaleString()} words detected` : ".docx · .txt · .md"}
                </div>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.docx,.doc"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-zinc-100" />
              <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-300">or paste</span>
              <div className="flex-1 h-px bg-zinc-100" />
            </div>

            {/* Paste area */}
            <div className="rounded-xl border border-zinc-200 overflow-hidden">
              <textarea
                value={inputText}
                onChange={(e) => { setInputText(e.target.value); if (filename) setFilename(""); }}
                placeholder="Paste your text here. Headings, citations, and reference lists will be preserved — only body prose is rewritten."
                className="w-full bg-white border-none outline-none resize-none font-sans text-[14px] leading-[1.7] text-zinc-800 placeholder:text-zinc-300 p-4 min-h-[200px]"
                rows={8}
              />
              {inputText && (
                <div className="px-4 py-2 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {countWords(inputText).toLocaleString()} words
                  </span>
                  <button
                    onClick={() => { setInputText(""); setFilename(""); }}
                    className="text-[10px] text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {error && (
              <p className="text-[12px] text-red-500 font-sans">{error}</p>
            )}
          </div>
        )}

        {/* ── RUNNING PHASE ── */}
        {phase === "running" && (
          <div className="px-4 pt-6 pb-4 flex flex-col gap-3">
            <p className="text-[11px] font-mono tracking-widest uppercase text-zinc-400 mb-1">
              Processing · {wordsBefore.toLocaleString()} words
            </p>
            {stages.map((s, i) => {
              if (i === 4 && s.status === "idle") return null;
              const color = STAGE_COLORS[i];
              return (
                <div key={i} className="flex items-center gap-3">
                  {/* Indicator */}
                  <div
                    className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{
                      background: s.status === "done" ? color : "transparent",
                      border: `2px solid ${s.status === "idle" ? "#e4e4e7" : color}`,
                    }}
                  >
                    {s.status === "done" && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {s.status === "active" && (
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className="flex-1 text-[13px] font-sans"
                    style={{
                      color: s.status === "idle" ? "#d4d4d8" : s.status === "active" ? "#18181b" : "#52525b",
                      fontWeight: s.status === "active" ? 600 : 400,
                    }}
                  >
                    {s.label}
                  </span>

                  {/* Words */}
                  {s.words !== undefined && (
                    <span className="text-[11px] font-mono text-zinc-400 flex-shrink-0">
                      {s.words.toLocaleString()}w
                    </span>
                  )}

                  {/* Active spinner */}
                  {s.status === "active" && (
                    <svg className="animate-spin flex-shrink-0" width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="5.5" stroke="#e4e4e7" strokeWidth="2" />
                      <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke={color} strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── DONE PHASE ── */}
        {phase === "done" && result && (
          <div className="px-4 pt-4 pb-4 flex flex-col gap-4">

            {/* Stats bar */}
            <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
              <div className="flex-1 text-center">
                <div className="text-[11px] text-zinc-400 font-mono">Before</div>
                <div className="text-[15px] font-semibold text-zinc-700">{wordsBefore.toLocaleString()}</div>
              </div>
              <div className="text-zinc-300">→</div>
              <div className="flex-1 text-center">
                <div className="text-[11px] text-zinc-400 font-mono">After</div>
                <div
                  className="text-[15px] font-semibold"
                  style={{ color: wordsAfter > Math.ceil(wordsBefore * 1.05) ? "#ef4444" : "#22c55e" }}
                >
                  {wordsAfter.toLocaleString()}
                </div>
              </div>
            </div>

            {error && (
              <div className="px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-[12px] text-orange-700 font-sans">{error}</p>
              </div>
            )}

            {/* Result text */}
            <div className="rounded-xl border border-zinc-200 overflow-hidden">
              <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-400">Output</span>
                <button
                  onClick={copy}
                  className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-900 transition-colors"
                >
                  {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="p-4 max-h-[50vh] overflow-y-auto">
                <pre className="font-sans text-[13.5px] leading-[1.75] text-zinc-800 whitespace-pre-wrap">
                  {result}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ── ERROR PHASE ── */}
        {phase === "error" && !result && (
          <div className="px-4 pt-8 pb-4 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
              <X size={24} className="text-red-400" />
            </div>
            <div>
              <p className="text-[15px] font-medium text-zinc-800 mb-1">Something went wrong</p>
              <p className="text-[13px] text-zinc-500 font-sans leading-relaxed">{error}</p>
            </div>
            <button onClick={reset} className="text-[13px] text-[#e85d3f] font-medium">
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      {(phase === "input" || phase === "done") && (
        <div className="flex-shrink-0 border-t border-zinc-100 px-4 py-3 bg-white" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          {phase === "input" && (
            <button
              disabled={!inputText.trim()}
              onClick={run}
              className="w-full py-3.5 rounded-xl font-sans font-semibold text-[15px] transition-all disabled:opacity-40"
              style={{ background: inputText.trim() ? "#e85d3f" : "#e4e4e7", color: inputText.trim() ? "white" : "#a1a1aa" }}
            >
              Humanise Text
            </button>
          )}
          {phase === "done" && (
            <div className="flex gap-2">
              <button
                onClick={reset}
                className="py-3 px-4 rounded-xl font-sans text-[14px] text-zinc-600 border border-zinc-200 hover:bg-zinc-50 transition-colors flex-shrink-0"
              >
                New
              </button>
              <button
                onClick={download}
                className="py-3 px-4 rounded-xl font-sans text-[14px] text-zinc-700 border border-zinc-200 hover:bg-zinc-50 transition-colors flex items-center gap-1.5 flex-shrink-0"
              >
                <Download size={15} />
                .docx
              </button>
              <button
                onClick={copy}
                className="flex-1 py-3 rounded-xl font-sans font-semibold text-[14px] text-white transition-colors flex items-center justify-center gap-2"
                style={{ background: "#e85d3f" }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
