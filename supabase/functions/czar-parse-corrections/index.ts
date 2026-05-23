// czar-parse-corrections — AI correction analysis for CZAR documents.
// Unlike parse-supervisor-feedback (which extracts human annotations),
// this function reads the user's own document and generates correction
// suggestions using Claude.
//
// Input (one of):
//   { docxBase64: string, filename: string }
//   { plainText: string }
// Plus optional:
//   { correctionNotes?: string }
//
// Output: { items: CorrectionItem[], originalText: string }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAnthropicJson } from "../_shared/anthropic.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CorrectionItem {
  id: string;
  type: "grammar" | "style" | "structure" | "argument" | "register";
  explanation: string;
  original: string;
  corrected: string;
}

// ── DOCX text extractor (same ZIP parser as parse-supervisor-feedback) ─────────

async function extractDocxText(b64: string): Promise<string> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

  const dv = new DataView(bytes.buffer);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Not a valid ZIP/DOCX file");

  const cdCount = dv.getUint16(eocd + 10, true);
  const cdOffset = dv.getUint32(eocd + 16, true);

  let p = cdOffset;
  let docXml = "";
  for (let i = 0; i < cdCount; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const compMethod = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const localOffset = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen));

    if (name === "word/document.xml") {
      const lh = localOffset;
      if (dv.getUint32(lh, true) === 0x04034b50) {
        const lhNameLen = dv.getUint16(lh + 26, true);
        const lhExtraLen = dv.getUint16(lh + 28, true);
        const dataStart = lh + 30 + lhNameLen + lhExtraLen;
        const compressed = bytes.subarray(dataStart, dataStart + compSize);
        let raw: Uint8Array;
        if (compMethod === 0) {
          raw = compressed;
        } else if (compMethod === 8) {
          const ds = new DecompressionStream("deflate-raw");
          const stream = new Response(compressed).body!.pipeThrough(ds);
          raw = new Uint8Array(await new Response(stream).arrayBuffer());
        } else {
          break;
        }
        docXml = new TextDecoder().decode(raw);
      }
      break;
    }
    p += 46 + nameLen + extraLen + commentLen;
  }

  if (!docXml) throw new Error("No word/document.xml found in DOCX");

  // Extract paragraph text
  const paras: string[] = [];
  const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  let m;
  while ((m = pRegex.exec(docXml)) !== null) {
    const tRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    let txt = ""; let t;
    while ((t = tRegex.exec(m[1])) !== null) txt += t[1];
    const clean = txt.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (clean) paras.push(clean);
  }
  return paras.join("\n\n");
}

// ── AI correction scanner ─────────────────────────────────────────────────────

async function scanForCorrections(text: string, notes: string): Promise<CorrectionItem[]> {
  const truncated = text.slice(0, 14000);
  const notesLine = notes.trim() ? `\n\nEDITOR NOTES FROM USER: ${notes.trim()}` : "";

  const result = await callAnthropicJson<any[]>({
    model: "claude-haiku-4-5-20251001",
    maxTokens: 4000,
    messages: [
      {
        role: "user",
        content: `You are a senior academic editor. Carefully read the document below and identify corrections and improvements.

For each issue, return a JSON object with:
- "type": one of "grammar" | "style" | "structure" | "argument" | "register"
- "explanation": a concise description of the issue (1–2 sentences)
- "original": the EXACT phrase or sentence from the document that needs changing (copy it verbatim — it must be findable via string search)
- "corrected": your improved version

TYPE DEFINITIONS:
- grammar: spelling, punctuation, subject-verb agreement, tense consistency, article use
- style: wordiness, passive voice, weak verbs, clichés, sentence variety
- structure: paragraph organisation, topic sentences, transitions, logical flow
- argument: claim strength, evidence gaps, reasoning, specificity, analytical depth
- register: tone mismatch, formality level, second-person intrusion, informal phrasing in academic text

RULES:
- Only flag genuine issues — do not invent problems
- "original" must be a verbatim substring of the document (max ~120 chars)
- "corrected" must be a drop-in replacement for "original"
- Aim for 5–20 high-value corrections
- Return a JSON array (no wrapper object)${notesLine}

DOCUMENT:
${truncated}`,
      },
    ],
  });

  if (!Array.isArray(result)) return [];
  let counter = 0;
  return result
    .filter((item: any) =>
      item &&
      typeof item.original === "string" && item.original.trim() &&
      typeof item.corrected === "string" && item.corrected.trim() &&
      typeof item.explanation === "string"
    )
    .map((item: any): CorrectionItem => ({
      id: `c-${++counter}`,
      type: ["grammar", "style", "structure", "argument", "register"].includes(item.type)
        ? item.type
        : "style",
      explanation: item.explanation.trim(),
      original: item.original.trim(),
      corrected: item.corrected.trim(),
    }));
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const correctionNotes: string = body.correctionNotes || "";
    let originalText = "";

    if (body.docxBase64) {
      originalText = await extractDocxText(body.docxBase64);
    } else if (body.plainText) {
      originalText = body.plainText;
    } else {
      return new Response(
        JSON.stringify({ error: "Provide docxBase64 or plainText" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!originalText.trim()) {
      return new Response(
        JSON.stringify({ error: "Document appears to be empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const items = await scanForCorrections(originalText, correctionNotes);

    return new Response(JSON.stringify({ items, originalText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[czar-parse-corrections] error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
