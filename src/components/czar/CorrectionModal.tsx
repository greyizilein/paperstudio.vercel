import { useRef, useState, useEffect } from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CorrectionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (params: { text?: string; notes: string; file?: File }) => void;
  isSubmitting?: boolean;
  initialText?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function countWords(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

export function CorrectionModal({
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
  initialText = "",
}: CorrectionModalProps) {
  const [tab, setTab] = useState<"upload" | "paste">(initialText ? "paste" : "upload");
  const [pastedText, setPastedText] = useState(initialText);
  const [notes, setNotes] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevSubmittingRef = useRef(false);

  // Auto-close when scanning finishes
  useEffect(() => {
    if (prevSubmittingRef.current && !isSubmitting && open) {
      onClose();
    }
    prevSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  if (!open) return null;

  function handleTabSwitch(next: "upload" | "paste") {
    if (next === "paste") setPastedText(initialText);
    setTab(next);
  }

  function handleFileSelect(file: File | null) {
    if (!file) return;
    // Immediately trigger analysis — no button needed
    onSubmit({ file, notes });
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0] ?? null;
    handleFileSelect(dropped);
  }

  function handlePasteScan() {
    if (!pastedText.trim()) return;
    onSubmit({ text: pastedText, notes });
  }

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">
            Correct &amp; Improve Document
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-secondary mb-5">
          {(["upload", "paste"] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleTabSwitch(t)}
              className={cn(
                "flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors",
                tab === t
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "upload" ? "Upload File" : "Paste Text"}
            </button>
          ))}
        </div>

        {/* Upload tab — drop triggers analysis instantly */}
        {tab === "upload" && (
          <div className="mb-5">
            {isSubmitting ? (
              <div className="flex flex-col items-center justify-center h-36 rounded-xl border border-border bg-secondary/20 gap-3">
                <Loader2 size={22} className="animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Scanning document for corrections…</p>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex flex-col items-center justify-center h-36 rounded-xl border-2 border-dashed cursor-pointer transition-colors",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-secondary/50"
                )}
              >
                <Upload
                  size={22}
                  className={cn(
                    "mb-2 transition-colors",
                    isDragging ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <p className="text-sm font-medium text-foreground">
                  Drop a file to scan instantly
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  .docx&nbsp;&middot;&nbsp;.pdf&nbsp;&middot;&nbsp;.txt — analysis starts on drop
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.pdf,.txt,.md"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
            />
          </div>
        )}

        {/* Paste tab */}
        {tab === "paste" && (
          <div className="mb-5">
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste your document text here…"
              className="w-full min-h-[200px] resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors dark:bg-background"
            />
            <p className="mt-1.5 text-xs text-muted-foreground text-right">
              {countWords(pastedText).toLocaleString()} words
            </p>
          </div>
        )}

        {/* Notes — only shown on paste tab or upload tab when not submitting */}
        {(tab === "paste" || (tab === "upload" && !isSubmitting)) && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Editor notes{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Focus on argument clarity, maintain formal academic register…"
              rows={2}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors dark:bg-background"
            />
          </div>
        )}

        {/* Paste tab scan button */}
        {tab === "paste" && (
          <button
            onClick={handlePasteScan}
            disabled={isSubmitting || !pastedText.trim()}
            className={cn(
              "w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity",
              "bg-primary text-primary-foreground",
              isSubmitting || !pastedText.trim() ? "opacity-40 cursor-not-allowed" : "hover:opacity-90"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Scanning…
              </>
            ) : (
              "Scan for corrections →"
            )}
          </button>
        )}

        {/* Upload tab: hint when not submitting */}
        {tab === "upload" && !isSubmitting && (
          <p className="text-center text-xs text-muted-foreground">
            Analysis starts the moment you drop or select a file
          </p>
        )}
      </div>
    </div>
  );
}
