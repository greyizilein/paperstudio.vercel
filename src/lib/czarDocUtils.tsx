import { useState } from "react";
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { Copy, Check, X, Download, Code2, ExternalLink, ZoomIn } from "lucide-react";

export function stripMarkdown(text: string): string {
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

export function parseInlineRuns(text: string): TextRun[] {
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

export function buildDocx(markdown: string): Document {
  const lines = markdown.split("\n");
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^### /.test(trimmed)) {
      paragraphs.push(new Paragraph({ text: trimmed.replace(/^### /, ""), heading: HeadingLevel.HEADING_3 }));
    } else if (/^## /.test(trimmed)) {
      paragraphs.push(new Paragraph({ text: trimmed.replace(/^## /, ""), heading: HeadingLevel.HEADING_2 }));
    } else if (/^# /.test(trimmed)) {
      paragraphs.push(new Paragraph({ text: trimmed.replace(/^# /, ""), heading: HeadingLevel.HEADING_1 }));
    } else if (/^[-*+] /.test(trimmed)) {
      const text = trimmed.replace(/^[-*+] /, "");
      paragraphs.push(new Paragraph({ bullet: { level: 0 }, children: parseInlineRuns(text) }));
    } else if (/^\d+\. /.test(trimmed)) {
      const text = trimmed.replace(/^\d+\. /, "");
      paragraphs.push(new Paragraph({ numbering: { reference: "default-numbering", level: 0 }, children: parseInlineRuns(text) }));
    } else if (trimmed === "") {
      paragraphs.push(new Paragraph({ text: "" }));
    } else {
      paragraphs.push(new Paragraph({ children: parseInlineRuns(trimmed), alignment: AlignmentType.LEFT }));
    }
  }

  return new Document({
    numbering: {
      config: [{
        reference: "default-numbering",
        levels: [{ level: 0, format: "decimal" as any, text: "%1.", alignment: AlignmentType.LEFT }],
      }],
    },
    sections: [{ children: paragraphs }],
  });
}

// ── Code block with copy button ───────────────────────────────────────────────

function CodeBlock({ language, content }: { language?: string; content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const ext: Record<string, string> = {
      python: "py", javascript: "js", typescript: "ts", jsx: "jsx", tsx: "tsx",
      css: "css", html: "html", json: "json", yaml: "yaml", yml: "yml",
      bash: "sh", shell: "sh", sql: "sql", markdown: "md", md: "md",
    };
    const filename = `code.${ext[language || ""] || language || "txt"}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mb-4 rounded-xl overflow-hidden border border-border">
      <div className="flex items-center justify-between px-3.5 py-2 bg-secondary/80 border-b border-border">
        <span className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-wide">
          {language || "code"}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDownload}
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-0.5 rounded hover:bg-secondary transition-colors"
            title="Download"
          >
            <Download size={10} />
          </button>
          <button
            onClick={handleCopy}
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-0.5 rounded hover:bg-secondary transition-colors"
          >
            {copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
        </div>
      </div>
      <pre className="bg-[#1e1e2e] text-[#cdd6f4] p-4 overflow-x-auto text-xs font-mono leading-relaxed m-0 whitespace-pre">
        <code>{content}</code>
      </pre>
    </div>
  );
}

// ── Artifact card + modal ─────────────────────────────────────────────────────

const ARTIFACT_META: Record<string, { label: string; color: string }> = {
  html:     { label: "HTML",     color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
  svg:      { label: "SVG",      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  mermaid:  { label: "Diagram",  color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  jsx:      { label: "React",    color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300" },
  tsx:      { label: "React TS", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300" },
};

function ArtifactModal({ language, content, title, onClose }: {
  language: string;
  content: string;
  title?: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const meta = ARTIFACT_META[language] || { label: language.toUpperCase(), color: "bg-secondary text-muted-foreground" };

  const handleCopy = () => {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const ext: Record<string, string> = { html: "html", svg: "svg", mermaid: "md", jsx: "jsx", tsx: "tsx" };
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `artifact.${ext[language] || "txt"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Build srcdoc for HTML artifacts
  const htmlSrc = language === "html" ? content
    : language === "svg" ? `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff}</style></head><body>${content}</body></html>`
    : language === "mermaid" ? `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:20px;font-family:sans-serif}</style><script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script></head><body><div class="mermaid">${content}</div><script>mermaid.initialize({startOnLoad:true,theme:'default'})</script></body></html>`
    : null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-2xl w-full max-w-4xl max-h-[90dvh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
          <Code2 size={16} className="text-muted-foreground" />
          <span className="text-[13px] font-semibold text-foreground flex-1 truncate">
            {title || "Artifact"}
          </span>
          <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${meta.color}`}>
            {meta.label}
          </span>
          <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors">
            {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors">
            <Download size={11} />
            Download
          </button>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-hidden rounded-b-2xl">
          {htmlSrc ? (
            <iframe
              srcDoc={htmlSrc}
              sandbox="allow-scripts"
              className="w-full h-full border-0"
              style={{ minHeight: "60vh" }}
              title="Artifact preview"
            />
          ) : (
            <pre className="p-4 text-xs font-mono text-foreground bg-background overflow-auto h-full whitespace-pre">
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function ArtifactCard({ language, content }: { language: string; content: string }) {
  const [open, setOpen] = useState(false);
  const meta = ARTIFACT_META[language] || { label: language.toUpperCase(), color: "bg-secondary text-muted-foreground" };

  const previewLines = content.split("\n").slice(0, 3).join("\n");

  return (
    <>
      <div
        className="mb-4 border border-border rounded-xl overflow-hidden cursor-pointer group hover:border-primary/50 transition-colors"
        onClick={() => setOpen(true)}
      >
        {/* Mini preview */}
        <div className="px-3 py-2 bg-[#1e1e2e] text-[#cdd6f4]/60 font-mono text-[10px] leading-relaxed whitespace-pre overflow-hidden max-h-14 select-none">
          {previewLines}
          {content.split("\n").length > 3 && "\n…"}
        </div>
        {/* Footer */}
        <div className="flex items-center gap-2 px-3 py-2 bg-secondary/40 border-t border-border">
          <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0 ${meta.color}`}>
            {meta.label}
          </span>
          <span className="text-[11px] text-muted-foreground flex-1 truncate">
            Click to preview &amp; download
          </span>
          <ExternalLink size={11} className="text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
        </div>
      </div>

      {open && (
        <ArtifactModal
          language={language}
          content={content}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ── Document markdown components (for InlineDocMessage — no artifacts) ────────

export const markdownComponents = {
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 {...props} className="text-2xl font-bold font-sans mt-8 mb-3 text-foreground leading-tight">{children}</h1>
  ),
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 {...props} className="text-xl font-bold font-sans mt-6 mb-2.5 text-foreground leading-tight">{children}</h2>
  ),
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 {...props} className="text-lg font-semibold font-sans mt-5 mb-2 text-foreground">{children}</h3>
  ),
  h4: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h4 {...props} className="text-base font-semibold font-sans mt-4 mb-1.5 text-foreground">{children}</h4>
  ),
  p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p {...props} className="leading-relaxed mb-4 text-foreground text-sm">{children}</p>
  ),
  ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul {...props} className="list-disc list-outside pl-5 mb-4 space-y-1 text-sm text-foreground">{children}</ul>
  ),
  ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol {...props} className="list-decimal list-outside pl-5 mb-4 space-y-1 text-sm text-foreground">{children}</ol>
  ),
  li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li {...props} className="leading-relaxed">{children}</li>
  ),
  blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote {...props} className="border-l-4 border-primary/40 pl-4 italic text-muted-foreground my-4 text-sm">{children}</blockquote>
  ),
  code: ({ inline, children, ...props }: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) =>
    inline ? (
      <code {...props} className="font-mono text-xs bg-secondary text-foreground px-1.5 py-0.5 rounded">{children}</code>
    ) : (
      <code {...props} className="font-mono text-xs">{children}</code>
    ),
  pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
    <pre {...props} className="bg-secondary border border-border rounded-md p-4 overflow-x-auto mb-4 text-xs font-mono">{children}</pre>
  ),
  table: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="overflow-x-auto mb-4">
      <table {...props} className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead {...props} className="bg-secondary">{children}</thead>
  ),
  th: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th {...props} className="border border-border px-3 py-2 text-left font-semibold text-xs text-foreground">{children}</th>
  ),
  td: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td {...props} className="border border-border px-3 py-2 text-xs text-foreground">{children}</td>
  ),
  hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
    <hr {...props} className="border-border my-6" />
  ),
  strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <strong {...props} className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <em {...props} className="italic">{children}</em>
  ),
  img: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) =>
    src ? <ImageViewer src={src} alt={alt} /> : null,
};

// ── Interactive image component ───────────────────────────────────────────────

function ImageViewer({ src, alt }: { src: string; alt?: string }) {
  const [lightbox, setLightbox] = useState(false);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = src;
    a.download = alt || "image";
    a.target = "_blank";
    a.click();
  };

  return (
    <>
      <span className="inline-block mb-4 relative group cursor-zoom-in" onClick={() => setLightbox(true)}>
        <img
          src={src}
          alt={alt || ""}
          className="max-w-full rounded-xl border border-border shadow-sm"
          style={{ maxHeight: "400px", objectFit: "contain" }}
        />
        <span className="absolute inset-0 flex items-center justify-center bg-foreground/0 group-hover:bg-foreground/10 rounded-xl transition-colors">
          <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 drop-shadow transition-opacity" />
        </span>
      </span>

      {lightbox && (
        <div
          className="fixed inset-0 z-[700] flex flex-col items-center justify-center bg-foreground/80 backdrop-blur-sm p-4"
          onClick={() => setLightbox(false)}
        >
          <div className="relative max-w-5xl w-full flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
            <img
              src={src}
              alt={alt || ""}
              className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl object-contain"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-4 py-2 bg-background text-foreground text-[12px] font-medium rounded-xl border border-border hover:bg-secondary transition-colors shadow"
              >
                <Download size={13} />
                Download
              </button>
              <button
                onClick={() => setLightbox(false)}
                className="flex items-center gap-1.5 px-4 py-2 bg-background text-muted-foreground text-[12px] rounded-xl border border-border hover:text-foreground hover:bg-secondary transition-colors shadow"
              >
                <X size={13} />
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Chat markdown components (for chat bubbles — with artifacts + code copy) ──

const ARTIFACT_LANGUAGES = new Set(["html", "svg", "mermaid", "jsx", "tsx"]);

export const chatMarkdownComponents = {
  ...markdownComponents,

  img: ({ src, alt }: React.ImgHTMLAttributes<HTMLImageElement>) =>
    src ? <ImageViewer src={src} alt={alt} /> : null,

  pre: ({ children }: React.HTMLAttributes<HTMLPreElement>) => {
    const child = (Array.isArray(children) ? children[0] : children) as React.ReactElement<any>;
    const className = child?.props?.className || "";
    const match = className.match(/language-(\w+)/);
    const language = (match?.[1] || "").toLowerCase();
    const content = String(child?.props?.children || "").replace(/\n$/, "");

    if (ARTIFACT_LANGUAGES.has(language)) {
      return <ArtifactCard language={language} content={content} />;
    }
    return <CodeBlock language={language} content={content} />;
  },

  code: ({ inline, children, ...props }: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) =>
    inline ? (
      <code {...props} className="font-mono text-xs bg-secondary text-foreground px-1.5 py-0.5 rounded">{children}</code>
    ) : (
      // Block code without language falls through to pre handler
      <code {...props}>{children}</code>
    ),
};
