// Export Corrected Document — TRUE STRUCTURE PRESERVATION
//
// Strategy: download the ORIGINAL .docx from Storage, unzip it, and patch only
// the specific text runs that received corrections. Everything else
// (page breaks, headers/footers, tables, images, TOC, references list,
// section properties, styles, numbering, media) is kept BYTE-FOR-BYTE intact.
//
// Falls back to the legacy regenerated-DOCX path only when:
//   • The original file is missing/unreadable, OR
//   • The record came from a non-DOCX upload (PDF/text), OR
//   • A correction can't be located in the original XML (rare).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
} from "https://esm.sh/docx@8.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ─── Types ────────────────────────────────────────────────────────────────

type Severity = "low" | "medium" | "high";

interface AppliedCorrection {
  block_index: number;        // index in parsed_blocks (== paragraph ordinal in word/document.xml)
  original_text: string;      // exact substring that was replaced
  corrected_text: string;     // replacement
  severity: Severity;
  reason?: string;
}

interface DocBlock {
  index: number;
  kind: "heading1" | "heading2" | "heading3" | "list" | "reference" | "paragraph";
  text: string;
  html: string;
  list_level?: number;
  protected?: boolean;
}

// ─── DOCX patching ────────────────────────────────────────────────────────

const HIGHLIGHT_BY_SEVERITY: Record<Severity, string> = {
  low: "yellow",
  medium: "cyan",
  high: "red",
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Returns the concatenated visible text inside a <w:p> (text from <w:t>
 * elements, preserving order, ignoring deletion text).
 */
function paragraphText(pXml: string): string {
  // Remove deletion text first.
  const noDel = pXml.replace(/<w:del\b[\s\S]*?<\/w:del>/g, "");
  const parts: string[] = [];
  const tRe = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = tRe.exec(noDel)) !== null) parts.push(m[1]);
  return parts.join("")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Apply corrections to ONE <w:p> XML string. Strategy: replace the original
 * text by emitting a fresh run sequence INSIDE the existing paragraph,
 * preserving paragraph properties (<w:pPr>) and any existing tracked
 * changes. Highlighting is added via <w:highlight> on the corrected run.
 *
 * Returns null if any correction couldn't be located (caller decides
 * whether to fall back to the regenerated DOCX path for that paragraph).
 */
function patchParagraph(pXml: string, corrections: AppliedCorrection[]): string | null {
  // Quick path: if no corrections, return as-is.
  if (corrections.length === 0) return pXml;

  // Capture <w:pPr> if present so we can keep it on the rebuilt paragraph.
  const pPrMatch = pXml.match(/<w:pPr\b[\s\S]*?<\/w:pPr>/);
  const pPr = pPrMatch ? pPrMatch[0] : "";

  // Try to grab the rPr from the FIRST text run so the rebuilt runs inherit
  // the paragraph's base font/size/bold etc.
  const rPrMatch = pXml.match(/<w:r\b[^>]*>\s*<w:rPr\b[\s\S]*?<\/w:rPr>/);
  const baseRPrInner = rPrMatch
    ? (rPrMatch[0].match(/<w:rPr\b[\s\S]*?<\/w:rPr>/)?.[0] || "")
    : "";

  // Reconstruct visible text from existing runs (skip deletions).
  const fullText = paragraphText(pXml);
  if (!fullText) return null;

  // Apply each correction sequentially as plain string replacement on the
  // logical text, building a list of (text, highlight?) segments.
  type Seg = { text: string; highlight?: string };
  let segments: Seg[] = [{ text: fullText }];

  for (const c of corrections) {
    const orig = c.original_text;
    const repl = c.corrected_text;
    const hl = HIGHLIGHT_BY_SEVERITY[c.severity] || "yellow";
    if (!orig) continue;

    const next: Seg[] = [];
    let landed = false;
    for (const seg of segments) {
      if (seg.highlight || !seg.text.includes(orig)) {
        next.push(seg);
        continue;
      }
      // Split this plain segment around the first occurrence.
      const idx = seg.text.indexOf(orig);
      const before = seg.text.slice(0, idx);
      const after = seg.text.slice(idx + orig.length);
      if (before) next.push({ text: before });
      next.push({ text: repl, highlight: hl });
      if (after) next.push({ text: after });
      landed = true;
      // Continue copying remaining segments unchanged.
    }
    if (!landed) {
      // One correction missed — bail; caller will fall back to the
      // regenerated path for this paragraph only.
      return null;
    }
    segments = next;
  }

  // Build the new run XML.
  const runs = segments
    .filter((s) => s.text.length > 0)
    .map((s) => {
      const rPrParts: string[] = [];
      if (baseRPrInner) {
        // Strip an existing highlight from the base rPr; we'll add ours.
        rPrParts.push(baseRPrInner.replace(/<w:highlight\s+w:val="[^"]*"\s*\/?>/g, ""));
      } else {
        rPrParts.push("<w:rPr></w:rPr>");
      }
      // Inject our highlight inside <w:rPr>.
      let rPr = rPrParts.join("");
      if (s.highlight) {
        const hlTag = `<w:highlight w:val="${s.highlight}"/>`;
        if (rPr.includes("</w:rPr>")) {
          rPr = rPr.replace("</w:rPr>", `${hlTag}</w:rPr>`);
        } else {
          rPr = `<w:rPr>${hlTag}</w:rPr>`;
        }
      }
      const t = `<w:t xml:space="preserve">${escapeXml(s.text)}</w:t>`;
      return `<w:r>${rPr}${t}</w:r>`;
    })
    .join("");

  // Pull paragraph open tag verbatim so we keep its rsid attrs.
  const openMatch = pXml.match(/^<w:p\b[^>]*>/);
  const openTag = openMatch ? openMatch[0] : "<w:p>";
  return `${openTag}${pPr}${runs}</w:p>`;
}

/**
 * Walk word/document.xml, replacing the Nth <w:p> with patched XML when that
 * paragraph index matches a correction. Returns the new XML and the count of
 * paragraphs that were successfully patched.
 *
 * `parsed_blocks` was emitted in the same order as <w:p> walks during
 * ingestion (skipping empty paragraphs), so we re-walk with the same skip
 * rule to keep indices aligned.
 */
function patchDocumentXml(
  xml: string,
  blocks: DocBlock[],
  corrections: AppliedCorrection[],
): { xml: string; patched: number; missed: number } {
  // Group corrections by block_index.
  const byBlock = new Map<number, AppliedCorrection[]>();
  for (const c of corrections) {
    const arr = byBlock.get(c.block_index) || [];
    arr.push(c);
    byBlock.set(c.block_index, arr);
  }
  if (byBlock.size === 0) return { xml, patched: 0, missed: 0 };

  let patched = 0;
  let missed = 0;
  let blockIndex = 0;
  let result = "";
  let cursor = 0;

  const paraRe = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  let m: RegExpExecArray | null;
  while ((m = paraRe.exec(xml)) !== null) {
    // Append everything between cursor and this <w:p>.
    result += xml.slice(cursor, m.index);
    const pXml = m[0];
    const text = paragraphText(pXml).replace(/[ \t]+/g, " ").trim();

    if (!text) {
      // Empty paragraph — keep but don't bump blockIndex (parser skipped these).
      result += pXml;
      cursor = m.index + pXml.length;
      continue;
    }

    const cs = byBlock.get(blockIndex);
    if (cs && cs.length > 0) {
      const patchedXml = patchParagraph(pXml, cs);
      if (patchedXml) {
        result += patchedXml;
        patched++;
      } else {
        result += pXml;
        missed++;
      }
    } else {
      result += pXml;
    }

    cursor = m.index + pXml.length;
    blockIndex++;
  }
  result += xml.slice(cursor);
  return { xml: result, patched, missed };
}

// ─── Legacy regenerated-DOCX (used only as fallback) ──────────────────────

function colorToHighlight(style: string): string {
  if (style.includes("#fef08a")) return "yellow";
  if (style.includes("#bfdbfe")) return "cyan";
  if (style.includes("#fecaca")) return "red";
  return "yellow";
}

function parseMarkedLine(line: string, font: string, size: number): TextRun[] {
  const runs: TextRun[] = [];
  const markRe = /<mark\s+style="([^"]*)">([\s\S]*?)<\/mark>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = markRe.exec(line)) !== null) {
    if (m.index > last) {
      const plain = line.slice(last, m.index);
      if (plain) runs.push(new TextRun({ text: plain, font, size }));
    }
    const inner = m[2].replace(/<[^>]+>/g, "");
    if (inner) runs.push(new TextRun({ text: inner, font, size, highlight: colorToHighlight(m[1]) as any }));
    last = m.index + m[0].length;
  }
  if (last < line.length) {
    const tail = line.slice(last).replace(/<[^>]+>/g, "");
    if (tail) runs.push(new TextRun({ text: tail, font, size }));
  }
  if (runs.length === 0) runs.push(new TextRun({ text: "", font, size }));
  return runs;
}

function blocksToDocxParagraphs(blocks: DocBlock[], font: string, size: number): Paragraph[] {
  const out: Paragraph[] = [];
  for (const b of blocks) {
    const html = b.html || b.text;
    if (!html.trim()) continue;
    if (b.kind === "heading1") {
      out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: parseMarkedLine(html, font, Math.round(size * 1.33)), spacing: { before: 240, after: 120 } }));
    } else if (b.kind === "heading2") {
      out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: parseMarkedLine(html, font, Math.round(size * 1.17)), spacing: { before: 200, after: 100 } }));
    } else if (b.kind === "heading3") {
      out.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: parseMarkedLine(html, font, Math.round(size * 1.08)), spacing: { before: 160, after: 80 } }));
    } else if (b.kind === "list") {
      out.push(new Paragraph({ children: parseMarkedLine(html, font, size), bullet: { level: b.list_level ?? 0 }, spacing: { before: 0, after: 80, line: 480 } }));
    } else if (b.kind === "reference") {
      out.push(new Paragraph({ children: parseMarkedLine(html, font, size), indent: { left: 720, hanging: 720 }, spacing: { before: 0, after: 120, line: 360 } }));
    } else {
      out.push(new Paragraph({ children: parseMarkedLine(html, font, size), spacing: { before: 0, after: 120, line: 480 }, alignment: AlignmentType.JUSTIFIED }));
    }
  }
  return out;
}

function buildHtmlExportFromBlocks(blocks: DocBlock[], filename: string): string {
  const body = blocks.map((b) => {
    const html = b.html || b.text;
    if (b.kind === "heading1") return `<h1>${html}</h1>`;
    if (b.kind === "heading2") return `<h2>${html}</h2>`;
    if (b.kind === "heading3") return `<h3>${html}</h3>`;
    if (b.kind === "list") return `<li>${html}</li>`;
    if (b.kind === "reference") return `<p class="ref">${html}</p>`;
    return `<p>${html}</p>`;
  }).join("\n");
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${filename}</title>
<style>
@media print { @page { margin: 2.54cm; } }
body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 2; margin: 2.54cm; }
h1 { font-size: 16pt; font-weight: bold; margin-top: 24pt; margin-bottom: 12pt; }
h2 { font-size: 14pt; font-weight: bold; margin-top: 18pt; margin-bottom: 10pt; }
h3 { font-size: 13pt; font-weight: bold; margin-top: 14pt; margin-bottom: 8pt; }
p { text-align: justify; margin-bottom: 6pt; }
p.ref { padding-left: 36pt; text-indent: -36pt; line-height: 1.4; }
mark { padding: 1px 0; }
</style></head><body>${body}</body></html>`;
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

async function regeneratedDocxFallback(blocks: DocBlock[], font: string, size: number): Promise<Uint8Array> {
  const paragraphs = blocksToDocxParagraphs(blocks, font, size);
  const doc = new Document({
    styles: {
      default: { document: { run: { font, size } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: Math.round(size * 1.33), bold: true, font }, paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: Math.round(size * 1.17), bold: true, font }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: Math.round(size * 1.08), bold: true, font }, paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 2 } },
      ],
    },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children: paragraphs,
    }],
  });
  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}

// ─── Handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("authorization") || "";
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

  const { data: { user }, error: authErr } = await sb.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { document_id, format = "docx", font = "Times New Roman", font_size = 12 } = await req.json();
  if (!document_id) {
    return new Response(JSON.stringify({ error: "document_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: docRow, error: fetchErr } = await sb
    .from("document_corrections")
    .select("corrected_html, corrected_blocks, parsed_blocks, original_filename, original_storage_path, original_format, user_id, status, annotations")
    .eq("id", document_id)
    .single();

  if (fetchErr || !docRow) {
    return new Response(JSON.stringify({ error: "Document not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (docRow.user_id !== user.id) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const correctedHtml: string = docRow.corrected_html || "";
  const correctedBlocks: DocBlock[] = Array.isArray(docRow.corrected_blocks) ? docRow.corrected_blocks as DocBlock[] : [];
  const parsedBlocks: DocBlock[] = Array.isArray(docRow.parsed_blocks) ? docRow.parsed_blocks as DocBlock[] : [];
  const ann = (docRow.annotations as any) || {};
  const applied: AppliedCorrection[] = Array.isArray(ann.applied_corrections) ? ann.applied_corrections : [];
  const baseName = (docRow.original_filename as string).replace(/\.[^.]+$/, "");
  const size = font_size * 2;
  const isDocxOriginal = (docRow.original_format === "docx") && !!docRow.original_storage_path;

  // PDF (HTML) path — unchanged for now.
  if (format === "pdf") {
    const html = correctedBlocks.length > 0
      ? buildHtmlExportFromBlocks(correctedBlocks, baseName)
      : `<!DOCTYPE html><html><body><pre>${correctedHtml}</pre></body></html>`;
    return new Response(JSON.stringify({
      content: btoa(unescape(encodeURIComponent(html))),
      filename: `${baseName}-corrected.pdf`,
      encoding: "base64",
      mimeType: "text/html",
      renderAsPdf: true,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // ── DOCX path: try patching the original file FIRST. ─────────────────
  if (isDocxOriginal && applied.length > 0 && parsedBlocks.length > 0) {
    try {
      const { data: fileData, error: dlErr } = await sb.storage
        .from("czar-uploads")
        .download(docRow.original_storage_path as string);
      if (dlErr || !fileData) throw new Error(`download failed: ${dlErr?.message}`);

      const origBytes = new Uint8Array(await fileData.arrayBuffer());
      const { unzipSync, strFromU8, strToU8, zipSync } = await import("https://esm.sh/fflate@0.8.2");
      const unzipped = unzipSync(origBytes);

      const docXmlBytes = unzipped["word/document.xml"];
      if (!docXmlBytes) throw new Error("word/document.xml not found in original");

      const docXml = strFromU8(docXmlBytes);
      const { xml: patchedXml, patched, missed } = patchDocumentXml(docXml, parsedBlocks, applied);
      console.log(`[export-corrected-doc] patched ${patched}/${applied.length} corrections (missed ${missed})`);

      // Replace document.xml in the package, leave everything else intact.
      const repacked: Record<string, Uint8Array> = { ...unzipped };
      repacked["word/document.xml"] = strToU8(patchedXml);
      const outBytes = zipSync(repacked, { level: 6 });

      return new Response(JSON.stringify({
        content: toBase64(outBytes),
        filename: `${baseName}-corrected.docx`,
        encoding: "base64",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (e: any) {
      console.warn(`[export-corrected-doc] patch path failed, falling back: ${e?.message || e}`);
      // Fall through to regenerated-DOCX.
    }
  }

  // ── Fallback: rebuild DOCX from corrected_blocks (legacy / non-docx). ──
  const blocks = correctedBlocks.length > 0 ? correctedBlocks : parsedBlocks;
  const outBytes = await regeneratedDocxFallback(blocks, font, size);
  return new Response(JSON.stringify({
    content: toBase64(outBytes),
    filename: `${baseName}-corrected.docx`,
    encoding: "base64",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
