import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { ArrowUp, Square, Plus, FileSearch, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceInput } from "./VoiceInput";

interface CommandInputProps {
  onSend: (text: string, files: File[]) => void;
  onStop: () => void;
  streaming: boolean;
  disabled?: boolean;
  tier?: string;
  onCorrect?: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function truncateFilename(name: string, max = 20): string {
  if (name.length <= max) return name;
  const ext = name.lastIndexOf(".");
  if (ext > 0 && name.length - ext <= 6) {
    const extPart = name.slice(ext);
    const base = name.slice(0, max - extPart.length - 1);
    return `${base}…${extPart}`;
  }
  return `${name.slice(0, max - 1)}…`;
}

function tierLabel(tier: string): string {
  if (tier === "pro") return "Unlimited";
  if (tier === "university") return "University";
  if (tier === "free") return "Free";
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export function CommandInput({
  onSend,
  onStop,
  streaming,
  disabled = false,
  tier,
  onCorrect,
}: CommandInputProps) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [interimVoice, setInterimVoice] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Auto-expand textarea up to 6 rows
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = parseInt(getComputedStyle(el).lineHeight || "24", 10);
    const maxHeight = lineHeight * 6 + 16;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [text, adjustHeight]);

  const handleTextChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
    },
    []
  );

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && files.length === 0) return;
    if (streaming) return;
    onSend(trimmed, files);
    setText("");
    setFiles([]);
    setInterimVoice("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, files, streaming, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleVoiceTranscript = useCallback((transcript: string) => {
    setInterimVoice("");
    setText((prev) => {
      const sep = prev.trim() ? " " : "";
      return prev + sep + transcript;
    });
    textareaRef.current?.focus();
  }, []);

  const handleVoiceInterim = useCallback((interim: string) => {
    setInterimVoice(interim);
  }, []);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles);
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.name}:${f.size}`));
      const deduped = arr.filter((f) => !existing.has(`${f.name}:${f.size}`));
      return [...prev, ...deduped];
    });
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(e.target.files);
        e.target.value = "";
      }
    },
    [addFiles]
  );

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDraggingOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDraggingOver(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const canSend = (text.trim().length > 0 || files.length > 0) && !streaming;
  const isDisabled = disabled;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl bg-background border-2 border-border shadow-lg transition-shadow",
        isDraggingOver && "ring-2 ring-primary/40 shadow-xl border-primary/40",
        isDisabled && "opacity-60"
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-primary/5 border-2 border-dashed border-primary/40 pointer-events-none">
          <p className="text-sm font-medium text-primary">Drop files here</p>
        </div>
      )}

      {/* Tier badge */}
      {tier && (
        <div className="flex justify-end px-4 pt-2.5">
          <span className="text-[10.5px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
            {tierLabel(tier)}
          </span>
        </div>
      )}

      {/* File chips */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pt-2 pb-0">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary border border-border text-xs text-foreground max-w-[200px]"
            >
              <span className="truncate" title={file.name}>
                {file.type.startsWith("image/") && <span className="text-[10px] mr-0.5">🖼</span>}
                {truncateFilename(file.name)}
              </span>
              <span className="text-muted-foreground flex-shrink-0">
                {formatFileSize(file.size)}
              </span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors ml-0.5"
                aria-label={`Remove ${file.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Textarea */}
      <div className="relative px-4 pt-3 pb-1">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          rows={1}
          placeholder={interimVoice ? "" : "Ask CZAR anything, describe what to write, or upload files to correct…"}
          aria-label="Message input"
          className={cn(
            "w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/45",
            "focus:outline-none leading-6",
            "min-h-[40px] overflow-y-auto",
            "scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent",
            isDisabled && "cursor-not-allowed"
          )}
          style={{ maxHeight: "144px" }}
        />
        {interimVoice && (
          <span
            className="absolute top-3 left-4 text-sm text-muted-foreground/40 pointer-events-none select-none leading-6 whitespace-pre-wrap break-words"
            style={{ maxWidth: "calc(100% - 32px)" }}
          >
            {text}{text ? " " : ""}{interimVoice}
          </span>
        )}
      </div>

      {/* Bottom action row */}
      <div className="flex items-center gap-1.5 px-3 pb-3 pt-1">
        {/* Attach files */}
        <button
          type="button"
          onClick={openFilePicker}
          disabled={isDisabled}
          className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          aria-label="Attach files"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Correct doc */}
        {!streaming && onCorrect && (
          <button
            type="button"
            onClick={onCorrect}
            disabled={isDisabled}
            className="flex items-center gap-1.5 px-2.5 h-8 rounded-full text-[11.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Correct a document"
          >
            <FileSearch className="w-3.5 h-3.5" />
            <span>Correct</span>
          </button>
        )}

        <div className="flex-1" />

        {/* Voice */}
        <VoiceInput
          onTranscript={handleVoiceTranscript}
          onInterim={handleVoiceInterim}
          disabled={isDisabled}
        />

        {/* Send / Stop */}
        {streaming ? (
          <button
            type="button"
            onClick={onStop}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
            aria-label="Stop generation"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend || isDisabled}
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-full transition-colors",
              canSend && !isDisabled
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-secondary text-muted-foreground/40 cursor-not-allowed"
            )}
            aria-label="Send message"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".docx,.pdf,.txt,.md,.csv,.xlsx,.xls,image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={handleFileInputChange}
        aria-hidden="true"
      />
    </div>
  );
}
