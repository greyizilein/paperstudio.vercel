import { useState } from "react";
import {
  X, Upload, ChevronLeft, CheckCircle2, Info,
  Sparkles, Loader2, CheckSquare, Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authedHeaders } from "@/lib/edgeFetch";

// ── Types ─────────────────────────────────────────────────────────────────────

type CorrectionType = "grammar" | "style" | "structure" | "argument" | "register";
type Scope = "local" | "global";
type Step = "upload" | "scanning" | "confirm" | "applying" | "done";

interface CorrectionItem {
  id: string;
  type: CorrectionType;
  explanation: string;
  original: string;
  corrected: string;
  selected: boolean;
  override: string;
  scope: Scope;
}

// ── Type metadata ─────────────────────────────────────────────────────────────

const TYPE_META: Record<CorrectionType, { label: string; color: string; border: string; pill: string }> = {
  grammar:   { label: "GRAMMAR",   color: "text-green-700 dark:text-green-400",  border: "border-green-400", pill: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" },
  style:     { label: "STYLE",     color: "text-blue-700 dark:text-blue-400",    border: "border-blue-400",  pill: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300" },
  structure: { label: "STRUCTURE", color: "text-orange-700 dark:text-orange-400", border: "border-orange-400", pill: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300" },
  argument:  { label: "ARGUMENT",  color: "text-red-700 dark:text-red-400",      border: "border-red-400",   pill: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300" },
  register:  { label: "REGISTER",  color: "text-purple-700 dark:text-purple-400", border: "border-purple-400", pill: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300" },
};

// ── Step progress bar ─────────────────────────────────────────────────────────

function StepBar({ step }: { step: Step }) {
  const steps = [
    { id: "upload",   label: "Upload" },
    { id: "scanning", label: "Scan" },
    { id: "confirm",  label: "Review" },
    { id: "applying", label: "Apply" },
  ];
  const idx = { upload: 0, scanning: 1, confirm: 2, applying: 3, done: 3 }[step];
  return (
    <div className="flex items-center gap-0 mb-5">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center">
          <div className={cn(
            "flex items-center gap-1.5 text-[11px] font-bold transition-colors",
            i <= idx ? "text-foreground" : "text-muted-foreground/40"
          )}>
            <div className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition-all",
              i < idx ? "bg-primary text-white" :
              i === idx ? "bg-foreground text-background" :
              "bg-border text-muted-foreground"
            )}>
              {i < idx ? <CheckCircle2 size={10} /> : i + 1}
            </div>
            <span>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn("h-px mx-3 w-8 transition-colors", i < idx ? "bg-primary" : "bg-border")} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface CorrectionModalProps {
  open: boolean;
  onClose: () => void;
  onApplied: (content: string, originalText: string, changeCount: number) => void;
}

export function CorrectionModal({ open, onClose, onApplied }: CorrectionModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [pasted, setPasted] = useState("");
  const [items, setItems] = useState<CorrectionItem[]>([]);
  const [originalText, setOriginalText] = useState("");
  const [notes, setNotes] = useState("");
  const [parseError, setParseError] = useState("");
  const [applyProgress, setApplyProgress] = useState(0);
  const [applyStatus, setApplyStatus] = useState("Thinking through each correction…");
  const [appliedCount, setAppliedCount] = useState(0);

  if (!open) return null;

  const reset = () => {
    setStep("upload");
    setPasted("");
    setItems([]);
    setOriginalText("");
    setNotes("");
    setParseError("");
    setApplyProgress(0);
    setAppliedCount(0);
  };

  const handleClose = () => { reset(); onClose(); };

  // ── Parse step ─────────────────────────────────────────────────────────────

  async function runParse(body: Record<string, any>) {
    setStep("scanning");
    setParseError("");
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/czar-parse-corrections`,
        { method: "POST", headers: await authedHeaders(), body: JSON.stringify({ ...body, correctionNotes: notes }) }
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to scan document");
      const parsed: CorrectionItem[] = (data.items || []).map((it: any) => ({
        ...it, selected: true, override: "", scope: "local" as Scope,
      }));
      setOriginalText(data.originalText || body.plainText || "");
      if (parsed.length === 0) {
        setParseError("No corrections needed — the document looks clean.");
        setStep("upload");
      } else {
        setItems(parsed);
        setStep("confirm");
      }
    } catch (e: any) {
      setParseError(e.message || "Could not scan document");
      setStep("upload");
    }
  }

  async function handleFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "docx") {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = "";
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      await runParse({ docxBase64: btoa(bin), filename: file.name });
    } else {
      const text = await file.text();
      await runParse({ plainText: text });
    }
  }

  async function handlePasteScan() {
    if (!pasted.trim()) return;
    await runParse({ plainText: pasted });
  }

  // ── Apply step ─────────────────────────────────────────────────────────────

  async function handleApply() {
    const selected = items.filter(i => i.selected);
    if (selected.length === 0) return;

    setStep("applying");
    setApplyProgress(5);
    setApplyStatus("Thinking through each correction…");

    const statusMessages = [
      "Thinking through each correction…",
      "Reading your document carefully…",
      "Applying corrections surgically…",
      "Checking academic voice…",
      "Self-critiquing the edits…",
      "Finalising the document…",
    ];
    let msgIdx = 0;
    const statusInterval = setInterval(() => {
      msgIdx = Math.min(msgIdx + 1, statusMessages.length - 1);
      setApplyStatus(statusMessages[msgIdx]);
    }, 3000);

    const ramp = setInterval(() => setApplyProgress(p => {
      if (p < 40) return p + 2;
      if (p < 75) return p + 0.8;
      if (p < 90) return p + 0.2;
      return p;
    }), 400);

    try {
      const wordCount = originalText.split(/\s+/).filter(Boolean).length;
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/apply-supervisor-corrections`,
        {
          method: "POST",
          headers: await authedHeaders(),
          body: JSON.stringify({
            chapter: {
              title: "Document",
              type: "general",
              content: originalText,
              word_count_actual: wordCount,
            },
            project: {
              title: "",
              degree: "",
              field_of_study: "",
              citation_style: "Harvard",
              language_style: "UK",
            },
            feedbackItems: selected.map(s => ({
              id: s.id,
              type: "comment",
              comment: s.override.trim() || s.explanation,
              target_excerpt: s.original,
              suggested_replacement: s.corrected,
              scope: s.scope,
            })),
          }),
        }
      );

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({}));
        throw new Error((err as any).error || `Server error ${resp.status}`);
      }

      // Accumulate SSE stream
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content || "";
            if (delta) acc += delta;
          } catch { /* ignore */ }
        }
      }

      clearInterval(ramp);
      clearInterval(statusInterval);
      setApplyProgress(100);
      setApplyStatus("Done!");

      const cleaned = acc.replace(/<!--\s*CORRECTIONS_LOG[\s\S]*?-->/g, "").trim();
      const logMatch = acc.match(/Applied:\s*([^\n]*)/);
      const appliedIds = logMatch ? logMatch[1].split(",").map(s => s.trim()).filter(Boolean) : [];
      const count = appliedIds.length || selected.length;
      setAppliedCount(count);

      await new Promise(r => setTimeout(r, 600));
      setStep("done");
      // Small delay so user sees "Done" before modal closes
      await new Promise(r => setTimeout(r, 800));
      onApplied(cleaned, originalText, count);
      handleClose();
    } catch (e: any) {
      clearInterval(ramp);
      clearInterval(statusInterval);
      setParseError(e.message || "Revision failed");
      setStep("confirm");
    }
  }

  const selectedCount = items.filter(i => i.selected).length;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-3 sm:p-5 bg-foreground/30 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-background border border-border rounded-2xl max-w-[700px] w-full max-h-[90dvh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-black text-foreground">Correct &amp; Improve Document</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {step === "upload" && "Upload a file or paste your text"}
                {step === "scanning" && "Scanning for corrections…"}
                {step === "confirm" && `${items.length} correction${items.length !== 1 ? "s" : ""} found`}
                {step === "applying" && `Applying ${selectedCount} correction${selectedCount !== 1 ? "s" : ""}…`}
                {step === "done" && "Corrections applied"}
              </p>
            </div>
            <button onClick={handleClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors ml-2 flex-shrink-0">
              <X size={15} />
            </button>
          </div>
          {step !== "done" && <StepBar step={step} />}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── Step: Upload ── */}
          {step === "upload" && (
            <>
              {/* File drop zone */}
              <input
                id="czar-correction-file"
                type="file"
                accept=".docx,.pdf,.txt,.md"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
              />
              <label
                htmlFor="czar-correction-file"
                className="block border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group"
              >
                <Upload size={26} className="text-muted-foreground group-hover:text-primary mx-auto mb-3 transition-colors" />
                <div className="text-[14px] font-bold text-foreground">Drop your document here</div>
                <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">
                  Scanning starts immediately on drop
                </p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">.docx · .txt · .md</p>
              </label>

              <div className="my-5 flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">or paste text</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <textarea
                value={pasted}
                onChange={e => setPasted(e.target.value)}
                placeholder="Paste your document text here…"
                rows={6}
                className="w-full px-3.5 py-3 border border-border rounded-xl text-[13px] outline-none focus:border-primary bg-background resize-none text-foreground placeholder:text-muted-foreground/50 leading-relaxed"
              />

              {/* Notes */}
              <div className="mt-3">
                <label className="block text-[12px] font-semibold text-foreground mb-1.5">
                  Editor notes <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Focus on argument clarity, maintain formal register…"
                  className="w-full px-3 py-2 border border-border rounded-xl text-[12px] outline-none focus:border-primary bg-background text-foreground placeholder:text-muted-foreground/50"
                />
              </div>

              {parseError && (
                <div className="mt-3 flex items-center gap-2 text-[12px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5">
                  <Info size={13} className="flex-shrink-0" />
                  {parseError}
                </div>
              )}

              {pasted.trim() && (
                <div className="flex justify-end mt-3">
                  <button
                    onClick={handlePasteScan}
                    className="px-4 py-2 rounded-xl text-[12px] font-bold bg-foreground text-background hover:opacity-80 transition-opacity"
                  >
                    Scan for corrections →
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Step: Scanning ── */}
          {step === "scanning" && (
            <div className="flex flex-col items-center justify-center py-14 gap-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-border" />
                <div className="absolute inset-0 rounded-full border-2 border-primary border-r-transparent animate-spin" style={{ animationDuration: "1.4s" }} />
                <Sparkles size={20} className="absolute inset-0 m-auto text-primary" />
              </div>
              <div className="text-center">
                <p className="text-[14px] font-bold text-foreground">Scanning document…</p>
                <p className="text-[12px] text-muted-foreground mt-1">Reading for grammar, style, structure, argument, and register issues</p>
              </div>
            </div>
          )}

          {/* ── Step: Confirm ── */}
          {step === "confirm" && (
            <>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[13px] font-bold text-foreground">
                    {selectedCount} of {items.length} corrections selected
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Deselect items to skip. Add an override instruction to redirect any correction.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setItems(p => p.map(i => ({ ...i, selected: true })))} className="text-[11px] font-bold text-primary hover:underline">All</button>
                  <span className="text-muted-foreground text-[11px]">·</span>
                  <button onClick={() => setItems(p => p.map(i => ({ ...i, selected: false })))} className="text-[11px] font-bold text-muted-foreground hover:underline">None</button>
                </div>
              </div>

              <div className="space-y-2.5">
                {items.map(item => {
                  const meta = TYPE_META[item.type];
                  const contextQuote = item.original.length > 120
                    ? `"${item.original.slice(0, 117)}…"`
                    : `"${item.original}"`;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "rounded-xl border p-3.5 transition-all",
                        item.selected ? "border-primary/25 bg-primary/[0.025]" : "border-border bg-secondary/20 opacity-60"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => setItems(prev => prev.map(p => p.id === item.id ? { ...p, selected: !p.selected } : p))}
                          className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
                        >
                          {item.selected ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} />}
                        </button>

                        <div className="flex-1 min-w-0">
                          {/* Badge row */}
                          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                            <span className={cn("text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded", meta.pill)}>
                              {meta.label}
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                              Clear
                            </span>
                            <span className="text-[13px] font-semibold text-foreground leading-snug">{item.explanation}</span>
                          </div>

                          {/* Context quote */}
                          <blockquote className={cn("text-[11px] text-muted-foreground italic border-l-2 pl-2.5 mb-2 line-clamp-2", meta.border)}>
                            {contextQuote}
                          </blockquote>

                          {/* Before → After */}
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-2.5 text-[11px]">
                            <del className="text-destructive/80 line-through">
                              {item.original.length > 70 ? item.original.slice(0, 67) + "…" : item.original}
                            </del>
                            <span className="text-muted-foreground/50">→</span>
                            <ins className={cn("no-underline font-medium", meta.color)}>
                              {item.corrected.length > 70 ? item.corrected.slice(0, 67) + "…" : item.corrected}
                            </ins>
                          </div>

                          {/* Scope + Override row */}
                          {item.selected && (
                            <div className="flex items-center gap-2">
                              <select
                                value={item.scope}
                                onChange={e => setItems(prev => prev.map(p => p.id === item.id ? { ...p, scope: e.target.value as Scope } : p))}
                                className="flex-shrink-0 px-2 py-1.5 border border-border rounded-lg text-[11px] font-semibold outline-none focus:border-primary bg-background text-foreground cursor-pointer"
                              >
                                <option value="local">Fix locally</option>
                                <option value="global">Apply to whole doc</option>
                              </select>
                              <input
                                type="text"
                                placeholder="Override instruction (optional)"
                                value={item.override}
                                onChange={e => setItems(prev => prev.map(p => p.id === item.id ? { ...p, override: e.target.value } : p))}
                                className="flex-1 px-2.5 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-primary bg-background text-foreground placeholder:text-muted-foreground/50"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* How AI works note */}
              <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-secondary/50 border border-border">
                <Sparkles size={13} className="text-primary mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">How the AI works:</strong> It reads your document carefully, applies each correction surgically without touching unrelated text, infers the real intent behind vague instructions, then self-critiques its own edits before outputting the result.
                </p>
              </div>

              {parseError && (
                <div className="mt-3 text-[12px] text-destructive bg-destructive/5 border border-destructive/20 rounded-xl px-3 py-2.5">
                  {parseError}
                </div>
              )}
            </>
          )}

          {/* ── Step: Applying ── */}
          {step === "applying" && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-border" />
                <div className="absolute inset-0 rounded-full border-2 border-primary border-r-transparent animate-spin" style={{ animationDuration: "1.4s" }} />
                <Sparkles size={20} className="absolute inset-0 m-auto text-primary" />
              </div>
              <div className="text-center">
                <p className="text-[14px] font-bold text-foreground">{applyStatus}</p>
                <p className="text-[12px] text-muted-foreground mt-1">Applying {selectedCount} correction{selectedCount !== 1 ? "s" : ""} to your document</p>
              </div>
              <div className="w-full max-w-xs">
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-700 ease-out" style={{ width: `${applyProgress}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-1.5">{Math.round(applyProgress)}%</p>
              </div>
              <div className="mt-2 flex flex-col gap-1 w-full max-w-xs">
                {items.filter(i => i.selected).map((item, idx) => {
                  const threshold = ((idx + 1) / selectedCount) * 85;
                  const done = applyProgress > threshold;
                  const active = applyProgress > (idx / selectedCount) * 85 && !done;
                  return (
                    <div key={item.id} className={cn("flex items-center gap-2 text-[11px] transition-colors",
                      done ? "text-foreground" : active ? "text-primary" : "text-muted-foreground/40"
                    )}>
                      {done
                        ? <CheckCircle2 size={11} className="text-emerald-500 flex-shrink-0" />
                        : active
                        ? <Loader2 size={11} className="animate-spin flex-shrink-0" />
                        : <div className="w-[11px] h-[11px] rounded-full border border-current flex-shrink-0" />
                      }
                      <span className="truncate">{item.override.trim() || item.explanation}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step: Done ── */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <CheckCircle2 size={28} className="text-emerald-500" />
              </div>
              <p className="text-[15px] font-black text-foreground">Corrections applied!</p>
              <p className="text-[12px] text-muted-foreground max-w-xs leading-relaxed">
                {appliedCount} correction{appliedCount !== 1 ? "s" : ""} applied. Your corrected document is ready to download.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-border flex items-center justify-between gap-2 flex-shrink-0">
          <div>
            {step === "confirm" && (
              <button
                onClick={() => { setStep("upload"); setParseError(""); }}
                className="text-[12px] font-bold text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
              >
                <ChevronLeft size={12} /> Back
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {(step === "upload" || step === "confirm") && (
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-xl text-[12px] font-bold text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
            )}
            {step === "confirm" && (
              <button
                onClick={handleApply}
                disabled={selectedCount === 0}
                className="px-5 py-2 rounded-xl text-[12px] font-bold bg-foreground text-background hover:opacity-80 disabled:opacity-40 transition-opacity inline-flex items-center gap-1.5"
              >
                <Sparkles size={11} />
                Apply {selectedCount} correction{selectedCount !== 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
