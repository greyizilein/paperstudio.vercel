import { useState } from "react";
import { X, Upload, FileText, ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";
import { BookLoader } from "@/components/ui/BookLoader";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Chapter, Project } from "@/types/project";
import { authedHeaders } from "@/lib/edgeFetch";

interface FeedbackItem {
  id: string;
  type: "comment" | "insertion" | "deletion" | "note";
  comment: string;
  target_excerpt?: string;
  suggested_replacement?: string;
  author?: string;
  // Local UI state
  selected?: boolean;
  override?: string;
  scope?: "local" | "chapter";
}

interface Props {
  open: boolean;
  onClose: () => void;
  chapter: Chapter;
  project: Project;
  onApplied: (revisedContent: string, itemsAppliedCount: number) => void;
}

type Step = "upload" | "confirm" | "diff";

export function SupervisorFeedbackModal({ open, onClose, chapter, project, onApplied }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [pasted, setPasted] = useState("");
  const [filename, setFilename] = useState("");
  const [source, setSource] = useState<"docx" | "pdf" | "txt" | "paste">("paste");
  const [applying, setApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState(0);
  const [revised, setRevised] = useState<string>("");

  if (!open) return null;

  const reset = () => {
    setStep("upload");
    setItems([]);
    setPasted("");
    setFilename("");
    setRevised("");
    setProgress(0);
    setApplyProgress(0);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleFile = async (file: File) => {
    setFilename(file.name);
    setParsing(true);
    setProgress(10);
    const ramp = setInterval(() => setProgress((p) => (p < 85 ? p + 5 : p)), 250);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let body: any = {};
      if (ext === "docx") {
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let bin = "";
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        body = { docxBase64: btoa(bin), filename: file.name };
        setSource("docx");
      } else if (ext === "pdf") {
        // Best-effort: PDF text extraction client-side is heavy; let user paste comments instead.
        const text = await file.text().catch(() => "");
        body = { pdfText: text || "", filename: file.name };
        setSource("pdf");
      } else {
        const text = await file.text();
        body = { plainText: text };
        setSource("txt");
      }

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-supervisor-feedback`, {
        method: "POST",
        headers: await authedHeaders(),
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      clearInterval(ramp);
      setProgress(100);
      if (!resp.ok) throw new Error(data.error || "Failed to parse feedback");
      const parsed: FeedbackItem[] = (data.items || []).map((it: FeedbackItem) => ({
        ...it,
        selected: true,
        override: "",
        scope: "local" as const,
      }));
      if (parsed.length === 0) {
        toast.error("No feedback items detected. Try pasting comments below.");
      } else {
        setItems(parsed);
        setStep("confirm");
      }
    } catch (e: any) {
      toast.error(e.message || "Could not parse feedback");
    } finally {
      setParsing(false);
    }
  };

  const handlePaste = async () => {
    if (!pasted.trim()) return toast.error("Paste some feedback first");
    setSource("paste");
    setParsing(true);
    setProgress(20);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-supervisor-feedback`, {
        method: "POST",
        headers: await authedHeaders(),
        body: JSON.stringify({ plainText: pasted }),
      });
      const data = await resp.json();
      setProgress(100);
      if (!resp.ok) throw new Error(data.error);
      const parsed = (data.items || []).map((it: FeedbackItem) => ({
        ...it, selected: true, override: "", scope: "local" as const,
      }));
      setItems(parsed);
      setStep("confirm");
    } catch (e: any) {
      toast.error(e.message || "Failed to parse");
    } finally {
      setParsing(false);
    }
  };

  const handleApply = async () => {
    const selected = items.filter((i) => i.selected);
    if (selected.length === 0) return toast.error("Select at least one feedback item");

    setApplying(true);
    setApplyProgress(8);
    const ramp = setInterval(() => setApplyProgress((p) => (p < 85 ? p + 4 : p)), 350);

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-chapter`, {
        method: "POST",
        headers: await authedHeaders(),
        body: JSON.stringify({
          project,
          chapter,
          draftConfig: chapter.draft_config || { target_words: chapter.word_count_target },
          mode: "supervisor_revision",
          supervisor_feedback: selected.map((s) => ({
            comment: s.override || s.comment,
            target_excerpt: s.target_excerpt,
            suggested_replacement: s.suggested_replacement,
            scope: s.scope,
            type: s.type,
          })),
          existingContent: chapter.content,
        }),
      });

      if (!resp.ok || !resp.body) {
        clearInterval(ramp);
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Server returned ${resp.status}`);
      }

      // Stream and accumulate
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
            if (delta) {
              acc += delta;
              setApplyProgress((p) => Math.min(95, p + 0.3));
            }
          } catch { /* ignore */ }
        }
      }

      clearInterval(ramp);
      setApplyProgress(100);
      setRevised(acc);
      setStep("diff");
    } catch (e: any) {
      clearInterval(ramp);
      toast.error(e.message || "Revision failed");
    } finally {
      setApplying(false);
    }
  };

  const acceptRevision = () => {
    const count = items.filter((i) => i.selected).length;
    onApplied(revised, count);
    toast.success(`Applied ${count} supervisor edit${count === 1 ? "" : "s"}`);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5 bg-foreground/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="bg-background border border-border rounded-xl max-w-[760px] w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-[15px] font-black text-foreground">Apply supervisor feedback</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">{chapter.title} · Step {step === "upload" ? 1 : step === "confirm" ? 2 : 3} of 3</p>
          </div>
          <button onClick={handleClose} className="p-1 text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Step 1 — Upload */}
          {step === "upload" && (
            <>
              {parsing ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <BookLoader progress={progress} label="Reading supervisor file…" />
                </div>
              ) : (
                <>
                  <input id="sup-feedback-file" type="file" accept=".docx,.pdf,.txt,.md" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
                  <label htmlFor="sup-feedback-file"
                    className="block border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
                    <Upload size={28} className="text-primary mx-auto mb-2" />
                    <div className="text-[14px] font-bold text-foreground">Upload supervisor file</div>
                    <p className="text-[12px] text-muted-foreground mt-1">.docx (tracked changes + comments) · .pdf · .txt · .md</p>
                  </label>

                  <div className="my-5 flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">or paste feedback</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <textarea
                    value={pasted}
                    onChange={(e) => setPasted(e.target.value)}
                    placeholder="Paste supervisor comments here. One per line, or use bullets/numbers."
                    rows={8}
                    className="w-full px-3 py-2 border border-border rounded-md text-[13px] outline-none focus:border-primary bg-background resize-none"
                  />
                  <div className="flex justify-end mt-3">
                    <button onClick={handlePaste} className="px-3 py-1.5 rounded-md text-xs font-bold bg-primary text-white hover:bg-primary/90">
                      Parse pasted feedback
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* Step 2 — Confirm */}
          {step === "confirm" && (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] text-muted-foreground">
                  <b className="text-foreground">{items.filter((i) => i.selected).length}</b> of {items.length} items selected
                </p>
                <div className="flex gap-1.5">
                  <button onClick={() => setItems((p) => p.map((i) => ({ ...i, selected: true })))}
                    className="text-[11px] font-bold text-primary hover:underline">Select all</button>
                  <span className="text-muted-foreground">·</span>
                  <button onClick={() => setItems((p) => p.map((i) => ({ ...i, selected: false })))}
                    className="text-[11px] font-bold text-muted-foreground hover:underline">Clear</button>
                </div>
              </div>

              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id}
                    className={cn("rounded-lg border p-3 transition-all",
                      item.selected ? "border-primary/30 bg-primary/[0.03]" : "border-border bg-secondary/20")}>
                    <div className="flex items-start gap-2.5">
                      <Checkbox
                        checked={!!item.selected}
                        onCheckedChange={(v) => setItems((prev) => prev.map((p) => p.id === item.id ? { ...p, selected: !!v } : p))}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={cn("text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded",
                            item.type === "comment" ? "bg-blue-100 text-blue-700" :
                            item.type === "insertion" ? "bg-green/10 text-green" :
                            item.type === "deletion" ? "bg-red-100 text-red-700" :
                            "bg-secondary text-muted-foreground"
                          )}>{item.type}</span>
                          {item.author && <span className="text-[10px] text-muted-foreground">{item.author}</span>}
                        </div>
                        <p className="text-[13px] font-semibold text-foreground leading-snug">{item.comment}</p>
                        {item.target_excerpt && (
                          <p className="text-[11px] text-muted-foreground italic mt-1.5 line-clamp-2 border-l-2 border-border pl-2">
                            "{item.target_excerpt}"
                          </p>
                        )}
                        {item.selected && (
                          <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                            <input
                              type="text"
                              placeholder="Override instruction (optional)"
                              value={item.override || ""}
                              onChange={(e) => setItems((prev) => prev.map((p) => p.id === item.id ? { ...p, override: e.target.value } : p))}
                              className="px-2 py-1 border border-border rounded text-[12px] outline-none focus:border-primary bg-background"
                            />
                            <select
                              value={item.scope}
                              onChange={(e) => setItems((prev) => prev.map((p) => p.id === item.id ? { ...p, scope: e.target.value as any } : p))}
                              className="px-2 py-1 border border-border rounded text-[12px] outline-none focus:border-primary bg-background"
                            >
                              <option value="local">Rewrite locally</option>
                              <option value="chapter">Reflow chapter</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Step 3 — Diff */}
          {step === "diff" && (
            <>
              {applying ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <BookLoader progress={applyProgress} label="Rewriting chapter…" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Original</h3>
                    <div className="border border-border rounded-md p-3 max-h-[50vh] overflow-y-auto text-[12px] whitespace-pre-wrap leading-relaxed bg-red-50/30">
                      {chapter.content.slice(0, 6000)}{chapter.content.length > 6000 ? "\n…" : ""}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Revised</h3>
                    <div className="border border-primary/30 rounded-md p-3 max-h-[50vh] overflow-y-auto text-[12px] whitespace-pre-wrap leading-relaxed bg-green/5">
                      {revised.slice(0, 6000)}{revised.length > 6000 ? "\n…" : ""}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border flex justify-between items-center gap-2">
          {step === "confirm" && (
            <button onClick={() => setStep("upload")} className="text-xs font-bold text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <ChevronLeft size={12} /> Back
            </button>
          )}
          {step === "diff" && !applying && (
            <button onClick={() => setStep("confirm")} className="text-xs font-bold text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <ChevronLeft size={12} /> Re-edit
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button onClick={handleClose} className="px-3 py-1.5 rounded-md text-xs font-bold text-muted-foreground hover:bg-secondary">Cancel</button>
            {step === "confirm" && (
              <button onClick={handleApply} disabled={applying || items.filter((i) => i.selected).length === 0}
                className="px-3 py-1.5 rounded-md text-xs font-bold bg-primary text-white hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-1.5">
                Apply selected <ChevronRight size={12} />
              </button>
            )}
            {step === "diff" && !applying && (
              <button onClick={acceptRevision}
                className="px-3 py-1.5 rounded-md text-xs font-bold bg-primary text-white hover:bg-primary/90 inline-flex items-center gap-1.5">
                <CheckCircle2 size={12} /> Accept revision
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
