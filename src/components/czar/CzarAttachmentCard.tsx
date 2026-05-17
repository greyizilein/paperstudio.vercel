import { X, FileText, Image as ImageIcon, FileAudio, File as FileIcon, Check, AlertTriangle, Download } from "lucide-react";
import type { CzarAttachment } from "./CzarComposer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

function fileIcon(mime: string, name: string) {
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime.startsWith("audio/")) return FileAudio;
  if (/\.(txt|md|csv|json|yaml|yml|xml|html|css|js|ts|tsx|jsx|py|go|rb|java|c|cpp|h|hpp|sh|sql)$/i.test(name)) return FileText;
  if (mime.includes("pdf")) return FileText;
  return FileIcon;
}

function fmtSize(b: number) {
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function fileLabel(mime: string, name: string) {
  if (mime.includes("pdf")) return "PDF";
  if (mime.includes("word") || /\.docx?$/i.test(name)) return "Word doc";
  if (mime.includes("sheet") || /\.xlsx?$/i.test(name)) return "Spreadsheet";
  if (mime.includes("presentation") || /\.pptx?$/i.test(name)) return "Slides";
  if (mime.startsWith("image/")) return "Image";
  if (mime.startsWith("audio/")) return "Audio";
  if (mime.startsWith("text/") || /\.(txt|md|csv|json)$/i.test(name)) return "Text";
  return mime.split("/")[1]?.toUpperCase() || "File";
}

interface Props {
  attachment: CzarAttachment;
  onRemove?: (path: string) => void;
  compact?: boolean;
}

export function CzarAttachmentCard({ attachment: a, onRemove, compact }: Props) {
  const Icon = fileIcon(a.mime, a.filename);
  const errored = a.status === "error";
  const ready = a.status === "ready";
  const uploading = a.status === "uploading";
  const progress = Math.max(0, Math.min(100, a.progress ?? (ready ? 100 : 0)));
  const downloadable = ready && !!a.path && !onRemove; // only in message bubbles, not composer

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!a.path) return;
    try {
      const { data, error } = await supabase.storage
        .from("czar-uploads")
        .createSignedUrl(a.path, 3600);
      if (error || !data?.signedUrl) throw error ?? new Error("No URL");
      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = a.filename;
      link.target = "_blank";
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message ?? "File may have been removed.", variant: "destructive" });
    }
  };

  const Wrapper: any = downloadable ? "button" : "div";

  return (
    <Wrapper
      onClick={downloadable ? handleDownload : undefined}
      title={downloadable ? `Download ${a.filename}` : a.filename}
      className={`group relative rounded-lg overflow-hidden flex items-center gap-2.5 p-2.5 min-w-0 text-left ${downloadable ? "cursor-pointer hover:opacity-90 transition-opacity" : ""}`}
      style={{
        background: errored ? "rgba(255,107,107,0.08)" : "var(--czar-surface-hover)",
        border: `1px solid ${errored ? "var(--czar-danger)" : "var(--czar-border)"}`,
        minWidth: compact ? "180px" : "200px",
      }}
    >
      <div
        className="shrink-0 w-9 h-9 rounded-md flex items-center justify-center"
        style={{
          background: errored ? "rgba(255,107,107,0.15)" : "var(--czar-surface)",
          color: errored ? "var(--czar-danger)" : "var(--czar-accent)",
        }}
      >
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium truncate" style={{ color: "var(--czar-text)" }} title={a.filename}>
          {a.filename}
        </div>
        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--czar-text-faint)" }}>
          <span>{fileLabel(a.mime, a.filename)}</span>
          <span>·</span>
          <span>{fmtSize(a.size)}</span>
          {uploading && <span>· {Math.round(progress)}%</span>}
          {ready && !a.was_summarized && (
            <span className="inline-flex items-center gap-0.5" style={{ color: "var(--czar-accent)" }}>
              · <Check size={9} /> Ready
            </span>
          )}
          {ready && a.was_summarized && (
            <span
              className="inline-flex items-center gap-0.5"
              style={{ color: "var(--czar-accent)" }}
              title={`Original ${a.original_words?.toLocaleString?.() ?? "?"} words map-reduced into ${a.summary_chunks ?? "?"} chunk summaries — full document is in context.`}
            >
              · <Check size={9} /> Full doc summarised
            </span>
          )}
          {errored && (
            <span className="inline-flex items-center gap-0.5" style={{ color: "var(--czar-danger)" }}>
              · <AlertTriangle size={9} /> Failed
            </span>
          )}
        </div>
      </div>
      {downloadable && (
        <Download
          size={12}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: "var(--czar-text-faint)" }}
        />
      )}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(a.path); }}
          className="shrink-0 p-1 rounded hover:opacity-80"
          style={{ color: "var(--czar-text-faint)" }}
          aria-label="Remove attachment"
        >
          <X size={12} />
        </button>
      )}
      {uploading && (
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ background: "var(--czar-border)" }}
        >
          <div
            className="h-full transition-all duration-200"
            style={{
              width: `${progress}%`,
              background: "var(--czar-accent)",
            }}
          />
        </div>
      )}
    </Wrapper>
  );
}
