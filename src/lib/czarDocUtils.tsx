import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";

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
};
