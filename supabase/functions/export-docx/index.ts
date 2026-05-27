import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  TableRow, TableCell, Table, WidthType, BorderStyle, ShadingType,
  LevelFormat, PageBreak, Footer, Header, PageNumber, ImageRun, TableOfContents,
  SectionType, NumberFormat, FootnoteReferenceRun,
} from "npm:docx@8.5.0";
import { getCitationStyleDocx } from "../generate-chapter/citationStyles.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CHART_BLOCK_RE = /```chart\s*\n([\s\S]*?)```/g;
// Inline figure markers — TWO formats accepted, in this priority order:
//   1. Writer's actual emit: <!-- FIGURE:4.1:Title:description -->     (colon-delimited, 3 fields)
//   2. Legacy pipe format:   <!-- FIGURE: id | Figure 2.1 | Title | desc -->
// Both yield: groupNum (e.g. "4.1"), title, description. The "id" field is
// derived as `fig-{num}` to match the keys persisted by Writer.tsx.
const FIGURE_MARKER_RE = /<!--\s*FIGURE:\s*(?:([^|:]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^>]*?)|([^:>][^:]*?):([^:]+?):([^>]+?))\s*-->/g;

/** Normalise a regex match against FIGURE_MARKER_RE into a single shape. */
function normaliseFigMatch(m: RegExpMatchArray | RegExpExecArray): { id: string; num: string; title: string; description: string } {
  // Pipe variant (capture groups 1-4)
  if (m[1]) {
    return {
      id: m[1].trim(),
      num: m[2].trim(),
      title: m[3].trim(),
      description: (m[4] || "").trim(),
    };
  }
  // Colon variant (capture groups 5-7)
  const num = (m[5] || "").trim();
  return {
    id: `fig-${num}`,
    num: `Figure ${num}`,
    title: (m[6] || "").trim(),
    description: (m[7] || "").trim(),
  };
}

function chartBlockToText(json: string): string {
  try {
    const { title, data } = JSON.parse(json);
    const header = `[Figure: ${title}]`;
    const rows = (data || []).map((d: any) => `  ${d.name || d.x}: ${d.value || d.y}`).join("\n");
    return `${header}\n${rows}`;
  } catch { return ""; }
}

function chartBlockToLatex(json: string): string {
  try {
    const { title, data } = JSON.parse(json);
    let t = `\n\\begin{table}[h!]\n\\centering\n\\caption{${escapeLatex(title)}}\n\\begin{tabular}{|l|r|}\n\\hline\n\\textbf{Label} & \\textbf{Value} \\\\\n\\hline\n`;
    for (const d of (data || [])) {
      t += `${escapeLatex(String(d.name || d.x))} & ${escapeLatex(String(d.value || d.y))} \\\\\n\\hline\n`;
    }
    t += `\\end{tabular}\n\\end{table}\n`;
    return t;
  } catch { return ""; }
}

function escapeLatex(s: string): string {
  return s
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

// ── Markdown to plain text ──
function markdownToPlainText(md: string): string {
  return md
    .replace(CHART_BLOCK_RE, (_, json) => chartBlockToText(json))
    .replace(FIGURE_MARKER_RE, (...args) => {
      const m = args.slice(0, 8) as RegExpMatchArray;
      const f = normaliseFigMatch(m as any);
      return `\n[${f.num}: ${f.title}]\n`;
    })
    .replace(/^#{1,6}\s+(.+)$/gm, (_, title) => `\n${title.toUpperCase()}\n${"─".repeat(50)}`)
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "  • ")
    .replace(/^\s*\d+\.\s+/gm, (match) => `  ${match.trim()} `)
    .replace(/\n{3,}/g, "\n\n");
}

// ── Markdown to LaTeX ──
function markdownToLatex(md: string): string {
  let tex = md.replace(CHART_BLOCK_RE, (_, json) => chartBlockToLatex(json));
  tex = tex.replace(FIGURE_MARKER_RE, (...args) => {
    const m = args.slice(0, 8) as RegExpMatchArray;
    const f = normaliseFigMatch(m as any);
    return `\n\\begin{figure}[h!]\\centering\\fbox{\\parbox{0.8\\textwidth}{\\centering ${escapeLatex(f.num)}: ${escapeLatex(f.title)} \\\\ \\small ${escapeLatex(f.description)}}}\\end{figure}\n`;
  });

  tex = tex.replace(/^######\s+(.+)$/gm, (_, t) => `\\subparagraph{${escapeLatex(t)}}`);
  tex = tex.replace(/^#####\s+(.+)$/gm, (_, t) => `\\paragraph{${escapeLatex(t)}}`);
  tex = tex.replace(/^####\s+(.+)$/gm, (_, t) => `\\subsubsection{${escapeLatex(t)}}`);
  tex = tex.replace(/^###\s+(.+)$/gm, (_, t) => `\\subsection{${escapeLatex(t)}}`);
  tex = tex.replace(/^##\s+(.+)$/gm, (_, t) => `\\section{${escapeLatex(t)}}`);
  tex = tex.replace(/^#\s+(.+)$/gm, (_, t) => `\\chapter{${escapeLatex(t)}}`);

  tex = tex.replace(/\*\*(.+?)\*\*/g, (_, t) => `\\textbf{${escapeLatex(t)}}`);
  tex = tex.replace(/\*(.+?)\*/g, (_, t) => `\\textit{${escapeLatex(t)}}`);
  tex = tex.replace(/`(.+?)`/g, (_, t) => `\\texttt{${escapeLatex(t)}}`);

  tex = tex.replace(/((?:^\s*[-*]\s+.+\n?)+)/gm, (block) => {
    const items = block.split("\n").filter(l => l.trim()).map(l => escapeLatex(l.replace(/^\s*[-*]\s+/, "")));
    return `\\begin{itemize}\n${items.map(i => `  \\item ${i}`).join("\n")}\n\\end{itemize}\n`;
  });

  tex = tex.replace(/((?:^\s*\d+\.\s+.+\n?)+)/gm, (block) => {
    const items = block.split("\n").filter(l => l.trim()).map(l => escapeLatex(l.replace(/^\s*\d+\.\s+/, "")));
    return `\\begin{enumerate}\n${items.map(i => `  \\item ${i}`).join("\n")}\n\\end{enumerate}\n`;
  });

  tex = tex.replace(/(?:^|\n)((?:\|[^\n]+\|\n)+)/g, (_, tableBlock: string) => {
    const rows = tableBlock.trim().split("\n").filter((r: string) => r.trim());
    if (rows.length < 2) return tableBlock;
    const isSeparator = /^\|[\s\-:]+(\|[\s\-:]+)+\|?$/.test(rows[1]);
    if (!isSeparator) return tableBlock;
    const parseRow = (row: string) => row.split("|").slice(1, -1).map((c: string) => c.trim());
    const headerCells = parseRow(rows[0]);
    const cols = headerCells.length;
    const colSpec = "|" + Array(cols).fill("l").join("|") + "|";
    let result = `\n\\begin{table}[h!]\n\\centering\n\\begin{tabular}{${colSpec}}\n\\hline\n`;
    result += headerCells.map(c => `\\textbf{${escapeLatex(c)}}`).join(" & ") + " \\\\\n\\hline\n";
    for (const row of rows.slice(2)) {
      const cells = parseRow(row);
      result += cells.map(c => escapeLatex(c)).join(" & ") + " \\\\\n\\hline\n";
    }
    result += `\\end{tabular}\n\\end{table}\n`;
    return result;
  });

  tex = tex.replace(/\n{2,}/g, "\n\n");
  return tex;
}

function buildLatexDocument(chapters: any[], projectTitle: string): string {
  const body = chapters.map((c: any) => {
    const tex = markdownToLatex(c.content);
    return `\\chapter{${escapeLatex(c.title)}}\n\n${tex}`;
  }).join("\n\n");

  return `\\documentclass[12pt,a4paper]{report}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{times}
\\usepackage{geometry}
\\geometry{margin=2.54cm}
\\usepackage{setspace}
\\doublespacing
\\usepackage{graphicx}
\\usepackage{booktabs}
\\usepackage{hyperref}
\\usepackage{natbib}

\\title{${escapeLatex(projectTitle)}}
\\date{\\today}

\\begin{document}

\\maketitle
\\tableofcontents
\\newpage

${body}

\\bibliographystyle{apalike}

\\end{document}
`;
}

// ── Strip leading chapter title heading the model may have included ──
function stripLeadingChapterHeading(content: string): string {
  return content.replace(
    /^\s*#{1,3}\s+(?:Chapter|Ch\.?|CHAPTER)\s*\d+(?:\s*[:·\-—].*)?\s*\n+/i,
    ""
  );
}

// ── Decode a base64 data URI into bytes ──
function dataUriToBytes(uri: string): { bytes: Uint8Array; mime: string } | null {
  const m = uri.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  const mime = m[1];
  const b64 = m[2];
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { bytes, mime };
  } catch { return null; }
}

function imageTypeFromMime(mime: string): "png" | "jpg" | "gif" | "bmp" {
  if (/jpeg|jpg/i.test(mime)) return "jpg";
  if (/gif/i.test(mime)) return "gif";
  if (/bmp/i.test(mime)) return "bmp";
  return "png";
}

// ── Markdown to DOCX paragraphs (with figure embedding) ──
type FigureMap = Map<string, { figure_number: string; title: string; description: string; image_data_uri: string }>;

function markdownToDocxParagraphs(
  md: string,
  font = "Times New Roman",
  size = 24,
  figures: FigureMap = new Map(),
  styleRules?: DocxStyleRules,
  footnoteCollector?: Map<number, Paragraph[]>,
): (Paragraph | Table)[] {
  const rules = styleRules ?? getCitationStyleDocx("Harvard");
  const bodyLineSpacing = rules.lineSpacing;
  let mdClean: string;
  if (rules.usesFootnotes && footnoteCollector) {
    // Collect footnote definitions as Word paragraphs, strip them from body text
    mdClean = md.replace(/^\[\^(\d+)\]:\s*(.+)$/gm, (_full, numStr, text) => {
      const n = parseInt(numStr, 10);
      if (!footnoteCollector.has(n)) {
        footnoteCollector.set(n, [
          new Paragraph({ children: parseInline(text.trim(), font, Math.max(size - 2, 18)), spacing: { before: 0, after: 40 } }),
        ]);
      }
      return "";
    });
  } else {
    // Non-footnote styles: strip definitions and convert inline [^N] to [N] text
    mdClean = md.replace(/^\[\^\d+\]:.+$/gm, "").replace(/\[\^(\d+)\]/g, "[$1]");
  }
  // Replace chart blocks with text tables first
  const content = mdClean.replace(CHART_BLOCK_RE, (_, json) => chartBlockToText(json));
  const lines = content.split("\n");
  const paragraphs: (Paragraph | Table)[] = [];
  let i = 0;
  let inReferences = false;

  while (i < lines.length) {
    const line = lines[i];

    // Inline data-URI markdown image: ![alt](data:image/png;base64,...)
    // CZAR generates figures client-side and inlines them this way; without
    // this branch they would be silently dropped from the .docx.
    const dataUriMatch = line.match(/^\s*!\[([^\]]*)\]\((data:image\/(?:png|jpe?g|webp|gif|bmp);base64,[^)]+)\)\s*$/i);
    if (dataUriMatch) {
      const alt = dataUriMatch[1].trim();
      const decoded = dataUriToBytes(dataUriMatch[2]);
      if (decoded) {
        paragraphs.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 100 },
          children: [new ImageRun({
            type: imageTypeFromMime(decoded.mime) as any,
            data: decoded.bytes,
            transformation: { width: 480, height: 320 },
            altText: { title: alt || "Figure", description: alt || "Figure", name: alt || "Figure" },
          } as any)],
        }));
        if (alt) {
          paragraphs.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: alt, italics: true, font, size: Math.max(size - 2, 18) })],
          }));
        }
        i++; continue;
      }
    }

    // Inline figure marker
    const figMatch = [...line.matchAll(FIGURE_MARKER_RE)];
    if (figMatch.length > 0) {
      for (const fm of figMatch) {
        const f = normaliseFigMatch(fm);
        // Lookup chain: exact id → fig_{num} → fig-{num} → ilike-title
        const numOnly = f.id.replace(/^fig[-_]/, "");
        const candidates = [f.id, `fig_${numOnly}`, `fig-${numOnly}`];
        let fig = candidates.map(c => figures.get(c)).find(Boolean);
        if (!fig && f.title) {
          // Title fallback (case-insensitive). Writers and batch jobs sometimes
          // disagree on the id prefix, but the title is stable.
          const wantedTitle = f.title.toLowerCase();
          for (const v of figures.values()) {
            const t = (v.title || "").toLowerCase();
            if (t && (t === wantedTitle || t.includes(wantedTitle) || wantedTitle.includes(t))) {
              fig = v;
              break;
            }
          }
        }
        if (fig) {
          const decoded = dataUriToBytes(fig.image_data_uri);
          if (decoded) {
            paragraphs.push(new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 100 },
              children: [new ImageRun({
                type: imageTypeFromMime(decoded.mime) as any,
                data: decoded.bytes,
                transformation: { width: 480, height: 320 },
                altText: { title: fig.title || f.title || "Figure", description: fig.description || f.description || "Figure", name: fig.figure_number || f.num || "Figure" },
              } as any)],
            }));
            paragraphs.push(new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
              children: [
                new TextRun({ text: `${fig.figure_number || f.num}: `, bold: true, font, size: Math.max(size - 2, 18) }),
                new TextRun({ text: fig.title || f.title || fig.description, italics: true, font, size: Math.max(size - 2, 18) }),
              ],
            }));
            continue;
          }
        }
        // Fallback placeholder
        paragraphs.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 120 },
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" }, bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" } },
          children: [new TextRun({ text: `[${f.num}: ${f.title}]`, italics: true, font, size: Math.max(size - 2, 18), color: "666666" })],
        }));
      }
      i++; continue;
    }

    // Headings
    const h1 = line.match(/^#\s+(.+)$/);
    if (h1) {
      paragraphs.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: parseInline(h1[1], font, Math.round(size * 1.33)),
        spacing: { before: 240, after: 120 },
      }));
      i++; continue;
    }
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      inReferences = /^(references?|reference list|bibliography)$/i.test(h2[1].trim());
      paragraphs.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: parseInline(h2[1], font, Math.round(size * 1.17)),
        spacing: { before: 200, after: 100 },
      }));
      i++; continue;
    }
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      paragraphs.push(new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: parseInline(h3[1], font, Math.round(size * 1.08)),
        spacing: { before: 160, after: 80 },
      }));
      i++; continue;
    }
    const h4 = line.match(/^####\s+(.+)$/);
    if (h4) {
      paragraphs.push(new Paragraph({
        heading: HeadingLevel.HEADING_4,
        children: parseInline(h4[1], font, size),
        spacing: { before: 120, after: 60 },
      }));
      i++; continue;
    }

    // Table detection
    if (line.startsWith("|") && i + 1 < lines.length && /^\|[\s\-:]+/.test(lines[i + 1])) {
      const tableLines: string[] = [line];
      let j = i + 1;
      while (j < lines.length && lines[j].startsWith("|")) {
        tableLines.push(lines[j]);
        j++;
      }
      const table = parseMarkdownTable(tableLines, font, size);
      if (table) paragraphs.push(table);
      i = j; continue;
    }

    // Bullet list
    const bulletMatch = line.match(/^\s*[-*]\s+(.+)$/);
    if (bulletMatch) {
      paragraphs.push(new Paragraph({
        children: parseInline(bulletMatch[1], font, size),
        bullet: { level: 0 },
        spacing: { before: 0, after: 80, line: 480 },
      }));
      i++; continue;
    }

    // Numbered list
    const numMatch = line.match(/^\s*\d+\.\s+(.+)$/);
    if (numMatch) {
      paragraphs.push(new Paragraph({
        children: parseInline(numMatch[1], font, size),
        numbering: { reference: "default-numbering", level: 0 },
        spacing: { before: 0, after: 80, line: 480 },
      }));
      i++; continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      paragraphs.push(new Paragraph({
        children: [],
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" } },
        spacing: { before: 120, after: 120 },
      }));
      i++; continue;
    }

    // Skip polish-pass marker comments
    if (/^<!--\s*POLISH:/i.test(line.trim())) { i++; continue; }

    // Empty line
    if (!line.trim()) { i++; continue; }

    // Block quote: lines starting with ">"
    const blockMatch = line.match(/^>\s*(.+)$/);
    if (blockMatch) {
      paragraphs.push(new Paragraph({
        children: parseInlineItalic(blockMatch[1], font, size),
        spacing: { before: 120, after: 120, line: bodyLineSpacing },
        indent: { left: rules.blockQuoteIndentTwips, right: rules.blockQuoteIndentTwips },
        alignment: AlignmentType.JUSTIFIED,
      }));
      i++; continue;
    }

    const lineChildren = rules.usesFootnotes && footnoteCollector
      ? parseInlineWithFnRefs(line, font, size) as any[]
      : parseInline(line, font, size);
    if (inReferences) {
      paragraphs.push(new Paragraph({
        children: lineChildren,
        spacing: { before: 0, after: 120, line: bodyLineSpacing },
        indent: { left: 720, hanging: 720 },
        alignment: AlignmentType.JUSTIFIED,
      }));
    } else {
      paragraphs.push(new Paragraph({
        children: lineChildren,
        spacing: { before: 0, after: 120, line: bodyLineSpacing },
        alignment: AlignmentType.JUSTIFIED,
      }));
    }
    i++;
  }

  return paragraphs;
}

function parseInline(text: string, font = "Times New Roman", size = 24): TextRun[] {
  const runs: TextRun[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      runs.push(new TextRun({ text: text.slice(lastIdx, match.index), font, size }));
    }
    if (match[2]) {
      runs.push(new TextRun({ text: match[2], bold: true, font, size }));
    } else if (match[3]) {
      runs.push(new TextRun({ text: match[3], italics: true, font, size }));
    } else if (match[4]) {
      runs.push(new TextRun({ text: match[4], font: "Courier New", size: Math.max(size - 2, 18) }));
    }
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) {
    runs.push(new TextRun({ text: text.slice(lastIdx), font, size }));
  }
  if (runs.length === 0) {
    runs.push(new TextRun({ text: text, font, size }));
  }
  return runs;
}

function parseInlineItalic(text: string, font = "Times New Roman", size = 24): TextRun[] {
  const runs: TextRun[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      runs.push(new TextRun({ text: text.slice(lastIdx, match.index), font, size, italics: true }));
    }
    if (match[2]) {
      runs.push(new TextRun({ text: match[2], bold: true, italics: true, font, size }));
    } else if (match[3]) {
      runs.push(new TextRun({ text: match[3], italics: true, font, size }));
    } else if (match[4]) {
      runs.push(new TextRun({ text: match[4], font: "Courier New", size: Math.max(size - 2, 18), italics: true }));
    }
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) {
    runs.push(new TextRun({ text: text.slice(lastIdx), font, size, italics: true }));
  }
  if (runs.length === 0) {
    runs.push(new TextRun({ text, font, size, italics: true }));
  }
  return runs;
}

// Like parseInline, but converts [^N] markdown footnote markers to Word FootnoteReferenceRun.
// Used when rendering body text for footnote-based citation styles (OSCOLA, Chicago N-B, etc.)
function parseInlineWithFnRefs(text: string, font: string, size: number): (TextRun | FootnoteReferenceRun)[] {
  // Split on footnote markers: "text [^1] more [^2] end" → ["text ", "[^1]", "1", " more ", "[^2]", "2", " end"]
  const parts = text.split(/(\[\^(\d+)\])/);
  const runs: (TextRun | FootnoteReferenceRun)[] = [];
  for (let i = 0; i < parts.length; i++) {
    const mod = i % 3;
    if (mod === 0) {
      if (parts[i]) runs.push(...parseInline(parts[i], font, size));
    } else if (mod === 2) {
      runs.push(new FootnoteReferenceRun(parseInt(parts[i], 10)) as unknown as FootnoteReferenceRun);
    }
    // mod === 1 is the full [^N] match — skip
  }
  return runs.length > 0 ? runs : parseInline(text, font, size);
}

function parseMarkdownTable(tableLines: string[], font = "Times New Roman", size = 24): Table | null {
  if (tableLines.length < 2) return null;
  const isSep = /^\|[\s\-:]+(\|[\s\-:]+)+\|?$/.test(tableLines[1]);
  if (!isSep) return null;

  const parseRow = (row: string) => row.split("|").slice(1, -1).map(c => c.trim());
  const headerCells = parseRow(tableLines[0]);
  const cols = headerCells.length;
  const colWidth = Math.floor(9360 / cols);
  const tableSize = Math.max(size - 2, 18);

  const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
  const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

  const headerRow = new TableRow({
    children: headerCells.map(c => new TableCell({
      borders: cellBorders,
      width: { size: colWidth, type: WidthType.DXA },
      shading: { fill: "E8E8E8", type: ShadingType.CLEAR },
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: [new Paragraph({ children: [new TextRun({ text: c, bold: true, font, size: tableSize })] })],
    })),
  });

  const dataRows = tableLines.slice(2).map(row => {
    const cells = parseRow(row);
    return new TableRow({
      children: Array.from({ length: cols }, (_, idx) => new TableCell({
        borders: cellBorders,
        width: { size: colWidth, type: WidthType.DXA },
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
        children: [new Paragraph({ children: [new TextRun({ text: cells[idx] || "", font, size: tableSize })] })],
      })),
    });
  });

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: Array(cols).fill(colWidth),
    rows: [headerRow, ...dataRows],
  });
}

// ── Reference extraction helpers ──
function extractChapterRefs(content: string): { body: string; refs: string[] } {
  const refMatch = content.search(/^#{1,3}\s+(references?|reference list|bibliography)/im);
  if (refMatch === -1) return { body: content, refs: [] };
  const body = content.slice(0, refMatch).trimEnd();
  const refsSection = content.slice(refMatch);
  const refs = refsSection
    .split("\n")
    .slice(1)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith("#"));
  return { body, refs };
}

function consolidateReferences(allRefs: string[][]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  const fingerprint = (ref: string) => {
    const lc = ref.toLowerCase().replace(/\s+/g, " ").trim();
    const yearMatch = lc.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? yearMatch[0] : "";
    const surname = (lc.match(/^[a-z\u00C0-\u017F'-]+/) || [""])[0];
    const titleStart = lc.split(year).slice(1).join(year).split(" ").slice(0, 5).join(" ");
    return `${surname}|${year}|${titleStart}`;
  };
  for (const refs of allRefs) {
    for (const ref of refs) {
      const key = fingerprint(ref);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(ref);
      }
    }
  }
  return unique.sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
}

// ── Citation extraction & reference enrichment ──
//
// Some chapters cite sources without re-listing them in their own References
// section (e.g. Ch 4 / Ch 5 reuse Ch 1/2 sources by policy; redrafts may drop
// the trailing list). The final consolidated bibliography must still contain a
// FULL reference entry for every author cited in the body — never just a
// surname-and-date orphan. We extract all in-text citations, match them
// against the pooled chapter references, and synthesize a placeholder full
// entry for any that lack a match so nothing is missing on download.

interface CitationKey { surname: string; year: string; etAl: boolean; coAuthor?: string; raw: string; }

/** Pull in-text citations from raw body markdown. Handles parenthetical and
 *  narrative APA/Harvard styles, including et al. and two-author forms. */
function extractCitationsFromBody(body: string): CitationKey[] {
  if (!body) return [];
  const out: CitationKey[] = [];
  const seen = new Set<string>();
  const push = (surname: string, year: string, etAl: boolean, coAuthor: string | undefined, raw: string) => {
    const s = surname.trim();
    if (!s || s.length < 2) return;
    // Filter common false positives where a capitalized word precedes a date
    // (months, demonyms, generic nouns). Heuristic: require alphabetic surname
    // ≥2 chars and a 4-digit year between 1900-2099.
    if (!/^[A-Z][\p{L}'’\-]+$/u.test(s)) return;
    if (!/^(19|20)\d{2}[a-z]?$/.test(year)) return;
    const key = `${s.toLowerCase()}|${year.replace(/[a-z]$/i, "")}${etAl ? "|etal" : ""}${coAuthor ? "|" + coAuthor.toLowerCase() : ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ surname: s, year, etAl, coAuthor, raw });
  };

  // Strip code/maths blocks to avoid garbage matches.
  const stripped = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ");

  // Parenthetical: (Smith, 2024)  (Smith & Jones, 2024)  (Smith and Jones, 2024)
  // (Smith et al., 2024)  (Smith, 2024a)  ; multiples separated by ;
  const paren = /\(([^()]{2,200})\)/g;
  let m: RegExpExecArray | null;
  while ((m = paren.exec(stripped)) !== null) {
    const inside = m[1];
    // Split on ; or | to handle multiple cites in one parenthesis
    for (const chunk of inside.split(/\s*;\s*/)) {
      // forms: Surname, YYYY  | Surname et al., YYYY  | Surname & Surname, YYYY  | Surname and Surname, YYYY
      const a = chunk.match(/^([A-Z][\p{L}'’\-]+)\s+et\s+al\.?,?\s*((?:19|20)\d{2}[a-z]?)/u);
      if (a) { push(a[1], a[2], true, undefined, m[0]); continue; }
      const b = chunk.match(/^([A-Z][\p{L}'’\-]+)\s*(?:&|and)\s*([A-Z][\p{L}'’\-]+),?\s*((?:19|20)\d{2}[a-z]?)/u);
      if (b) { push(b[1], b[3], false, b[2], m[0]); continue; }
      const c = chunk.match(/^([A-Z][\p{L}'’\-]+),?\s*((?:19|20)\d{2}[a-z]?)/u);
      if (c) { push(c[1], c[2], false, undefined, m[0]); continue; }
    }
  }

  // Narrative: Smith (2024)  | Smith et al. (2024)  | Smith and Jones (2024)  | Smith & Jones (2024)
  const narrEtAl = /\b([A-Z][\p{L}'’\-]+)\s+et\s+al\.?\s*\(((?:19|20)\d{2}[a-z]?)\)/gu;
  while ((m = narrEtAl.exec(stripped)) !== null) push(m[1], m[2], true, undefined, m[0]);

  const narrTwo = /\b([A-Z][\p{L}'’\-]+)\s+(?:&|and)\s+([A-Z][\p{L}'’\-]+)\s*\(((?:19|20)\d{2}[a-z]?)\)/gu;
  while ((m = narrTwo.exec(stripped)) !== null) push(m[1], m[3], false, m[2], m[0]);

  const narrSingle = /\b([A-Z][\p{L}'’\-]+)\s*\(((?:19|20)\d{2}[a-z]?)\)/gu;
  while ((m = narrSingle.exec(stripped)) !== null) push(m[1], m[2], false, undefined, m[0]);

  return out;
}

/** Does the master reference pool contain a full entry for this citation? */
function poolHasFullRefFor(pool: string[], cite: CitationKey): boolean {
  const yearBare = cite.year.replace(/[a-z]$/i, "");
  const surnameLc = cite.surname.toLowerCase();
  const coLc = cite.coAuthor?.toLowerCase();
  for (const ref of pool) {
    const lc = ref.toLowerCase();
    if (!lc.includes(yearBare)) continue;
    // Reference must START with the surname (Harvard / APA list ordering).
    if (!new RegExp(`^\\s*${surnameLc.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\b`, "i").test(lc)) continue;
    if (cite.etAl) {
      // Multi-author entry: surname, initial., othername et al, OR multiple commas before year.
      // Heuristic: at least one extra comma between surname and year.
      const beforeYear = lc.split(yearBare)[0];
      if ((beforeYear.match(/,/g) || []).length >= 2) return true;
    } else if (coLc) {
      if (lc.includes(coLc)) return true;
    } else {
      return true;
    }
  }
  return false;
}

/** Synthesize a minimal full Harvard-style reference entry so a cite is never
 *  orphaned. Marked with an italic note so the user knows to verify it. */
function synthesizePlaceholderRef(cite: CitationKey): string {
  const authors = cite.etAl
    ? `${cite.surname}, A. et al.`
    : cite.coAuthor
      ? `${cite.surname}, A. and ${cite.coAuthor}, B.`
      : `${cite.surname}, A.`;
  return `${authors} (${cite.year}) *Cited work — full bibliographic details to be confirmed.* [Reference reconstructed from in-text citation.]`;
}

/** Ensure every in-text citation across all chapter bodies has a matching full
 *  reference entry. Returns the enriched, alphabetically sorted reference
 *  list. */
function enrichReferencesWithCitations(consolidated: string[], chapterBodies: string[]): string[] {
  const allCites: CitationKey[] = [];
  const seen = new Set<string>();
  for (const body of chapterBodies) {
    for (const c of extractCitationsFromBody(body)) {
      const k = `${c.surname.toLowerCase()}|${c.year.replace(/[a-z]$/i, "")}|${c.etAl ? "etal" : c.coAuthor?.toLowerCase() || ""}`;
      if (seen.has(k)) continue;
      seen.add(k);
      allCites.push(c);
    }
  }
  const additions: string[] = [];
  for (const cite of allCites) {
    if (!poolHasFullRefFor(consolidated, cite)) {
      additions.push(synthesizePlaceholderRef(cite));
    }
  }
  if (additions.length === 0) return consolidated;
  const merged = [...consolidated, ...additions];
  return merged.sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
}

function isAbstractChapter(ch: any): boolean {
  const title = (ch?.title || "").toString();
  return (
    (ch?.chapter_type && ch.chapter_type.toString().toLowerCase() === "abstract") ||
    title.toLowerCase().replace(/[^a-z]/g, "") === "abstract"
  );
}

function isAppendixChapter(ch: any): boolean {
  const title = (ch?.title || "").toString();
  return (
    (ch?.chapter_type && ch.chapter_type.toString().toLowerCase().startsWith("appendix")) ||
    /^appendix/i.test(title.trim())
  );
}

// ── Title page (no page number shown) ──
function buildTitlePage(projectTitle: string, submissionDetails: any | null, font: string, size: number): Paragraph[] {
  const sd = submissionDetails || {};
  const paras: Paragraph[] = [];

  paras.push(new Paragraph({ spacing: { before: 2000 }, children: [] }));
  paras.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 480 },
    children: [new TextRun({ text: projectTitle, bold: true, font, size: Math.round(size * 2) })],
  }));
  paras.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 480 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" } },
    children: [],
  }));

  const detail = (label: string, value: string) => {
    if (!value) return null;
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 80 },
      children: [
        new TextRun({ text: label ? `${label}: ` : "", font, size, color: "666666" }),
        new TextRun({ text: value, font, size, bold: !!label }),
      ],
    });
  };

  const items = [
    detail("", sd.fullName || ""),
    detail("Student ID", sd.studentId || ""),
    detail("Institution", sd.institution || ""),
    sd.moduleCode && sd.moduleName
      ? new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 80, after: 80 },
          children: [new TextRun({ text: `${sd.moduleCode} — ${sd.moduleName}`, font, size })],
        })
      : (sd.moduleName
          ? detail("Module", sd.moduleName)
          : (sd.moduleCode ? detail("Module Code", sd.moduleCode) : null)),
    detail("Academic Year", sd.academicYear || ""),
    detail("Supervisor", sd.supervisor || ""),
    detail("Company / Organisation", sd.company || ""),
  ];
  for (const p of items) if (p) paras.push(p);

  const dateStr = sd.submissionDate
    ? new Date(sd.submissionDate).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });

  paras.push(new Paragraph({ spacing: { before: 480 }, children: [] }));
  paras.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: dateStr, font, size, color: "666666" })],
  }));

  return paras;
}

// ── Generic preliminary page (single heading + body block) ──
function buildPrelimPage(heading: string, bodyText: string, font: string, size: number, opts: { centered?: boolean } = {}): Paragraph[] {
  const paras: Paragraph[] = [];
  paras.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 360 },
    children: [new TextRun({ text: heading, bold: true, font, size: Math.round(size * 1.33) })],
  }));
  const blocks = bodyText.split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
  for (const block of blocks) {
    paras.push(new Paragraph({
      alignment: opts.centered ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
      spacing: { before: 0, after: 120, line: 480 },
      children: [new TextRun({ text: block, font, size })],
    }));
  }
  return paras;
}

// ── Bulleted prelim page for term-definition lists (Glossary / Abbreviations) ──
// Each line becomes a bullet: **Term** — definition.
// Accepts these line shapes: "Term — definition", "Term - definition",
// "Term: definition", "Term\tdefinition", or just plain "Term".
function buildBulletPrelimPage(heading: string, bodyText: string, font: string, size: number): Paragraph[] {
  const paras: Paragraph[] = [];
  paras.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 360 },
    children: [new TextRun({ text: heading, bold: true, font, size: Math.round(size * 1.33) })],
  }));
  const lines = bodyText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const splitRe = /\s*(?:[—–-]|:|\t)\s+/;
  for (const line of lines) {
    // Strip common bullet markers users may have typed.
    const clean = line.replace(/^[-*•·]\s+/, "");
    const m = clean.split(splitRe);
    const term = (m[0] || "").trim();
    const def = m.length > 1 ? clean.slice(term.length).replace(splitRe, "").trim() : "";
    const children: TextRun[] = [];
    if (term) children.push(new TextRun({ text: term, bold: true, font, size }));
    if (def) {
      children.push(new TextRun({ text: " — ", font, size }));
      children.push(new TextRun({ text: def, font, size }));
    }
    paras.push(new Paragraph({
      bullet: { level: 0 },
      spacing: { before: 0, after: 80, line: 360 },
      children,
    }));
  }
  return paras;
}

// ── Declaration with auto-generated wording ──
function buildDeclaration(fullName: string, projectTitle: string, dateStr: string, font: string, size: number, documentType = "dissertation"): Paragraph[] {
  // "document" reads awkwardly inline ("this document, entitled…") so swap for "work".
  const dt = (documentType || "dissertation").trim().toLowerCase();
  const noun = dt === "document" || dt === "" ? "work" : dt;
  const text =
    `I hereby declare that this ${noun}, entitled "${projectTitle}", is the result of my own original work and has not been submitted, in whole or in part, for any other degree or qualification at this or any other institution.\n\n` +
    `All sources of information consulted have been duly acknowledged through citations and a complete reference list. Where the work of others has been drawn upon, this is clearly indicated in accordance with standard academic practice.\n\n` +
    `I accept full responsibility for the content of this work, including any errors, omissions, or matters of interpretation.`;
  const paras = buildPrelimPage("Declaration", text, font, size);
  paras.push(new Paragraph({ spacing: { before: 600 }, children: [] }));
  paras.push(new Paragraph({
    spacing: { before: 120, after: 60 },
    children: [new TextRun({ text: `Signed: ${fullName || "________________________"}`, font, size })],
  }));
  paras.push(new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text: `Date: ${dateStr}`, font, size })],
  }));
  return paras;
}

// ── Scan all chapters for figure markers and table captions ──
function buildListOfFigures(chapters: any[], font: string, size: number): Paragraph[] | null {
  const figures: { num: string; title: string }[] = [];
  for (const ch of chapters) {
    const content = ch._bodyContent || ch.content || "";
    const matches = [...content.matchAll(FIGURE_MARKER_RE)];
    for (const m of matches) {
      // FIGURE_MARKER_RE has TWO alternatives:
      //   pipe-form: groups 1-4   (1=id, 2=num, 3=title, 4=desc)
      //   colon-form: groups 5-7  (5=num, 6=title, 7=desc)
      // Whichever alt didn't match leaves its groups undefined, so guard
      // both and fall back to "" before .trim() — otherwise the export
      // crashes with "Cannot read properties of undefined (reading 'trim')".
      const num = (m[2] ?? m[5] ?? "").toString().trim();
      const title = (m[3] ?? m[6] ?? "").toString().trim();
      if (!num && !title) continue;
      figures.push({ num: num || "Figure", title: title || "Untitled figure" });
    }
  }
  if (figures.length === 0) return null;
  const paras: Paragraph[] = [];
  paras.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 240 },
    children: [new TextRun({ text: "List of Figures", bold: true, font, size: Math.round(size * 1.33) })],
  }));
  for (const f of figures) {
    paras.push(new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({ text: `${f.num}  `, bold: true, font, size }),
        new TextRun({ text: f.title, font, size }),
      ],
    }));
  }
  return paras;
}

function buildListOfTables(chapters: any[], font: string, size: number): Paragraph[] | null {
  const tables: { num: string; title: string }[] = [];
  const tableCaptionRe = /\*\*(Table\s+\d+(?:\.\d+)?)\s*[:\-—]\s*([^*]+?)\*\*/gi;
  for (const ch of chapters) {
    const content = ch._bodyContent || ch.content || "";
    const matches = [...content.matchAll(tableCaptionRe)];
    for (const m of matches) {
      const num = (m[1] ?? "").toString().trim();
      const title = (m[2] ?? "").toString().trim();
      if (!num && !title) continue;
      tables.push({ num: num || "Table", title: title || "Untitled table" });
    }
  }
  if (tables.length === 0) return null;
  const paras: Paragraph[] = [];
  paras.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 240 },
    children: [new TextRun({ text: "List of Tables", bold: true, font, size: Math.round(size * 1.33) })],
  }));
  for (const t of tables) {
    paras.push(new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [
        new TextRun({ text: `${t.num}  `, bold: true, font, size }),
        new TextRun({ text: t.title, font, size }),
      ],
    }));
  }
  return paras;
}

interface BuildDocxOpts {
  isFinalExport: boolean;
  /** When true, render as a flat single document (no page breaks per section,
   *  no title page / declaration / TOC, no synthesized References heading).
   *  Used by CZAR essays/reports/letters. */
  singleDocument?: boolean;
  /** When true (CZAR only), prepend a proper Word title page using buildTitlePage(). */
  czarCoverPage?: boolean;
  /** Author name shown on the CZAR cover page. */
  authorName?: string;
  submissionDetails: any | null;
  fontFamily: string;
  fontSize: number;
  figuresByChapter: Map<string, FigureMap>;
  citationStyle?: string;
}

/** Detect whether the body already includes its own References / Bibliography heading. */
function hasOwnReferencesHeading(content: string): boolean {
  return /^\s*#{1,3}\s+(references?|reference list|bibliography)\s*$/im.test(content || "");
}

async function buildDocx(
  chapters: any[],
  projectTitle: string,
  opts: BuildDocxOpts,
): Promise<Uint8Array> {
  const { isFinalExport, singleDocument, czarCoverPage, authorName, submissionDetails, fontFamily: font, fontSize: size, figuresByChapter, citationStyle } = opts;
  const sd = submissionDetails || {};
  const styleRules = getCitationStyleDocx(citationStyle || sd.citationStyle || "Harvard");
  // Shared collector — populated by all markdownToDocxParagraphs calls, then passed to packDoc
  const footnoteCollector: Map<number, Paragraph[]> = new Map();

  // Pre-strip any leading "# Chapter N" heading the model emitted
  const cleanChapters = chapters.map(ch => ({ ...ch, content: stripLeadingChapterHeading(ch.content || "") }));

  // ─── Single-document mode (CZAR essays/reports/letters) ───
  // Flat layout: optional title at top, then body inline. NO page breaks
  // between ## sections, NO synthesized References heading, NO TOC.
  if (singleDocument) {
    const joined = cleanChapters.map(ch => ch.content || "").join("\n\n");
    // Merge all figures into one map (single doc has at most one chapter id anyway)
    const mergedFigs: FigureMap = new Map();
    for (const m of figuresByChapter.values()) {
      for (const [k, v] of m.entries()) mergedFigs.set(k, v);
    }
    const bodyChildren: (Paragraph | Table)[] = markdownToDocxParagraphs(joined, font, size, mergedFigs, styleRules, footnoteCollector);

    if (czarCoverPage) {
      // Proper Word title page (centered, with page break) followed by the body
      // starting on page 1 with a footer page number.
      const titlePageParas = buildTitlePage(
        projectTitle,
        { fullName: authorName || "" },
        font,
        size,
      );
      return await packDoc([
        { children: titlePageParas, footerCenter: false, hideFooter: true, sectionType: SectionType.NEXT_PAGE },
        { children: bodyChildren, footerCenter: true, pageNumberFormat: NumberFormat.DECIMAL, restartPageNumber: 1, sectionType: SectionType.NEXT_PAGE },
      ], font, size, styleRules, footnoteCollector);
    }

    // No cover page: flat single section with optional inline title heading.
    const sectionChildren: (Paragraph | Table)[] = [];
    const startsWithH1 = /^\s*#\s+/m.test(joined.split("\n").slice(0, 3).join("\n"));
    if (!startsWithH1 && projectTitle && projectTitle.trim()) {
      sectionChildren.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: projectTitle, bold: true, font, size: Math.round(size * 1.5) })],
        spacing: { before: 0, after: 360 },
      }));
    }
    sectionChildren.push(...bodyChildren);
    return await packDoc([{ children: sectionChildren, footerCenter: true }], font, size, styleRules, footnoteCollector);
  }

  // ─── Standard (non-final) export: single section, simple footer ───
  if (!isFinalExport) {
    const sectionChildren: (Paragraph | Table)[] = [];
    const nonFinalRefs: string[][] = [];
    for (let idx = 0; idx < cleanChapters.length; idx++) {
      const ch = cleanChapters[idx];
      const { body, refs } = extractChapterRefs(ch.content || "");
      if (refs.length > 0) nonFinalRefs.push(refs);
      if (idx > 0) sectionChildren.push(new Paragraph({ children: [new PageBreak()] }));
      sectionChildren.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: ch.title, bold: true, font, size: Math.round(size * 1.33) })],
        spacing: { before: 240, after: 240 },
      }));
      const figs = figuresByChapter.get(ch.id) || new Map();
      sectionChildren.push(...markdownToDocxParagraphs(body, font, size, figs, styleRules, footnoteCollector));
    }
    // Append a consolidated reference list at the end ONLY if the body
    // doesn't already contain its own References / Bibliography section.
    const bodyHasRefs = cleanChapters.some(ch => hasOwnReferencesHeading(ch.content || ""));
    // Pull every chapter's body (without its tail refs section) so we can scan
    // for in-text citations and ensure every cite has a full reference entry.
    const nonFinalBodies = cleanChapters.map(ch => extractChapterRefs(ch.content || "").body);
    const nonFinalConsolidated = enrichReferencesWithCitations(consolidateReferences(nonFinalRefs), nonFinalBodies);
    if (nonFinalConsolidated.length > 0 && !bodyHasRefs) {
      sectionChildren.push(new Paragraph({ children: [new PageBreak()] }));
      sectionChildren.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: "References", bold: true, font, size: Math.round(size * 1.33) })],
        spacing: { before: 240, after: 240 },
      }));
      for (const ref of nonFinalConsolidated) {
        sectionChildren.push(new Paragraph({
          children: parseInline(ref, font, size),
          spacing: { before: 0, after: 120, line: 480 },
          indent: { left: 720, hanging: 720 },
          alignment: AlignmentType.JUSTIFIED,
        }));
      }
    }
    return await packDoc([{ children: sectionChildren, footerCenter: true }], font, size, styleRules, footnoteCollector);
  }

  // ─── FINAL EXPORT — multi-section pipeline ───
  const abstracts = cleanChapters.filter(isAbstractChapter);
  const appendices = cleanChapters.filter(isAppendixChapter);
  const mainChapters = cleanChapters.filter(ch => !isAbstractChapter(ch) && !isAppendixChapter(ch));

  // Extract & consolidate references
  const allRefs: string[][] = [];
  const processedChapters = [...abstracts, ...mainChapters, ...appendices].map(ch => {
    const { body, refs } = extractChapterRefs(ch.content || "");
    if (refs.length > 0) allRefs.push(refs);
    return { ...ch, _bodyContent: body };
  });
  const consolidatedRefs = enrichReferencesWithCitations(
    consolidateReferences(allRefs),
    processedChapters.map(ch => ch._bodyContent || ""),
  );

  const dateStr = sd.submissionDate
    ? new Date(sd.submissionDate).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });

  // ── Section 1: Title page (no number visible, but counts as i) ──
  const titleSection = buildTitlePage(projectTitle, submissionDetails, font, size);

  // ── Section 2: Preliminary pages with lowercase Roman numerals ──
  const prelim: (Paragraph | Table)[] = [];

  // Declaration (always) — document type comes from submissionDetails
  const documentType = (sd.documentType || "dissertation").toLowerCase();
  prelim.push(...buildDeclaration(sd.fullName || "", projectTitle, dateStr, font, size, documentType));
  prelim.push(new Paragraph({ children: [new PageBreak()] }));

  // Preface and Acknowledgements (optional)
  if ((sd.acknowledgements || "").trim()) {
    prelim.push(...buildPrelimPage("Preface and Acknowledgements", sd.acknowledgements, font, size));
    prelim.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // Dedication (optional, centered)
  if ((sd.dedication || "").trim()) {
    prelim.push(...buildPrelimPage("Dedication", sd.dedication, font, size, { centered: true }));
    prelim.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // Abstract chapters
  for (const ch of processedChapters.filter(c => isAbstractChapter(c))) {
    prelim.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: ch.title, bold: true, font, size: Math.round(size * 1.33) })],
      spacing: { before: 240, after: 240 },
    }));
    const figs = figuresByChapter.get(ch.id) || new Map();
    prelim.push(...markdownToDocxParagraphs(ch._bodyContent, font, size, figs, styleRules, footnoteCollector));
    prelim.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // Abbreviations (optional) — bullet list of **Term** — definition
  if ((sd.abbreviations || "").trim()) {
    prelim.push(...buildBulletPrelimPage("List of Abbreviations", sd.abbreviations, font, size));
    prelim.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // Glossary (optional) — bullet list of **Term** — definition
  if ((sd.glossary || "").trim()) {
    prelim.push(...buildBulletPrelimPage("Glossary", sd.glossary, font, size));
    prelim.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // Table of Contents — real Word field, auto-paginates on open
  prelim.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 240 },
    children: [new TextRun({ text: "Table of Contents", bold: true, font, size: Math.round(size * 1.33) })],
  }));
  prelim.push(new TableOfContents("Table of Contents", {
    hyperlink: true,
    headingStyleRange: "1-3",
  }) as any);
  prelim.push(new Paragraph({ children: [new PageBreak()] }));

  // List of Figures
  const lof = buildListOfFigures(processedChapters, font, size);
  if (lof) {
    prelim.push(...lof);
    prelim.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // List of Tables
  const lot = buildListOfTables(processedChapters, font, size);
  if (lot) {
    prelim.push(...lot);
    prelim.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // ── Section 3: Main body (Arabic numerals, restart at 1) ──
  const main: (Paragraph | Table)[] = [];
  for (const ch of processedChapters.filter(c => !isAbstractChapter(c) && !isAppendixChapter(c))) {
    main.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: ch.title, bold: true, font, size: Math.round(size * 1.33) })],
      spacing: { before: 240, after: 240 },
    }));
    const figs = figuresByChapter.get(ch.id) || new Map();
    main.push(...markdownToDocxParagraphs(ch._bodyContent, font, size, figs, styleRules, footnoteCollector));
    main.push(new Paragraph({ children: [new PageBreak()] }));
  }

  // References — skip entirely if any chapter already has its own References /
  // Bibliography heading (avoids duplicate headings + the empty "See in-text
  // citations…" stub on a final orphaned page).
  const finalBodyHasRefs = processedChapters.some(c => hasOwnReferencesHeading(c._bodyContent || ""));
  if (!finalBodyHasRefs) {
    main.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "References", bold: true, font, size: Math.round(size * 1.33) })],
      spacing: { before: 240, after: 240 },
    }));
    if (consolidatedRefs.length > 0) {
      for (const ref of consolidatedRefs) {
        main.push(new Paragraph({
          children: parseInline(ref, font, size),
          spacing: { before: 0, after: 120, line: 480 },
          indent: { left: 720, hanging: 720 },
          alignment: AlignmentType.JUSTIFIED,
        }));
      }
    } else {
      main.push(new Paragraph({
        children: [new TextRun({ text: "See in-text citations within individual chapters.", font, size, italics: true, color: "888888" })],
      }));
    }
  }

  // Appendices
  const appendixChapters = processedChapters.filter(c => isAppendixChapter(c));
  if (appendixChapters.length > 0) {
    main.push(new Paragraph({ children: [new PageBreak()] }));
    appendixChapters.forEach((ch, idx) => {
      const letter = String.fromCharCode(65 + idx);
      main.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: `Appendix ${letter}: ${ch.title}`, bold: true, font, size: Math.round(size * 1.33) })],
        spacing: { before: 240, after: 240 },
      }));
      const figs = figuresByChapter.get(ch.id) || new Map();
      main.push(...markdownToDocxParagraphs(ch._bodyContent, font, size, figs, styleRules, footnoteCollector));
      if (idx < appendixChapters.length - 1) {
        main.push(new Paragraph({ children: [new PageBreak()] }));
      }
    });
  }

  // ── Pack three sections with distinct page-numbering schemes ──
  return await packDoc([
    { children: titleSection, footerCenter: false, pageNumberFormat: NumberFormat.LOWER_ROMAN, hideFooter: true, sectionType: SectionType.NEXT_PAGE },
    { children: prelim, footerCenter: true, pageNumberFormat: NumberFormat.LOWER_ROMAN, sectionType: SectionType.NEXT_PAGE },
    { children: main, footerCenter: true, pageNumberFormat: NumberFormat.DECIMAL, restartPageNumber: 1, sectionType: SectionType.NEXT_PAGE },
  ], font, size, styleRules, footnoteCollector);
}

interface SectionSpec {
  children: (Paragraph | Table)[];
  footerCenter: boolean;
  pageNumberFormat?: any;
  restartPageNumber?: number;
  hideFooter?: boolean;
  sectionType?: any;
}

import type { DocxStyleRules } from "../generate-chapter/citationStyles.ts";

async function packDoc(
  sections: SectionSpec[],
  font: string,
  size: number,
  styleRules?: DocxStyleRules,
  footnoteMap?: Map<number, Paragraph[]>,
): Promise<Uint8Array> {
  const rules = styleRules ?? getCitationStyleDocx("Harvard");
  const pageNumTopRight = rules.pageNumberPosition === "top-right";

  const docSections = sections.map((s) => {
    const footer = (s.hideFooter || pageNumTopRight)
      ? undefined
      : new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ children: [PageNumber.CURRENT], font, size: Math.max(size - 4, 18), color: "888888" })],
            }),
          ],
        });

    const header = pageNumTopRight
      ? new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ children: [PageNumber.CURRENT], font, size: Math.max(size - 4, 18), color: "888888" })],
            }),
          ],
        })
      : undefined;

    return {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: {
            top: rules.marginTop,
            right: rules.marginRight,
            bottom: rules.marginBottom,
            left: rules.marginLeft,
          },
          pageNumbers: {
            ...(s.pageNumberFormat ? { formatType: s.pageNumberFormat } : {}),
            ...(s.restartPageNumber !== undefined ? { start: s.restartPageNumber } : {}),
          },
        },
        type: s.sectionType,
      },
      headers: header ? { default: header } : undefined,
      footers: footer ? { default: footer } : undefined,
      children: s.children,
    } as any;
  });

  const h1Alignment = rules.h1Alignment === "center" ? AlignmentType.CENTER : AlignmentType.LEFT;

  const doc = new Document({
    styles: {
      default: { document: { run: { font, size } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: Math.round(size * 1.33), bold: rules.h1Bold, font },
          paragraph: { spacing: { before: 240, after: 240 }, alignment: h1Alignment, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: Math.round(size * 1.17), bold: true, italics: rules.h2Italic, font },
          paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: Math.round(size * 1.08), bold: true, italics: rules.h3Italic, font },
          paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 2 } },
        { id: "Heading4", name: "Heading 4", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size, bold: true, italics: true, font },
          paragraph: { spacing: { before: 120, after: 60 }, outlineLevel: 3 } },
      ],
    },
    numbering: {
      config: [{
        reference: "default-numbering",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
      }],
    },
    features: { updateFields: true } as any,
    footnotes: (footnoteMap && footnoteMap.size > 0)
      ? Object.fromEntries(Array.from(footnoteMap.entries()).map(([n, children]) => [n, { children }]))
      : undefined,
    sections: docSections,
  } as any);

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function toBase64Str(str: string): string {
  const encoder = new TextEncoder();
  return toBase64(encoder.encode(str));
}

// ── HTML builder for PDF ──
function markdownToHtml(content: string): string {
  let processed = content
    .replace(CHART_BLOCK_RE, (_, json) => {
      try {
        const { title, data } = JSON.parse(json);
        const rows = (data || []).map((d: any) => `<tr><td>${d.name || d.x}</td><td>${d.value || d.y}</td></tr>`).join("");
        return `<table><caption><b>${title}</b></caption><thead><tr><th>Label</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table>`;
      } catch { return ""; }
    })
    .replace(FIGURE_MARKER_RE, (_, _id, num, title, desc) =>
      `<figure style="text-align:center;border:1px solid #ccc;padding:16pt;margin:12pt 0"><figcaption><b>${num}:</b> <i>${title}</i></figcaption><div style="font-size:10pt;color:#666;margin-top:4pt">${desc}</div></figure>`);

  processed = processed.replace(
    /(?:^|\n)((?:\|[^\n]+\|\n)+)/g,
    (_, tableBlock: string) => {
      const rows = tableBlock.trim().split("\n").filter((r: string) => r.trim());
      if (rows.length < 2) return tableBlock;
      const isSeparator = /^\|[\s\-:]+(\|[\s\-:]+)+\|?$/.test(rows[1]);
      if (!isSeparator) return tableBlock;
      const parseRow = (row: string) => row.split("|").slice(1, -1).map((c: string) => c.trim());
      const headerCells = parseRow(rows[0]);
      const headerHtml = `<tr>${headerCells.map((c: string) => `<th>${c}</th>`).join("")}</tr>`;
      const bodyRows = rows.slice(2);
      const bodyHtml = bodyRows.map((row: string) => {
        const cells = parseRow(row);
        return `<tr>${cells.map((c: string) => `<td>${c}</td>`).join("")}</tr>`;
      }).join("");
      return `\n<table><thead>${headerHtml}</thead><tbody>${bodyHtml}</tbody></table>\n`;
    }
  );

  let html = processed
    .replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
    .replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
    .replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
    .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
    .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
    .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.+?)\*/g, '<i>$1</i>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');
  return html;
}

function buildHtmlDoc(chapters: any[], projectTitle: string): string {
  const htmlChapters = chapters.map((c: any) => {
    const html = markdownToHtml(stripLeadingChapterHeading(c.content));
    return `<h1>${c.title}</h1><p>${html}</p>`;
  }).join('<br clear="all" style="page-break-before:always"/>');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${projectTitle}</title>
<style>
@media print { @page { margin: 2.54cm; } }
body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 2; margin: 2.54cm; }
h1 { font-size: 16pt; font-weight: bold; margin-top: 24pt; margin-bottom: 12pt; }
h2 { font-size: 14pt; font-weight: bold; margin-top: 18pt; margin-bottom: 10pt; }
h3 { font-size: 13pt; font-weight: bold; margin-top: 14pt; margin-bottom: 8pt; }
h4 { font-size: 12pt; font-weight: bold; font-style: italic; margin-top: 12pt; margin-bottom: 6pt; }
p { text-align: justify; margin-bottom: 6pt; }
table { border-collapse: collapse; width: 100%; margin: 12pt 0; }
td, th { border: 1px solid #666; padding: 6pt 8pt; text-align: left; font-size: 11pt; }
th { background-color: #f0f0f0; font-weight: bold; }
figure { page-break-inside: avoid; }
</style>
</head>
<body>
${htmlChapters}

</body>
</html>`;
}

// ── Fetch persisted figures for the chapters being exported ──
async function loadFiguresForChapters(chapterIds: string[], userJwt: string | null): Promise<Map<string, FigureMap>> {
  const result = new Map<string, FigureMap>();
  if (chapterIds.length === 0) return result;
  // Skip non-UUID chapter ids (e.g. CZAR's synthetic "czar-single") — those
  // exports embed images inline as data-URIs and have no rows in chapter_figures.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const validIds = chapterIds.filter((id) => typeof id === "string" && UUID_RE.test(id));
  if (validIds.length === 0) return result;
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceKey) return result;
    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data, error } = await sb
      .from("chapter_figures")
      .select("chapter_id, figure_id, figure_number, title, description, image_data_uri")
      .in("chapter_id", validIds);
    if (error) {
      console.warn("loadFiguresForChapters error:", error.message);
      return result;
    }
    for (const row of (data || [])) {
      if (!result.has(row.chapter_id)) result.set(row.chapter_id, new Map());
      result.get(row.chapter_id)!.set(row.figure_id, {
        figure_number: row.figure_number || "",
        title: row.title || "",
        description: row.description || "",
        image_data_uri: row.image_data_uri,
      });
    }
  } catch (e) {
    console.warn("loadFiguresForChapters threw:", (e as Error).message);
  }
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    let { chapters, projectTitle, format, isFinalExport, singleDocument, submissionDetails, fontFamily, fontSize, citationStyle } = body;

    // CZAR single-document shape: { content, title } → adapt into ONE chapter.
    // When `singleDocument: true` is set, do NOT split on ## (would create
    // hard page breaks between sections); keep everything as one flowing block.
    if ((!chapters || !Array.isArray(chapters)) && typeof body.content === "string") {
      const treatAsSingle = !!body.singleDocument;
      if (!treatAsSingle) {
        const sections = body.content.split(/(?=^## )/m).filter((s: string) => s.trim());
        if (sections.length > 1) {
          chapters = sections.map((sec: string, idx: number) => {
            const headingMatch = sec.match(/^##\s+(.+)$/m);
            const heading = headingMatch ? headingMatch[1].trim() : `Section ${idx + 1}`;
            const content = headingMatch ? sec.replace(/^##\s+.+$/m, "").trim() : sec.trim();
            return { id: `czar-${idx}`, title: heading, content, order_index: idx, type: "body" };
          });
        }
      }
      if (!chapters) {
        chapters = [{
          id: "czar-single",
          title: body.title || "Document",
          content: body.content,
          order_index: 0,
          type: "body",
        }];
      }
      projectTitle = projectTitle || body.title || body.content.match(/^#{1,2}\s+(.+)$/m)?.[1] || "Document";
      format = format || "docx";
      if (body.isFinalExport !== undefined) isFinalExport = body.isFinalExport;
      if (body.singleDocument !== undefined) singleDocument = body.singleDocument;
    }

    if (!chapters || !Array.isArray(chapters)) {
      return new Response(
        JSON.stringify({ error: "Missing chapters array or content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const docFont = fontFamily || "Times New Roman";
    const docSize = (fontSize || 12) * 2;

    const sorted = [...chapters].sort((a: any, b: any) => a.order_index - b.order_index).filter((c: any) => c.content);
    const rawName = (projectTitle || "Dissertation").replace(/[/\\:*?"<>|]/g, "").trim();
    const safeName = rawName.length > 80 ? rawName.slice(0, 80).replace(/\s+\S*$/, "") : rawName;

    if (sorted.length === 0) {
      return new Response(
        JSON.stringify({ error: "No drafted chapters to export" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (format === "md") {
      const mdContent = sorted.map((c: any) => `# ${c.title}\n\n${stripLeadingChapterHeading(c.content)}`).join("\n\n---\n\n");
      const fullMd = `---\ntitle: "${projectTitle}"\ndate: ${new Date().toISOString().split("T")[0]}\n---\n\n${mdContent}`;
      return new Response(JSON.stringify({ content: fullMd, filename: `${safeName}.md` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (format === "txt") {
      const txtContent = sorted.map((c: any) => `${c.title.toUpperCase()}\n${"─".repeat(50)}\n\n${markdownToPlainText(stripLeadingChapterHeading(c.content))}`).join("\n\n\n");
      const fullTxt = `${(projectTitle || "Dissertation").toUpperCase()}\n${"═".repeat(50)}\n\n${txtContent}`;
      return new Response(JSON.stringify({ content: fullTxt, filename: `${safeName}.txt` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (format === "latex") {
      const latexContent = buildLatexDocument(sorted, projectTitle || "Dissertation");
      return new Response(JSON.stringify({ content: latexContent, filename: `${safeName}.tex` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (format === "pdf") {
      const fullHtml = buildHtmlDoc(sorted, projectTitle || "Dissertation");
      return new Response(JSON.stringify({
        content: toBase64Str(fullHtml),
        filename: `${safeName}.pdf`,
        encoding: "base64",
        mimeType: "text/html",
        renderAsPdf: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── DOCX ───
    const chapterIds = sorted.map((c: any) => c.id).filter(Boolean);
    const userJwt = req.headers.get("authorization");
    const figuresByChapter = await loadFiguresForChapters(chapterIds, userJwt);

    const docxBytes = await buildDocx(sorted, projectTitle || "Dissertation", {
      isFinalExport: !!isFinalExport,
      singleDocument: !!singleDocument,
      czarCoverPage: !!body.czarCoverPage,
      authorName: typeof body.authorName === "string" ? body.authorName : "",
      submissionDetails: submissionDetails || null,
      fontFamily: docFont,
      fontSize: docSize,
      figuresByChapter,
      citationStyle: citationStyle || submissionDetails?.citationStyle || submissionDetails?.citation_style,
    });
    const base64 = toBase64(docxBytes);

    return new Response(JSON.stringify({
      content: base64,
      filename: `${safeName}.docx`,
      encoding: "base64",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("export-docx error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
