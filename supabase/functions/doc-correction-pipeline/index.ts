// Tool Processing Pipeline — Document Correction (structure-preserving)
//
// Activated when the user opts into "Edit in document" mode.
// Flow:
//   1. Download the uploaded .docx / .pdf from Supabase Storage
//   2. Parse into STRUCTURED BLOCKS (paragraph / heading / list / reference)
//   3. Persist blocks + plain text + tracked changes to document_corrections
//   4. Run an agentic Claude loop with block-aware tools:
//        • read_document_with_annotations  — returns block list + annotations
//        • apply_targeted_correction       — edits inside one block_index
//        • web_search                      — Tavily real-time grounding
//   5. Stream SSE events: meta, tool, message, status, correction_done, error, done
//   6. Run inside EdgeRuntime.waitUntil so a closed tab never aborts the work.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY") || "";

// ─── Helpers ────────────────────────────────────────────────────────────────

function sse(evt: string, data: unknown): string {
  return `event: ${evt}\ndata: ${JSON.stringify(data)}\n\n`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// ─── Block model ────────────────────────────────────────────────────────────

type BlockKind = "heading1" | "heading2" | "heading3" | "list" | "reference" | "paragraph";

interface DocBlock {
  index: number;
  kind: BlockKind;
  text: string;          // plain text (no <mark>)
  html: string;          // text + any applied <mark> tags
  list_level?: number;   // 0+ when kind === "list"
  protected?: boolean;   // true for reference entries (don't edit unless user asks)
}

interface DocAnnotations {
  tracked_insertions: Array<{ text: string; author?: string }>;
  tracked_deletions: Array<{ text: string; author?: string }>;
  comments: Array<{ id: string; author?: string; text: string; anchor?: string }>;
}

// ─── DOCX parsing — STRUCTURE-PRESERVING ────────────────────────────────────

async function parseDocx(bytes: Uint8Array): Promise<{ blocks: DocBlock[]; annotations: DocAnnotations }> {
  const { unzipSync, strFromU8 } = await import("https://esm.sh/fflate@0.8.2");
  const files = unzipSync(bytes);

  const rawXml = files["word/document.xml"] ? decodeXml(strFromU8(files["word/document.xml"])) : "";
  const commentsXml = files["word/comments.xml"] ? decodeXml(strFromU8(files["word/comments.xml"])) : "";

  // ── Walk every <w:p> in document order ──
  const blocks: DocBlock[] = [];
  const paraRe = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  let pm: RegExpExecArray | null;
  let inReferenceSection = false;

  // Heuristic detectors used in addition to Word style ids.
  const isHeadingText = (t: string): "heading1" | "heading2" | "heading3" | null => {
    const s = t.trim();
    if (!s || s.length > 140) return null;
    // Front-matter and dissertation prelim headings.
    if (/^(abstract|acknowledgements?|declaration|dedication|table of contents?|list of (figures?|tables?|abbreviations?)|references?|reference list|bibliography|works cited|appendix|appendices)\.?$/i.test(s)) return "heading1";
    // CHAPTER ONE / CHAPTER 1 etc.
    if (/^chapter\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/i.test(s)) return "heading1";
    // Numbered sections like "1.", "1.2", "3.4.1"
    if (/^\d+(\.\d+){0,3}\.?\s+\S/.test(s)) {
      const dots = (s.match(/\./g) || []).length;
      if (dots <= 1) return "heading2";
      return "heading3";
    }
    // ALL CAPS short line — likely a heading.
    if (s.length <= 80 && /^[A-Z0-9 ,:'’\-&()]+$/.test(s) && /[A-Z]{3,}/.test(s)) return "heading1";
    return null;
  };

  // TOC entry: heading-like text followed by dot leader and a page number, e.g.
  // "1.1. Background to Study 1" or "ACKNOWLEDGEMENT......... iii".
  const isTocLine = (t: string): boolean => {
    const s = t.trim();
    if (!s) return false;
    if (/\.{3,}\s*\S+$/.test(s)) return true;
    if (/\s+(\d{1,3}|[ivxlcdm]{1,5})$/i.test(s) && s.length < 120) return true;
    return false;
  };

  // Page-number-only or running header.
  const isStructuralNoise = (t: string): boolean => {
    const s = t.trim();
    if (!s) return true;
    if (/^[ivxlcdm]{1,5}$/i.test(s)) return true;          // roman page number
    if (/^\d{1,4}$/.test(s)) return true;                  // arabic page number
    if (/^[A-Z0-9]{6,}\s+\d{1,4}$/.test(s)) return true;   // student id + page
    return false;
  };

  let inToc = false;

  while ((pm = paraRe.exec(rawXml)) !== null) {
    const inner = pm[1];

    // Extract text (ignoring tracked-deletion content).
    let text = "";
    const runRe = /<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g;
    let rm: RegExpExecArray | null;
    const innerNoDel = inner.replace(/<w:del\b[\s\S]*?<\/w:del>/g, "");
    if (!/<w:r\b/.test(innerNoDel)) {
      text = innerNoDel.replace(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g, (_, t) => t).replace(/<[^>]+>/g, "").trim();
    } else {
      while ((rm = runRe.exec(innerNoDel)) !== null) {
        const runInner = rm[1];
        const piece = runInner
          .replace(/<w:tab\b[^>]*\/?>/g, " ")
          .replace(/<w:br\b[^>]*\/?>/g, "\n")
          .replace(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g, (_, t) => t)
          .replace(/<[^>]+>/g, "");
        text += piece;
      }
      text = text.replace(/[ \t]+/g, " ").trim();
    }

    // Word style / numbering hints.
    const styleMatch = inner.match(/<w:pStyle\s+w:val="([^"]+)"/);
    const styleId = (styleMatch?.[1] || "").toLowerCase();
    const numMatch = inner.match(/<w:numPr\b[\s\S]*?<\/w:numPr>/);
    const ilvlMatch = numMatch?.[0]?.match(/<w:ilvl\s+w:val="(\d+)"/);

    let kind: BlockKind = "paragraph";
    let listLevel: number | undefined;

    if (/heading1|heading 1|title$/.test(styleId)) kind = "heading1";
    else if (/heading2|heading 2/.test(styleId)) kind = "heading2";
    else if (/heading3|heading 3|heading4|heading5|heading6/.test(styleId)) kind = "heading3";
    else if (numMatch) { kind = "list"; listLevel = ilvlMatch ? parseInt(ilvlMatch[1]) : 0; }
    else {
      // Heuristic heading detection — only when no Word style told us otherwise.
      const h = isHeadingText(text);
      if (h) kind = h;
    }

    // Track TOC region (between "Table of Contents" and the next chapter/section).
    if (kind.startsWith("heading") && /^table of contents?\.?$/i.test(text.trim())) {
      inToc = true;
    } else if (kind === "heading1" && /^(chapter|abstract|references?|bibliography|appendix)\b/i.test(text.trim())) {
      inToc = false;
    }
    if (inToc && kind === "paragraph" && isTocLine(text)) {
      kind = "paragraph";
      // Mark TOC lines protected via a separate flag below.
    }

    // References-section detection (sticky once entered).
    if (/^(references|bibliography|works\s+cited|reference\s+list)\.?$/i.test(text.trim())) {
      inReferenceSection = true;
      if (kind === "paragraph") kind = "heading1"; // promote so it renders as a heading
    } else if (kind === "heading1" && /^(appendix|appendices)\b/i.test(text.trim())) {
      inReferenceSection = false;
    }
    if (inReferenceSection && kind === "paragraph" && text.trim().length > 0) {
      kind = "reference";
    }

    if (!text.trim()) continue;

    const isToc = inToc && (kind === "paragraph" || kind.startsWith("heading")) && isTocLine(text);
    const isNoise = isStructuralNoise(text);
    const isProtected = kind === "reference" || isToc || isNoise || kind.startsWith("heading");

    blocks.push({
      index: blocks.length,
      kind,
      text,
      html: text,
      list_level: listLevel,
      protected: isProtected,
    });
  }

  // ── Annotations ──
  const annotations: DocAnnotations = { tracked_insertions: [], tracked_deletions: [], comments: [] };

  const insRe = /<w:ins\b[^>]*w:author="([^"]*)"[^>]*>([\s\S]*?)<\/w:ins>/g;
  let m: RegExpExecArray | null;
  while ((m = insRe.exec(rawXml)) !== null) {
    const author = m[1];
    const text = m[2].replace(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g, (_, t) => t).replace(/<[^>]+>/g, "").trim();
    if (text) annotations.tracked_insertions.push({ text, author });
  }

  const delRe = /<w:del\b[^>]*w:author="([^"]*)"[^>]*>([\s\S]*?)<\/w:del>/g;
  while ((m = delRe.exec(rawXml)) !== null) {
    const author = m[1];
    const text = m[2].replace(/<w:delText[^>]*>([\s\S]*?)<\/w:delText>/g, (_, t) => t).replace(/<[^>]+>/g, "").trim();
    if (text) annotations.tracked_deletions.push({ text, author });
  }

  if (commentsXml) {
    const commentRe = /<w:comment\b[^>]*w:id="([^"]*)"[^>]*(?:w:author="([^"]*)")?[^>]*>([\s\S]*?)<\/w:comment>/g;
    while ((m = commentRe.exec(commentsXml)) !== null) {
      const id = m[1];
      const author = m[2] || undefined;
      const text = m[3].replace(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g, (_, t) => t).replace(/<[^>]+>/g, "").trim();
      if (text) annotations.comments.push({ id, author, text });
    }
  }

  return { blocks, annotations };
}

// ─── PDF parsing — text only, one block per non-empty line ──────────────────

async function parsePdf(bytes: Uint8Array): Promise<{ blocks: DocBlock[]; annotations: DocAnnotations }> {
  const empty: DocAnnotations = { tracked_insertions: [], tracked_deletions: [], comments: [] };
  try {
    const { getDocumentProxy, extractText } = await import("https://esm.sh/unpdf@0.12.1");
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    const lines = (text || "").split(/\n{1,}/).map((l) => l.trim()).filter(Boolean);
    let inRefs = false;
    const blocks: DocBlock[] = lines.map((line, i) => {
      if (/^(references|bibliography|works\s+cited)\.?$/i.test(line)) inRefs = true;
      const kind: BlockKind = inRefs && i > 0 && !/^(references|bibliography|works\s+cited)\.?$/i.test(line)
        ? "reference"
        : "paragraph";
      return { index: i, kind, text: line, html: line, protected: kind === "reference" };
    });
    return { blocks, annotations: empty };
  } catch {
    return { blocks: [], annotations: empty };
  }
}

// ─── Render blocks to a flat string (with markers) for the model ────────────

function blocksToPromptText(blocks: DocBlock[]): string {
  return blocks
    .map((b) => {
      const tag =
        b.kind === "heading1" ? "[H1]" :
        b.kind === "heading2" ? "[H2]" :
        b.kind === "heading3" ? "[H3]" :
        b.kind === "list"     ? `[LIST L${b.list_level ?? 0}]` :
        b.kind === "reference"? "[REF — DO NOT EDIT]" :
                                "[¶]";
      return `[${b.index}] ${tag} ${b.text}`;
    })
    .join("\n\n");
}

function blocksToFlatHtml(blocks: DocBlock[]): string {
  return blocks
    .map((b) => {
      const prefix =
        b.kind === "heading1" ? "# " :
        b.kind === "heading2" ? "## " :
        b.kind === "heading3" ? "### " :
        b.kind === "list"     ? "- " :
                                "";
      return prefix + b.html;
    })
    .join("\n\n");
}

// ─── Apply <mark> highlight to ONE block ───────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  low: "#fef08a",
  medium: "#bfdbfe",
  high: "#fecaca",
};

function applyMarkToBlock(
  block: DocBlock,
  originalText: string,
  correctedText: string,
  severity: "low" | "medium" | "high",
): { ok: boolean; reason?: string } {
  const color = SEVERITY_COLORS[severity] || SEVERITY_COLORS.low;
  const marked = `<mark style="background-color: ${color}">${correctedText}</mark>`;

  if (block.html.includes(originalText)) {
    block.html = block.html.replace(originalText, marked);
    block.text = block.text.replace(originalText, correctedText);
    return { ok: true };
  }
  // Whitespace-tolerant fallback
  const compact = originalText.trim().replace(/\s+/g, " ");
  if (!compact) return { ok: false, reason: "empty original_text" };
  const escaped = compact.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\ /g, "\\s+");
  const re = new RegExp(escaped);
  if (re.test(block.html)) {
    block.html = block.html.replace(re, marked);
    block.text = block.text.replace(re, correctedText);
    return { ok: true };
  }
  return { ok: false, reason: "text not found in block" };
}

// ─── Tavily web search ──────────────────────────────────────────────────────

async function tavilySearch(query: string): Promise<string> {
  if (!TAVILY_API_KEY) return "Web search unavailable (no TAVILY_API_KEY configured).";
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: TAVILY_API_KEY, query, max_results: 5, search_depth: "basic" }),
    });
    if (!res.ok) return `Search failed: ${res.status}`;
    const data = await res.json();
    const results = (data.results || []).slice(0, 5).map((r: any) => {
      const cleaned = stripHtml(r.content || r.snippet || "");
      return `**${r.title}** (${r.url})\n${cleaned}`;
    }).join("\n\n");
    return results || "No results found.";
  } catch (e: any) {
    return `Search error: ${e.message}`;
  }
}

// ─── Tool definitions ──────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "read_document_with_annotations",
    description: "Returns the document as an ordered list of numbered blocks (paragraphs, headings, list items, reference entries) plus any tracked changes/comments. Always call this first.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "apply_targeted_correction",
    description: "Edits a small substring INSIDE a single block (identified by block_index). Use one call per correction. The original_text must be an exact substring of that block.",
    input_schema: {
      type: "object",
      properties: {
        block_index: { type: "integer", description: "The [N] index of the block to edit, exactly as shown in read_document_with_annotations." },
        original_text: { type: "string", description: "The exact substring of the block to replace." },
        corrected_text: { type: "string", description: "The replacement text." },
        severity: { type: "string", enum: ["low", "medium", "high"], description: "low=yellow (style), medium=blue (clarity), high=red (factual)." },
        reason: { type: "string", description: "Brief explanation." },
      },
      required: ["block_index", "original_text", "corrected_text", "severity"],
    },
  },
  {
    name: "web_search",
    description: "Search the web for facts, claims, or sources to ground a correction.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
];

type ToolName = "read_document_with_annotations" | "apply_targeted_correction" | "web_search";

// ─── Main handler ──────────────────────────────────────────────────────────

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

  let body: {
    storage_path: string; filename: string; mime: string; user_message: string;
    conversation_id?: string | null; model_id?: string | null;
  };
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { storage_path, filename, mime, user_message, conversation_id, model_id } = body;
  if (!storage_path || !filename) {
    return new Response(JSON.stringify({ error: "storage_path and filename required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Resolve which model + provider runs the correction loop.
  // All CZAR models support document corrections — Claude uses the native
  // Anthropic tool loop, GPT-5.2 / Gemini route through the Lovable Gateway,
  // and Qwen routes through DashScope. All non-Claude providers use an
  // OpenAI-compatible tool-calling loop.
  type Provider = "anthropic" | "lovable" | "qwen";
  let provider: Provider = "anthropic";
  let correctionModel = "claude-sonnet-4-5";
  switch (model_id) {
    case "claude-opus-4-7":
    case "claude-opus-4-6":
      provider = "anthropic"; correctionModel = "claude-opus-4-5"; break;
    case "claude-haiku-4-5-20251001":
      provider = "anthropic"; correctionModel = "claude-haiku-4-5-20251001"; break;
    case "gpt-5.2":
      provider = "lovable"; correctionModel = "openai/gpt-5.2"; break;
    case "gemini-3-pro":
      provider = "lovable"; correctionModel = "google/gemini-3-flash-preview"; break;
    case "qwen3.6-plus":
      provider = "qwen"; correctionModel = "qwen3.6-plus"; break;
    case "claude-sonnet-4-6":
    default:
      provider = "anthropic"; correctionModel = "claude-sonnet-4-5"; break;
  }
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
  const DASHSCOPE_API_KEY = Deno.env.get("DASHSCOPE_API_KEY") || "";

  // ── Stream setup ──
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  let writerClosed = false;
  const emit = async (evt: string, data: unknown) => {
    if (writerClosed) return;
    try { await writer.write(enc.encode(sse(evt, data))); } catch { writerClosed = true; }
  };

  let convId: string | null = conversation_id || null;
  let assistantMessageId: string | null = null;
  let streamingContent = "";

  const ensureConvAndUserMsg = async () => {
    if (!convId) {
      const title = (user_message || filename).slice(0, 60).trim() || "Document corrections";
      const { data: convRow, error: convErr } = await sb
        .from("czar_conversations")
        .insert({ user_id: user.id, title })
        .select("id").single();
      if (convErr || !convRow) throw new Error(`Could not create conversation: ${convErr?.message}`);
      convId = convRow.id;
    }
    await sb.from("czar_messages").insert({
      conversation_id: convId, user_id: user.id, role: "user",
      content: user_message || `Edit in document: ${filename}`,
      metadata: { attachments: [{ filename, mime, path: storage_path }], doc_correction_request: true },
    });
    await sb.from("czar_conversations")
      .update({ last_user_message: (user_message || filename).slice(0, 200), updated_at: new Date().toISOString() })
      .eq("id", convId);
  };

  // ── Pipeline (runs inside waitUntil so it survives client disconnects) ──
  const run = async () => {
    let documentId: string | null = null;
    try {
      await ensureConvAndUserMsg();

      // 1. Download
      const { data: fileData, error: dlErr } = await sb.storage.from("czar-uploads").download(storage_path);
      if (dlErr || !fileData) { await emit("error", { message: `Could not download file: ${dlErr?.message}` }); return; }
      const bytes = new Uint8Array(await fileData.arrayBuffer());

      // 2. Parse into blocks
      const isDocx = filename.toLowerCase().endsWith(".docx") || mime.includes("officedocument.wordprocessingml");
      const isPdf = filename.toLowerCase().endsWith(".pdf") || mime === "application/pdf";

      let blocks: DocBlock[] = [];
      let annotations: DocAnnotations = { tracked_insertions: [], tracked_deletions: [], comments: [] };

      if (isDocx) {
        const parsed = await parseDocx(bytes);
        blocks = parsed.blocks; annotations = parsed.annotations;
      } else if (isPdf) {
        const parsed = await parsePdf(bytes);
        blocks = parsed.blocks; annotations = parsed.annotations;
      } else {
        const txt = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
        blocks = txt.split(/\n{2,}/).map((t, i) => ({
          index: i, kind: "paragraph" as BlockKind, text: t.trim(), html: t.trim(),
        })).filter((b) => b.text);
      }

      if (blocks.length === 0) {
        await emit("error", {
          message: isPdf
            ? "Could not extract text from this PDF. Make sure it is a text-based PDF (not a scanned image)."
            : "Could not extract text from this document. Make sure it is a standard .docx file.",
        });
        return;
      }

      const parsedText = blocks.map((b) => b.text).join("\n\n");

      // 3. Persist
      const { data: docRow, error: insertErr } = await sb
        .from("document_corrections")
        .insert({
          user_id: user.id,
          conversation_id: convId,
          original_storage_path: storage_path,
          original_filename: filename,
          original_format: isDocx ? "docx" : isPdf ? "pdf" : "txt",
          parsed_text: parsedText,
          parsed_blocks: blocks,
          corrected_blocks: blocks,
          corrected_html: blocksToFlatHtml(blocks),
          annotations,
          status: "processing",
        })
        .select("id").single();

      if (insertErr || !docRow) { await emit("error", { message: `Failed to store document: ${insertErr?.message}` }); return; }
      documentId = docRow.id;

      const { data: asstRow } = await sb.from("czar_messages").insert({
        conversation_id: convId, user_id: user.id, role: "assistant", content: "",
        model_used: correctionModel,
        metadata: { document_id: documentId, filename, kind: "doc_correction" },
      }).select("id").single();
      assistantMessageId = asstRow?.id || null;

      await emit("meta", { document_id: documentId, filename, conversation_id: convId, assistant_id: assistantMessageId });
      await emit("status", { state: "processing", message: "Reading document…" });

      const corrections: Array<{ block_index: number; original: string; corrected: string; severity: string; reason: string }> = [];

      // 4. System prompt — explicit structure rules
      const refCount = blocks.filter((b) => b.kind === "reference").length;
      const headingCount = blocks.filter((b) => b.kind.startsWith("heading")).length;
      const userMsg = (user_message || "").toLowerCase();
      const userWantsReferenceWork = /\b(reference|bibliograph|citation|works cited)\b/i.test(userMsg);
      const userWantsHeadingWork = /\b(heading|title|section title|toc|table of contents)\b/i.test(userMsg);
      const userWantsRewrite = /\b(rewrite|rephrase|reword|paraphrase|restructure|expand|shorten|summari[sz]e)\b/i.test(userMsg);

      const systemPrompt = `You are a precise document correction assistant editing inside a structured document. Your job is to PRESERVE the document and only fix what genuinely needs fixing.

The document is split into numbered blocks. You will see them as:
[INDEX] [KIND] text...

ABSOLUTE HARD RULES — never violate:
1. Edit text ONLY by calling apply_targeted_correction with a block_index. Never produce rewrites in chat.
2. Each correction edits a small substring INSIDE one block. Never split, merge, reorder, move, or delete blocks.
3. Headings, list items, and reference entries keep their kind. Never change a block's kind.
4. ${userWantsReferenceWork
        ? `The user asked about references — you MAY edit reference entries (kind=reference, ${refCount} found), one entry at a time.`
        : `Reference entries (kind=reference, ${refCount} found) are PROTECTED. Do NOT edit them. Skip silently.`}
5. ${userWantsHeadingWork
        ? `The user asked about headings/TOC — heading edits ARE allowed.`
        : `Headings (${headingCount}) and Table-of-Contents lines are PROTECTED. Do NOT edit them. Skip silently.`}
6. Page numbers, running headers, and student-id lines are PROTECTED. Skip silently.
7. original_text MUST be an exact substring of that block's current text.
8. ${userWantsRewrite
        ? `The user asked for rewriting — larger replacements are allowed.`
        : `Each correction must be SURGICAL — replace at most ~20 words at a time. Never rewrite a whole paragraph. If a paragraph needs many small fixes, make many small calls.`}
9. Severity: high (red) = factual/structural error, medium (cyan) = clarity, low (yellow) = grammar/style/typo.
10. Preserve the author's voice, terminology, citation style, and structure. Never change British/American spelling. Never reorder sentences.

Workflow:
- Step 1: Call read_document_with_annotations.
- Step 2: Walk the document top-to-bottom, applying surgical corrections. SKIP protected blocks unless the user explicitly asked you to touch them.
- Step 3: Use web_search ONLY when you need to verify a specific factual claim before correcting it.
- Step 4: When you have reviewed every editable block, write ONE short summary in chat (max 6 lines) listing what you changed by block index. Do not restate the document.`;

      // 5. Agentic loop
      const messages: Array<{ role: string; content: any }> = [
        { role: "user", content: user_message || "Please review and correct this document." },
      ];

      const MAX_ITERATIONS = 60;
      let iterations = 0;
      let consecutiveFailures = 0;

      while (iterations < MAX_ITERATIONS) {
        iterations++;

        // Build a normalized model call that works with Anthropic, Lovable
        // Gateway (GPT-5.2 / Gemini), and DashScope (Qwen). All three return
        // the same shape: { contentBlocks, stopReason } where contentBlocks is
        // an Anthropic-style mix of {type:"text", text} and
        // {type:"tool_use", id, name, input} entries.
        async function callModel(): Promise<{ contentBlocks: any[]; stopReason: string }> {
          if (provider === "anthropic") {
            const r = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: correctionModel,
                max_tokens: 16384,
                system: systemPrompt,
                tools: TOOLS,
                messages,
              }),
            });
            if (!r.ok) {
              const t = await r.text().catch(() => "");
              const err: any = new Error(`Anthropic ${r.status}: ${t.slice(0, 300)}`);
              err.status = r.status; err.body = t;
              throw err;
            }
            const data = await r.json();
            return { contentBlocks: data.content || [], stopReason: data.stop_reason || "end_turn" };
          }

          // OpenAI-compatible providers (Lovable Gateway, DashScope/Qwen).
          const url = provider === "qwen"
            ? "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions"
            : "https://ai.gateway.lovable.dev/v1/chat/completions";
          const key = provider === "qwen" ? DASHSCOPE_API_KEY : LOVABLE_API_KEY;
          if (!key) {
            const err: any = new Error(provider === "qwen" ? "DashScope API key not configured." : "Lovable AI key not configured.");
            err.status = 500;
            throw err;
          }

          // Translate Anthropic-shaped messages into OpenAI-style
          // (system/user/assistant + tool messages).
          const oaiMessages: any[] = [{ role: "system", content: systemPrompt }];
          for (const m of messages) {
            if (typeof m.content === "string") {
              oaiMessages.push({ role: m.role, content: m.content });
              continue;
            }
            if (m.role === "assistant") {
              // Anthropic assistant content blocks → OpenAI assistant message
              // with optional tool_calls.
              const text = (m.content as any[]).filter((c: any) => c.type === "text").map((c: any) => c.text).join("");
              const toolCalls = (m.content as any[]).filter((c: any) => c.type === "tool_use").map((c: any) => ({
                id: c.id, type: "function",
                function: { name: c.name, arguments: JSON.stringify(c.input || {}) },
              }));
              const am: any = { role: "assistant", content: text || "" };
              if (toolCalls.length) am.tool_calls = toolCalls;
              oaiMessages.push(am);
            } else {
              // user role with tool_result blocks → multiple "tool" role messages
              for (const c of m.content as any[]) {
                if (c?.type === "tool_result") {
                  oaiMessages.push({ role: "tool", tool_call_id: c.tool_use_id, content: String(c.content ?? "") });
                } else if (typeof c === "string") {
                  oaiMessages.push({ role: "user", content: c });
                } else if (c?.type === "text") {
                  oaiMessages.push({ role: "user", content: c.text });
                }
              }
            }
          }

          const oaiTools = TOOLS.map((t) => ({
            type: "function",
            function: { name: t.name, description: t.description, parameters: t.input_schema },
          }));

          const r = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: correctionModel,
              messages: oaiMessages,
              tools: oaiTools,
              tool_choice: "auto",
            }),
          });
          if (!r.ok) {
            const t = await r.text().catch(() => "");
            const err: any = new Error(`${provider} ${r.status}: ${t.slice(0, 300)}`);
            err.status = r.status; err.body = t;
            throw err;
          }
          const data = await r.json();
          const choice = data.choices?.[0];
          const msg = choice?.message || {};
          const blocks: any[] = [];
          if (msg.content) blocks.push({ type: "text", text: String(msg.content) });
          if (Array.isArray(msg.tool_calls)) {
            for (const tc of msg.tool_calls) {
              let input: any = {};
              try { input = tc?.function?.arguments ? JSON.parse(tc.function.arguments) : {}; } catch { input = {}; }
              blocks.push({ type: "tool_use", id: tc.id, name: tc?.function?.name, input });
            }
          }
          const finish = choice?.finish_reason;
          const stopReason = finish === "tool_calls" || (Array.isArray(msg.tool_calls) && msg.tool_calls.length) ? "tool_use" : "end_turn";
          return { contentBlocks: blocks, stopReason };
        }

        // Retry transient errors with exponential backoff (up to 5 attempts)
        let modelResult: { contentBlocks: any[]; stopReason: string } | null = null;
        let lastErrTxt = "";
        let lastStatus = 0;
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            modelResult = await callModel();
            break;
          } catch (e: any) {
            lastErrTxt = e?.message || "model error";
            lastStatus = e?.status || 0;
            const transient = lastStatus === 429 || lastStatus === 529 || lastStatus >= 500 || lastStatus === 0;
            if (!transient) break;
            await emit("status", { state: "retrying", message: `AI service busy — retrying in ${Math.round(0.8 * Math.pow(2, attempt))}s…` });
            await new Promise((r) => setTimeout(r, 800 * Math.pow(2, attempt)));
          }
        }

        if (!modelResult) {
          consecutiveFailures++;
          if (consecutiveFailures < 2) {
            await emit("status", { state: "retrying", message: "AI service interrupted — pausing 30s then resuming…" });
            await new Promise((r) => setTimeout(r, 30000));
            iterations--;
            continue;
          }
          if (corrections.length > 0) {
            const warn = `\n\nThe AI service became unavailable after applying ${corrections.length} correction${corrections.length === 1 ? "" : "s"}. Your progress is saved — you can download the partial result now.`;
            streamingContent += warn;
            await emit("message", { delta: warn });
          } else {
            await emit("error", { message: `AI error (${lastStatus}): ${lastErrTxt.slice(0, 300) || "service unavailable"}` });
          }
          break;
        }

        consecutiveFailures = 0;
        const stopReason = modelResult.stopReason;
        const contentBlocks = modelResult.contentBlocks;

        const textBlocks = contentBlocks.filter((b: any) => b.type === "text");
        for (const tb of textBlocks) {
          if (tb.text) {
            streamingContent += tb.text;
            await emit("message", { delta: tb.text });
          }
        }

        messages.push({ role: "assistant", content: contentBlocks });

        if (stopReason !== "tool_use") break;

        const toolUseBlocks = contentBlocks.filter((b: any) => b.type === "tool_use");
        const toolResults: Array<{ type: "tool_result"; tool_use_id: string; content: string }> = [];

        for (const toolCall of toolUseBlocks) {
          const toolName: ToolName = toolCall.name;
          const toolInput = toolCall.input || {};
          const toolId = toolCall.id;

          await emit("tool", { id: toolId, name: toolName, phase: "start", input: toolInput });

          let result = "";
          try {
            if (toolName === "read_document_with_annotations") {
              const docDump = blocksToPromptText(blocks);
              const annotationSummary = [
                annotations.tracked_insertions.length > 0
                  ? `**Tracked Insertions (${annotations.tracked_insertions.length}):**\n${annotations.tracked_insertions.map((i) => `- "${i.text}"${i.author ? ` (by ${i.author})` : ""}`).join("\n")}`
                  : null,
                annotations.tracked_deletions.length > 0
                  ? `**Tracked Deletions (${annotations.tracked_deletions.length}):**\n${annotations.tracked_deletions.map((d) => `- "${d.text}"${d.author ? ` (by ${d.author})` : ""}`).join("\n")}`
                  : null,
                annotations.comments.length > 0
                  ? `**Reviewer Comments (${annotations.comments.length}):**\n${annotations.comments.map((c) => `- Comment${c.author ? ` by ${c.author}` : ""}: "${c.text}"`).join("\n")}`
                  : null,
              ].filter(Boolean).join("\n\n");
              result = `## Document (${blocks.length} blocks)\n\n${docDump}\n\n${annotationSummary ? `## Annotations\n\n${annotationSummary}` : "No tracked changes or comments."}`;

            } else if (toolName === "apply_targeted_correction") {
              const { block_index, original_text, corrected_text, severity, reason } = toolInput as {
                block_index: number; original_text: string; corrected_text: string;
                severity: "low" | "medium" | "high"; reason?: string;
              };
              if (block_index === undefined || !original_text || !corrected_text || !severity) {
                result = "Error: block_index, original_text, corrected_text, and severity are all required.";
              } else if (block_index < 0 || block_index >= blocks.length) {
                result = `Error: block_index ${block_index} is out of range (0–${blocks.length - 1}).`;
              } else {
                const block = blocks[block_index];

                // Guard 1: protected blocks (headings/refs/TOC/page numbers).
                const isHeading = block.kind.startsWith("heading");
                const isRef = block.kind === "reference";
                if (isRef && !userWantsReferenceWork) {
                  result = `Skipped: block ${block_index} is a reference entry (protected). User did not request reference edits.`;
                } else if (isHeading && !userWantsHeadingWork) {
                  result = `Skipped: block ${block_index} is a heading (protected). User did not request heading edits.`;
                } else if (block.protected && !isRef && !isHeading && !userWantsHeadingWork) {
                  result = `Skipped: block ${block_index} is a protected structural line (TOC entry, page number, or running header).`;
                } else {
                  // Guard 2: surgical-edit limit. Reject replacements > ~25 words
                  // unless user asked for rewriting.
                  const replWords = (corrected_text.trim().split(/\s+/).filter(Boolean) || []).length;
                  const origWords = (original_text.trim().split(/\s+/).filter(Boolean) || []).length;
                  if (!userWantsRewrite && (replWords > 25 || origWords > 25)) {
                    result = `Rejected: that's too large a replacement for proofreading mode (${origWords}→${replWords} words). Break it into smaller surgical edits, or ask the user for a rewrite.`;
                  } else {
                    const res = applyMarkToBlock(block, original_text, corrected_text, severity);
                    if (!res.ok) {
                      result = `Error: could not find "${original_text.slice(0, 80)}" in block ${block_index}. Block currently reads: "${block.text.slice(0, 200)}…". Try a shorter exact substring.`;
                    } else {
                      corrections.push({ block_index, original: original_text, corrected: corrected_text, severity, reason: reason || "" });
                      // Persist surgical delta into annotations.applied_corrections
                      // so the export-corrected-doc edge function can patch the
                      // ORIGINAL .docx package and preserve all formatting.
                      const appliedRecord = {
                        block_index,
                        original_text,
                        corrected_text,
                        severity,
                        reason: reason || "",
                        at: new Date().toISOString(),
                      };
                      const nextAnnotations = {
                        ...annotations,
                        applied_corrections: [
                          ...((annotations as any).applied_corrections || []),
                          appliedRecord,
                        ],
                      };
                      (annotations as any).applied_corrections = nextAnnotations.applied_corrections;
                      // Persist after every successful edit so a tab close never loses work.
                      await sb.from("document_corrections").update({
                        corrected_blocks: blocks,
                        corrected_html: blocksToFlatHtml(blocks),
                        annotations: nextAnnotations,
                        updated_at: new Date().toISOString(),
                      }).eq("id", documentId);
                      await emit("status", { state: "processing", message: `${corrections.length} edit${corrections.length === 1 ? "" : "s"} applied…` });
                      result = `Applied (${severity}) in block ${block_index}: "${original_text.slice(0, 60)}" → "${corrected_text.slice(0, 60)}"`;
                    }
                  }
                }
              }
            } else if (toolName === "web_search") {
              result = await tavilySearch((toolInput as any).query);
            } else {
              result = `Unknown tool: ${toolName}`;
            }
          } catch (e: any) {
            result = `Tool error: ${e.message}`;
            await emit("tool", { id: toolId, name: toolName, phase: "error", error: e.message });
          }

          await emit("tool", { id: toolId, name: toolName, phase: "result", result: result.slice(0, 500) });
          toolResults.push({ type: "tool_result", tool_use_id: toolId, content: result });
        }

        messages.push({ role: "user", content: toolResults });
      }

      // 6. Final persist
      await sb.from("document_corrections").update({
        corrected_blocks: blocks,
        corrected_html: blocksToFlatHtml(blocks),
        correction_summary: `${corrections.length} correction(s) applied.`,
        status: "done",
        updated_at: new Date().toISOString(),
      }).eq("id", documentId);

      if (assistantMessageId) {
        await sb.from("czar_messages").update({
          content: streamingContent,
          metadata: { document_id: documentId, filename, kind: "doc_correction", correction_count: corrections.length },
        }).eq("id", assistantMessageId);
      }

      await emit("status", { state: "done", message: `${corrections.length} edit${corrections.length === 1 ? "" : "s"} ready.` });
      await emit("correction_done", { document_id: documentId, filename, correction_count: corrections.length });
      await emit("done", { document_id: documentId });

    } catch (e: any) {
      if (documentId) {
        await sb.from("document_corrections").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", documentId);
      }
      await emit("error", { message: e?.message || "Pipeline error" });
      await emit("done", {});
    } finally {
      writerClosed = true;
      writer.close().catch(() => {});
    }
  };

  // Run inside waitUntil so a closed browser tab does NOT abort the pipeline.
  // The work continues; the preview panel re-subscribes via Supabase Realtime.
  // @ts-ignore — EdgeRuntime is provided by Supabase Edge Functions.
  if (typeof EdgeRuntime !== "undefined" && (EdgeRuntime as any).waitUntil) {
    // @ts-ignore
    (EdgeRuntime as any).waitUntil(run());
  } else {
    run();
  }

  return new Response(readable as unknown as ReadableStream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});
