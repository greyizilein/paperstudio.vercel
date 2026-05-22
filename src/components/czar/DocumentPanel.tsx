import { useEffect, useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Feather, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentPanelProps {
  content: string;
  streaming: boolean;
  mode: string;
  onSelectionAction?: (action: string, selectedText: string) => void;
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

export function DocumentPanel({
  content,
  streaming,
  mode,
  onSelectionAction,
  className,
}: DocumentPanelProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [selectionToolbar, setSelectionToolbar] = useState<SelectionToolbar | null>(null);
  const isUserScrolledUpRef = useRef(false);

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
  }, []);

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

  const handleExport = useCallback(() => {
    onSelectionAction?.("export", "");
  }, [onSelectionAction]);

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
            onClick={handleExport}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Download className="w-3 h-3" />
            Download
          </button>
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
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents as React.ComponentProps<typeof ReactMarkdown>["components"]}
            >
              {content}
            </ReactMarkdown>

            {/* Blinking cursor while streaming */}
            {streaming && (
              <span
                className="inline-block w-0.5 h-4 bg-foreground/70 align-text-bottom ml-0.5"
                style={{ animation: "czarCursor 1s step-end infinite" }}
                aria-hidden="true"
              />
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
