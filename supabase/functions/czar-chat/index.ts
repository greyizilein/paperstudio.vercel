// CZAR — single-stream chat function.
// Reads the user's message + every uploaded file (full text), injects the
// CZAR Brain system prompt, picks the model based on tier, and streams the
// reply token-by-token over SSE. No multi-stage pipeline. No JSON envelopes.
//
// This replaces czar-orchestrate, czar-plan, czar-write, and czar-ingest-files.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { CZAR_BRAIN_SYSTEM_PROMPT } from "./brain.ts";
import { pickPlaybook, playbookText, type CzarPlaybook } from "./promptLibrary.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
import { buildPptxBase64, type PptxSpec } from "../_shared/pptx-builder.ts";
const ADMIN_EMAIL = "grey.izilein@gmail.com";

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────
interface AttachmentInput {
  storage_path: string;
  filename: string;
  size: number;
  mime: string;
}
type CzarMode = "chat" | "plan" | "build" | "agent";
interface ChatRequest {
  conversation_id: string | null;
  user_message: string;
  attachments?: AttachmentInput[];
  think?: boolean;
  mode?: CzarMode;
  settings?: Record<string, any>;
}

// ─────────────────────────────────────────────────────────────────────
// CZAR model routing
//
// Hard rule: the user's chosen model is STICKY. Mode changes (chat / plan /
// build) and the think toggle never silently switch the underlying model.
// The only two exceptions are gated unlocks, not auto-changes:
//
//   • Opus 4.6 — only honoured when the turn is clearly data-analysis,
//     mathematical / programming heavy, OR the user is in Agent mode.
//     Outside those conditions Opus falls back to GPT 5.2 just for that
//     single turn (the user's saved selection is not mutated).
//   • Gemini 3 Pro — locked to image generation. Plain prose requests fall
//     back to Claude Sonnet 4.6 for that turn (the tool path still handles
//     image generation under the hood).
//
// Default when no override is present is GPT 5.2.
// ─────────────────────────────────────────────────────────────────────
function pickWritingModel(tier: string, isAdmin: boolean, think: boolean, toolsRequested: boolean, modelOverride?: string, wantsImage?: boolean, isDataAnalysis?: boolean, isAgentMode?: boolean): {
  provider: "anthropic" | "google" | "qwen";
  model: string;
  thinking: boolean;
  tools: boolean;
} {
  const tools = toolsRequested;

  // Honour the user's explicit selection.
  switch (modelOverride) {
    case "claude-sonnet-4-6":
      return { provider: "anthropic", model: "claude-sonnet-4-6", thinking: think, tools };
    case "gpt-5.2":
      // GPT-5.2 has no agentic tool loop — it cannot call web_search, cite_check,
      // or generate_image. In Agent mode we must use Claude regardless of the
      // user's saved preference (for this turn only; saved selection is untouched).
      if (isAgentMode) {
        return { provider: "anthropic", model: "claude-sonnet-4-6", thinking: true, tools: true };
      }
      return { provider: "google", model: "gemini-2.5-flash", thinking: false, tools: false };
    case "qwen3.6-plus":
      // Qwen runs through DashScope (OpenAI-compatible). No agentic tools yet.
      // Agent mode falls back to Claude, identical to GPT-5.2 behaviour.
      if (isAgentMode) {
        return { provider: "anthropic", model: "claude-sonnet-4-6", thinking: true, tools: true };
      }
      return { provider: "qwen", model: "qwen3.6-plus", thinking: false, tools: false };
    case "claude-opus-4-6":
      // Opus only unlocks for high-level analytical / mathematical /
      // programming work or when the user is in Agent mode. Otherwise
      // silently fall back to GPT 5.2 for THIS turn — never overwrite
      // the user's saved selection.
      if (isDataAnalysis || isAgentMode) {
        return { provider: "anthropic", model: "claude-opus-4-7", thinking: think, tools };
      }
      return { provider: "google", model: "gemini-2.5-flash", thinking: false, tools: false };
    case "gemini-3-pro":
      // Gemini stays image-only. For non-image turns, route through Claude
      // Sonnet 4.6 (with image tool still available) for this turn only.
      return { provider: "anthropic", model: "claude-sonnet-4-6", thinking: think, tools: wantsImage ? true : tools };
  }

  // No explicit model selection. Agent mode always needs Claude — GPT-5.2 has
  // no agentic tool loop and cannot fulfill the autonomous brief.
  if (isAgentMode) {
    return { provider: "anthropic", model: "claude-sonnet-4-6", thinking: true, tools: true };
  }

  // Default: GPT 5.2 for all non-agent turns.
  return { provider: "google", model: "gemini-2.5-flash", thinking: false, tools: false };
}

// ─────────────────────────────────────────────────────────────────────
// File text extraction (Deno-compatible, no native deps)
// ─────────────────────────────────────────────────────────────────────
async function extractFileText(bytes: Uint8Array, filename: string, mime: string): Promise<string> {
  const lower = filename.toLowerCase();
  const isPdf = mime === "application/pdf" || lower.endsWith(".pdf");
  const isDocx = lower.endsWith(".docx") || mime.includes("officedocument.wordprocessingml");
  const isXlsx = lower.endsWith(".xlsx") || lower.endsWith(".xls") || mime.includes("spreadsheetml") || mime.includes("ms-excel");
  const isCsv = lower.endsWith(".csv") || mime === "text/csv";
  const isText =
    mime.startsWith("text/") ||
    /\.(txt|md|json|xml|html|htm|css|js|ts|tsx|jsx|py|java|c|cpp|h|sql|yml|yaml|toml|sh|log|csv|tsv)$/i.test(filename);

  if (isText && !isCsv) {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }
  if (isCsv) {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }
  if (isDocx) {
    return await extractDocx(bytes);
  }
  if (isXlsx) {
    return await extractXlsx(bytes, filename);
  }
  if (isPdf) {
    return await extractPdf(bytes);
  }
  // Unknown binary — best-effort UTF-8
  try {
    const t = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return t.length > 0 ? t : `[Binary file ${filename} — ${bytes.length} bytes — content not text-extractable]`;
  } catch {
    return `[Binary file ${filename} — ${bytes.length} bytes]`;
  }
}

// DOCX = ZIP. Pull word/document.xml + word/footnotes.xml, strip tags.
async function extractDocx(bytes: Uint8Array): Promise<string> {
  try {
    const { unzipSync, strFromU8 } = await import("https://esm.sh/fflate@0.8.2");
    const files = unzipSync(bytes);
    const parts: string[] = [];
    const decodeXml = (s: string) => s
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'");
    const wordText = (xml: string) => decodeXml(xml
      .replace(/<w:tab[^>]*\/>/g, "\t")
      .replace(/<w:br[^>]*\/>/g, "\n")
      .replace(/<\/w:p>/g, "\n\n")
      .replace(/<w:(?:t|delText)[^>]*>([\s\S]*?)<\/w:(?:t|delText)>/g, "$1")
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n")).trim();
    const attr = (attrs: string, name: string) => {
      const m = attrs.match(new RegExp(`w:${name}="([^"]*)"`));
      return m ? decodeXml(m[1]) : "";
    };
    for (const [name, data] of Object.entries(files)) {
      if (name === "word/document.xml" || name.startsWith("word/footnotes") || name.startsWith("word/endnotes") || name.startsWith("word/header") || name.startsWith("word/footer")) {
        const xml = strFromU8(data as Uint8Array);
        const revisions: string[] = [];
        for (const m of xml.matchAll(/<w:(ins|del)\b([^>]*)>([\s\S]*?)<\/w:\1>/g)) {
          const kind = m[1] === "ins" ? "INSERTED" : "DELETED";
          const who = attr(m[2], "author") || "unknown";
          const when = attr(m[2], "date") || "undated";
          const txt = wordText(m[3]).replace(/\s+/g, " ").trim();
          if (txt) revisions.push(`- ${kind} by ${who} (${when}): ${txt}`);
        }
        const text = wordText(xml);
        parts.push(text.trim());
        if (revisions.length) parts.push(`\n\n=== TRACKED CHANGES IN ${name} ===\n${revisions.join("\n")}`);
      }
    }
    const commentsXml = files["word/comments.xml"] ? strFromU8(files["word/comments.xml"] as Uint8Array) : "";
    if (commentsXml) {
      const comments: string[] = [];
      for (const m of commentsXml.matchAll(/<w:comment\b([^>]*)>([\s\S]*?)<\/w:comment>/g)) {
        const id = attr(m[1], "id") || String(comments.length + 1);
        const who = attr(m[1], "author") || "unknown";
        const when = attr(m[1], "date") || "undated";
        const txt = wordText(m[2]).replace(/\s+/g, " ").trim();
        if (txt) comments.push(`- Comment ${id} by ${who} (${when}): ${txt}`);
      }
      parts.push(comments.length ? `\n\n=== WORD COMMENTS ===\n${comments.join("\n")}` : "\n\n=== WORD COMMENTS ===\nNo comment bodies were present in comments.xml.");
    }
    return parts.join("\n\n").trim();
  } catch (e) {
    console.error("[czar-chat] docx extract failed:", (e as Error).message);
    return `[Could not extract DOCX text: ${(e as Error).message}]`;
  }
}

// XLSX → SheetJS, every sheet, every cell, as CSV-like blocks.
async function extractXlsx(bytes: Uint8Array, filename: string): Promise<string> {
  try {
    const XLSX = await import("https://esm.sh/xlsx@0.18.5");
    const wb = XLSX.read(bytes, { type: "array" });
    const out: string[] = [`# Workbook: ${filename}`];
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
      out.push(`\n## Sheet: ${sheetName}\n${csv}`);
    }
    return out.join("\n");
  } catch (e) {
    console.error("[czar-chat] xlsx extract failed:", (e as Error).message);
    return `[Could not extract spreadsheet: ${(e as Error).message}]`;
  }
}

// PDF → unpdf (Deno-compatible, no canvas dependency).
async function extractPdf(bytes: Uint8Array): Promise<string> {
  try {
    const { extractText, getDocumentProxy } = await import("https://esm.sh/unpdf@0.12.1");
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: false });
    const pages = Array.isArray(text) ? text : [text];
    return pages
      .map((t, i) => `--- Page ${i + 1} ---\n${(t || "").replace(/\s+/g, " ").trim()}`)
      .join("\n\n");
  } catch (e) {
    console.error("[czar-chat] pdf extract failed:", (e as Error).message);
    return `[Could not extract PDF text: ${(e as Error).message}]`;
  }
}

// ─────────────────────────────────────────────────────────────────────
// Large-document summarisation (preserve numbers, plurals, headings verbatim)
// ─────────────────────────────────────────────────────────────────────
// Files above this word count are compressed before injection. 10K words ≈ a
// dense 1–1.5 MB PDF — well below the point where raw injection kills speed.
const SUMMARY_THRESHOLD_WORDS = 10_000;
// Smaller chunks = faster individual Gemini calls, better paragraph coherence.
const CHUNK_WORDS = 3_500;
// Workers that run in parallel during summarisation.
const SUMMARISE_CONCURRENCY = 8;

function wordCount(s: string): number {
  return (s || "").trim().split(/\s+/).filter(Boolean).length;
}

// Split on paragraph boundaries so chunk edges never land mid-sentence.
// Paragraphs that individually exceed chunkSize are hard-split as a fallback.
function chunkByWords(text: string, chunkSize: number): string[] {
  const paragraphs = (text || "").split(/\n\n+/);
  const chunks: string[] = [];
  let current: string[] = [];
  let currentWords = 0;
  for (const para of paragraphs) {
    const paraWords = para.trim().split(/\s+/).filter(Boolean).length;
    if (paraWords === 0) continue;
    if (currentWords > 0 && currentWords + paraWords > chunkSize) {
      chunks.push(current.join("\n\n"));
      current = [];
      currentWords = 0;
    }
    // Paragraph alone exceeds limit — hard-split it.
    if (paraWords > chunkSize) {
      const words = para.split(/\s+/);
      for (let i = 0; i < words.length; i += chunkSize) {
        chunks.push(words.slice(i, i + chunkSize).join(" "));
      }
    } else {
      current.push(para);
      currentWords += paraWords;
    }
  }
  if (current.length > 0) chunks.push(current.join("\n\n"));
  return chunks;
}

async function summariseLargeText(
  text: string,
  filename: string,
  onHeartbeat?: () => void,
  onChunkProgress?: (done: number, total: number) => void,
): Promise<string> {
  const chunks = chunkByWords(text, CHUNK_WORDS);
  console.log(`[czar-chat] summarising ${filename}: ${chunks.length} chunks ~${CHUNK_WORDS} w (concurrency=${SUMMARISE_CONCURRENCY})`);
  const sys = `You are a precise document compressor. Preserve EVERY number, percentage, statistic, named entity, heading, plural quantity ("8 tables", "3 case studies"), citation, requirement, and quoted phrase EXACTLY. Lose only filler words and redundant elaboration. Output a structured digest with headings. Never summarise away quantity statements. Keep your output under 800 words.`;

  // Heartbeat ticker so the SSE connection never idles while we summarise.
  const beat = setInterval(() => { try { onHeartbeat?.(); } catch { /* noop */ } }, 8000);

  const results: string[] = new Array(chunks.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= chunks.length) return;
      const usr = `Source: "${filename}" — chunk ${i + 1} of ${chunks.length}\n\n${chunks[i]}`;
      // Per-chunk timeout prevents a single slow gateway call stalling the batch.
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 25_000);
      try {
        const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
          method: "POST",
          signal: ctrl.signal,
          headers: { Authorization: `Bearer ${GOOGLE_AI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gemini-2.5-flash",
            max_tokens: 1500,
            messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
          }),
        });
        const data = await res.json();
        const out = data.choices?.[0]?.message?.content ?? "";
        results[i] = `### Chunk ${i + 1}\n${out}`;
      } catch (e: any) {
        const isTimeout = e?.name === "AbortError";
        results[i] = `### Chunk ${i + 1}\n[${isTimeout ? "Timed out" : "Failed"}; raw excerpt]\n${chunks[i].slice(0, 2000)}`;
      } finally {
        clearTimeout(timer);
      }
      onChunkProgress?.(i + 1, chunks.length);
      onHeartbeat?.();
    }
  }
  try {
    await Promise.all(Array.from({ length: Math.min(SUMMARISE_CONCURRENCY, chunks.length) }, worker));
  } finally {
    clearInterval(beat);
  }
  return `# Compressed digest of "${filename}"\n\n${results.join("\n\n")}`;
}

// ─────────────────────────────────────────────────────────────────────
// Settings manifest — mirrors src/lib/czarSettingsManifest.ts.
// Compiles ALL user-active settings into a highest-priority rules block.
// Previously only 3 fields (language/citation_style/tone) were forwarded;
// every toggle (oxford_comma, british_spelling, ban_filler, etc.) was dropped.
// ─────────────────────────────────────────────────────────────────────
function buildSettingsManifest(settings: Record<string, any>): string {
  if (!settings || typeof settings !== "object" || Object.keys(settings).length === 0) return "";
  const TOGGLE_RULES: Record<string, string> = {
    no_contractions: "Never use contractions (don't, won't, it's, etc.). Always write the full form.",
    section_pause: "Write ONE section at a time. After each section, stop and emit the literal token <<<SECTION_END>>> on its own line. Wait for the user to say 'continue' before writing the next section.",
    ban_filler: "Banned phrases (never use): 'In conclusion', 'In today's fast-paced world', 'It is important to note', 'delve', 'tapestry', 'navigate the landscape', 'leverage', 'in the realm of', 'plays a crucial role'.",
    vary_sentence_length: "Vary sentence length deliberately. Mix short, declarative sentences with longer compound ones. Avoid the AI staccato cadence.",
    british_spelling: "Use British English spelling throughout (colour, organise, behaviour, centre, programme, analyse, recognise).",
    oxford_comma: "Use the Oxford (serial) comma in lists of three or more items.",
    prefer_active_voice: "Prefer active voice. Only use passive when the agent is genuinely unknown or irrelevant.",
    cite_every_claim: "Every evidence-based claim must carry an in-text citation. No floating assertions.",
    academic_register_lock: "Maintain academic register throughout. No casual asides, no rhetorical questions to the reader, no second-person addresses.",
    auto_paragraph_break: "Break paragraphs after 4–5 sentences for readability. Each paragraph must address one focused idea.",
    spell_out_acronyms: "Spell out every acronym in full on first use, with the abbreviation in parentheses. Use the abbreviation thereafter.",
    double_check_numbers: "Re-verify every numerical claim, percentage, year, and statistic before stating it. Round consistently.",
    sources_only_2018_plus: "Only cite sources published in 2018 or later, except for foundational/seminal works which must be flagged as such.",
    include_executive_summary: "Begin the piece with a concise Executive Summary (≈150–200 words) before the main body.",
    include_keywords: "Add a 'Keywords' block of 5–7 comma-separated terms beneath the abstract or intro.",
    include_word_count_per_section: "At the end of each section heading, append the target word count in brackets, e.g. '## Introduction [400 words]'.",
    show_outline_first: "Before writing the body, present the outline as a bulleted list and write '--- BEGIN DRAFT ---' before the first paragraph.",
  };
  const PICKER_RULES: Record<string, (v: string) => string> = {
    language: (v) => `Language variant: ${v === "US" ? "US English" : "UK English"}.`,
    citation_style: (v) => v === "none" ? "Citations: omit unless explicitly requested." : `Citation style: ${v}. Use ${v} formatting for every in-text citation and the References section.`,
    tone: (v) => `Tone & register: ${v.replace(/-/g, " ")}.`,
  };
  const lines: string[] = [];
  for (const [key, fn] of Object.entries(PICKER_RULES)) {
    if (settings[key]) lines.push(`• ${fn(String(settings[key]))}`);
  }
  for (const [key, rule] of Object.entries(TOGGLE_RULES)) {
    if (settings[key] === true) lines.push(`• ${rule}`);
  }
  if (settings.thinking_mode) lines.push("• Thinking mode: spend extra reasoning effort before producing the final draft. Plan, then write.");
  if (settings.allow_online_lookup === false) {
    lines.push("• Online lookup is DISABLED: rely solely on training data. If asked for live figures, say you cannot fetch them right now.");
  }
  if (lines.length === 0) return "";
  return [
    "",
    "===== USER-ACTIVE SETTINGS (HIGHEST PRIORITY — OVERRIDE DEFAULTS) =====",
    ...lines,
    "===== END USER SETTINGS =====",
    "",
  ].join("\n");
}

// ─────────────────────────────────────────────────────────────────────
// Conversation persistence helpers
// ─────────────────────────────────────────────────────────────────────
async function ensureConversation(svc: any, userId: string, conversationId: string | null, firstMessage: string): Promise<string> {
  if (conversationId) return conversationId;
  const title = firstMessage.slice(0, 60).trim() || "New chat";
  const { data, error } = await svc.from("czar_conversations").insert({ user_id: userId, title }).select("id").single();
  if (error) throw new Error(`Could not create conversation: ${error.message}`);
  return data.id;
}

// ─────────────────────────────────────────────────────────────────────
// Billing intent quick-check (no model call)
// ─────────────────────────────────────────────────────────────────────
function detectBillingIntent(msg: string): "upgrade" | null {
  const m = msg.toLowerCase();
  if (/\b(upgrade|subscribe|subscription|pricing|word ?packs?|top ?up|how much|buy (words|pack|plan|czar)|paystack)\b/.test(m)) {
    return "upgrade";
  }
  // "plan" is common academic language (research plan, chapter plan, marked
  // plan). Only treat it as billing when paired with payment language.
  if (/\b(plans?|tiers?)\b/.test(m) && /\b(price|pricing|upgrade|subscribe|payment|billing|paid|word ?pack|czar pack)\b/.test(m)) {
    return "upgrade";
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── Auth ────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Auth failed" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isAdmin = (user.email || "").toLowerCase() === ADMIN_EMAIL;

    // ── Tier lookup ─────────────────────────────────────────────────
    const { data: sub } = await svc.from("czar_subscriptions").select("tier, words_used, word_limit, bonus_words, bonus_used, status").eq("user_id", user.id).maybeSingle();
    const tier = isAdmin ? "phd" : (sub?.tier || "none");

    // ── Body ────────────────────────────────────────────────────────
    const body: ChatRequest = await req.json();
    const userMessage = (body.user_message || "").trim();
    const incomingAttachments = Array.isArray(body.attachments) ? body.attachments : [];
    const mode: CzarMode = body.mode === "plan" || body.mode === "build" || body.mode === "agent" ? body.mode : "chat";
    // Plan and Agent modes force deep thinking ON; user can still toggle Think for chat/build.
    const think = mode === "plan" || mode === "agent" ? true : !!body.think;

    if (!userMessage && incomingAttachments.length === 0) {
      return new Response(JSON.stringify({ error: "Empty message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── EVERYTHING BELOW runs inside the SSE stream so we can heartbeat ─
    // and never trip the 150 s idle timeout while ingesting heavy files.
    return sseResponse(async (write, humaniserAbort) => {
      // Heartbeat every 10 s with a no-op SSE comment until first real bytes flow.
      let firstByteSent = false;
      const heartbeat = setInterval(() => {
        if (!firstByteSent) {
          try { write("ping", { t: Date.now() }); } catch { /* noop */ }
        }
      }, 10_000);
      const stopHeartbeat = () => { firstByteSent = true; clearInterval(heartbeat); };

      try {
        // Ensure conversation row exists
        const conversationId = await ensureConversation(svc, user.id, body.conversation_id, userMessage);

        // Insert user message
        await svc.from("czar_messages").insert({
          conversation_id: conversationId,
          user_id: user.id,
          role: "user",
          content: userMessage,
          metadata: { attachments: incomingAttachments.map((a) => ({ filename: a.filename, mime: a.mime, size: a.size })) },
        });

        // Conversation last-message + auto-title (fire-and-forget OK)
        const { data: convRow } = await svc.from("czar_conversations").select("title, renamed").eq("id", conversationId).maybeSingle();
        const updates: Record<string, any> = { last_user_message: userMessage.slice(0, 200), updated_at: new Date().toISOString() };
        if (convRow && !convRow.renamed && (convRow.title === "New chat" || !convRow.title)) {
          updates.title = userMessage.slice(0, 60) || "New chat";
        }
        svc.from("czar_conversations").update(updates).eq("id", conversationId).then(() => {});

        // Tell the client we're alive and have a conversation id
        write("status", { phase: "starting", conversation_id: conversationId, files: incomingAttachments.length });

        // Billing intent short-circuit
        if (!isAdmin && detectBillingIntent(userMessage) && incomingAttachments.length === 0) {
          const reply = "Pick a CZAR word pack below — checkout is two taps. I'll keep our chat right here.\n\n[OPEN_UPGRADE_MODAL]";
          const { data: billRow } = await svc.from("czar_messages").insert({
            conversation_id: conversationId, user_id: user.id, role: "assistant", content: reply, model_used: "billing-shortcut",
          }).select("id").single();
          stopHeartbeat();
          // CRITICAL: emit meta BEFORE done so the client adopts the new
          // conversation_id and does not wipe its optimistic bubbles.
          write("meta", {
            conversation_id: conversationId,
            assistant_id: billRow?.id,
            model: "billing-shortcut",
            tier: "n/a",
            delivery: null,
            is_build: false,
          });
          write("message", { delta: reply });
          write("done", { conversation_id: conversationId, billing: "upgrade" });
          return;
        }

        // ── Word-limit gate (build / agent turns only) ────────────────
        // Chat and plan turns are free — they don't consume the user's word
        // quota and are always allowed. Only actual writing (build / agent)
        // is gated so users can still ask questions when their pack runs out.
        if (!isAdmin && (mode === "build" || mode === "agent")) {
          const wordsRemaining = (() => {
            if (!sub) return 0;
            if (!sub.tier || sub.tier === "none") {
              return Math.max((sub.bonus_words ?? 0) - (sub.bonus_used ?? 0), 0);
            }
            return Math.max((sub.word_limit ?? 0) - (sub.words_used ?? 0), 0);
          })();
          if (wordsRemaining <= 0) {
            stopHeartbeat();
            write("meta", {
              conversation_id: conversationId,
              model: "billing-shortcut",
              tier: "n/a",
              delivery: null,
              is_build: false,
            });
            write("done", { conversation_id: conversationId, billing: "upgrade" });
            return;
          }
        }

        // ── Ingest NEW attachments in PARALLEL with heartbeats ────────
        // For each file we first check the global czar_file_cache keyed by
        // storage_path. If a hit is found we skip the download + extraction
        // entirely (significant win for large PDFs / DOCX files that were
        // already processed in a previous session or conversation).
        if (incomingAttachments.length > 0) {
          write("status", { phase: "reading_files", count: incomingAttachments.length });
          await Promise.all(incomingAttachments.map(async (att) => {
            try {
              // Cache lookup first — avoids re-downloading + re-extracting
              const { data: cached } = await svc
                .from("czar_file_cache")
                .select("extracted_text, word_count, was_summarized, summary")
                .eq("storage_path", att.storage_path)
                .maybeSingle();

              let text: string;
              let wc: number;
              let summary: string | null;
              let wasSummarised: boolean;

              if (cached?.extracted_text) {
                text = cached.extracted_text;
                wc = cached.word_count ?? wordCount(text);
                summary = cached.summary ?? null;
                wasSummarised = cached.was_summarized ?? false;
                write("status", { phase: "file_ready", filename: att.filename, words: wc, cached: true });
                console.log(`[czar-chat] cache hit for ${att.filename}: ${wc} words`);
              } else {
                const { data: blob, error: dlErr } = await svc.storage.from("czar-uploads").download(att.storage_path);
                if (dlErr || !blob) {
                  console.error(`[czar-chat] download failed for ${att.filename}:`, dlErr?.message);
                  return;
                }
                write("status", { phase: "extracting", filename: att.filename });
                const bytes = new Uint8Array(await blob.arrayBuffer());
                text = await extractFileText(bytes, att.filename, att.mime);
                wc = wordCount(text);
                summary = null;
                wasSummarised = false;
                if (wc > SUMMARY_THRESHOLD_WORDS) {
                  write("status", { phase: "summarising", filename: att.filename, words: wc, chunks: Math.ceil(wc / CHUNK_WORDS) });
                  summary = await summariseLargeText(
                    text,
                    att.filename,
                    () => write("ping", { t: Date.now() }),
                    (done, total) => write("status", { phase: "summarising_chunk", filename: att.filename, chunk: done, total }),
                  );
                  wasSummarised = true;
                }
                write("status", { phase: "file_ready", filename: att.filename, words: wc });
                console.log(`[czar-chat] ingested ${att.filename}: ${wc} words${wasSummarised ? " (summarised)" : ""}`);
                // Write to global cache so future conversations get the fast path
                svc.from("czar_file_cache").upsert({
                  storage_path: att.storage_path,
                  filename: att.filename,
                  mime: att.mime,
                  original_size: att.size,
                  extracted_text: text,
                  summary,
                  word_count: wc,
                  was_summarized: wasSummarised,
                }, { onConflict: "storage_path" }).then(() => {}).catch(() => {});
              }

              await svc.from("czar_conversation_files").insert({
                conversation_id: conversationId,
                user_id: user.id,
                filename: att.filename,
                mime: att.mime,
                storage_path: att.storage_path,
                original_size: att.size,
                extracted_text: text,
                summary,
                word_count: wc,
                role: "other",
                was_summarized: wasSummarised,
              });
            } catch (e) {
              console.error(`[czar-chat] ingest error for ${att.filename}:`, (e as Error).message);
              write("status", { phase: "file_failed", filename: att.filename, error: (e as Error).message });
            }
          }));
        }

        // Pull ALL files in this conversation (for context across turns)
        const { data: allFiles } = await svc
          .from("czar_conversation_files")
          .select("filename, mime, extracted_text, summary, word_count, was_summarized")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        // Pull conversation history (last 30 messages)
        const { data: history } = await svc
          .from("czar_messages")
          .select("role, content")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })
          .limit(60);

        // Build the full prompt
        let fileBlock = "";
        if (allFiles && allFiles.length > 0) {
          const blocks = allFiles.map((f, i) => {
            const body2 = f.was_summarized && f.summary ? f.summary : f.extracted_text;
            return `\n=== FILE ${i + 1}: ${f.filename} (${f.word_count} words${f.was_summarized ? ", compressed digest" : ""}) ===\n${body2}\n=== END FILE ${i + 1} ===\n`;
          }).join("\n");
          fileBlock = `\n\nFILES IN PLAY (read every one fully before writing):\n${blocks}\n\n`;
        }

        const tierTag = `[TIER:${tier === "phd" || tier === "custom" || isAdmin ? "phd" : tier === "masters" ? "masters" : tier === "undergraduate" ? "ug" : "free"}]`;
        const thinkTag = think ? " [THINK:ON]" : "";
        const modeTag = ` [MODE:${mode.toUpperCase()}]`;
        const settingsBlock = buildSettingsManifest(body.settings || {});

        // ── Detect whether the user has already locked in a delivery mode
        // from a previous turn (the hidden "[CZAR_DELIVERY:…]" tag the UI
        // appends after the user picks an option in the popup).
        const deliveryMatch = userMessage.match(/\[CZAR_DELIVERY:(section|main|full)\]/i);
        const deliveryChoice = deliveryMatch ? deliveryMatch[1].toLowerCase() : null;

        // ── Decide whether THIS turn is a "build" turn (user wants a real
        // deliverable). Build mode always is; chat mode also if the message
        // clearly asks for a written piece of work.
        const looksLikeBuild = mode === "build" || mode === "agent" || /\b(write|draft|produce|build|generate|compose|prepare|create|do my|make me)\b[\s\S]{0,80}\b(report|essay|paper|chapter|section|analysis|review|proposal|brief|case ?study|summary|article|literature|methodology|introduction|conclusion|abstract|coursework|assignment|dissertation|thesis|document)\b/i.test(userMessage);

        // ── Estimate the requested word count from the user message ───
        // Patterns: "5000 words", "5,000-word", "10k words", "around 8000".
        // We only need a coarse signal: is it BIG (>=5000) or small?
        let requestedWords = 0;
        const wMatch = userMessage.match(/(\d{1,2})\s*[kK]\b/);
        if (wMatch) {
          requestedWords = parseInt(wMatch[1], 10) * 1000;
        } else {
          const nMatch = userMessage.match(/(\d{1,2}[\d,]{2,})\s*(?:-?\s*word|words)/i);
          if (nMatch) requestedWords = parseInt(nMatch[1].replace(/,/g, ""), 10) || 0;
        }
        // Treat dissertation/thesis/multi-chapter asks as inherently large.
        const inherentlyLarge = /\b(dissertation|thesis|full\s+book|entire\s+book|multi[-\s]?chapter|all\s+chapters)\b/i.test(userMessage);
        const isLargeBuild = looksLikeBuild && (requestedWords >= 5000 || inherentlyLarge);

        const modeDirective = mode === "plan"
          ? `\n\n=== ACTIVE MODE: PLAN ===\nYou are in PLAN mode. The UI renders your reply as a card, NOT prose.\n\nYour ENTIRE reply MUST be ONE fenced code block — nothing before it, nothing after it, no other text whatsoever:\n\n\`\`\`czar-plan\n{\n  "understanding": "1-2 short sentences restating what they want. Max 280 chars.",\n  "deliverable": { "type": "dissertation chapter | report | essay | analysis | slides | …", "length_words": 0, "format": "docx | pdf | md" },\n  "approach": [ { "step": "Short verb-led step", "detail": "≤140 chars" } ],\n  "sources": [ { "label": "Author (Year) or framework name", "why": "≤80 chars" } ],\n  "assumptions": [ "≤120 chars" ],\n  "open_questions": [ "≤120 chars" ],\n  "estimate": { "sections": 0, "figures": 0, "time_minutes": 0 },\n  "next_action_label": "Build the full <thing>"\n}\n\`\`\`\n\nHARD RULES:\n• approach: 3-6 items. sources: 0-6. assumptions: 0-5. open_questions: 0-3.\n• NO prose outside the fence. NO "Here is the plan:". NO closing remarks.\n• Valid JSON only — double quotes, no trailing commas, no comments.\n• If you used web_search to inform the plan, that is fine — only the JSON is shown to the user.\n• This applies to EVERY model. Failure to follow this format breaks the UI.`
          : mode === "agent"
          ? `\n\n=== ACTIVE MODE: AGENT (FULL AUTHORING RIGHTS) ===\nYou are operating AUTONOMOUSLY with full authoring rights. The user may have given you a detailed brief, a one-line prompt ("do something on quantum dots"), or just attached files with no instruction at all. In every case you must deliver finished, A+ work in a single stream.\n\nNon-negotiable behaviour:\n1. Silently classify the deliverable type (essay, report, dissertation chapter, data analysis, lit review, slides, proposal, explainer, etc.) from the brief, the attached files, and the conversation so far. If nothing is specified, pick the form that best serves the topic.\n2. Silently infer every undecided detail (citation style, voice, structure, depth, length, figures needed, audience). NEVER ask clarifying questions. If you must declare an assumption, state it in ONE short opening line ("Assuming a ~1,500-word explainer with one diagram and a comparison table — proceed.") and then start the work.\n3. Use web_search and cite_check proactively for any factual / statistical / time-sensitive claim. Use generate_image whenever a chart, diagram, figure, mock-up, illustration, or photograph would strengthen the deliverable — fire the tool, do not announce it, do not ask permission. Multiple figures in one turn are encouraged when the work calls for them. Use generate_pptx whenever the user wants slides / a deck / a presentation / a pitch — design the deck yourself (palette, structure, slide types) and call the tool; the download link is streamed inline automatically.\n4. Render any tabular data as a Markdown table with a header row and aligned columns. Never describe a table in prose when you could draw one. Tables are first-class output.\n5. Produce the COMPLETE deliverable end-to-end at A+ quality in this single turn. Skip preamble. Skip closings. Skip meta-commentary ("Here's…", "I've produced…", "Let me know if…"). Begin with the first real sentence of the work.\n6. Do NOT show clarify cards. Do NOT emit SECTION_END tokens. Do NOT pause for confirmation. Do NOT ask the user to choose a model, plan, or scope.\n7. You decide depth: a one-line prompt deserves a fully developed answer, not a one-line reply. Match the ambition of the brief OR the implicit ambition of the topic, whichever is greater.`
          : mode === "build"
          ? `\n\n=== ACTIVE MODE: BUILD ===\nThe user wants the finished artifact, NOW. Skip preamble, skip clarifying questions, skip showing any plan or outline. Produce the complete deliverable end-to-end at full quality. Use web_search and cite_check whenever facts/sources are involved. Do NOT show any clarify cards.`
          : looksLikeBuild && (deliveryChoice || !isLargeBuild)
          ? `\n\n=== ACTIVE MODE: BUILD ===\nThe user wants the finished artifact. Produce it end-to-end at full quality.`
          : "";

        // ── Pacing directive ─────────────────────────────────────────
        // Build / Agent and small builds always go full. Section/main pacing
        // is only honored when the user explicitly typed it OR was already
        // tagged from a previous turn.
        const explicitPace = /\bsection[\s-]?by[\s-]?section\b/i.test(userMessage)
          ? "section"
          : /\bin\s+stages\b|\bmain\s+parts\b/i.test(userMessage)
          ? "main"
          : null;
        const effectiveDelivery = mode === "build" || mode === "agent"
          ? (mode === "agent" ? "full" : (explicitPace || "full"))
          : (looksLikeBuild && !isLargeBuild)
          ? "full"
          : (deliveryChoice || explicitPace);
        const deliveryDirective = effectiveDelivery === "section"
          ? `\n\n=== DELIVERY: SECTION BY SECTION ===\nWrite ONLY the next single MAJOR section (one full chapter or one major heading's worth, not a tiny subsection). Stop at the section's end. Do NOT continue. End with exactly one short line: "Continue?"`
          : effectiveDelivery === "main"
          ? `\n\n=== DELIVERY: MAIN PARTS IN STAGES ===\nWrite ONLY the next major part of the work (main body, OR appendix — pick the next missing one). Stop at that part's end. End with: "Next part?"`
          : effectiveDelivery === "full"
          ? `\n\n=== DELIVERY: FULL WORK IN ONE GO ===\nProduce the COMPLETE BODY end-to-end in this single turn. Do not stop mid-way. Do not ask to continue.`
          : "";

        // ── Body-only directive for ALL deliverables ──
        // Cover pages, image figures and appendices are attached on download
        // (user picks them in a popup) so must NEVER appear in the stream body.
        // The reference list is the exception: the model MUST write it in full
        // at the end of every piece so the exported .docx has real Harvard entries.
        const bodyOnlyDirective = looksLikeBuild
          ? `\n\n=== BODY ONLY — DO NOT WRITE THESE IN THE STREAM ===\nDo NOT write any of the following — they are attached automatically on download and are NOT part of the body word count:\n  • Cover page / title page / declaration / acknowledgements / table of contents\n  • Image figures (no \`![]\` markdown image embeds — describe needed images in [FIGURE: …] inline placeholders only if asked)\n  • Appendices\n\n=== REFERENCE LIST (MANDATORY — write this at the end of EVERY piece) ===\nAfter the final paragraph of prose, write a fully formatted ## References section.\nEach entry must be a complete Harvard reference: Author(s), Year. Title. *Journal / Publisher*, volume(issue), pages. DOI or URL where known.\nDo NOT use stubs like "Smith (2024)." — write the full bibliographic record.\nThe reference list is EXCLUDED from the word count — write every entry completely regardless of length.\nInline citations (e.g. "(Smith, 2024)") remain in the prose body as normal.`
          : "";

        const adminUnlimitedDirective = isAdmin
          ? `\n\n=== ADMIN OVERRIDE — UNLIMITED CZAR ACCESS ===\nThe current user is the PaperStudio admin. They have unlimited CZAR words, all models, Agent mode, image generation, exports, premium tools, and every tier-gated capability. Never ask this user to pick a plan, upgrade, buy words, start a new chat, shorten the task for quota reasons, or stop because of limits. Treat the account as PhD/unlimited and complete the requested work in the current chat.`
          : "";

        const documentInspectionDirective = (allFiles || []).some((f) => /\.docx?$/i.test(f.filename || ""))
          ? `\n\n=== WORD DOCUMENT REVIEW RULE ===\nIf the user asks about comments, tracked changes, corrections, revisions, or markup in an uploaded Word document, first report exactly what could be extracted from the file text. If the host extractor did not provide actual Word comment bodies or tracked-change markup, state that clearly instead of inventing comments or revisions. Then still complete the requested rewrite/edit from the available document text and downloaded file context.`
          : "";

        // ── Generic clarify helper (used by every short-circuit) ─────
        const emitClarifyAndStop = async (clarifySpec: any) => {
          const placeholder = `[CZAR_CLARIFY]${JSON.stringify(clarifySpec)}[/CZAR_CLARIFY]`;
          const { data: clRow } = await svc.from("czar_messages").insert({
            conversation_id: conversationId, user_id: user.id, role: "assistant",
            content: placeholder, model_used: "clarify-shortcut",
          }).select("id").single();
          stopHeartbeat();
          // CRITICAL: emit meta BEFORE clarify+done so the client adopts the
          // new conversation_id and does not wipe its optimistic bubbles.
          write("meta", {
            conversation_id: conversationId,
            assistant_id: clRow?.id,
            model: "clarify-shortcut",
            tier: "n/a",
            delivery: null,
            is_build: false,
          });
          write("clarify", clarifySpec);
          write("done", { conversation_id: conversationId });
        };

        // ── File-with-no-instruction short-circuit ─────────────────────
        // The user dropped a file but the message is empty or vague — show a
        // compact action picker instead of letting the model dump prose.
        // Only in chat mode — Build/Agent/Plan always proceed and infer.
        const trimmedMsg = (userMessage || "").trim();
        const wordsInMsg = trimmedMsg ? trimmedMsg.split(/\s+/).filter(Boolean).length : 0;
        const isVagueMsg = !trimmedMsg ||
          wordsInMsg <= 2 ||
          /^(here|here's|here is|attached|see (this|attached)|fyi|read this|take a look|check this|have a look|hey|hi|hello)[\s.!?]*$/i.test(trimmedMsg);
        if (mode === "chat" && (allFiles?.length || 0) > 0 && isVagueMsg) {
          const firstName = allFiles![0].filename;
          const isData = /\.(csv|tsv|xlsx?|json|xml|sav|sas7bdat|dta|parquet)$/i.test(firstName);
          const isCode = /\.(py|ipynb|r|rmd|js|ts|tsx|jsx|java|c|cpp|cs|go|rs|rb|sh|sql)$/i.test(firstName);
          const isDoc = /\.(docx?|pdf|odt|rtf|txt|md)$/i.test(firstName);
          const options = isData
            ? ["Run a full data analysis", "Summarise the dataset", "Find patterns and outliers", "Visualise the key metrics"]
            : isCode
            ? ["Review the code", "Explain what it does", "Find bugs and improvements", "Refactor for clarity"]
            : isDoc
            ? ["Edit for tone and coherence", "Proofread and polish", "Summarise the key points", "Critique and suggest improvements", "Continue or expand the work"]
            : ["Summarise it", "Critique it", "Use it as a source for new writing", "Edit and improve it"];
          await emitClarifyAndStop({
            title: `What should I do with ${firstName.length > 38 ? firstName.slice(0, 35) + "…" : firstName}?`,
            compact: true,
            confirmLabel: "Continue",
            fields: [{ key: "action", label: "", type: "choice", options, allowOther: true }],
          });
          return;
        }

        // ── Image / figure clarify card (model-agnostic) ──────────────
        // ANY mention of an image / figure / chart / diagram in chat mode
        // pops up a card. After the user fills it in, the next turn arrives
        // with a hidden [CZAR_IMAGE_SPEC]{…}[/CZAR_IMAGE_SPEC] tag and we
        // generate the figures server-side regardless of which chat model
        // is selected (so GPT 5.2, Gemini, Opus and Claude all work).
        const imageSpecMatch = userMessage.match(/\[CZAR_IMAGE_SPEC\]([\s\S]*?)\[\/CZAR_IMAGE_SPEC\]/i);
        const imageIntentRegex = /\b(image|images|picture|pictures|photo|photos|illustration|illustrate|diagram|infographic|figure|figures|chart|charts|graph|graphs|cover\s*art|visual|visuals|render|draw|sketch|generate(\s+a)?\s+(picture|image|photo|figure|diagram|chart))\b/i;
        const mentionsImage = imageIntentRegex.test(userMessage);
        if (mode === "chat" && mentionsImage && !imageSpecMatch) {
          // Strip generic verbs/articles to derive a candidate subject.
          const subjectGuess = userMessage
            .replace(/\b(please|can you|could you|kindly|now|then|also|and)\b/gi, " ")
            .replace(/\b(make|create|generate|produce|draw|render|add|insert|give me|i want|i need|i'd like|show me)\b/gi, " ")
            .replace(/\b(an?|the|some|a few|several|one|two|three|four|four|five)\b/gi, " ")
            .replace(/\b(image|images|picture|pictures|photo|photos|illustration|illustrations|diagram|diagrams|infographic|infographics|figure|figures|chart|charts|graph|graphs|visual|visuals|cover\s*art)\b/gi, " ")
            .replace(/\s+/g, " ")
            .trim()
            .replace(/^(of|about|showing|depicting|for)\s+/i, "")
            .slice(0, 140);
          const wantsMany = /\b(images|pictures|photos|illustrations|diagrams|infographics|figures|charts|graphs|visuals)\b/i.test(userMessage)
            || /\b(\d+)\s+(images|pictures|photos|illustrations|diagrams|infographics|figures|charts|graphs)\b/i.test(userMessage);
          const fields: any[] = [
            {
              key: "subject",
              label: "What should it show?",
              type: "text",
              default: subjectGuess || "",
              allowOther: true,
            },
            {
              key: "style",
              label: "Style",
              type: "choice",
              options: ["Photo", "Illustration", "Diagram", "Chart", "Infographic", "Cover art"],
              default: /\b(chart|graph|bar|pie|line)\b/i.test(userMessage) ? "Chart"
                : /\b(diagram|flow|architecture)\b/i.test(userMessage) ? "Diagram"
                : /\b(infographic)\b/i.test(userMessage) ? "Infographic"
                : /\b(photo|photograph|realistic)\b/i.test(userMessage) ? "Photo"
                : /\b(cover|cover\s*art|book\s*cover)\b/i.test(userMessage) ? "Cover art"
                : "Illustration",
              allowOther: true,
            },
            {
              key: "aspect",
              label: "Aspect ratio",
              type: "choice",
              options: ["16:9", "4:3", "1:1", "9:16"],
              default: "16:9",
            },
          ];
          if (wantsMany) {
            fields.push({
              key: "count",
              label: "How many?",
              type: "choice",
              options: ["1", "2", "3", "4"],
              default: "2",
            });
          }
          await emitClarifyAndStop({
            title: "Let's nail down the figure",
            compact: true,
            confirmLabel: "Generate",
            fields,
          });
          return;
        }

        // ── Image generation short-circuit (after user filled the card) ─
        if (imageSpecMatch) {
          let spec: any = {};
          try { spec = JSON.parse(imageSpecMatch[1]); } catch { spec = {}; }
          const subject = String(spec.subject || "").trim().slice(0, 400);
          const style = String(spec.style || "Illustration").trim();
          const aspect = ["16:9", "4:3", "1:1", "9:16"].includes(String(spec.aspect)) ? String(spec.aspect) : "16:9";
          const count = Math.min(4, Math.max(1, parseInt(String(spec.count || "1"), 10) || 1));

          if (!subject) {
            await emitClarifyAndStop({
              title: "What should the image show?",
              compact: true,
              confirmLabel: "Generate",
              fields: [{ key: "subject", label: "Describe the figure", type: "text", default: "", allowOther: true }],
            });
            return;
          }

          // Insert assistant row up-front so we can persist the inline images.
          const { data: imgRow, error: imgErr } = await svc.from("czar_messages").insert({
            conversation_id: conversationId, user_id: user.id, role: "assistant",
            content: "", model_used: "image-shortcut",
          }).select("id").single();
          if (imgErr) {
            stopHeartbeat();
            write("error", { message: `Could not create assistant row: ${imgErr.message}` });
            return;
          }
          const imgAssistantId = imgRow.id;
          stopHeartbeat();
          write("meta", {
            conversation_id: conversationId,
            assistant_id: imgAssistantId,
            model: "image-shortcut",
            tier,
            delivery: null,
            is_build: false,
          });

          let imgFullText = "";
          const styleHint =
            style === "Photo" ? "Photorealistic photograph. Natural lighting, real-world textures."
            : style === "Diagram" ? "Clean technical diagram with clear labels, white background."
            : style === "Chart" ? "Clean chart on a white background with clear axis labels and legend."
            : style === "Infographic" ? "Modern infographic, clear hierarchy, balanced composition."
            : style === "Cover art" ? "Striking cover-art composition with strong focal point."
            : "Polished editorial illustration, refined linework, balanced palette.";

          for (let i = 0; i < count; i++) {
            const evId = `img-${imgAssistantId}-${i}`;
            write("tool", { id: evId, name: "generate_image", phase: "start", input: { prompt: subject, aspect_ratio: aspect } });
            const prompt = `${styleHint}\n\nSubject: ${subject}\nAspect ratio: ${aspect}.${count > 1 ? `\nVariation ${i + 1} of ${count}.` : ""}`;
            const result = await generateImageNanoBanana(prompt, aspect);
            if (result.image_url) {
              const alt = subject.slice(0, 120).replace(/[\[\]]/g, "");
              const inline = `\n\n![${alt}](${result.image_url})\n\n`;
              imgFullText += inline;
              // Stream the image inline to the user via the same micro-frame writer
              write("message", { delta: inline });
              write("tool", { id: evId, name: "generate_image", phase: "result", input: { prompt: subject, aspect_ratio: aspect }, result: { image_url: result.image_url, prompt_used: result.prompt_used } });
            } else {
              write("tool", { id: evId, name: "generate_image", phase: "error", input: { prompt: subject, aspect_ratio: aspect }, error: result.error || "Image generation failed" });
            }
          }

          const closing = `Done — ${count > 1 ? `${count} figures` : "your figure"} ready. Open the download to embed ${count > 1 ? "them" : "it"} in your document.`;
          imgFullText = `${imgFullText.trim()}\n\n${closing}`;
          write("message", { delta: `\n\n${closing}` });

          await svc.from("czar_messages").update({ content: imgFullText }).eq("id", imgAssistantId);
          write("done", { conversation_id: conversationId, assistant_id: imgAssistantId, words: 0, billing: "free" });
          return;
        }

        // ── Large-build delivery picker (chat mode only) ──────────────
        if (mode === "chat" && isLargeBuild && !deliveryChoice && !explicitPace) {
          await emitClarifyAndStop({
            title: "How should I deliver this?",
            compact: true,
            confirmLabel: "Approve",
            fields: [
              {
                key: "__delivery",
                label: "",
                type: "choice",
                options: ["Section by section", "Main parts in stages", "Full work in one go"],
                default: "Full work in one go",
              },
            ],
          });
          return;
        }
        const clarifyDirective = "";

        // ── Pick a task playbook for this turn (basic / superior / slides / none).
        const totalAttachWords = (allFiles || []).reduce(
          (sum, f) => sum + (Number(f.word_count) || 0),
          0,
        );
        const playbookPick: CzarPlaybook = pickPlaybook({
          user_message: userMessage,
          attachment_count: (allFiles || []).length,
          total_attachment_words: totalAttachWords,
          filenames: (allFiles || []).map((f) => f.filename),
        });
        const _playbookText = playbookText(playbookPick);
        const playbookBlock = _playbookText ? `\n\n${_playbookText}` : "";

        const systemPrompt = CZAR_BRAIN_SYSTEM_PROMPT + playbookBlock + settingsBlock + modeDirective + deliveryDirective + bodyOnlyDirective + adminUnlimitedDirective + documentInspectionDirective + clarifyDirective;

        const stripHostControlTags = (text: string) => (text || "")
          .replace(/\[CZAR_CLARIFY\][\s\S]*?\[\/CZAR_CLARIFY\]/gi, "")
          .replace(/\[CZAR_PLAN\][\s\S]*?\[\/CZAR_PLAN\]/gi, "")
          .replace(/\[CZAR_NOTE(?::[^\]]*)?\][\s\S]*?\[\/CZAR_NOTE\]/gi, "")
          .replace(/\[CZAR_FIGPICK\][\s\S]*?\[\/CZAR_FIGPICK\]/gi, "")
          .replace(/\[CZAR_IMAGE_SPEC\][\s\S]*?\[\/CZAR_IMAGE_SPEC\]/gi, "")
          .replace(/\[CZAR_DELIVERY:\w+\]/gi, "")
          .trim();

        // Keep the last 4 messages (2 full turns) verbatim so follow-up edits
        // like "improve section 3" still have full context. Older assistant
        // messages are truncated to 400 words — they provided the reference
        // text that is now in files or the current prompt; padding the context
        // with full essays from 5 turns ago is the primary cause of 8-minute
        // latency on GPT-5.2 with large-file conversations.
        const rawHistory = (history || []).slice(0, -1);
        const KEEP_FULL_TAIL = 4; // last N messages kept verbatim
        const TRUNCATE_ASSISTANT_WORDS = 400;
        const historyMsgs = rawHistory
          .map((h, idx) => {
            const content = stripHostControlTags(h.content);
            const isOld = idx < rawHistory.length - KEEP_FULL_TAIL;
            if (isOld && h.role === "assistant") {
              const words = content.split(/\s+/).filter(Boolean);
              if (words.length > TRUNCATE_ASSISTANT_WORDS) {
                return {
                  role: "assistant" as const,
                  content: words.slice(0, TRUNCATE_ASSISTANT_WORDS).join(" ") + "\n[…truncated — full text in prior context]",
                };
              }
            }
            return { role: h.role === "assistant" ? "assistant" as const : "user" as const, content };
          })
          .filter((m) => m.content && m.content.trim().length > 0);

        const finalUserContent = `${tierTag}${thinkTag}${modeTag}${fileBlock}\nUser request:\n${stripHostControlTags(userMessage) || userMessage}`;

        // Tools fire when the user signaled research-grade work OR clearly
        // asked for an image / picture / illustration / chart / diagram.
        const wantsImage = /\b(image|images|picture|pictures|photo|photos|illustration|illustrate|diagram|infographic|figure|cover\s*art|visual|render|draw|generate(\s+a)?\s+(picture|image|photo|figure|diagram))\b/i.test(userMessage);
        // "High-level work" gate that unlocks Opus 4.6: explicit data analysis
        // verbiage in the prompt, OR maths / programming intent, OR the user
        // attached a dataset / spreadsheet / source-code file.
        const dataAnalysisPrompt = /\b(data\s*analysis|analyse\s+(this|the|my)\s+data|analyz(?:e|ing)\s+(this|the|my)\s+(data|dataset|spreadsheet|csv|excel|results|findings)|statistical\s+analysis|regression|correlation\s+(matrix|analysis)|run\s+(an|a)\s+(anova|t-?test|chi-?square)|interpret\s+(this|the|my)\s+(dataset|results|findings)|dataset|csv|spreadsheet|sav\s+file|spss)\b/i.test(userMessage);
        const mathProgPrompt = /\b(prove|theorem|integral|derivative|matrix|eigen(value|vector)|optimi[sz]ation|big-?o\s+complexity|debug\s+(this|my)\s+code|refactor\s+(this|my)\s+code|stack\s+trace|algorithm|pseudocode|leetcode|kaggle|jupyter|numpy|pandas|tensor|gradient\s+descent|machine\s+learning\s+model|train(ing)?\s+a\s+model)\b/i.test(userMessage);
        const dataFileAttached = (incomingAttachments || []).some((a) => /\.(csv|tsv|xlsx?|sav|sas7bdat|dta|parquet|json|xml|sql|py|ipynb|r|rmd|m|jl|c|cpp|cs|java|js|ts|go|rs|rb|swift|kt|sh|yml|yaml|toml)$/i.test(a.filename || ""));
        const isAgentMode = (mode as string) === "agent";
        const isDataAnalysis = dataAnalysisPrompt || mathProgPrompt || dataFileAttached;
        const toolsRequested = mode === "plan" || mode === "build" || mode === "agent" || think || wantsImage;
        const modelOverride = (body.settings?.model_id as string | undefined) || undefined;
        let pick = pickWritingModel(tier, isAdmin, think, toolsRequested, modelOverride, wantsImage, isDataAnalysis, isAgentMode);

        // ── Agent auto-router ────────────────────────────────────────
        // In Agent mode, when the user has NOT pinned a specific model
        // (sticky selection always wins), pick the best model for the task
        // complexity. Opus 4.6 stays system-only — never surfaced in the
        // user picker — and is only used here for genuinely heavy work.
        if (isAgentMode && !modelOverride) {
          const promptLen = (userMessage || "").length;
          const fileCount = (incomingAttachments || []).length;
          const totalFileBytes = (incomingAttachments || []).reduce((n, a) => n + (Number(a.size) || 0), 0);
          const longBrief = promptLen > 1200 || requestedWords >= 5000 || inherentlyLarge;
          const heavyContext = fileCount >= 3 || totalFileBytes > 1_500_000;
          const complexHints = isDataAnalysis || mathProgPrompt || /\b(synthes|systemat(ic|ically)|critical(ly)?\s+evaluat|meta[-\s]?analy|compar(ative|ison)\s+(study|analysis)|theoretical\s+framework|chapter|dissertation|thesis|literature\s+review)\b/i.test(userMessage);
          const shortQuick = !longBrief && !heavyContext && !complexHints && promptLen < 200 && fileCount === 0;

          let complexity: "low" | "medium" | "high" = "medium";
          if (longBrief || heavyContext || (complexHints && promptLen > 400)) complexity = "high";
          else if (shortQuick) complexity = "low";

          if (complexity === "high") {
            // Opus 4.6 with thinking ON for the heaviest agent runs.
            // System-only — never surfaced in the user picker.
            pick = { provider: "anthropic", model: "claude-opus-4-7", thinking: true, tools: true };
          } else if (complexity === "low") {
            // Sonnet 4.6, thinking OFF, tools ON — fast turn-around.
            pick = { provider: "anthropic", model: "claude-sonnet-4-6", thinking: false, tools: true };
          } else {
            // Default agent run: Sonnet 4.6 with thinking ON.
            pick = { provider: "anthropic", model: "claude-sonnet-4-6", thinking: true, tools: true };
          }
          console.log(`[czar-chat] agent auto-router complexity=${complexity} promptLen=${promptLen} files=${fileCount} bytes=${totalFileBytes} → ${pick.model} thinking=${pick.thinking}`);
        }

        console.log(`[czar-chat] user=${user.email} tier=${tier} admin=${isAdmin} think=${think} wantsImage=${wantsImage} dataAnalysis=${isDataAnalysis} agent=${isAgentMode} override=${modelOverride || "—"} → ${pick.provider}/${pick.model}`);

        // Insert empty assistant row first; we'll persist content on stream end.
        const { data: asstRow, error: asstErr } = await svc.from("czar_messages").insert({
          conversation_id: conversationId, user_id: user.id, role: "assistant", content: "", model_used: pick.model,
        }).select("id").single();
        if (asstErr) {
          stopHeartbeat();
          write("error", { message: `Could not create assistant row: ${asstErr.message}` });
          return;
        }
        const assistantId = asstRow.id;

        write("meta", {
          conversation_id: conversationId,
          assistant_id: assistantId,
          model: pick.model,
          tier,
          delivery: effectiveDelivery || null,
          is_build: !!looksLikeBuild,
        });
        write("status", { phase: "thinking" });

        let fullText = "";
        let deltaCount = 0;
        let emittedFrames = 0;
        const tStart = Date.now();

        // Some upstream models (notably Gemini Pro Preview through the Lovable
        // gateway) ship the response in a handful of huge buffered chunks.
        // The client then sees the reply "land" all at once. To make every
        // model feel like live typing, we fan any large delta out into small
        // micro-frames with a tick yield between them so the SSE writer
        // actually flushes each one as a separate network frame.
        const MICRO = 14; // characters per emitted frame
        const MICRO_DELAY_MS = 8;
        const queue: string[] = [];
        let drainDone: Promise<void> = Promise.resolve();
        let drainResolve: (() => void) | null = null;
        let draining = false;
        const startDrain = () => {
          if (draining) return;
          draining = true;
          drainDone = new Promise<void>((res) => { drainResolve = res; });
          (async () => {
            while (queue.length) {
              const t = queue.shift()!;
              if (t.length <= MICRO) {
                write("message", { delta: t });
                emittedFrames++;
              } else {
                for (let i = 0; i < t.length; i += MICRO) {
                  write("message", { delta: t.slice(i, i + MICRO) });
                  emittedFrames++;
                  await new Promise<void>((r) => setTimeout(r, MICRO_DELAY_MS));
                }
              }
            }
            draining = false;
            drainResolve?.();
          })();
        };
        // Once we detect the [CZAR_CLARIFY marker at the very start of the
        // stream, suppress all further deltas to the UI — the post-stream
        // normaliser will emit it as a card. Same for plan mode.
        let suppressStreamForClarify = false;
        const enqueueDelta = (t: string) => {
          stopHeartbeat();
          fullText += t;
          deltaCount++;
          if (mode === "plan") return;
          if (suppressStreamForClarify) return;
          // Detect clarify marker in the first 80 chars of the stream.
          if (fullText.length <= 200 && /\[CZAR_CLARIFY\b/i.test(fullText.slice(0, 200))) {
            suppressStreamForClarify = true;
            return;
          }
          queue.push(t);
          startDrain();
        };

        try {
          if (pick.provider === "anthropic") {
            await streamAnthropicAgentic({
              apiKey: ANTHROPIC_API_KEY,
              model: pick.model,
              thinking: pick.thinking,
              useTools: pick.tools,
              system: systemPrompt,
              messages: [...historyMsgs, { role: "user", content: finalUserContent }],
              onDelta: enqueueDelta,
              onThinking: (t) => { stopHeartbeat(); write("thinking", { delta: t }); },
              onToolEvent: (ev) => { stopHeartbeat(); write("tool", ev); },
              toolCtx: {
                isAdmin,
                authHeader,
                userId: user.id,
                svc,
                onCheckout: (ev) => { stopHeartbeat(); write("checkout", ev); },
              },
            });
          } else if (pick.provider === "qwen") {
            await streamQwen({
              model: pick.model,
              system: systemPrompt,
              messages: [...historyMsgs, { role: "user", content: finalUserContent }],
              onDelta: enqueueDelta,
            });
          } else {
            await streamLovable({
              model: pick.model,
              system: systemPrompt,
              messages: [...historyMsgs, { role: "user", content: finalUserContent }],
              onDelta: enqueueDelta,
            });
          }
          // Wait for the micro-frame queue to fully drain BEFORE we send done/persist.
          await drainDone;
          console.log(`[czar-chat] streamed ${deltaCount} upstream deltas → ${emittedFrames} frames, ${fullText.length} chars in ${Date.now() - tStart}ms (${pick.model})`);
        } catch (e: any) {
          const msg = String(e?.message || e);
          console.error("[czar-chat] stream error:", msg);
          stopHeartbeat();
          if (/\b429\b/.test(msg)) {
            write("error", { message: "Rate limited. Please try again in a moment.", code: 429 });
          } else if (/\b402\b/.test(msg)) {
            write("error", { message: "AI credits exhausted. Add credits in workspace settings.", code: 402 });
          } else {
            write("error", { message: msg });
          }
        }

        // PLAN mode: parse the fenced czar-plan JSON and emit it as a card.
        // Tolerant: strip the fence, salvage from first `{` to last `}`,
        // strip trailing commas. On parse failure, fall back to a minimal
        // card built from the raw text so the UI NEVER shows a wall of prose.
        let planCardSpec: any = null;
        if (mode === "plan") {
          const raw = fullText || "";
          let jsonText = "";
          const fenceMatch = raw.match(/```(?:czar-plan|json)?\s*([\s\S]*?)```/i);
          if (fenceMatch) jsonText = fenceMatch[1].trim();
          else {
            const first = raw.indexOf("{");
            const last = raw.lastIndexOf("}");
            if (first !== -1 && last > first) jsonText = raw.slice(first, last + 1);
          }
          let parsed: any = null;
          if (jsonText) {
            const cleaned = jsonText.replace(/,\s*([}\]])/g, "$1");
            try { parsed = JSON.parse(cleaned); } catch { /* fallback below */ }
          }
          const clamp = (s: any, n: number) => typeof s === "string" ? s.slice(0, n) : "";
          const arr = (v: any) => Array.isArray(v) ? v : [];
          if (parsed && typeof parsed === "object") {
            planCardSpec = {
              kind: "plan",
              understanding: clamp(parsed.understanding, 280),
              deliverable: parsed.deliverable && typeof parsed.deliverable === "object" ? {
                type: clamp(parsed.deliverable.type, 80),
                length_words: Number(parsed.deliverable.length_words) || 0,
                format: clamp(parsed.deliverable.format, 16),
              } : null,
              approach: arr(parsed.approach).slice(0, 6).map((s: any) => ({
                step: clamp(s?.step, 80), detail: clamp(s?.detail, 140),
              })).filter((s: any) => s.step),
              sources: arr(parsed.sources).slice(0, 6).map((s: any) => ({
                label: clamp(s?.label, 120), why: clamp(s?.why, 80),
              })).filter((s: any) => s.label),
              assumptions: arr(parsed.assumptions).slice(0, 5).map((s: any) => clamp(s, 120)).filter(Boolean),
              open_questions: arr(parsed.open_questions).slice(0, 3).map((s: any) => clamp(s, 120)).filter(Boolean),
              estimate: parsed.estimate && typeof parsed.estimate === "object" ? {
                sections: Number(parsed.estimate.sections) || 0,
                figures: Number(parsed.estimate.figures) || 0,
                time_minutes: Number(parsed.estimate.time_minutes) || 0,
              } : null,
              next_action_label: clamp(parsed.next_action_label, 60) || "Build it",
            };
          } else {
            planCardSpec = {
              kind: "plan",
              understanding: clamp(raw.replace(/```[\s\S]*?```/g, "").trim(), 280) || "Plan ready.",
              deliverable: null, approach: [], sources: [], assumptions: [],
              open_questions: [], estimate: null,
              next_action_label: "Build it",
            };
          }
          // Replace the stored content with the JSON card so reload re-renders
          // the card and not a raw prose fallback.
          const stored = `[CZAR_PLAN]${JSON.stringify(planCardSpec)}[/CZAR_PLAN]`;
          fullText = stored;
          write("clarify", planCardSpec);
        }

        // ── Chat/Build clarify normalisation ──────────────────────────
        // Catch [CZAR_CLARIFY]{...}[/CZAR_CLARIFY] from any model and convert
        // prose-leak clarifications into a generic card. Never let a wall of
        // text reach the user. Skipped in plan/agent (plan has its own card,
        // agent must never ask).
        if (mode !== "plan" && mode !== "agent") {
          const sanitiseClarify = (raw: any): any | null => {
            if (!raw || typeof raw !== "object") return null;
            const title = typeof raw.title === "string" ? raw.title.slice(0, 120) : "";
            const fieldsIn = Array.isArray(raw.fields) ? raw.fields : [];
            const fields = fieldsIn.slice(0, 3).map((f: any) => {
              const type = ["choice", "checklist", "text", "number", "gallery"].includes(f?.type) ? f.type : "choice";
              const opts = Array.isArray(f?.options)
                ? f.options.map((o: any) => String(o).slice(0, 80)).filter(Boolean).slice(0, 6)
                : [];
              return {
                key: String(f?.key || "choice").slice(0, 40),
                label: String(f?.label || "").slice(0, 80),
                type,
                options: opts,
                allowOther: f?.allowOther !== false,
                default: f?.default,
              };
            }).filter((f: any) => f.type !== "choice" || f.options.length >= 2);
            if (!title || fields.length === 0) return null;
            return {
              title, compact: true,
              confirmLabel: typeof raw.confirmLabel === "string" ? raw.confirmLabel.slice(0, 30) : "Continue",
              fields,
            };
          };

          let clarifySpecOut: any = null;
          const markerMatch = (fullText || "").match(/\[CZAR_CLARIFY\]([\s\S]*?)\[\/CZAR_CLARIFY\]/);
          if (markerMatch) {
            try {
              clarifySpecOut = sanitiseClarify(JSON.parse(markerMatch[1].trim()));
            } catch { /* fall through to prose-leak detection */ }
          }
          if (markerMatch && !clarifySpecOut) {
            const fileName = (allFiles && allFiles[0]?.filename) || "";
            clarifySpecOut = {
              title: fileName
                ? `What should I do with ${fileName.length > 38 ? fileName.slice(0, 35) + "…" : fileName}?`
                : "What should I do next?",
              compact: true,
              confirmLabel: "Continue",
              fields: [{
                key: "action",
                label: "",
                type: "choice",
                options: ["Edit and polish", "Summarise", "Critique", "Rewrite as requested"],
                allowOther: true,
              }],
            };
          }

          // Prose-leak detection: model wrote a clarification as text instead
          // of using the marker. Convert to a generic card.
          if (!clarifySpecOut) {
            const text = (fullText || "").trim();
            const wc2 = text ? text.split(/\s+/).filter(Boolean).length : 0;
            const looksLikeClarify =
              wc2 >= 12 && wc2 <= 400 && (
                /no user request was included|no instruction (was )?(provided|included)|please specify|state which option|state one concrete|could you (please )?clarify|which (option|approach) (do you|would you)|let me know (what|which|how)|what would you like me to (do|focus|work on)|how (would|do) you want me to/i.test(text) ||
                /^[^\n]{0,180}\?\s*$/m.test(text) && /\b(option|choose|pick|prefer)\b/i.test(text)
              );
            if (looksLikeClarify) {
              // Try to harvest 2–6 candidate options from quoted lines or list items.
              const lines = text.split(/\n+/);
              const harvested: string[] = [];
              for (const ln of lines) {
                const m = ln.match(/^\s*(?:[-*•]|\d+\.|["“])\s*["“]?(.+?)["”.]?\s*$/);
                if (m) {
                  const opt = m[1].replace(/["”]+$/, "").trim();
                  if (opt.length >= 4 && opt.length <= 80) harvested.push(opt);
                }
                if (harvested.length >= 6) break;
              }
              const fileName = (allFiles && allFiles[0]?.filename) || "";
              const title = fileName
                ? `What should I do with ${fileName.length > 38 ? fileName.slice(0, 35) + "…" : fileName}?`
                : "What would you like me to do?";
              const options = harvested.length >= 2
                ? harvested.slice(0, 6)
                : ["Edit for tone and coherence", "Proofread and polish", "Summarise the key points", "Critique and suggest improvements"];
              clarifySpecOut = {
                title, compact: true, confirmLabel: "Continue",
                fields: [{ key: "action", label: "", type: "choice", options, allowOther: true }],
              };
              console.log(`[czar-chat] prose-leak clarify converted to card (${wc2} words → ${options.length} options)`);
            }
          }

          if (clarifySpecOut) {
            fullText = `[CZAR_CLARIFY]${JSON.stringify(clarifySpecOut)}[/CZAR_CLARIFY]`;
            write("clarify", clarifySpecOut);
          } else {
            fullText = (fullText || "")
              .replace(/\[CZAR_CLARIFY\][\s\S]*?(?:\[\/CZAR_CLARIFY\]|$)/gi, "")
              .replace(/\[CZAR_PLAN\][\s\S]*?(?:\[\/CZAR_PLAN\]|$)/gi, "")
              .replace(/\[CZAR_IMAGE_SPEC\][\s\S]*?(?:\[\/CZAR_IMAGE_SPEC\]|$)/gi, "")
              .replace(/\[CZAR_DELIVERY:\w+\]/gi, "")
              .trim();
          }
        }

        // ── HUMANISER PIPELINE ────────────────────────────────────────
        // Run the 5-stage Academic Humaniser on substantive writing output
        // BEFORE persisting. Excluded: clarify/plan cards, slides decks,
        // short replies (<150 words), and document-correction (separate fn).
        // Doc-correction never reaches this function — it has its own pipeline.
        {
          const preWc = wordCount(fullText);
          const hasMarker = /\[CZAR_(CLARIFY|PLAN|IMAGE_SPEC)\]/.test(fullText || "");
          // OPT-IN. Humaniser only runs when user explicitly enabled the
          // "Auto-run Humaniser after each piece" setting. Default = OFF.
          const humaniserOn = body.settings?.humanise_after_writing === true;
          const shouldHumanise =
            !!fullText &&
            preWc >= 150 &&
            !hasMarker &&
            playbookPick !== "slides" &&
            humaniserOn;

          if (shouldHumanise) {
            console.log(`[czar-chat] humaniser starting (${preWc} words, mode=${mode}, playbook=${playbookPick})`);
            write("humanise", { state: "start", words: preWc });
            try {
              const polished = await runHumaniserPipeline(fullText, pick.model, (ev) => {
                write("humanise", ev);
              }, humaniserAbort);
              if (polished && polished.trim().length > 50) {
                fullText = polished;
                console.log(`[czar-chat] humaniser done: ${preWc} → ${wordCount(fullText)} words`);
                write("humanise", { state: "done", words: wordCount(fullText) });
              } else {
                console.warn("[czar-chat] humaniser returned empty — keeping raw draft");
                write("humanise", { state: "skipped", reason: "empty output" });
              }
            } catch (e: any) {
              console.error("[czar-chat] humaniser failed:", e?.message || e);
              write("humanise", { state: "skipped", reason: String(e?.message || e).slice(0, 200) });
            }
          }
        }

        // Persist final content & word usage (await so the row is up-to-date
        // before we tell the client we're done — avoids a DB-vs-stream race).
        const wc = wordCount(fullText);
        await svc.from("czar_messages").update({ content: fullText, tokens_out: wc }).eq("id", assistantId);
        // Only deduct from word quota for build / agent turns (actual writing).
        // Chat and plan turns are free and do not consume the user's pack.
        if (wc > 0 && !isAdmin && (mode === "build" || mode === "agent")) {
          try { await svc.rpc("increment_czar_words_used", { _user_id: user.id, _amount: wc }); }
          catch (e) { console.error("[czar-chat] word increment failed:", (e as Error).message); }
        }

        // Tell the client we're done IMMEDIATELY — don't make them wait for
        // the follow-ups roundtrip. Follow-ups stream in afterwards on the
        // same SSE connection and the client renders them when they arrive.
        write("done", { conversation_id: conversationId, assistant_id: assistantId, words: wc });

        // Follow-ups: only for substantive replies, fired after `done` so they
        // never delay the user seeing their answer settle.
        if (fullText && fullText.length > 200 && wc >= 40) {
          try {
            const followups = await generateFollowups(fullText, userMessage);
            if (followups.length) write("followups", { suggestions: followups });
          } catch (e) {
            console.warn("[czar-chat] followups failed:", (e as Error).message);
          }
        }
      } finally {
        clearInterval(heartbeat);
      }
    });
  } catch (err: any) {
    console.error("[czar-chat] fatal:", err?.message);
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─────────────────────────────────────────────────────────────────────
// SSE helper
// ─────────────────────────────────────────────────────────────────────
function sseResponse(producer: (write: (event: string, data: any) => void, humaniserAbort: AbortSignal) => Promise<void> | void): Response {
  const encoder = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  let clientGone = false;
  // Dedicated abort for the humaniser pipeline only — fired when the client
  // explicitly cancels (Stop button). Generation itself still runs to
  // completion in the background so persistence finishes; only the (slow,
  // optional) humaniser pass is interrupted.
  const humaniserAbort = new AbortController();
  const stream = new ReadableStream<Uint8Array>({
    start(c) { controller = c; },
    cancel() { clientGone = true; try { humaniserAbort.abort(); } catch {} },
  });

  const write = (event: string, data: any) => {
    if (clientGone) return; // silently drop — keeps the producer healthy
    try {
      controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    } catch {
      clientGone = true;
    }
  };

  // Prime the connection so the browser unblocks its fetch reader instantly
  // (Deno only flushes response bytes once start() has returned AND there is
  //  at least one chunk queued).
  write("ping", { t: Date.now() });

  // Run the producer in the BACKGROUND. Awaiting it inside start() would
  // hold back every byte until the entire reply is generated.
  // EdgeRuntime.waitUntil keeps the worker alive past client disconnect
  // so persistence + word-usage updates always complete.
  const run = (async () => {
    try { await producer(write, humaniserAbort.signal); }
    catch (e: any) {
      if (!clientGone) write("error", { message: String(e?.message || e) });
    }
    finally { try { controller.close(); } catch { /* already closed */ } }
  })();
  // @ts-ignore — Supabase Edge runtime exposes EdgeRuntime.waitUntil
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(run);
  }

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// ─────────────────────────────────────────────────────────────────────
// Lovable AI Gateway streaming (Gemini / GPT)
// ─────────────────────────────────────────────────────────────────────
async function streamLovable(opts: {
  model: string;
  system: string;
  messages: { role: string; content: string }[];
  onDelta: (text: string) => void;
}) {
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GOOGLE_AI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.model,
      stream: true,
      messages: [{ role: "system", content: opts.system }, ...opts.messages],
    }),
  });
  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Lovable AI ${res.status}: ${txt.slice(0, 300)}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") return;
      try {
        const parsed = JSON.parse(json);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta.length) opts.onDelta(delta);
      } catch {
        // partial JSON — re-buffer
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// DashScope (Qwen) streaming — OpenAI-compatible
// ─────────────────────────────────────────────────────────────────────
async function streamQwen(opts: {
  model: string;
  system: string;
  messages: { role: string; content: string }[];
  onDelta: (text: string) => void;
}) {
  const key = Deno.env.get("DASHSCOPE_API_KEY");
  if (!key) throw new Error("DashScope API key not configured.");
  const res = await fetch("https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.model,
      stream: true,
      messages: [{ role: "system", content: opts.system }, ...opts.messages],
    }),
  });
  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => "");
    throw new Error(`DashScope ${res.status}: ${txt.slice(0, 300)}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") return;
      try {
        const parsed = JSON.parse(json);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta.length) opts.onDelta(delta);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }
}

// Anthropic AGENTIC streaming with tool-use loop (Claude Sonnet 4.5)
// Tools: web_search (Gemini grounding), cite_check, generate_image_prompt
// ─────────────────────────────────────────────────────────────────────

const TOOL_DEFINITIONS = [
  {
    name: "web_search",
    description: "Search the live web in real time via Tavily and Google (Serper). Returns a curated answer plus a list of real source URLs you can cite. Use this whenever the user asks about anything time-sensitive (news, prices, current events), recent statistics, or any factual claim you're not 100% sure of. Set focus='academic' for peer-reviewed papers (Google Scholar), 'news' for fresh news (last 14 days), or 'general' for everything else. Use it BEFORE making factual claims you're uncertain about.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query — be specific and natural-language, like a human Google search." },
        focus: { type: "string", enum: ["general", "academic", "news"], description: "What kind of result to prioritise." },
      },
      required: ["query"],
    },
  },
  {
    name: "cite_check",
    description: "Verify whether a specific factual claim is true and find supporting sources. Use this after making a substantive claim if the user asks you to fact-check, or whenever you want to confirm a statistic, quote, study, or historical fact before stating it.",
    input_schema: {
      type: "object",
      properties: {
        claim: { type: "string", description: "The exact claim to verify, in one sentence." },
      },
      required: ["claim"],
    },
  },
  {
    name: "generate_image",
    description: "Generate a NEW image (photo, illustration, diagram, chart concept, infographic mock, cover art, figure for a document) from a text prompt. Use this whenever the user asks for an image, picture, photo, illustration, diagram, chart, figure, infographic, or visual asset — including 'add an image to this document'. The returned image is embedded inline in your reply automatically; do not also try to write a markdown link yourself. Be specific in the prompt: subject, composition, style, colour palette, mood. For document figures, request a clean academic style with a white background.",
    input_schema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "A vivid, specific description of the image to generate (subject, composition, style, palette)." },
        aspect_ratio: { type: "string", enum: ["1:1", "4:3", "3:4", "16:9", "9:16"], description: "Aspect ratio. Default 16:9 for figures, 1:1 for spot illustrations." },
      },
      required: ["prompt"],
    },
  },
  {
    name: "generate_pptx",
    description: "Generate a finished PowerPoint (.pptx) deck and return a download link that is automatically streamed inline in your reply. Use this whenever the user asks for slides, a deck, a presentation, a pitch, a lecture deck, a defence slides, a board pack, or anything PowerPoint-shaped. You design the slides yourself: pick a sensible palette, write punchy titles, decide structure (title → section → bullets/two-column/stat/quote/table/image). Render any tabular data as a real table slide, not bullets. For figures, you may pre-call generate_image and pass the returned data URL as image_data_url on a slide. Do NOT also write a markdown link to the file yourself — the link is added automatically. After calling, just confirm in one short sentence what the deck covers.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Filename without extension (e.g. 'quantum_dots_overview'). Defaults to 'czar-deck'." },
        title:    { type: "string", description: "Deck title shown on the cover slide and in the file metadata." },
        author:   { type: "string", description: "Author name for the file metadata. Optional." },
        palette: {
          type: "string",
          enum: ["midnight_executive","grey_llc","coral_energy","forest_moss","ocean_gradient","charcoal_minimal","clean_white","academic_navy","berry_cream","teal_trust","auto"],
          description: "Colour palette. Pick one that matches the topic; default 'academic_navy'.",
        },
        font_heading: { type: "string", description: "Heading font (e.g. 'Calibri', 'Georgia', 'Arial Black'). Default Calibri." },
        font_body:    { type: "string", description: "Body font. Default Calibri." },
        slides: {
          type: "array",
          description: "Ordered list of slide specs. 1 cover + section/bullets/etc. Aim for 6-20 slides unless the user asked for a specific count.",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["title","section","bullets","two_column","image","stat","quote","table"], description: "Slide layout. Default 'bullets'." },
              title: { type: "string" },
              subtitle: { type: "string" },
              body: { type: "string" },
              bullets: { type: "array", items: { type: "string" } },
              left:    { type: "array", items: { type: "string" }, description: "two_column left-side bullets." },
              right:   { type: "array", items: { type: "string" }, description: "two_column right-side bullets." },
              image_data_url: { type: "string", description: "Optional data:image/png;base64,... URL (e.g. from a prior generate_image call)." },
              stat: { type: "string", description: "Big-number string for a 'stat' slide, e.g. '87%' or '3.2x'." },
              stat_label: { type: "string" },
              quote: { type: "string" },
              attribution: { type: "string" },
              table: {
                type: "object",
                properties: {
                  headers: { type: "array", items: { type: "string" } },
                  rows:    { type: "array", items: { type: "array", items: { type: "string" } } },
                },
              },
              notes: { type: "string", description: "Speaker notes." },
            },
          },
        },
      },
      required: ["slides"],
    },
  },
  {
    name: "list_subscription_plans",
    description: "List the available CZAR word-pack subscriptions and the PaperStudio dissertation tiers, with prices in USD. Use this whenever the user asks what subscriptions / plans / packs / pricing are available, what they can buy, what tiers exist, or how much CZAR or PaperStudio costs. After listing, ask which one they want — then call start_subscription_checkout.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "start_subscription_checkout",
    description: "Start a Paystack checkout session for the plan the user picked. The user will be redirected to Paystack automatically — you do NOT need to write the URL. After calling, just confirm in one short sentence that checkout has opened. Always confirm the product (czar vs paperstudio) and tier before calling.",
    input_schema: {
      type: "object",
      properties: {
        product: { type: "string", enum: ["czar", "paperstudio"], description: "Which product the user wants to subscribe to." },
        tier: { type: "string", description: "For czar: starter | standard | pro | custom. For paperstudio: undergraduate | masters | phd | custom." },
        custom_words: { type: "number", description: "Required only when tier='custom'. Number of words the user wants to buy." },
      },
      required: ["product", "tier"],
    },
  },
];

async function streamAnthropicAgentic(opts: {
  apiKey: string;
  model: string;
  thinking: boolean;
  useTools: boolean;
  system: string;
  messages: { role: string; content: any }[];
  onDelta: (text: string) => void;
  onThinking?: (text: string) => void;
  onToolEvent?: (ev: { id: string; name: string; phase: "start" | "result" | "error"; input?: any; result?: any; error?: string }) => void;
  toolCtx?: ToolCtx;
}) {
  // Build conversation that we mutate across tool turns.
  const convo: any[] = opts.messages.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: typeof m.content === "string" ? m.content : m.content,
  }));

  // Agent runs may need many rounds (multi-figure deliverables, multi-source
  // cite_check loops). Non-agent tool turns rarely exceed 3.
  const MAX_TOOL_ROUNDS = 8;
  for (let round = 0; round < MAX_TOOL_ROUNDS + 1; round++) {
    const reqBody: any = {
      model: opts.model,
      // 32 K tokens ≈ 24 K words — enough for any dissertation chapter without
      // truncation. The previous 8 192 cap silently cut off large deliverables.
      max_tokens: 32000,
      system: opts.system,
      messages: convo,
      stream: true,
    };
    if (opts.thinking) {
      reqBody.thinking = { type: "enabled", budget_tokens: 8000 };
    }
    if (opts.useTools) {
      reqBody.tools = TOOL_DEFINITIONS;
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": opts.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reqBody),
    });
    if (!res.ok || !res.body) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Anthropic ${res.status}: ${txt.slice(0, 300)}`);
    }

    // Track content blocks for THIS turn so we can build the assistant
    // message to append back if tools were used.
    const blocks: any[] = []; // {type, text?, id?, name?, input?}
    let stopReason: string | null = null;
    let currentToolJson = ""; // accumulator for tool_use input json deltas
    let currentBlockIdx = -1;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (!json) continue;
        try {
          const parsed = JSON.parse(json);
          const t = parsed.type;
          if (t === "content_block_start") {
            currentBlockIdx = parsed.index;
            const cb = parsed.content_block;
            blocks[currentBlockIdx] = { ...cb };
            if (cb.type === "text") blocks[currentBlockIdx].text = "";
            if (cb.type === "tool_use") {
              blocks[currentBlockIdx].input = {};
              currentToolJson = "";
              opts.onToolEvent?.({ id: cb.id, name: cb.name, phase: "start" });
            }
            if (cb.type === "thinking") {
              blocks[currentBlockIdx].thinking = "";
              // Anthropic emits the cryptographic signature for thinking blocks
              // via a separate `signature_delta` event AFTER content_block_start.
              // Initialise it so we can append, and so we can tell signed from
              // unsigned blocks when rebuilding the assistant turn for the
              // tool_use round-trip (unsigned thinking blocks → 400 invalid
              // signature error and the agent run dies).
              blocks[currentBlockIdx].signature = "";
            }
          } else if (t === "content_block_delta") {
            const d = parsed.delta;
            const idx = parsed.index;
            if (d?.type === "text_delta" && typeof d.text === "string") {
              blocks[idx].text = (blocks[idx].text || "") + d.text;
              opts.onDelta(d.text);
            } else if (d?.type === "thinking_delta" && typeof d.thinking === "string") {
              blocks[idx].thinking = (blocks[idx].thinking || "") + d.thinking;
              opts.onThinking?.(d.thinking);
            } else if (d?.type === "signature_delta" && typeof d.signature === "string") {
              // Capture the thinking-block signature so we can replay this
              // assistant turn back to Anthropic in the next round.
              blocks[idx].signature = (blocks[idx].signature || "") + d.signature;
            } else if (d?.type === "input_json_delta" && typeof d.partial_json === "string") {
              currentToolJson += d.partial_json;
            }
          } else if (t === "content_block_stop") {
            const idx = parsed.index;
            if (blocks[idx]?.type === "tool_use") {
              try { blocks[idx].input = currentToolJson ? JSON.parse(currentToolJson) : {}; }
              catch { blocks[idx].input = { _raw: currentToolJson }; }
              currentToolJson = "";
            }
          } else if (t === "message_delta") {
            if (parsed.delta?.stop_reason) stopReason = parsed.delta.stop_reason;
          }
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }

    // If model didn't call tools, we're done.
    if (stopReason !== "tool_use") return;

    // Append assistant turn (with tool_use blocks) to conversation, then
    // execute tools and append a user message containing tool_result blocks.
    const assistantContent = blocks
      .filter(Boolean)
      .map((b) => {
        if (b.type === "text") return { type: "text", text: b.text || "" };
        if (b.type === "tool_use") return { type: "tool_use", id: b.id, name: b.name, input: b.input || {} };
        if (b.type === "thinking") {
          // Only replay thinking blocks that arrived with a real signature.
          // Unsigned/empty-signature blocks would trigger:
          //   "Invalid signature in thinking block"
          // Anthropic accepts assistant turns with tool_use but no thinking,
          // so dropping is the safe fallback.
          if (!b.signature) return null;
          return { type: "thinking", thinking: b.thinking || "", signature: b.signature };
        }
        return null;
      })
      .filter(Boolean);
    convo.push({ role: "assistant", content: assistantContent });

    const toolResults: any[] = [];
    for (const b of blocks) {
      if (b?.type !== "tool_use") continue;
      try {
        const result = await executeTool(b.name, b.input || {}, opts.onDelta, opts.toolCtx);
        opts.onToolEvent?.({ id: b.id, name: b.name, phase: "result", input: b.input, result });
        // For tool_result we send a TEXT-ONLY summary back to Claude.
        // The actual image (if any) was already streamed inline to the user
        // via onDelta — we never want to round-trip a giant base64 string
        // back to Anthropic (token explosion + no benefit).
        let toolResultForClaude: string;
        if (b.name === "generate_image" && result && (result as any).image_url) {
          toolResultForClaude = `Image generated successfully and embedded inline in the reply. Prompt used: "${(result as any).prompt_used || b.input?.prompt || ""}". Continue your reply naturally — do NOT write any markdown image link yourself, the image is already there.`;
        } else {
          toolResultForClaude = typeof result === "string" ? result : JSON.stringify(result);
        }
        toolResults.push({
          type: "tool_result",
          tool_use_id: b.id,
          content: toolResultForClaude,
        });
      } catch (e: any) {
        const msg = e?.message || String(e);
        opts.onToolEvent?.({ id: b.id, name: b.name, phase: "error", input: b.input, error: msg });
        toolResults.push({
          type: "tool_result",
          tool_use_id: b.id,
          content: `Tool error: ${msg}`,
          is_error: true,
        });
      }
    }
    convo.push({ role: "user", content: toolResults });

    if (round === MAX_TOOL_ROUNDS) {
      // Force a final answer with no tools
      // (next loop iteration will run, but we strip tools)
      // Easiest: just let it loop one more time; if it tries another tool call we stop.
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// Tool implementations
// ─────────────────────────────────────────────────────────────────────
interface ToolCtx {
  isAdmin?: boolean;
  authHeader?: string | null;
  userId?: string;
  svc?: any;
  onCheckout?: (ev: { product: string; tier: string; authorization_url: string; reference?: string }) => void;
}
async function executeTool(
  name: string,
  input: Record<string, any>,
  onInlineDelta?: (text: string) => void,
  ctx?: ToolCtx,
): Promise<any> {
  if (name === "web_search") {
    const query = String(input.query || "").trim();
    if (!query) return { error: "Empty query" };
    return await webSearchGemini(query, String(input.focus || "general"));
  }
  if (name === "cite_check") {
    const claim = String(input.claim || "").trim();
    if (!claim) return { error: "Empty claim" };
    const search = await webSearchGemini(`Verify: ${claim}`, "academic");
    return {
      claim,
      verdict_reasoning: search.answer,
      sources: search.sources,
    };
  }
  if (name === "generate_image") {
    const prompt = String(input.prompt || "").trim();
    if (!prompt) return { error: "Empty prompt" };
    const aspect = String(input.aspect_ratio || "16:9");
    const result = await generateImageNanoBanana(prompt, aspect);
    if (result.image_url && onInlineDelta) {
      // Stream the image into the user's reply IMMEDIATELY so it appears
      // in-line where Claude decided to call the tool, without waiting for
      // Claude's next text turn.
      const alt = prompt.slice(0, 120).replace(/[\[\]]/g, "");
      onInlineDelta(`\n\n![${alt}](${result.image_url})\n\n`);
    }
    return result;
  }
  if (name === "generate_pptx") {
    try {
      const spec = (input || {}) as PptxSpec;
      if (!spec.slides || !Array.isArray(spec.slides) || spec.slides.length === 0) {
        return { error: "slides array is required (at least 1 slide)." };
      }
      const b64 = await buildPptxBase64(spec);
      // Upload to czar-uploads under the user's folder for RLS scoping.
      const uid = ctx?.userId || "anon";
      const safeName = (spec.filename || spec.title || "czar-deck")
        .toString().toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "czar-deck";
      const ts = Date.now();
      const path = `${uid}/generated/${ts}-${safeName}.pptx`;
      const svc = ctx?.svc;
      if (!svc) return { error: "Storage client unavailable." };
      // base64 → Uint8Array
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const { error: upErr } = await svc.storage.from("czar-uploads").upload(path, bin, {
        contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        upsert: true,
      });
      if (upErr) return { error: `Upload failed: ${upErr.message}` };
      const { data: signed, error: sErr } = await svc.storage.from("czar-uploads").createSignedUrl(path, 60 * 60 * 24 * 7);
      if (sErr || !signed?.signedUrl) return { error: `Could not sign URL: ${sErr?.message || "unknown"}` };
      const url = signed.signedUrl;
      if (onInlineDelta) {
        onInlineDelta(`\n\n📎 [Download ${safeName}.pptx](${url})\n\n`);
      }
      return {
        ok: true,
        filename: `${safeName}.pptx`,
        download_url: url,
        slide_count: spec.slides.length,
        message: "PPTX generated and link streamed inline. Do not write the link again — confirm in one short sentence what the deck covers.",
      };
    } catch (e: any) {
      console.error("[czar-chat] generate_pptx failed:", e?.message || e);
      return { error: e?.message || "PPTX generation failed" };
    }
  }
  if (name === "list_subscription_plans") {
    return {
      czar: [
        { id: "starter",  label: "Starter",  words: 20000, price_usd: 50,  blurb: "Essays, briefs, quick research." },
        { id: "standard", label: "Standard", words: 40000, price_usd: 100, blurb: "Dissertation-grade output with extended thinking." },
        { id: "pro",      label: "Pro",      words: 80000, price_usd: 120, blurb: "Heaviest reasoning for thesis-level chapters." },
        { id: "custom",   label: "Custom",   price_usd_per_word: 0.009, blurb: "Pick any word amount. Linear pricing." },
      ],
      paperstudio: [
        { id: "undergraduate", label: "Undergraduate", words: 50000,  price_usd: 30,  blurb: "Final-year project / undergrad dissertation." },
        { id: "masters",       label: "Masters",       words: 80000,  price_usd: 150, blurb: "Masters thesis with extended thinking." },
        { id: "phd",           label: "PhD",           words: 100000, price_usd: 280, blurb: "Doctoral-grade reasoning + every premium tool." },
        { id: "custom",        label: "Custom",        price_usd_per_word: 0.027, blurb: "Pick any word amount." },
      ],
      note: "Show these to the user, then ask which one they want and call start_subscription_checkout with the chosen product + tier.",
    };
  }
  if (name === "start_subscription_checkout") {
    if (ctx?.isAdmin) {
      return { error: "Admin account does not subscribe — already has unlimited access." };
    }
    if (!ctx?.authHeader) return { error: "Not authenticated." };
    const product = String(input.product || "").toLowerCase();
    const tier = String(input.tier || "").toLowerCase();
    if (!["czar", "paperstudio"].includes(product)) return { error: "product must be 'czar' or 'paperstudio'." };
    if (!tier) return { error: "tier is required." };
    const callback_url = `${Deno.env.get("SITE_URL") || ""}/payment/callback?product=${product}`;
    const fnName = product === "czar" ? "create-czar-checkout" : "create-paystack-checkout";
    const body: any = { tier, callback_url };
    if (tier === "custom") body.custom_words = Number(input.custom_words) || 10000;
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: ctx.authHeader,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.authorization_url) {
        return { error: data?.error || `Checkout failed (${res.status})` };
      }
      // Tell the client to open the Paystack URL.
      ctx.onCheckout?.({ product, tier, authorization_url: data.authorization_url, reference: data.reference });
      return { ok: true, message: "Checkout opened. The user will complete payment on Paystack and be redirected back automatically.", reference: data.reference };
    } catch (e: any) {
      return { error: e?.message || "Checkout error" };
    }
  }
  return { error: `Unknown tool: ${name}` };
}

// Gemini image generation via Google AI native API. Returns a
// data:image/{type};base64,... URL that renders directly in markdown.
async function generateImageNanoBanana(prompt: string, _aspectRatio: string): Promise<{ image_url?: string; prompt_used: string; error?: string }> {
  try {
    const model = "gemini-2.0-flash-preview-image-generation";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_AI_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("[czar-chat] generate_image failed:", res.status, txt.slice(0, 300));
      return { prompt_used: prompt, error: `Image generation failed (${res.status})` };
    }
    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p: any) => p.inlineData?.data);
    if (!imagePart?.inlineData) {
      console.error("[czar-chat] generate_image: no image in response", JSON.stringify(data).slice(0, 500));
      return { prompt_used: prompt, error: "No image returned" };
    }
    const { mimeType, data: b64 } = imagePart.inlineData;
    return { image_url: `data:${mimeType || "image/png"};base64,${b64}`, prompt_used: prompt };
  } catch (e: any) {
    return { prompt_used: prompt, error: e?.message || "Unknown error" };
  }
}

// Real web search: Tavily (primary) → Serper (fallback) → Gemini grounding (last resort).
// Tavily returns clean URL + extract; Serper Scholar/News for academic/news focus.
const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");
const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY");

async function searchTavily(query: string, focus: string): Promise<{ answer: string; sources: { title: string; url: string }[] }> {
  if (!TAVILY_API_KEY) throw new Error("TAVILY_API_KEY not configured");
  const body: any = {
    api_key: TAVILY_API_KEY,
    query,
    search_depth: "advanced",
    include_answer: "advanced",
    max_results: 8,
    topic: focus === "news" ? "news" : "general",
  };
  if (focus === "news") body.days = 14;
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Tavily ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const data = await res.json();
  const sources = (data.results || []).slice(0, 8).map((r: any) => ({
    title: r.title || r.url,
    url: r.url,
  }));
  let answer: string = data.answer || "";
  if (!answer && data.results?.length) {
    answer = data.results.slice(0, 4).map((r: any) => `• ${r.title}: ${(r.content || "").slice(0, 200)}`).join("\n");
  }
  return { answer, sources };
}

async function searchSerper(query: string, focus: string): Promise<{ answer: string; sources: { title: string; url: string }[] }> {
  if (!SERPER_API_KEY) throw new Error("SERPER_API_KEY not configured");
  const endpoint =
    focus === "academic" ? "https://google.serper.dev/scholar" :
    focus === "news" ? "https://google.serper.dev/news" :
    "https://google.serper.dev/search";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, num: 10, hl: "en" }),
  });
  if (!res.ok) throw new Error(`Serper ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const data = await res.json();
  const items: any[] = data.organic || data.news || data.scholar || [];
  const answerBox = data.answerBox?.answer || data.answerBox?.snippet || "";
  const knowledge = data.knowledgeGraph?.description || "";
  const sources = items.slice(0, 8).map((r: any) => ({ title: r.title || r.link, url: r.link }));
  let answer = [answerBox, knowledge].filter(Boolean).join("\n\n");
  if (!answer) {
    answer = items.slice(0, 4).map((r: any) => `• ${r.title}: ${r.snippet || ""}`).join("\n");
  }
  return { answer, sources };
}

async function webSearchGemini(query: string, focus: string): Promise<{ answer: string; sources: { title: string; url: string }[] }> {
  // 1) Try Tavily — best for general & news, returns curated answer + clean URLs.
  if (TAVILY_API_KEY) {
    try { return await searchTavily(query, focus); }
    catch (e) { console.warn("[czar web_search] Tavily failed, falling back:", (e as Error).message); }
  }
  // 2) Try Serper — Google Scholar for academic, News for news, Search otherwise.
  if (SERPER_API_KEY) {
    try { return await searchSerper(query, focus); }
    catch (e) { console.warn("[czar web_search] Serper failed, falling back:", (e as Error).message); }
  }
  // 3) Last resort: Gemini grounding via Lovable Gateway.
  const focusHint =
    focus === "academic" ? "Prioritise peer-reviewed and scholarly sources where available. " :
    focus === "news" ? "Prioritise recent news from reputable outlets. " : "";
  const prompt = `${focusHint}Answer this query concisely (under 250 words) using live web information, then list the most relevant sources you used.\n\nQuery: ${query}`;
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GOOGLE_AI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a precise web research assistant. Answer with grounded facts, cite sources by URL." },
          { role: "user", content: prompt },
        ],
        tools: [{ type: "google_search", google_search: {} }],
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`web_search ${res.status}: ${txt.slice(0, 200)}`);
    }
    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content || "";
    const grounding = data.choices?.[0]?.message?.grounding_metadata
      || data.choices?.[0]?.grounding_metadata
      || data.grounding_metadata;
    const sources: { title: string; url: string }[] = [];
    if (grounding?.grounding_chunks) {
      for (const c of grounding.grounding_chunks) {
        if (c.web?.uri) sources.push({ title: c.web.title || c.web.uri, url: c.web.uri });
      }
    }
    if (sources.length === 0) {
      const linkRe = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
      let m;
      while ((m = linkRe.exec(answer)) && sources.length < 6) {
        sources.push({ title: m[1], url: m[2] });
      }
    }
    return { answer, sources: sources.slice(0, 8) };
  } catch (e: any) {
    return { answer: `Search failed: ${e?.message || e}`, sources: [] };
  }
}

// Generate 3 contextual follow-up questions after each reply.
async function generateFollowups(reply: string, lastUserMsg: string): Promise<string[]> {
  const sys = `You generate 3 short, contextual follow-up questions a user might ask next. Return ONLY a JSON array of 3 strings, each under 60 characters. No preamble, no markdown, no code fence — just the raw JSON array.`;
  const usr = `User just asked: "${lastUserMsg.slice(0, 300)}"\n\nAssistant just replied:\n${reply.slice(0, 1500)}\n\nReturn 3 follow-up questions as a JSON array.`;
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GOOGLE_AI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gemini-2.0-flash-lite",
      messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  let out = data.choices?.[0]?.message?.content || "";
  out = out.trim().replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
  try {
    const arr = JSON.parse(out);
    if (Array.isArray(arr)) return arr.slice(0, 3).map((s) => String(s).slice(0, 80));
  } catch { /* ignore */ }
  return [];
}

// ─────────────────────────────────────────────────────────────────────
// Humaniser pipeline caller — invokes the czar-humanise edge function
// over SSE and forwards stage events back via the supplied callback.
// Returns the final humanised text (or "" if every stage failed).
// ─────────────────────────────────────────────────────────────────────
async function runHumaniserPipeline(
  text: string,
  model: string | undefined,
  onEvent: (ev: any) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/czar-humanise`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
    },
    body: JSON.stringify({ text, model }),
  });
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    throw new Error(`humaniser ${res.status}: ${t.slice(0, 200)}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let currentEvent = "message";
  let humanised = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line) { currentEvent = "message"; continue; }
      if (line.startsWith("event:")) { currentEvent = line.slice(6).trim(); continue; }
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      try {
        const parsed = JSON.parse(payload);
        if (currentEvent === "stage_start" || currentEvent === "stage_done" || currentEvent === "stage_skip") {
          onEvent({ state: currentEvent, ...parsed });
        } else if (currentEvent === "done") {
          humanised = parsed?.humanised || "";
        }
      } catch { /* skip partial line */ }
    }
  }
  return humanised;
}
