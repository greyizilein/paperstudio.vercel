import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { ArrowUp, Square, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceInput } from "./VoiceInput";

interface CommandInputProps {
  onSend: (text: string, files: File[]) => void;
  onStop: () => void;
  streaming: boolean;
  disabled?: boolean;
  placeholder?: string;
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

export function CommandInput({
  onSend,
  onStop,
  streaming,
  disabled = false,
  placeholder,
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
    const maxHeight = lineHeight * 6 + 16; // 6 lines + padding
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
    // Reset textarea height
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

  // Voice callbacks
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

  // File handling
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

  // Drag-and-drop handlers (on the whole component)
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
  const isDisabled = disabled || (streaming && false); // allow stop even when streaming

  const defaultPlaceholder =
    "Ask CZAR anything, describe what to write, or upload files to correct…";

  return (
    <div
      className={cn(
        "relative flex flex-col gap-0 border border-border rounded-xl bg-background shadow-sm transition-shadow",
        isDraggingOver && "ring-2 ring-primary/40 border-primary/40 shadow-md",
        isDisabled && "opacity-60"
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-primary/5 border-2 border-dashed border-primary/40 pointer-events-none">
          <p className="text-sm font-medium text-primary">Drop files here</p>
        </div>
      )}

      {/* File chips area */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pt-3 pb-1">
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
          <span className="self-center text-xs text-muted-foreground/60 ml-1">
            {files.length} file{files.length !== 1 ? "s" : ""} attached
          </span>
        </div>
      )}

      {/* Drop target hint when no files and not dragging */}
      {files.length === 0 && (
        <button
          type="button"
          onClick={openFilePicker}
          className={cn(
            "flex items-center justify-center gap-2 py-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors mx-3 mt-2",
            ""
          )}
          aria-label="Attach files"
        >
          <Paperclip className="w-3 h-3" />
          <span>Drag & drop files, or click to attach</span>
        </button>
      )}

      {/* Input row */}
      <div className="flex items-end gap-1 px-2 py-2">
        {/* Paperclip button (only visible when files already attached) */}
        {files.length > 0 && (
          <button
            type="button"
            onClick={openFilePicker}
            disabled={isDisabled}
            className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors mb-0.5"
            aria-label="Attach more files"
          >
            <Paperclip className="w-4 h-4" />
          </button>
        )}

        {/* Textarea */}
        <div className="relative flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
            rows={1}
            placeholder={
              interimVoice ? "" : placeholder ?? defaultPlaceholder
            }
            aria-label="Message input"
            className={cn(
              "w-full resize-none rounded-lg bg-transparent px-1 py-2 text-sm text-foreground placeholder:text-muted-foreground/50",
              "focus:outline-none leading-6",
              "min-h-[40px] overflow-y-auto",
              "scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent",
              isDisabled && "cursor-not-allowed"
            )}
            style={{ maxHeight: "144px" }} // 6 rows × 24px
          />

          {/* Interim voice overlay */}
          {interimVoice && (
            <span
              className="absolute top-2 left-1 text-sm text-muted-foreground/40 pointer-events-none select-none leading-6 whitespace-pre-wrap break-words"
              style={{ maxWidth: "calc(100% - 4px)" }}
            >
              {text}
              {text ? " " : ""}
              {interimVoice}
            </span>
          )}
        </div>

        {/* Voice input button */}
        <div className="flex-shrink-0 mb-0.5">
          <VoiceInput
            onTranscript={handleVoiceTranscript}
            onInterim={handleVoiceInterim}
            disabled={isDisabled}
          />
        </div>

        {/* Send / Stop button */}
        <div className="flex-shrink-0 mb-0.5">
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
