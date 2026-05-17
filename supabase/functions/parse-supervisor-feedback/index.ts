// parse-supervisor-feedback — extract feedback items from supervisor uploads.
// Inputs (one of):
//   - { docxBase64: string, filename: string }  → tracked changes + comments
//   - { pdfText: string, filename: string }     → annotations / highlights as text
//   - { plainText: string }                     → bullet/line items
// Output: { items: Array<{ id, type, comment, target_excerpt?, suggested_replacement? }> }
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FeedbackItem {
  id: string;
  type: "comment" | "insertion" | "deletion" | "note";
  comment: string;
  target_excerpt?: string;
  suggested_replacement?: string;
  author?: string;
}

// Tiny ZIP reader (DOCX is a ZIP). We only need to extract two text entries.
async function readDocxEntries(b64: string): Promise<Record<string, string>> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

  const dv = new DataView(bytes.buffer);
  const entries: Record<string, string> = {};

  // Find End of Central Directory
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Not a valid ZIP/DOCX file");

  const cdCount = dv.getUint16(eocd + 10, true);
  const cdOffset = dv.getUint32(eocd + 16, true);

  let p = cdOffset;
  for (let i = 0; i < cdCount; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const compMethod = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const localOffset = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen));

    if (name === "word/document.xml" || name === "word/comments.xml") {
      const lh = localOffset;
      if (dv.getUint32(lh, true) === 0x04034b50) {
        const lhNameLen = dv.getUint16(lh + 26, true);
        const lhExtraLen = dv.getUint16(lh + 28, true);
        const dataStart = lh + 30 + lhNameLen + lhExtraLen;
        const compressed = bytes.subarray(dataStart, dataStart + compSize);
        try {
          let raw: Uint8Array;
          if (compMethod === 0) {
            raw = compressed;
          } else if (compMethod === 8) {
            // deflate via DecompressionStream
            const ds = new DecompressionStream("deflate-raw");
            const stream = new Response(compressed).body!.pipeThrough(ds);
            raw = new Uint8Array(await new Response(stream).arrayBuffer());
          } else {
            continue;
          }
          entries[name] = new TextDecoder().decode(raw);
        } catch (e) {
          console.error(`Failed to decompress ${name}:`, e);
        }
      }
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function stripXml(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function extractParagraphText(xml: string): string[] {
  const paras: string[] = [];
  const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  let m;
  while ((m = pRegex.exec(xml)) !== null) {
    const tRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    let txt = "";
    let t;
    while ((t = tRegex.exec(m[1])) !== null) txt += t[1];
    if (txt.trim()) paras.push(stripXml(txt));
  }
  return paras;
}

function parseDocxFeedback(docXml: string, commentsXml: string | undefined): FeedbackItem[] {
  const items: FeedbackItem[] = [];
  let counter = 0;
  const newId = () => `fb-${++counter}`;

  // ── Comments (word/comments.xml) ──
  const commentMap = new Map<string, { author: string; text: string }>();
  if (commentsXml) {
    const cRegex = /<w:comment\s+([^>]*)>([\s\S]*?)<\/w:comment>/g;
    let m;
    while ((m = cRegex.exec(commentsXml)) !== null) {
      const attrs = m[1];
      const idMatch = attrs.match(/w:id="([^"]+)"/);
      const authorMatch = attrs.match(/w:author="([^"]+)"/);
      if (!idMatch) continue;
      const text = stripXml(m[2]);
      commentMap.set(idMatch[1], { author: authorMatch?.[1] || "Supervisor", text });
    }
  }

  // For each comment, find the marked range in document.xml.
  for (const [cid, c] of commentMap) {
    const startRe = new RegExp(`<w:commentRangeStart\\s+w:id="${cid}"\\s*/>`);
    const endRe = new RegExp(`<w:commentRangeEnd\\s+w:id="${cid}"\\s*/>`);
    const startIdx = docXml.search(startRe);
    const endIdx = docXml.search(endRe);
    let excerpt: string | undefined;
    if (startIdx >= 0 && endIdx > startIdx) {
      const between = docXml.substring(startIdx, endIdx);
      const tRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
      let t; let txt = "";
      while ((t = tRegex.exec(between)) !== null) txt += t[1];
      excerpt = stripXml(txt).slice(0, 400);
    }
    items.push({
      id: newId(),
      type: "comment",
      author: c.author,
      comment: c.text,
      target_excerpt: excerpt,
    });
  }

  // ── Tracked insertions ──
  const insRegex = /<w:ins\s+([^>]*)>([\s\S]*?)<\/w:ins>/g;
  let m;
  while ((m = insRegex.exec(docXml)) !== null) {
    const author = m[1].match(/w:author="([^"]+)"/)?.[1] || "Supervisor";
    const tRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    let txt = ""; let t;
    while ((t = tRegex.exec(m[2])) !== null) txt += t[1];
    txt = stripXml(txt);
    if (!txt) continue;
    items.push({
      id: newId(),
      type: "insertion",
      author,
      comment: `Insert: "${txt}"`,
      suggested_replacement: txt,
    });
  }

  // ── Tracked deletions ──
  const delRegex = /<w:del\s+([^>]*)>([\s\S]*?)<\/w:del>/g;
  while ((m = delRegex.exec(docXml)) !== null) {
    const author = m[1].match(/w:author="([^"]+)"/)?.[1] || "Supervisor";
    const tRegex = /<w:delText[^>]*>([\s\S]*?)<\/w:delText>/g;
    let txt = ""; let t;
    while ((t = tRegex.exec(m[2])) !== null) txt += t[1];
    txt = stripXml(txt);
    if (!txt) continue;
    items.push({
      id: newId(),
      type: "deletion",
      author,
      comment: `Delete: "${txt}"`,
      target_excerpt: txt,
    });
  }

  return items;
}

function parsePlainText(text: string): FeedbackItem[] {
  const items: FeedbackItem[] = [];
  let counter = 0;
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Group consecutive non-bullet lines into single items; treat each bullet/numbered line as its own item.
  const bulletRe = /^([-*•]|\d+[\).])\s+(.+)/;
  let buffer = "";
  const flush = () => {
    if (buffer.trim()) {
      items.push({ id: `fb-${++counter}`, type: "note", comment: buffer.trim() });
      buffer = "";
    }
  };
  for (const line of lines) {
    const m = bulletRe.exec(line);
    if (m) {
      flush();
      items.push({ id: `fb-${++counter}`, type: "note", comment: m[2] });
    } else {
      buffer += (buffer ? " " : "") + line;
    }
  }
  flush();
  return items;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    let items: FeedbackItem[] = [];

    if (body.docxBase64) {
      const entries = await readDocxEntries(body.docxBase64);
      const doc = entries["word/document.xml"];
      const comments = entries["word/comments.xml"];
      if (!doc) {
        return new Response(JSON.stringify({ error: "No word/document.xml found in DOCX" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      items = parseDocxFeedback(doc, comments);
      // If no tracked changes/comments found, fall back to scanning for paragraphs
      // beginning with markers like "[Comment]" or "Note:".
      if (items.length === 0) {
        const paras = extractParagraphText(doc);
        const noteRe = /^(\[?(comment|note|fix|change|reword|rewrite|see also)\]?:?\s*)(.+)/i;
        let counter = 0;
        for (const p of paras) {
          const m = noteRe.exec(p);
          if (m) items.push({ id: `fb-${++counter}`, type: "note", comment: m[3] });
        }
      }
    } else if (body.pdfText) {
      items = parsePlainText(body.pdfText);
    } else if (body.plainText) {
      items = parsePlainText(body.plainText);
    } else {
      return new Response(JSON.stringify({ error: "Provide docxBase64, pdfText, or plainText" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-supervisor-feedback error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
