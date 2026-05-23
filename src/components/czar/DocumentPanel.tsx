import { useEffect, useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Feather, Download, Volume2, VolumeX, Edit3, Eye, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
} from "docx";

interface DocumentPanelProps {
  content: string;
  streaming: boolean;
  mode: string;
  onSelectionAction?: (action: string, selectedText: string) => void;
  onContentChange?: (content: string) => void;
  className?: string;
}

interface SelectionToolbar {
  x: number;
  y: number;
  text: string;
}

const SELECTION_ACTIONS = ["Improve", "Shorten", "Expand", "Rewrite"] as const;

// Markdown component overrides for document typography
const markdownComponents = {
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 {...props} className="text-2xl font-bold font-sans mt-8 mb-3 text-foreground leading-tight">
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 {...props} className="text-xl font-bold font-sans mt-6 mb-2.5 text-foreground leading-tight">
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 {...props} className="text-lg font-semibold font-sans mt-5 mb-2 text-foreground">
      {children}
    </h3>
  ),
  h4: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h4 {...props} className="text-base font-semibold font-sans mt-4 mb-1.5 text-foreground">
      {children}
    </h4>
  ),
  p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p {...props} className="leading-relaxed mb-4 text-foreground text-sm">
      {children}
    </p>
  ),
  ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul {...props} className="list-disc list-outside pl-5 mb-4 space-y-1 text-sm text-foreground">
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol {...props} className="list-decimal list-outside pl-5 mb-4 space-y-1 text-sm text-foreground">
      {children}
    </ol>
  ),
  li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li {...props} className="leading-relaxed">
      {children}
    </li>
  ),
  blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote {...props} className="border-l-4 border-primary/40 pl-4 italic text-muted-foreground my-4 text-sm">
      {children}
    </blockquote>
  ),
  code: ({ inline, children, ...props }: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) =>
    inline ? (
      <code
        {...props}
        className="font-mono text-xs bg-secondary text-foreground px-1.5 py-0.5 rounded"
      >
        {children}
      </code>
    ) : (
      <code {...props} className="font-mono text-xs">
        {children}
      </code>
    ),
  pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
    <pre
      {...props}
      className="bg-secondary border border-border rounded-md p-4 overflow-x-auto mb-4 text-xs font-mono"
    >
      {children}
    </pre>
  ),
  table: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="overflow-x-auto mb-4">
      <table {...props} className="w-full border-collapse text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead {...props} className="bg-secondary">
      {children}
    </thead>
  ),
  th: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th {...props} className="border border-border px-3 py-2 text-left font-semibold text-xs text-foreground">
      {children}
    </th>
  ),
  td: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td {...props} className="border border-border px-3 py-2 text-xs text-foreground">
      {children}
    </td>
  ),
  hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
    <hr {...props} className="border-border my-6" />
  ),
  strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <strong {...props} className="font-semibold text-foreground">
      {children}
    </strong>
  ),
  em: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <em {...props} className="italic">
      {children}
    </em>
  ),
};

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildDocx(markdown: string): Document {
  const lines = markdown.split("\n");
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^### /.test(trimmed)) {
      paragraphs.push(new Paragraph({
        text: trimmed.replace(/^### /, ""),
        heading: HeadingLevel.HEADING_3,
      }));
    } else if (/^## /.test(trimmed)) {
      paragraphs.push(new Paragraph({
        text: trimmed.replace(/^## /, ""),
        heading: HeadingLevel.HEADING_2,
      }));
    } else if (/^# /.test(trimmed)) {
      paragraphs.push(new Paragraph({
        text: trimmed.replace(/^# /, ""),
        heading: HeadingLevel.HEADING_1,
      }));
    } else if (/^[-*+] /.test(trimmed)) {
      const text = trimmed.replace(/^[-*+] /, "");
      paragraphs.push(new Paragraph({
        bullet: { level: 0 },
        children: parseInlineRuns(text),
      }));
    } else if (/^\d+\. /.test(trimmed)) {
      const text = trimmed.replace(/^\d+\. /, "");
      paragraphs.push(new Paragraph({
        numbering: { reference: "default-numbering", level: 0 },
        children: parseInlineRuns(text),
      }));
    } else if (trimmed === "") {
      paragraphs.push(new Paragraph({ text: "" }));
    } else {
      paragraphs.push(new Paragraph({
        children: parseInlineRuns(trimmed),
        alignment: AlignmentType.LEFT,
      }));
    }
  }

  return new Document({
    numbering: {
      config: [
        {
          reference: "default-numbering",
          levels: [
            {
              level: 0,
              format: "decimal" as any,
              text: "%1.",
              alignment: AlignmentType.LEFT,
            },
          ],
        },
      ],
    },
    sections: [{ children: paragraphs }],
  });
}

function parseInlineRuns(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      runs.push(new TextRun({ text: text.slice(last, match.index) }));
    }
    if (match[0].startsWith("**")) {
      runs.push(new TextRun({ text: match[2], bold: true }));
    } else if (match[0].startsWith("*")) {
      runs.push(new TextRun({ text: match[3], italics: true }));
    } else {
      runs.push(new TextRun({ text: match[4], font: "Courier New" }));
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    runs.push(new TextRun({ text: text.slice(last) }));
  }

  return runs.length > 0 ? runs : [new TextRun({ text })];
}

export function DocumentPanel({
  content,
  streaming,
  mode,
  onSelectionAction,
  onContentChange,
  className,
}: DocumentPanelProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [selectionToolbar, setSelectionToolbar] = useState<SelectionToolbar | null>(null);
  const isUserScrolledUpRef = useRef(false);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  // Keep editContent in sync with incoming content when not in edit mode
  useEffect(() => {
    if (!isEditMode) {
      setEditContent(content);
    }
  }, [content, isEditMode]);

  // Cancel speech on unmount or content change
  useEffect(() => {
    return () => { window.speechSynthesis.cancel(); };
  }, []);
  useEffect(() => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  const handleSpeak = useCallback(() => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const text = stripMarkdown(content);
    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const ukVoice = voices.find(v => v.lang === "en-GB") ?? voices.find(v => v.lang.startsWith("en"));
    if (ukVoice) utterance.voice = ukVoice;
    utterance.lang = "en-GB";
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }, [isSpeaking, content]);

  // Voices may not be loaded synchronously; retry once they load
  useEffect(() => {
    window.speechSynthesis.onvoiceschanged = () => {};
  }, []);

  const handleToggleEdit = useCallback(() => {
    if (isEditMode) {
      onContentChange?.(editContent);
    }
    setIsEditMode(e => !e);
  }, [isEditMode, editContent, onContentChange]);

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditContent(e.target.value);
  }, []);

  const handleDownloadMd = useCallback(() => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "czar-document.md"; a.click();
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
  }, [content]);

  const handleDownloadDocx = useCallback(async () => {
    setShowDownloadMenu(false);
    const doc = buildDocx(content);
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "czar-document.docx"; a.click();
    URL.revokeObjectURL(url);
  }, [content]);

  // Track if user has scrolled up manually
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isUserScrolledUpRef.current = distFromBottom > 200;
  }, []);

  // Auto-scroll to bottom when streaming, unless user has scrolled up
  useEffect(() => {
    if (streaming && !isUserScrolledUpRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [content, streaming]);

  // Text selection toolbar
  const handleMouseUp = useCallback(() => {
    if (isEditMode) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setSelectionToolbar(null);
      return;
    }
    const selectedText = selection.toString().trim();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = scrollContainerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    setSelectionToolbar({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 8,
      text: selectedText,
    });
  }, [isEditMode]);

  // Dismiss toolbar when selection is cleared
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setSelectionToolbar(null);
      }
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  const handleSelectionActionClick = useCallback(
    (action: string) => {
      if (!selectionToolbar) return;
      onSelectionAction?.(action.toLowerCase(), selectionToolbar.text);
      setSelectionToolbar(null);
      window.getSelection()?.removeAllRanges();
    },
    [selectionToolbar, onSelectionAction]
  );

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Panel header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Feather className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Document
          </span>
          {mode && (
            <span className="text-xs text-muted-foreground/60 ml-1">· {mode}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {streaming && (
            <span className="text-xs text-muted-foreground/70 flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
              </span>
              Generating
            </span>
          )}
          <button
            type="button"
            onClick={handleSpeak}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title={isSpeaking ? "Stop reading" : "Listen"}
          >
            {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            {isSpeaking ? "Stop" : "Listen"}
          </button>
          <button
            type="button"
            onClick={handleToggleEdit}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title={isEditMode ? "Switch to view mode" : "Switch to edit mode"}
          >
            {isEditMode ? <Eye className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
            {isEditMode ? "View" : "Edit"}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDownloadMenu(o => !o)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <Download className="w-3 h-3" />
              Download
              <ChevronDown className="w-2.5 h-2.5" />
            </button>
            {showDownloadMenu && (
              <>
                <div className="fixed inset-0 z-[190]" onClick={() => setShowDownloadMenu(false)} />
                <div className="absolute right-0 mt-1 z-[200] bg-background border border-border rounded-lg shadow-xl overflow-hidden w-36 animate-in fade-in duration-100">
                  <button
                    type="button"
                    onClick={handleDownloadMd}
                    className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    Download .md
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadDocx}
                    className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    Download .docx
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable content area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        onMouseUp={handleMouseUp}
        className="relative flex-1 overflow-y-auto px-6 py-6"
      >
        {/* Empty state */}
        {!content && !streaming && (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center gap-4 py-16">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
              <Feather className="w-7 h-7 text-muted-foreground/40" />
            </div>
            <div className="space-y-1.5">
              <p className="text-base font-medium text-muted-foreground/60">
                Your document will appear here
              </p>
              <p className="text-sm text-muted-foreground/40 max-w-xs">
                Send a message to CZAR to start generating content
              </p>
            </div>
          </div>
        )}

        {/* Document content */}
        {(content || streaming) && (
          <div className="max-w-2xl mx-auto">
            {isEditMode ? (
              <textarea
                value={editContent}
                onChange={handleTextareaChange}
                className="w-full min-h-[60vh] bg-transparent text-sm text-foreground font-mono leading-relaxed resize-none outline-none border border-border rounded-md p-4 focus:border-primary/50 transition-colors"
                spellCheck
              />
            ) : (
              <>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents as React.ComponentProps<typeof ReactMarkdown>["components"]}
                >
                  {isEditMode ? editContent : content}
                </ReactMarkdown>

                {/* Blinking cursor while streaming */}
                {streaming && (
                  <span
                    className="inline-block w-0.5 h-4 bg-foreground/70 align-text-bottom ml-0.5"
                    style={{ animation: "czarCursor 1s step-end infinite" }}
                    aria-hidden="true"
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* Auto-scroll anchor */}
        <div ref={bottomRef} />

        {/* Floating selection toolbar */}
        {selectionToolbar && onSelectionAction && (
          <div
            className="absolute z-50 flex items-center gap-0.5 bg-foreground rounded-lg shadow-lg px-1 py-1"
            style={{
              left: selectionToolbar.x,
              top: selectionToolbar.y,
              transform: "translate(-50%, -100%)",
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {SELECTION_ACTIONS.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => handleSelectionActionClick(action)}
                className="px-2.5 py-1 text-xs font-medium text-background hover:bg-background/15 rounded-md transition-colors whitespace-nowrap"
              >
                {action}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cursor keyframe */}
      <style>{`
        @keyframes czarCursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
