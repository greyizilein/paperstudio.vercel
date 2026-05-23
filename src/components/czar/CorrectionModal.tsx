import { useRef, useState } from "react";
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
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState(initialText);
  const [notes, setNotes] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const isDisabled =
    isSubmitting ||
    (tab === "upload" && file === null) ||
    (tab === "paste" && pastedText.trim() === "");

  function handleTabSwitch(next: "upload" | "paste") {
    if (next === "upload") setPastedText("");
    if (next === "paste") setFile(null);
    setTab(next);
  }

  function handleFileSelect(selected: File | null) {
    if (selected) setFile(selected);
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

  function handleSubmit() {
    if (isDisabled) return;
    onSubmit({
      file: tab === "upload" ? (file ?? undefined) : undefined,
      text: tab === "paste" ? pastedText : undefined,
      notes,
    });
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

        {/* Upload tab */}
        {tab === "upload" && (
          <div className="mb-5">
            {file === null ? (
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
                  Drag a file here or click to browse
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  .docx&nbsp;&middot;&nbsp;.pdf&nbsp;&middot;&nbsp;.txt
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-secondary/40">
                <FileText size={20} className="shrink-0 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(file.size)}
                  </p>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  aria-label="Remove file"
                >
                  <X size={14} />
                </button>
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

        {/* Notes section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Additional notes{" "}
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

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isDisabled}
          className={cn(
            "w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity",
            "bg-primary text-primary-foreground",
            isDisabled ? "opacity-40 cursor-not-allowed" : "hover:opacity-90"
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Analyzing…
            </>
          ) : (
            "Analyze Document →"
          )}
        </button>
      </div>
    </div>
  );
}
