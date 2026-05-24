import {
  useRef, useState, useCallback, useEffect,
  type ChangeEvent, type DragEvent, type KeyboardEvent,
} from "react";
import {
  ArrowUp, Square, Paperclip, X,
  FileSearch, Hash, AtSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceInput } from "./VoiceInput";

// ─── Command catalogue ─────────────────────────────────────────────────────

interface Cmd { cmd: string; aliases: string[]; label: string; desc: string; group: string; action: string }

const COMMANDS: Cmd[] = [
  { cmd: "/correct",  aliases: ["/fix", "/edit"],                                                                     label: "Correct",          desc: "Fix and improve a draft",               group: "Other",   action: "correct" },
  { cmd: "/image",    aliases: ["/draw", "/drawing", "/figure", "/diagram", "/chart", "/illustration", "/visual"],    label: "Image / Diagram",  desc: "Generate a visual, chart, or diagram",  group: "Visuals", action: "image"   },
  { cmd: "/new",      aliases: ["/clear", "/reset", "/start"],                                                        label: "New conversation", desc: "Start fresh",                           group: "Other",   action: "new"     },
];

const CMD_GROUPS = ["Visuals", "Other"];

const AT_ITEMS = [
  { token: "@file", label: "Attach file",  desc: "Open the file picker", action: "file" },
  { token: "@cite", label: "Citation",     desc: "Insert a citation placeholder", action: "cite" },
];

const HASH_ITEMS = [
  { token: "#harvard",   label: "Harvard",   desc: "Use Harvard referencing" },
  { token: "#apa",       label: "APA 7th",   desc: "Use APA 7th referencing" },
  { token: "#chicago",   label: "Chicago",   desc: "Use Chicago referencing" },
  { token: "#vancouver", label: "Vancouver", desc: "Use Vancouver referencing" },
  { token: "#ieee",      label: "IEEE",      desc: "Use IEEE referencing" },
  { token: "#mla",       label: "MLA",       desc: "Use MLA referencing" },
];

// Strip @/# tokens and build context note to append to payload
function processTokens(text: string): string {
  const hashMatches = [...text.matchAll(/#(harvard|apa|chicago|vancouver|ieee|mla)\b/gi)];
  const atCiteMatches = [...text.matchAll(/@cite\b/gi)];

  let context = "";
  if (hashMatches.length > 0) {
    const styleMap: Record<string, string> = { harvard: "Harvard", apa: "APA 7th", chicago: "Chicago", vancouver: "Vancouver", ieee: "IEEE", mla: "MLA" };
    context += ` [Use ${styleMap[hashMatches[0][1].toLowerCase()] ?? hashMatches[0][1]} referencing style.]`;
  }
  if (atCiteMatches.length > 0) context += " [User has requested citations here.]";

  return text
    .replace(/#(harvard|apa|chicago|vancouver|ieee|mla)\b/gi, "")
    .replace(/@cite\b/gi, "[CITE]")
    .replace(/\s{2,}/g, " ")
    .trim() + context;
}

// ─── Misc helpers ──────────────────────────────────────────────────────────

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function truncName(name: string, max = 20) {
  if (name.length <= max) return name;
  const ext = name.lastIndexOf(".");
  if (ext > 0 && name.length - ext <= 6) return `${name.slice(0, max - (name.length - ext) - 1)}…${name.slice(ext)}`;
  return `${name.slice(0, max - 1)}…`;
}

// ─── Component ────────────────────────────────────────────────────────────

interface CommandInputProps {
  onSend: (text: string, files: File[]) => void;
  onStop: () => void;
  streaming: boolean;
  disabled?: boolean;
  onCorrect?: () => void;
  onNewConversation?: () => void;
}

export function CommandInput({
  onSend, onStop, streaming, disabled = false,
  onCorrect, onNewConversation,
}: CommandInputProps) {
  const [text, setText]               = useState("");
  const [files, setFiles]             = useState<File[]>([]);
  const [isDragging, setIsDragging]   = useState(false);
  const [interimVoice, setInterim]    = useState("");

  // Palette state
  const [paletteMode, setPaletteMode]       = useState<"command" | "at" | "hash" | null>(null);
  const [paletteFilter, setPaletteFilter]   = useState("");
  const [paletteIdx, setPaletteIdx]         = useState(0);

  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCount    = useRef(0);

  // ── Auto-height ──────────────────────────────────────────
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lh = parseInt(getComputedStyle(el).lineHeight || "24", 10);
    el.style.height = `${Math.min(el.scrollHeight, lh * 6 + 16)}px`;
  }, []);

  useEffect(() => { adjustHeight(); }, [text, adjustHeight]);

  // ── Palette filtering ─────────────────────────────────────
  const filteredCmds = paletteMode === "command"
    ? COMMANDS.filter(c =>
        !paletteFilter || paletteFilter === "/"
          ? true
          : c.cmd.includes(paletteFilter) ||
            c.aliases.some(a => a.includes(paletteFilter)) ||
            c.label.toLowerCase().includes(paletteFilter.slice(1).toLowerCase()))
    : [];

  const filteredAt   = paletteMode === "at"   ? AT_ITEMS.filter(a => a.token.includes(paletteFilter))   : [];
  const filteredHash = paletteMode === "hash" ? HASH_ITEMS.filter(h => h.token.includes(paletteFilter)) : [];

  const paletteItems =
    filteredCmds.length > 0 ? filteredCmds :
    filteredAt.length   > 0 ? filteredAt   :
    filteredHash;

  useEffect(() => { setPaletteIdx(0); }, [paletteFilter, paletteMode]);

  // ── Text change — detect /, @, # ─────────────────────────
  const handleTextChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    const slashM = val.match(/(?:^|\s)(\/\w*)$/);
    if (slashM) { setPaletteMode("command"); setPaletteFilter(slashM[1]); return; }

    const atM = val.match(/(?:^|\s)(@\w*)$/);
    if (atM) { setPaletteMode("at"); setPaletteFilter(atM[1]); return; }

    const hashM = val.match(/(?:^|\s)(#\w*)$/);
    if (hashM) { setPaletteMode("hash"); setPaletteFilter(hashM[1]); return; }

    setPaletteMode(null);
    setPaletteFilter("");
  }, []);

  // Strip the trigger token from the textarea
  const stripToken = useCallback(() => {
    setText(prev => prev.replace(/(?:^|\s)(\/\w*|@\w*|#\w*)$/, m => m.startsWith(" ") ? " " : "").trimEnd());
    setPaletteMode(null);
    setPaletteFilter("");
  }, []);

  // ── Apply command ─────────────────────────────────────────
  const applyCommand = useCallback((action: string) => {
    if (action === "correct") onCorrect?.();
    else if (action === "new") onNewConversation?.();
    else if (action === "file") fileInputRef.current?.click();

    stripToken();
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [onCorrect, onNewConversation, stripToken]);

  const applyAt = useCallback((action: string) => {
    if (action === "file") {
      stripToken();
      fileInputRef.current?.click();
    } else {
      setPaletteMode(null);
    }
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [stripToken]);

  const applyHash = useCallback((token: string) => {
    setText(prev => {
      const stripped = prev.replace(/(?:^|\s)#\w*$/, "").trimEnd();
      return `${stripped} ${token}`.trimStart();
    });
    setPaletteMode(null);
    setPaletteFilter("");
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  // ── Send ──────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if ((!trimmed && files.length === 0) || streaming) return;

    const payload = processTokens(trimmed);
    onSend(payload || trimmed, files);
    setText("");
    setFiles([]);
    setInterim("");
    setPaletteMode(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [text, files, streaming, onSend]);

  // ── Keyboard ──────────────────────────────────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (paletteMode) {
      if (e.key === "ArrowDown") { e.preventDefault(); setPaletteIdx(i => Math.min(i + 1, paletteItems.length - 1)); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setPaletteIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === "Escape")    { e.preventDefault(); setPaletteMode(null); return; }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const item = paletteItems[paletteIdx];
        if (item) {
          if (paletteMode === "command") applyCommand((item as Cmd).action);
          else if (paletteMode === "at") applyAt((item as typeof AT_ITEMS[0]).action);
          else if (paletteMode === "hash") applyHash((item as typeof HASH_ITEMS[0]).token);
        }
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [paletteMode, paletteItems, paletteIdx, applyCommand, applyAt, applyHash, handleSend]);

  // ── Voice ─────────────────────────────────────────────────
  const handleVoiceTranscript = useCallback((t: string) => {
    setInterim("");
    setText(prev => `${prev}${prev.trim() ? " " : ""}${t}`);
    textareaRef.current?.focus();
  }, []);

  // ── Files ─────────────────────────────────────────────────
  const addFiles = useCallback((fl: FileList | File[]) => {
    const arr = Array.from(fl);
    setFiles(prev => {
      const seen = new Set(prev.map(f => `${f.name}:${f.size}`));
      return [...prev, ...arr.filter(f => !seen.has(`${f.name}:${f.size}`))];
    });
  }, []);

  const removeFile = useCallback((i: number) => setFiles(p => p.filter((_, idx) => idx !== i)), []);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); dragCount.current++; setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); if (--dragCount.current <= 0) { dragCount.current = 0; setIsDragging(false); } }, []);
  const handleDragOver  = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); }, []);
  const handleDrop      = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); dragCount.current = 0; setIsDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const canSend = (text.trim().length > 0 || files.length > 0) && !streaming;

  // Groups for command palette rendering
  const cmdGroups = CMD_GROUPS.map(g => ({ g, items: filteredCmds.filter(c => c.group === g) })).filter(x => x.items.length > 0);
  let globalIdx = 0;

  return (
    <div
      className={cn(
        "relative flex flex-col border border-border rounded-xl bg-background shadow-sm transition-shadow",
        isDragging && "ring-2 ring-primary/40 border-primary/40",
        disabled && "opacity-60"
      )}
      onDragEnter={handleDragEnter} onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}   onDrop={handleDrop}
    >

      {/* ── Command / @ / # palette ──────────────────────────── */}
      {paletteMode && (
        <div className="absolute bottom-full mb-2 left-0 right-0 z-50 bg-background border border-border rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">

          {paletteMode === "command" && (
            <>
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-secondary/40">
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Commands</span>
                <span className="ml-auto text-[9px] text-muted-foreground/35">↑↓ · ↵ select · Esc</span>
              </div>

              {cmdGroups.map(({ g, items }) => (
                <div key={g}>
                  <div className="px-3 pt-2 pb-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/35">{g}</span>
                  </div>
                  {items.map(cmd => {
                    const isActive = paletteIdx === globalIdx;
                    const thisIdx  = globalIdx++;
                    return (
                      <button key={cmd.cmd}
                        onClick={() => applyCommand(cmd.action)}
                        onMouseEnter={() => setPaletteIdx(thisIdx)}
                        className={cn("w-full flex items-center gap-3 px-3 py-2 text-left transition-colors", isActive ? "bg-secondary" : "hover:bg-secondary/60")}>
                        {cmd.action === "correct" ? (
                          <span className="w-5 h-5 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                            <FileSearch size={10} className="text-amber-600 dark:text-amber-400" />
                          </span>
                        ) : cmd.group === "Visuals" ? (
                          <span className="w-5 h-5 rounded-full bg-pink-500/15 text-[10px] flex items-center justify-center flex-shrink-0">🖼</span>
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-secondary text-[10px] flex items-center justify-center flex-shrink-0 text-muted-foreground">↩</span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-[12px] font-semibold text-foreground">{cmd.label}</span>
                            <span className="text-[10px] text-muted-foreground/45 font-mono">{cmd.cmd}</span>
                          </div>
                          <p className="text-[10.5px] text-muted-foreground/55 truncate">{cmd.desc}</p>
                        </div>
                        {cmd.aliases.length > 0 && (
                          <span className="text-[9px] text-muted-foreground/25 font-mono hidden sm:block flex-shrink-0">{cmd.aliases.slice(0, 2).join(" ")}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}

              {filteredCmds.length === 0 && (
                <p className="px-3 py-4 text-[12px] text-muted-foreground text-center">No commands match &ldquo;{paletteFilter}&rdquo;</p>
              )}
            </>
          )}

          {paletteMode === "at" && (
            <>
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-secondary/40">
                <AtSign size={10} className="text-muted-foreground/50" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Mentions</span>
              </div>
              {filteredAt.map((item, i) => (
                <button key={item.token}
                  onClick={() => applyAt(item.action)}
                  onMouseEnter={() => setPaletteIdx(i)}
                  className={cn("w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors", paletteIdx === i ? "bg-secondary" : "hover:bg-secondary/60")}>
                  <span className="text-[10px] font-mono text-primary/70 w-14 flex-shrink-0">{item.token}</span>
                  <div>
                    <div className="text-[12px] font-semibold text-foreground">{item.label}</div>
                    <div className="text-[10.5px] text-muted-foreground/55">{item.desc}</div>
                  </div>
                </button>
              ))}
            </>
          )}

          {paletteMode === "hash" && (
            <>
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-secondary/40">
                <Hash size={10} className="text-muted-foreground/50" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">Citation Style</span>
              </div>
              {filteredHash.map((item, i) => (
                <button key={item.token}
                  onClick={() => applyHash(item.token)}
                  onMouseEnter={() => setPaletteIdx(i)}
                  className={cn("w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors", paletteIdx === i ? "bg-secondary" : "hover:bg-secondary/60")}>
                  <span className="text-[10px] font-mono text-purple-500/70 w-20 flex-shrink-0">{item.token}</span>
                  <div>
                    <div className="text-[12px] font-semibold text-foreground">{item.label}</div>
                    <div className="text-[10.5px] text-muted-foreground/55">{item.desc}</div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Drag overlay ──────────────────────────────────────── */}
      {isDragging && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-primary/5 border-2 border-dashed border-primary/40 pointer-events-none">
          <p className="text-sm font-medium text-primary">Drop files here</p>
        </div>
      )}

      {/* ── File chips ────────────────────────────────────────── */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pt-3 pb-1">
          {files.map((file, i) => (
            <div key={`${file.name}-${i}`} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary border border-border text-xs text-foreground max-w-[200px]">
              <span className="truncate" title={file.name}>{truncName(file.name)}</span>
              <span className="text-muted-foreground flex-shrink-0">{fmtSize(file.size)}</span>
              <button type="button" onClick={() => removeFile(i)} className="flex-shrink-0 text-muted-foreground hover:text-foreground ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Attach hint (when no files) ───────────────────────── */}
      {files.length === 0 && (
        <button type="button" onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 py-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors border-b border-dashed border-border/50 mx-3 mt-2 hover:border-border">
          <Paperclip className="w-3 h-3" />
          <span>Drag & drop files, or click to attach</span>
        </button>
      )}

      {/* ── Input row ─────────────────────────────────────────── */}
      <div className="flex items-end gap-1 px-2 py-2">

        {/* Paperclip (only when files already attached) */}
        {files.length > 0 && (
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={disabled}
            className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors mb-0.5">
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
            disabled={disabled}
            rows={1}
            placeholder={interimVoice ? "" : "Ask CZAR anything — essay, report, script, question… or type / for commands"}
            aria-label="Message input"
            className={cn(
              "w-full resize-none rounded-lg bg-transparent px-1 py-2 text-sm text-foreground placeholder:text-muted-foreground/50",
              "focus:outline-none leading-6 min-h-[40px] overflow-y-auto",
              "scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent",
              disabled && "cursor-not-allowed"
            )}
            style={{ maxHeight: "144px" }}
          />
          {interimVoice && (
            <span className="absolute top-2 left-1 text-sm text-muted-foreground/40 pointer-events-none select-none leading-6 whitespace-pre-wrap break-words" style={{ maxWidth: "calc(100% - 4px)" }}>
              {text}{text ? " " : ""}{interimVoice}
            </span>
          )}
        </div>

        {/* Correct document shortcut */}
        {onCorrect && (
          <button
            type="button"
            onClick={onCorrect}
            disabled={disabled}
            title="Correct & improve a document"
            className="flex-shrink-0 mb-0.5 w-7 h-7 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 transition-colors"
          >
            <FileSearch className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Voice input */}
        <div className="flex-shrink-0 mb-0.5">
          <VoiceInput onTranscript={handleVoiceTranscript} onInterim={setInterim} disabled={disabled} />
        </div>

        {/* Send / Stop */}
        <div className="flex-shrink-0 mb-0.5">
          {streaming ? (
            <button type="button" onClick={onStop}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              aria-label="Stop generation">
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button type="button" onClick={handleSend} disabled={!canSend || disabled}
              className={cn(
                "flex items-center justify-center w-9 h-9 rounded-full transition-colors",
                canSend && !disabled ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-secondary text-muted-foreground/40 cursor-not-allowed"
              )}
              aria-label="Send message">
              <ArrowUp className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <input ref={fileInputRef} type="file" multiple accept="*/*" className="hidden"
        onChange={e => { if (e.target.files) { addFiles(e.target.files); e.target.value = ""; } }}
        aria-hidden="true" />
    </div>
  );
}
