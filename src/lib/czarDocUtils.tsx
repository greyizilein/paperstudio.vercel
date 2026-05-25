import { useState } from "react";
import {
  Document, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType,
  Footer, PageNumber,
} from "docx";
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
  // Order matters: *** before **, * before lone *
  const pattern = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|~~(.+?)~~|`(.+?)`)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      runs.push(new TextRun({ text: text.slice(last, match.index) }));
    }
    if (match[0].startsWith("***")) {
      runs.push(new TextRun({ text: match[2], bold: true, italics: true }));
    } else if (match[0].startsWith("**")) {
      runs.push(new TextRun({ text: match[3], bold: true }));
    } else if (match[0].startsWith("*")) {
      runs.push(new TextRun({ text: match[4], italics: true }));
    } else if (match[0].startsWith("~~")) {
      runs.push(new TextRun({ text: match[5], strike: true }));
    } else {
      // inline code — monospace, slightly smaller, muted
      runs.push(new TextRun({ text: match[6], font: "Courier New", size: 18, color: "444444" }));
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    runs.push(new TextRun({ text: text.slice(last) }));
  }

  return runs.length > 0 ? runs : [new TextRun({ text })];
}

// ── Table helpers ─────────────────────────────────────────────────────────────

function isTableLine(line: string): boolean {
  const t = line.trim();
  return t.startsWith("|") && t.endsWith("|") && t.length > 2;
}

function isTableSeparator(line: string): boolean {
  return /^\|[-:\s|]+\|$/.test(line.trim());
}

function parseTableCells(row: string): string[] {
  return row.trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map(c => c.trim());
}

function buildMarkdownTable(rows: string[]): Table {
  const sepIdx = rows.findIndex(r => isTableSeparator(r));
  const headerRow = rows[sepIdx > 0 ? sepIdx - 1 : 0];
  const bodyRows = sepIdx >= 0 ? rows.slice(sepIdx + 1).filter(r => r.trim() && !isTableSeparator(r)) : rows.slice(1);

  const headerCells = parseTableCells(headerRow);
  const colCount = Math.max(1, headerCells.length);

  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: headerCells.map(cellText =>
        new TableCell({
          shading: { type: "clear" as any, color: "auto", fill: "1F3864" },
          children: [new Paragraph({
            children: [new TextRun({ text: cellText, bold: true, color: "FFFFFF", font: "Calibri", size: 20 })],
            spacing: { before: 80, after: 80 },
          })],
        })
      ),
    }),
    ...bodyRows.map((row, rowIdx) => {
      const cells = parseTableCells(row);
      return new TableRow({
        children: Array.from({ length: colCount }, (_, ci) => {
          const cellText = cells[ci] ?? "";
          const isAlt = rowIdx % 2 === 1;
          return new TableCell({
            ...(isAlt ? { shading: { type: "clear" as any, color: "auto", fill: "F5F7FA" } } : {}),
            children: [new Paragraph({
              children: parseInlineRuns(cellText),
              spacing: { before: 60, after: 60 },
            })],
          });
        }),
      });
    }),
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  });
}

// ── Filename derivation ────────────────────────────────────────────────────────
// Derives a human-readable .docx filename from the document content.
// Priority: first H1 → first H2 → first non-empty sentence (≤8 words).

export function docxFilename(markdown: string): string {
  const lines = stripYAMLFrontmatter(markdown).split("\n");

  // Try H1 then H2
  for (const prefix of ["# ", "## "]) {
    const line = lines.find(l => l.trimStart().startsWith(prefix));
    if (line) {
      const title = line.replace(/^#{1,2}\s+/, "").trim();
      if (title.length > 2) return sanitiseFilename(title);
    }
  }

  // Fall back to first substantive line (first 8 words)
  for (const line of lines) {
    const t = line.replace(/^#{1,6}\s+/, "").replace(/[*_`[\]()>]/g, "").trim();
    if (t.length < 4) continue;
    const words = t.split(/\s+/).slice(0, 8).join(" ");
    return sanitiseFilename(words);
  }

  return "czar-document.docx";
}

function sanitiseFilename(title: string): string {
  return (
    title
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")   // strip illegal chars
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80)
      .replace(/[. ]+$/, "") + ".docx"           // no trailing dots/spaces
  );
}

// ── Professional document builder ─────────────────────────────────────────────
// Produces Calibri 11pt body · 1-inch margins · styled headings · page footer.
// Base64 images are stripped and replaced with a figure placeholder.

function stripYAMLFrontmatter(markdown: string): string {
  if (!markdown.startsWith("---")) return markdown;
  const end = markdown.indexOf("\n---", 3);
  if (end === -1) return markdown;
  return markdown.slice(end + 4).trimStart();
}

export function buildDocx(markdown: string): Document {
  // Strip YAML frontmatter if present (Pandoc-style --- blocks)
  const withoutYAML = stripYAMLFrontmatter(markdown);
  // Strip base64-embedded images — replace with italic figure caption
  const cleaned = withoutYAML.replace(
    /!\[([^\]]*)\]\(data:[^)]+\)/g,
    (_, alt) => `\n*[Figure${alt ? `: ${alt}` : ""}]*\n`
  );

  const rawLines = cleaned.split("\n");
  const blocks: (Paragraph | Table)[] = [];

  // Detect document title: first non-empty H1 heading
  let docTitle: string | undefined;
  const firstH1Idx = rawLines.findIndex(l => /^# /.test(l.trim()) && l.trim().length > 2);
  if (firstH1Idx >= 0) {
    docTitle = rawLines[firstH1Idx].replace(/^# /, "").trim();
    rawLines[firstH1Idx] = ""; // clear from normal processing
  }

  // State-machine line parser
  let i = 0;
  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // ── Code fence ───────────────────────────────────────────────
    if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
      const fence = trimmed.slice(0, 3);
      const closingRe = fence === "```" ? /^```\s*$/ : /^~~~\s*$/;
      i++;
      const codeLines: string[] = [];
      while (i < rawLines.length && !closingRe.test(rawLines[i].trim())) {
        codeLines.push(rawLines[i]);
        i++;
      }
      if (codeLines.length > 0) {
        // Interleave text runs with line-break runs
        const codeRuns: TextRun[] = [];
        codeLines.forEach((cl, idx) => {
          codeRuns.push(new TextRun({ text: cl || " ", font: "Courier New", size: 18 }));
          if (idx < codeLines.length - 1) codeRuns.push(new TextRun({ break: 1 }));
        });
        blocks.push(new Paragraph({
          children: codeRuns,
          shading: { type: "clear" as any, color: "auto", fill: "F2F2F2" },
          spacing: { before: 120, after: 120 },
        }));
      }
      i++; // skip closing fence
      continue;
    }

    // ── Markdown table ────────────────────────────────────────────
    if (isTableLine(trimmed)) {
      const tableLines: string[] = [];
      while (i < rawLines.length && (isTableLine(rawLines[i].trim()) || isTableSeparator(rawLines[i].trim()))) {
        tableLines.push(rawLines[i]);
        i++;
      }
      if (tableLines.length >= 2) {
        blocks.push(new Paragraph({ text: "", spacing: { before: 120, after: 40 } }));
        blocks.push(buildMarkdownTable(tableLines));
        blocks.push(new Paragraph({ text: "", spacing: { before: 40, after: 120 } }));
      }
      continue;
    }

    // ── Headings ─────────────────────────────────────────────────
    if (/^### /.test(trimmed)) {
      blocks.push(new Paragraph({ text: trimmed.replace(/^### /, ""), heading: HeadingLevel.HEADING_3 }));
    } else if (/^## /.test(trimmed)) {
      blocks.push(new Paragraph({ text: trimmed.replace(/^## /, ""), heading: HeadingLevel.HEADING_2 }));
    } else if (/^# /.test(trimmed)) {
      // Secondary H1 (not the title)
      blocks.push(new Paragraph({ text: trimmed.replace(/^# /, ""), heading: HeadingLevel.HEADING_1 }));
    }
    // ── Bullet list ───────────────────────────────────────────────
    else if (/^[-*+] /.test(trimmed)) {
      blocks.push(new Paragraph({
        bullet: { level: 0 },
        children: parseInlineRuns(trimmed.replace(/^[-*+] /, "")),
        spacing: { after: 60 },
      }));
    }
    // ── Numbered list ─────────────────────────────────────────────
    else if (/^\d+\. /.test(trimmed)) {
      blocks.push(new Paragraph({
        numbering: { reference: "default-numbering", level: 0 },
        children: parseInlineRuns(trimmed.replace(/^\d+\. /, "")),
        spacing: { after: 60 },
      }));
    }
    // ── Blockquote ────────────────────────────────────────────────
    else if (/^> /.test(trimmed)) {
      blocks.push(new Paragraph({
        indent: { left: 720 },
        children: [new TextRun({ text: trimmed.replace(/^> /, ""), italics: true, color: "595959" })],
        spacing: { after: 120 },
      }));
    }
    // ── Horizontal rule ───────────────────────────────────────────
    else if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
      blocks.push(new Paragraph({
        text: "",
        border: { bottom: { color: "CCCCCC", space: 1, value: "single" as any, size: 6 } },
        spacing: { before: 160, after: 160 },
      }));
    }
    // ── Empty line ────────────────────────────────────────────────
    else if (trimmed === "") {
      blocks.push(new Paragraph({ text: "", spacing: { after: 80 } }));
    }
    // ── Regular paragraph ─────────────────────────────────────────
    else {
      blocks.push(new Paragraph({
        children: parseInlineRuns(trimmed),
        alignment: AlignmentType.LEFT,
        spacing: { after: 160 },
      }));
    }

    i++;
  }

  // Prepend title paragraph if detected
  const finalBlocks: (Paragraph | Table)[] = [];
  if (docTitle) {
    finalBlocks.push(
      new Paragraph({
        children: [new TextRun({ text: docTitle, bold: true, font: "Calibri", size: 52, color: "1F3864" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 480, after: 560 },
      }),
      // Thin rule under title
      new Paragraph({
        text: "",
        border: { bottom: { color: "1F3864", space: 1, value: "single" as any, size: 8 } },
        spacing: { before: 0, after: 320 },
      })
    );
  }
  finalBlocks.push(...blocks);

  return new Document({
    title: docTitle,
    creator: "CZAR",
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
          paragraph: { spacing: { after: 160 } },
        },
        heading1: {
          run: { font: "Calibri", size: 36, bold: true, color: "1F3864" },
          paragraph: { spacing: { before: 480, after: 160 } },
        },
        heading2: {
          run: { font: "Calibri", size: 28, bold: true, color: "1F3864" },
          paragraph: { spacing: { before: 360, after: 120 } },
        },
        heading3: {
          run: { font: "Calibri", size: 24, bold: true, color: "2E74B5" },
          paragraph: { spacing: { before: 240, after: 80 } },
        },
      },
    },
    numbering: {
      config: [{
        reference: "default-numbering",
        levels: [{ level: 0, format: "decimal" as any, text: "%1.", alignment: AlignmentType.LEFT }],
      }],
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ children: [PageNumber.CURRENT], font: "Calibri", size: 16, color: "888888" }),
                new TextRun({ text: " / ", font: "Calibri", size: 16, color: "888888" }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Calibri", size: 16, color: "888888" }),
              ],
            }),
          ],
        }),
      },
      children: finalBlocks,
    }],
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
