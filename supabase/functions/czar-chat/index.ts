// czar-chat edge function — CZAR AI writing handler
// Handles chat, write, correct, research, and plan modes.
// Streams SSE events back to the client.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { CZAR_BRAIN_SYSTEM_PROMPT } from "./brain.ts";
import { runOrchestrator } from "./orchestrator.ts";
import { pickPlaybook, playbookText, RouterSignals } from "./promptLibrary.ts";

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Attachment {
  storage_path: string;
  filename: string;
  size: number;
  mime: string;
}

type CzarMode = "chat" | "write" | "correct" | "research" | "plan" | "literature_review" | "screenplay" | "legal";

interface CzarRequest {
  conversation_id: string | null;
  user_message: string;
  attachments?: Attachment[];
  mode?: CzarMode;
  settings?: Record<string, any>;
}

type WriteFunction = (event: string, data: Record<string, unknown>) => void;

// ---------------------------------------------------------------------------
// Settings manifest (inlined — can't import from src/ in Deno edge)
// ---------------------------------------------------------------------------

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

const PICKER_RULES: Record<string, (val: string) => string> = {
  language: (v) => `Language variant: ${v === "US" ? "US English" : "UK English"}.`,
  citation_style: (v) => v === "none"
    ? "Citations: omit unless explicitly requested."
    : `Citation style: ${v}. Use ${v} formatting for every in-text citation and the References section.`,
  tone: (v) => `Tone & register: ${v.replace(/-/g, " ")}.`,
};

function buildSettingsManifest(settings: Record<string, any>): string {
  if (!settings || typeof settings !== "object") return "";
  const lines: string[] = [];

  for (const [key, fn] of Object.entries(PICKER_RULES)) {
    if (settings[key]) lines.push(`• ${fn(String(settings[key]))}`);
  }

  for (const [key, rule] of Object.entries(TOGGLE_RULES)) {
    if (settings[key] === true) {
      if (rule.startsWith("(Handled")) continue;
      lines.push(`• ${rule}`);
    }
  }

  if (settings.thinking_mode) {
    lines.push("• Thinking mode: spend extra reasoning effort before producing the final draft. Plan, then write.");
  }

  if (settings.allow_online_lookup !== false) {
    lines.push("• Online lookup is ENABLED: use real data and current knowledge. For live figures, cite the source.");
  } else {
    lines.push("• Online lookup is DISABLED: rely solely on training data. If asked for live figures, state you cannot fetch them.");
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

// ---------------------------------------------------------------------------
// SSE helper
// ---------------------------------------------------------------------------

function createSSE(): {
  stream: ReadableStream;
  write: WriteFunction;
  close: () => void;
} {
  let controller: ReadableStreamDefaultController<Uint8Array>;
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
    cancel() {
      closed = true;
    },
  });

  function write(event: string, data: Record<string, unknown>): void {
    if (closed) return;
    try {
      const line = `data: ${JSON.stringify({ event, ...data })}\n\n`;
      controller.enqueue(encoder.encode(line));
    } catch {
      // stream may have been cancelled — ignore silently
    }
  }

  function close(): void {
    if (closed) return;
    closed = true;
    try {
      controller.close();
    } catch {
      // already closed
    }
  }

  return { stream, write, close };
}

// ---------------------------------------------------------------------------
// Word counting
// ---------------------------------------------------------------------------

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ---------------------------------------------------------------------------
// Mode detection
// ---------------------------------------------------------------------------

function detectMode(message: string, hasFiles: boolean, requestedMode?: CzarMode): CzarMode {
  const lower = message.toLowerCase();

  // Specialist modes are ALWAYS auto-detected from content — they override any frontend selection.
  // Users no longer see these in the dropdown; CZAR senses them from the brief automatically.
  if (/\b(literature review|systematic review|scoping review|integrative review|narrative review|prisma)\b/.test(lower)) {
    return "literature_review";
  }
  if (/\b(screenplay|script|scene heading|fade in|ext\.|int\.|feature film|short film|pilot|teleplay)\b/.test(lower)) {
    return "screenplay";
  }
  if (/\b(legal brief|legal memo|legal analysis|irac|case law|statute|tort|contract law|judicial|appellant|respondent|claimant|defendant brief)\b/.test(lower)) {
    return "legal";
  }

  // For non-specialist modes, respect what the user selected in the UI
  if (requestedMode) return requestedMode;

  // Auto-detect when no explicit mode was sent
  if (/\b(correct|fix|improve|proofread|edit)\b/.test(lower) && hasFiles) return "correct";
  if (/\b(research|find sources|bibliography)\b/.test(lower)) return "research";
  if (/\b(plan|outline|structure)\b/.test(lower)) return "plan";
  if (!hasFiles && message.length > 300 && /\b(write|draft|essay|report|paper)\b/.test(lower)) return "write";

  return "chat";
}

// ---------------------------------------------------------------------------
// Complexity detection
// ---------------------------------------------------------------------------

function detectComplexity(
  message: string,
  fileCount: number,
  mode: CzarMode,
): "low" | "medium" | "high" {
  if (mode === "chat" && countWords(message) < 50) return "low";
  if (fileCount > 0 && (mode === "write" || mode === "correct" || mode === "research")) return "high";
  if (/\b(\d{4,})\s*words?\b/.test(message)) {
    const m = message.match(/\b(\d+)\s*words?\b/);
    if (m && parseInt(m[1]) > 5000) return "high";
  }
  return "medium";
}

// ---------------------------------------------------------------------------
// Model selection
// ---------------------------------------------------------------------------

interface ModelChoice {
  provider: "anthropic" | "google" | "qwen";
  model: string;
  thinking: boolean;
  label: string;
}

// ── Model roster ─────────────────────────────────────────────────────────────
// Gemini 3.5 Flash — best-in-class fast reasoning, complex agentic tasks
const G_FAST = "gemini-3.5-flash";
// Gemini 3.1 Flash-Lite — cheap classification, memory extraction, tagging
const G_LITE = "gemini-3.1-flash-lite";
// Gemini 3.1 Pro Preview — advanced PhD-level reasoning, writing
const G_PRO  = "gemini-3.1-pro-preview";
// Claude models
const C_SONNET = "claude-sonnet-4-6";   // precision editing, correction
const C_OPUS   = "claude-opus-4-7";     // hardest PhD tasks, deep thinking
// Qwen — legal/structured reasoning (QwQ), general writing (Max)
const Q_REASON = "qwq-32b";             // dedicated reasoning model
const Q_MAX    = "qwen-max";            // general Qwen writer

const ADMIN_EMAIL = "grey.izilein@gmail.com";

function pickModel(
  tier: string,
  mode: CzarMode,
  complexity: "low" | "medium" | "high",
  email?: string | null,
): ModelChoice {
  const isAdmin = !!email && email.toLowerCase() === ADMIN_EMAIL;
  const effectiveTier = isAdmin ? "phd" : tier.toLowerCase();
  const isPremium = ["phd", "enterprise", "custom"].includes(effectiveTier) || isAdmin;

  // Chat + Plan: fast Gemini — conversational, no heavy reasoning needed
  if (mode === "chat" || mode === "plan") {
    return { provider: "google", model: G_FAST, thinking: false, label: "standard" };
  }

  // Screenplay: Gemini 3.5 Flash — creative, fast, no citation pipeline
  if (mode === "screenplay") {
    return { provider: "google", model: G_FAST, thinking: false, label: "standard" };
  }

  // Correct: Claude Sonnet — superb at editing, line-level precision, following markup instructions
  if (mode === "correct") {
    return { provider: "anthropic", model: C_SONNET, thinking: false, label: "standard" };
  }

  // Legal: reasoning-heavy — Qwen QwQ (reasoning model) for standard; Claude Opus for premium
  if (mode === "legal") {
    if (isPremium) {
      return { provider: "anthropic", model: C_OPUS, thinking: true, label: "deep reasoning" };
    }
    return { provider: "qwen", model: Q_REASON, thinking: false, label: "legal reasoning" };
  }

  // Write / Research / Lit Review — premium + high complexity: Claude Opus with thinking
  const isDeepMode = mode === "write" || mode === "research" || mode === "literature_review";
  if (isPremium && complexity === "high" && isDeepMode) {
    return { provider: "anthropic", model: C_OPUS, thinking: true, label: "deep reasoning" };
  }

  // Write / Research / Lit Review — premium, medium complexity: Claude Sonnet (excellent academic writer)
  if (isPremium && isDeepMode) {
    return { provider: "anthropic", model: C_SONNET, thinking: false, label: "enhanced" };
  }

  // Everything else: Gemini 3.1 Pro — advanced reasoning, PhD-level for standard tier
  return { provider: "google", model: G_PRO, thinking: false, label: "enhanced" };
}

// ---------------------------------------------------------------------------
// Mode directives
// ---------------------------------------------------------------------------

function modeDirective(mode: CzarMode, hasFiles: boolean): string {
  switch (mode) {
    case "correct":
      return `You are reviewing uploaded content. Read all files carefully. Identify: grammar errors, argument weaknesses, citation gaps, structural issues, register problems. Then produce the corrected version with changes marked as ~~old~~ → **new**. Explain significant changes.`;
    case "research":
      return `You are a research agent writing a standalone research document. Your task is fully specified in the EXECUTION PLAN and SOURCES sections of the user's message — write exactly what the plan specifies. Do not infer a different topic from earlier conversation messages. Always end with a full ## References section using the verified sources provided.`;
    case "plan":
      return `You are a document planning assistant. Output ONLY a single JSON block in this exact format — no prose, no commentary before or after:

\`\`\`czar-plan
{
  "title": "Document title here",
  "overview": "2–3 sentence summary of scope and approach",
  "sections": [
    { "number": 1, "title": "Section name", "description": "What this section covers and why", "words": 400 }
  ],
  "key_arguments": ["Central argument 1", "Central argument 2"],
  "sources": ["Author (Year) - Key text title", "Field/database to search"],
  "estimate": { "sections": 5, "words": 3500, "time_minutes": 40 },
  "open_questions": ["Any clarification needed from the user"],
  "assumptions": ["UK English", "Harvard referencing"]
}
\`\`\`

Rules: sections must be numbered; words per section must be specific integers; estimate.words = sum of section words; open_questions is empty array [] if none. Do not write ANYTHING outside the fence.`;
    case "write":
      return `You are writing a full document. Write completely. Do not stop mid-section. Do not ask permission to continue. Write all sections fully.`;
    case "literature_review":
      return `You are conducting a systematic literature review. Structure: Introduction (scope, search strategy, inclusion/exclusion criteria) → Thematic Sections (organised by theme not chronology) → Synthesis and Gaps → Conclusion. Follow PRISMA principles where appropriate. All claims must be cited. Identify research gaps explicitly. End with a full ## References section.`;
    case "screenplay":
      return `You are writing in Fountain screenplay format. Use proper scene headings (INT./EXT. LOCATION — DAY/NIGHT), action lines (present tense, active voice), character names (centred, all caps), and dialogue. Each scene must advance character or plot. Subtext over exposition. No camera directions unless essential. Dialogue must do at least two things simultaneously.`;
    case "legal":
      return `You are writing a legal document. Apply IRAC structure (Issue, Rule, Application, Conclusion) for each legal question. Distinguish clearly between statute (legislation as written), case law (judicial interpretation), and academic commentary. Cite cases in italics, statutes in plain text. Use OSCOLA citation style unless otherwise specified. Argument must be formally valid — state premises explicitly.`;
    case "chat":
    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// Gemini Imagen — photorealistic image generation
// ---------------------------------------------------------------------------

function isPhotoRequest(message: string): boolean {
  const lower = message.toLowerCase();
  const actionWord = /\b(generate|create|make|draw|produce|show me|give me|render)\b/.test(lower);
  const imageWord = /\b(photo|photograph|photorealistic|realistic image|picture|portrait|landscape|painting|artwork|illustration)\b/.test(lower);
  const notDiagram = !/\b(diagram|chart|flowchart|graph|table|timeline|mindmap|svg)\b/.test(lower);
  return actionWord && imageWord && notDiagram;
}

async function generateImage(
  prompt: string,
  signal: AbortSignal,
): Promise<string | null> {
  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
  if (!apiKey) return null;

  // Try Imagen 3 first (highest quality)
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1, aspectRatio: "4:3" },
        }),
        signal,
      },
    );
    if (resp.ok) {
      const data = await resp.json();
      const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
      const mime = data?.predictions?.[0]?.mimeType || "image/png";
      if (b64) return `data:${mime};base64,${b64}`;
    }
  } catch { /* fall through to next model */ }

  // Fallback: Gemini 2.0 Flash with image output modality
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
        signal,
      },
    );
    if (resp.ok) {
      const data = await resp.json();
      const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part?.inlineData?.data) {
          const mime = part.inlineData.mimeType || "image/png";
          return `data:${mime};base64,${part.inlineData.data}`;
        }
      }
    }
  } catch { /* both models failed */ }

  return null;
}

// ---------------------------------------------------------------------------
// Gemini multimodal extraction (PDF, audio)
// ---------------------------------------------------------------------------

async function extractWithGemini(
  b64: string,
  mimeType: string,
  instruction: string,
  signal: AbortSignal,
): Promise<string> {
  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
  if (!apiKey) return "";

  const body = {
    contents: [{
      role: "user",
      parts: [
        { text: instruction },
        { inlineData: { mimeType, data: b64 } },
      ],
    }],
    generationConfig: { maxOutputTokens: 16384, temperature: 0 },
  };

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${G_FAST}:generateContent?key=${apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal },
    );
    if (!resp.ok) return "";
    const data = await resp.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// File ingestion
// ---------------------------------------------------------------------------

async function ingestFiles(
  attachments: Attachment[],
  svc: SupabaseClient,
  write: WriteFunction,
  signal: AbortSignal,
): Promise<string> {
  const parts: string[] = [];
  let successCount = 0;

  for (const att of attachments) {
    if (signal.aborted) break;

    write("agent", {
      id: "reader",
      name: "File Reader",
      status: "working",
      action: `Reading ${att.filename}`,
    });

    try {
      const { data, error } = await svc.storage
        .from("czar-uploads")
        .download(att.storage_path);

      if (signal.aborted) break;

      if (error || !data) {
        write("status", {
          phase: "file_error",
          message: `Could not read ${att.filename}: ${error?.message ?? "unknown error"}`,
        });
        continue;
      }

      let text = "";

      const isText = att.mime === "text/plain" || att.mime === "text/markdown" ||
        att.filename.endsWith(".md") || att.filename.endsWith(".txt") ||
        att.mime.startsWith("text/") || att.mime === "application/json";

      const isPdf = att.mime === "application/pdf" || att.filename.endsWith(".pdf");

      const isAudio = att.mime.startsWith("audio/") ||
        /\.(mp3|wav|m4a|ogg|webm|flac|aac)$/i.test(att.filename);

      if (isText) {
        text = await data.text();
      } else if (isPdf || isAudio) {
        // Use Gemini multimodal for PDFs and audio
        const buf = await data.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        const instruction = isPdf
          ? "Extract all text from this PDF document. Preserve headings, paragraph structure, and any tables or lists. Return only the extracted text."
          : "Transcribe this audio file accurately and completely. Return only the transcription, with speaker labels if multiple speakers are apparent.";
        text = await extractWithGemini(b64, att.mime, instruction, signal);
        if (!text || text.length < 20) {
          text = isPdf
            ? `[PDF: ${att.filename} — extraction returned limited content. Please paste key sections directly.]`
            : `[Audio: ${att.filename} — transcription failed or returned empty.]`;
        }
      } else {
        text = `[File: ${att.filename} (${att.mime}) — binary format, not extractable as text.]`;
      }

      parts.push(`\n\n--- FILE: ${att.filename} ---\n${text}\n--- END FILE ---`);
      successCount++;
    } catch (err: any) {
      write("status", {
        phase: "file_error",
        message: `Could not read ${att.filename}: ${err?.message ?? "unexpected error"}`,
      });
      write("error", {
        message: `File read failed for ${att.filename}: ${err?.message ?? "unexpected error"}`,
        recoverable: true,
      });
    }
  }

  write("agent", {
    id: "reader",
    name: "File Reader",
    status: "done",
    action: `Read ${successCount} file${successCount !== 1 ? "s" : ""}`,
  });

  return parts.join("");
}

// ---------------------------------------------------------------------------
// Anthropic non-streaming (for structured JSON extraction)
// ---------------------------------------------------------------------------

async function callAnthropicSync(
  model: string,
  system: string,
  userMessage: string,
  signal: AbortSignal,
): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
    signal,
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`Anthropic ${resp.status}: ${txt.slice(0, 400)}`);
  }

  const data = await resp.json();
  return data?.content?.[0]?.text ?? "";
}

// ---------------------------------------------------------------------------
// Anthropic streaming
// ---------------------------------------------------------------------------

async function streamAnthropic(
  model: string,
  system: string,
  messages: { role: string; content: string }[],
  useThinking: boolean,
  write: WriteFunction,
  signal: AbortSignal,
): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const body: Record<string, unknown> = {
    model,
    max_tokens: 16000,
    stream: true,
    messages,
    system,
  };

  if (useThinking) {
    body.thinking = { type: "adaptive" };
    body.temperature = 1;
  }

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`Anthropic ${resp.status}: ${txt.slice(0, 400)}`);
  }
  if (!resp.body) throw new Error("Anthropic returned empty body");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let buf = "";

  try {
    while (true) {
      if (signal.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;

      buf += decoder.decode(value, { stream: true });
      let nlIdx: number;
      while ((nlIdx = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nlIdx).trim();
        buf = buf.slice(nlIdx + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "content_block_delta") {
            if (ev.delta?.type === "text_delta" && ev.delta?.text) {
              accumulated += ev.delta.text;
              write("delta", { text: ev.delta.text });
            } else if (ev.delta?.type === "thinking_delta" && ev.delta?.thinking) {
              write("thinking", { text: ev.delta.thinking });
            }
          }
        } catch {
          // malformed SSE line — ignore
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return accumulated;
}

// ---------------------------------------------------------------------------
// Google Gemini streaming
// ---------------------------------------------------------------------------

async function streamGoogle(
  model: string,
  system: string,
  messages: { role: string; content: string }[],
  write: WriteFunction,
  signal: AbortSignal,
): Promise<string> {
  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not configured");

  // Build Gemini contents array: system as first user turn if present
  const contents: { role: string; parts: { text: string }[] }[] = [];

  for (const m of messages) {
    const geminiRole = m.role === "assistant" ? "model" : "user";
    const last = contents[contents.length - 1];
    if (last && last.role === geminiRole) {
      last.parts[0].text += "\n\n" + m.content;
    } else {
      contents.push({ role: geminiRole, parts: [{ text: m.content }] });
    }
  }

  const body = {
    system_instruction: system ? { parts: [{ text: system }] } : undefined,
    contents,
    generationConfig: {
      maxOutputTokens: 32768,
      temperature: 0.7,
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`Google ${resp.status}: ${txt.slice(0, 400)}`);
  }
  if (!resp.body) throw new Error("Google returned empty body");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let buf = "";

  try {
    while (true) {
      if (signal.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;

      buf += decoder.decode(value, { stream: true });
      let nlIdx: number;
      while ((nlIdx = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nlIdx).trim();
        buf = buf.slice(nlIdx + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          const text = ev?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            accumulated += text;
            write("delta", { text });
          }
        } catch {
          // ignore
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return accumulated;
}

// ---------------------------------------------------------------------------
// Qwen streaming (OpenAI-compatible DashScope endpoint)
// ---------------------------------------------------------------------------

async function streamQwen(
  model: string,
  system: string,
  messages: { role: string; content: string }[],
  write: WriteFunction,
  signal: AbortSignal,
): Promise<string> {
  const apiKey = Deno.env.get("QWEN_API_KEY");
  if (!apiKey) throw new Error("QWEN_API_KEY not configured");

  const resp = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, ...messages],
      stream: true,
      max_tokens: 16000,
    }),
    signal,
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`Qwen ${resp.status}: ${txt.slice(0, 400)}`);
  }
  if (!resp.body) throw new Error("Qwen returned empty body");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let buf = "";

  try {
    while (true) {
      if (signal.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;

      buf += decoder.decode(value, { stream: true });
      let nlIdx: number;
      while ((nlIdx = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nlIdx).trim();
        buf = buf.slice(nlIdx + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          // Reasoning content (QwQ think-aloud) — stream as thinking event
          const reasoning = ev?.choices?.[0]?.delta?.reasoning_content;
          if (reasoning) write("thinking", { text: reasoning });
          // Main content
          const text = ev?.choices?.[0]?.delta?.content;
          if (text) {
            accumulated += text;
            write("delta", { text });
          }
        } catch { /* ignore */ }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return accumulated;
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

interface AuthInfo {
  userId: string;
  email: string | null;
  tier: string;
}

async function getAuthInfo(
  authHeader: string,
  svc: SupabaseClient,
): Promise<AuthInfo | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: authHeader, apikey: serviceKey },
  });
  if (!userResp.ok) return null;

  const userData = await userResp.json();
  const userId: string = userData?.id;
  const email: string | null = userData?.email ?? null;
  if (!userId) return null;

  // Look up czar subscription tier
  const { data: sub } = await svc
    .from("czar_subscriptions")
    .select("tier, status, word_limit, words_used, bonus_words, bonus_used")
    .eq("user_id", userId)
    .maybeSingle();

  const tier = sub?.tier ?? "none";
  return { userId, email, tier };
}

// ---------------------------------------------------------------------------
// Conversation helpers
// ---------------------------------------------------------------------------

async function ensureConversation(
  conversationId: string | null,
  userId: string,
  title: string,
  svc: SupabaseClient,
): Promise<string> {
  if (conversationId) {
    // Verify it belongs to this user
    const { data } = await svc
      .from("czar_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (data?.id) return conversationId;
  }

  // Create new conversation
  const { data, error } = await svc
    .from("czar_conversations")
    .insert({ user_id: userId, title })
    .select("id")
    .single();

  if (error || !data?.id) throw new Error(`Failed to create conversation: ${error?.message}`);
  return data.id;
}

async function loadConversationHistory(
  conversationId: string,
  svc: SupabaseClient,
): Promise<{ role: string; content: string }[]> {
  const { data, error } = await svc
    .from("czar_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(40);

  if (error || !data) return [];
  return data.filter((m) => m.content?.trim()).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));
}

// ---------------------------------------------------------------------------
// Long-term memory
// ---------------------------------------------------------------------------

async function loadUserMemory(userId: string, svc: SupabaseClient): Promise<string> {
  try {
    const { data } = await svc
      .from("czar_user_memory")
      .select("facts")
      .eq("user_id", userId)
      .maybeSingle();

    if (!data?.facts) return "";

    const facts = data.facts as Record<string, string>;
    const lines = Object.entries(facts)
      .filter(([, v]) => v?.trim())
      .map(([k, v]) => `• ${k}: ${v}`);

    if (lines.length === 0) return "";

    return [
      "",
      "===== USER MEMORY (persistent context — highest priority) =====",
      ...lines,
      "===== END USER MEMORY =====",
      "",
    ].join("\n");
  } catch {
    return "";
  }
}

async function extractAndSaveMemory(
  userId: string,
  userMessage: string,
  svc: SupabaseClient,
): Promise<void> {
  const lower = userMessage.toLowerCase();
  if (!lower.includes("remember") && !lower.includes("my name is") &&
      !lower.includes("i am a") && !lower.includes("i'm a") &&
      !lower.includes("i study") && !lower.includes("my supervisor")) {
    return;
  }

  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
  if (!apiKey) return;

  const system = `Extract factual memory items from this message. The user is telling CZAR something to remember.
Return ONLY valid JSON: { "key": "value", ... } where key is a short label and value is the fact.
Examples: { "academic_level": "PhD student", "institution": "UCL", "citation_style": "Harvard", "supervisor": "Dr Smith" }
Return {} if nothing memorable. Max 5 keys.`;

  try {
    const body = {
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: { maxOutputTokens: 512, temperature: 0 },
    };
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${G_LITE}:generateContent?key=${apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    );
    if (!resp.ok) return;
    const data = await resp.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return;
    const newFacts = JSON.parse(match[0]);
    if (Object.keys(newFacts).length === 0) return;

    // Merge with existing facts
    const { data: existing } = await svc
      .from("czar_user_memory")
      .select("facts")
      .eq("user_id", userId)
      .maybeSingle();

    const merged = { ...(existing?.facts ?? {}), ...newFacts };

    await svc
      .from("czar_user_memory")
      .upsert({ user_id: userId, facts: merged, updated_at: new Date().toISOString() });
  } catch {
    // non-fatal
  }
}

// ---------------------------------------------------------------------------
// Main logic
// ---------------------------------------------------------------------------

async function runMain(
  req: CzarRequest,
  authHeader: string,
  write: WriteFunction,
  close: () => void,
): Promise<void> {
  const controller = new AbortController();
  const signal = controller.signal;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const svc = createClient(supabaseUrl, serviceKey);

  let streamClosed = false;
  const heartbeat = setInterval(() => {
    if (!streamClosed) write("ping", {});
  }, 8000);

  const safeClose = () => {
    if (!streamClosed) {
      streamClosed = true;
      clearInterval(heartbeat);
      close();
    }
  };

  try {
    // ── 1. Auth ──────────────────────────────────────────────────────────
    let auth: AuthInfo | null;
    try {
      auth = await getAuthInfo(authHeader, svc);
    } catch (err: any) {
      write("error", { message: `Auth failed: ${err?.message ?? "unknown"}`, recoverable: false });
      return;
    }

    if (!auth) {
      write("error", { message: "Unauthorized — invalid or expired token", recoverable: false });
      return;
    }

    const { userId, email, tier } = auth;

    // ── 2. Word limit check ──────────────────────────────────────────────
    if (email !== ADMIN_EMAIL) {
      const { data: sub } = await svc
        .from("czar_subscriptions")
        .select("word_limit, words_used, bonus_words, bonus_used, status")
        .eq("user_id", userId)
        .maybeSingle();

      if (sub) {
        const totalUsed = (sub.words_used ?? 0) + (sub.bonus_used ?? 0);
        const totalAllowed = (sub.word_limit ?? 0) + (sub.bonus_words ?? 0);
        if (totalAllowed > 0 && totalUsed >= totalAllowed) {
          write("billing", { reason: "Word limit reached. Please upgrade your CZAR plan to continue." });
          return;
        }
        if (sub.status === "expired") {
          write("billing", { reason: "Your CZAR subscription has expired. Please renew to continue." });
          return;
        }
      }
    }

    // ── 3. Parse request ─────────────────────────────────────────────────
    const hasFiles = (req.attachments?.length ?? 0) > 0;
    const mode = detectMode(req.user_message, hasFiles, req.mode);
    const complexity = detectComplexity(req.user_message, req.attachments?.length ?? 0, mode);
    const modelChoice = pickModel(tier, mode, complexity, email);

    // ── 4. Conversation ──────────────────────────────────────────────────
    const conversationTitle = req.user_message.slice(0, 60) || "New chat";
    let conversationId: string;
    try {
      conversationId = await ensureConversation(
        req.conversation_id,
        userId,
        conversationTitle,
        svc,
      );
    } catch (err: any) {
      write("error", { message: `Conversation error: ${err?.message}`, recoverable: false });
      return;
    }

    // ── 5. Save user message ─────────────────────────────────────────────
    try {
      await svc.from("czar_messages").insert({
        conversation_id: conversationId,
        user_id: userId,
        role: "user",
        content: req.user_message,
        mode,
        metadata: hasFiles ? { attachments: req.attachments } : {},
      });
    } catch (err: any) {
      write("error", { message: `Failed to save user message: ${err?.message}`, recoverable: true });
    }

    // ── 6. Create placeholder assistant message ──────────────────────────
    let assistantId: string | null = null;
    try {
      const { data: assistantRow } = await svc
        .from("czar_messages")
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          role: "assistant",
          content: "",
          mode,
          model_used: modelChoice.model,
          metadata: { mode, complexity },
        })
        .select("id")
        .single();
      assistantId = assistantRow?.id ?? null;
    } catch (err: any) {
      write("error", { message: `Failed to create assistant message: ${err?.message}`, recoverable: true });
    }

    // ── 7. Emit meta ─────────────────────────────────────────────────────
    write("meta", {
      conversation_id: conversationId,
      assistant_id: assistantId ?? "",
      model_label: modelChoice.label,
      mode,
    });

    // ── 8. Ingest files ──────────────────────────────────────────────────
    let fileContext = "";
    if (hasFiles) {
      try {
        fileContext = await ingestFiles(req.attachments!, svc, write, signal);
      } catch (err: any) {
        write("error", {
          message: `File ingestion failed: ${err?.message}`,
          recoverable: true,
        });
      }
    }

    // ── 9. Build system prompt ────────────────────────────────────────────
    const settingsBlock = req.settings ? buildSettingsManifest(req.settings) : "";
    const directive = modeDirective(mode, hasFiles);

    // Pick and append the right task playbook
    const routerSignals: RouterSignals = {
      user_message: req.user_message,
      attachment_count: req.attachments?.length ?? 0,
      total_attachment_words: 0,
      filenames: req.attachments?.map((a) => a.filename) ?? [],
    };
    const playbook = pickPlaybook(routerSignals);
    const playbookContent = playbookText(playbook);

    const memoryBlock = await loadUserMemory(userId, svc);

    const systemParts = [CZAR_BRAIN_SYSTEM_PROMPT];
    if (memoryBlock) systemParts.push(memoryBlock);
    if (settingsBlock) systemParts.push(settingsBlock);
    if (directive) systemParts.push("\n\n" + directive);
    if (playbookContent) systemParts.push("\n\n" + playbookContent);
    const system = systemParts.join("\n");

    // Extract memory facts async — non-blocking, runs after main logic starts
    extractAndSaveMemory(userId, req.user_message, svc).catch(() => {});

    // ── 10. Load conversation history ─────────────────────────────────────
    let history: { role: string; content: string }[] = [];
    try {
      history = await loadConversationHistory(conversationId, svc);
      // Strip empty assistant placeholder (just inserted above)
      while (
        history.length > 0 &&
        history[history.length - 1].role === "assistant" &&
        history[history.length - 1].content.trim() === ""
      ) {
        history.pop();
      }
      // Strip current user message — we re-add it below (with augmented content for write/research)
      if (history.length > 0 && history[history.length - 1].role === "user") {
        history.pop();
      }
    } catch {
      // non-fatal
    }

    // ── 11. Generate response (orchestrated or direct) ────────────────────
    let fullResponse = "";

    // ── Special path: Apply selected corrections (surgical AI edit) ───────
    if (mode === "correct" && req.settings?.correction_apply === true && !signal.aborted) {
      const originalText = (req.settings.correction_original_text as string | undefined) || "";
      const correctionsList = (req.settings.correction_selected_changes as string | undefined) || "";

      if (!originalText.trim() || !correctionsList.trim()) {
        write("error", { message: "Missing original text or corrections to apply.", recoverable: false });
        return;
      }

      write("agent", { id: "editor", name: "CZAR Editor", status: "working", action: "Applying corrections…" });

      const applySystem = `You are a precise document editor. Your sole job is to apply the listed corrections to the document.

Rules:
1. Apply ONLY the corrections listed — do not change anything else
2. Apply each correction surgically: find the exact text and replace it
3. If an override instruction is given for a correction, honour it as the primary guidance
4. Preserve all paragraph breaks, spacing, headings, and formatting
5. Output the COMPLETE corrected document text — nothing else, no preamble, no explanation`;

      const userMsg = `Apply these corrections:\n\n${correctionsList}\n\n---\n\nORIGINAL DOCUMENT:\n\n${originalText}`;

      try {
        fullResponse = await streamAnthropic(
          C_SONNET,
          applySystem,
          [{ role: "user", content: userMsg }],
          false,
          write,
          signal,
        );
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          write("error", { message: `Apply failed: ${err?.message ?? "unknown error"}`, recoverable: false });
          return;
        }
      }

      write("agent", { id: "editor", name: "CZAR Editor", status: "done", action: `${countWords(fullResponse)} words` });

      // Persist
      if (assistantId && fullResponse) {
        try { await svc.from("czar_messages").update({
          content: fullResponse,
          metadata: { mode, complexity, word_count: countWords(fullResponse) },
        }).eq("id", assistantId); } catch {}
      }
      try { await svc.from("czar_conversations").update({
        mode, last_message: req.user_message.slice(0, 200), updated_at: new Date().toISOString(),
      }).eq("id", conversationId); } catch {}

      if (countWords(fullResponse) > 0 && email !== ADMIN_EMAIL) {
        try { await svc.rpc("increment_czar_words_used", { _user_id: userId, _amount: countWords(fullResponse) }); } catch {}
      }

      write("done", { conversation_id: conversationId, assistant_id: assistantId ?? "", words: countWords(fullResponse) });
      return;
    }

    // ── Special path: Correction mode — structured JSON analysis ──────────
    if (mode === "correct" && !signal.aborted) {
      const docText: string = (req.settings?.correction_paste as string | undefined) || fileContext;
      const correctionNotes: string = (req.settings?.correction_notes as string | undefined) || "";

      if (!docText.trim()) {
        write("error", {
          message: "No document text found. Please upload a file or paste your text in the correction modal.",
          recoverable: false,
        });
        return;
      }

      write("agent", { id: "corrector", name: "CZAR Corrector", status: "working", action: "Analyzing document…" });

      const correctionSystem = `You are a professional editor. Analyze the provided document and identify ALL corrections needed.

Return ONLY valid JSON (no markdown code fence, no explanation outside the JSON) in this exact format:
{
  "summary": {
    "word_count_before": <number>,
    "word_count_after": <number>,
    "register_notes": ["<note about tone or register inconsistency if any>"]
  },
  "changes": [
    {
      "id": "ch_001",
      "type": "<grammar|style|structure|argument|register>",
      "original": "<EXACT verbatim text from document — must match character-for-character>",
      "corrected": "<the improved replacement text>",
      "explanation": "<brief, specific explanation of why this change is needed>"
    }
  ]
}

Types:
- grammar: spelling, punctuation, subject-verb agreement, tense consistency, capitalisation
- style: word choice, clarity, passive voice, sentence variety, concision, filler words
- structure: paragraph organisation, transitions, topic sentences, logical flow
- argument: logical gaps, unsupported claims, weak evidence, missing citations
- register: tone inconsistency, formal/informal mixing, inappropriate register for context

Rules:
1. The "original" field MUST be verbatim text from the document (used for exact string matching — do NOT paraphrase)
2. Include ALL corrections, including minor ones; err on the side of more changes
3. Order changes by their position in the document (start → end)
4. Do not repeat the same original text in two changes
5. Keep changes granular — one specific issue per change entry
6. For structural issues, use the problematic sentence or paragraph opener as "original"${correctionNotes ? `\n\nAdditional editor instructions from user: ${correctionNotes}` : ""}`;

      let rawJson = "";
      try {
        rawJson = await callAnthropicSync(C_SONNET, correctionSystem, `Document to analyze:\n\n${docText}`, signal);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        write("error", { message: `Correction analysis failed: ${err?.message ?? "unknown error"}`, recoverable: false });
        return;
      }

      write("agent", { id: "corrector", name: "CZAR Corrector", status: "done", action: "Analysis complete" });

      // Parse JSON — extract the JSON object even if the model added surrounding text
      let parsed: { summary?: Record<string, any>; changes?: any[] } = {};
      try {
        const match = rawJson.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("No JSON object found in response");
        parsed = JSON.parse(match[0]);
      } catch (err: any) {
        write("error", { message: `Could not parse correction results: ${err?.message}`, recoverable: false });
        return;
      }

      const changes: any[] = Array.isArray(parsed.changes) ? parsed.changes : [];
      const summary = parsed.summary ?? {};

      // Count by type
      const byType: Record<string, number> = {};
      for (const c of changes) {
        if (c.type) byType[c.type] = (byType[c.type] ?? 0) + 1;
      }

      const wordsBefore = typeof summary.word_count_before === "number"
        ? summary.word_count_before
        : docText.trim().split(/\s+/).filter(Boolean).length;

      // Emit summary first
      write("correction_summary", {
        total: changes.length,
        by_type: byType,
        word_count_before: wordsBefore,
        word_count_after: typeof summary.word_count_after === "number" ? summary.word_count_after : wordsBefore,
        register_notes: Array.isArray(summary.register_notes) ? summary.register_notes : [],
        original_text: docText,
      });

      // Emit each change
      for (let i = 0; i < changes.length; i++) {
        const c = changes[i];
        if (!c.original || !c.corrected) continue;
        write("correction_change", {
          id: c.id ?? `ch_${String(i + 1).padStart(3, "0")}`,
          type: c.type ?? "grammar",
          original: c.original,
          corrected: c.corrected,
          explanation: c.explanation ?? "",
        });
      }

      // Persist
      const correctionMeta = `[Correction analysis: ${changes.length} changes]`;
      if (assistantId) {
        try { await svc.from("czar_messages").update({
          content: correctionMeta,
          metadata: { mode, complexity, correction_count: changes.length },
        }).eq("id", assistantId); } catch {}
      }

      try { await svc.from("czar_conversations").update({
        mode, last_message: req.user_message.slice(0, 200), updated_at: new Date().toISOString(),
      }).eq("id", conversationId); } catch {}

      write("done", { conversation_id: conversationId, assistant_id: assistantId ?? "", words: changes.length });
      return;
    }

    const isOrchestratedMode = mode === "write" || mode === "research" || mode === "literature_review" || mode === "legal";

    if (isOrchestratedMode && !signal.aborted) {
      // Multi-agent pipeline: Planner → Researcher → Writer → Critic → Illustrator
      try {
        fullResponse = await runOrchestrator({
          userMessage: req.user_message,
          mode,
          fileContext,
          systemPrompt: system,
          history: history.slice(-20),
          modelChoice,
          write,
          signal,
          streamAnthropicFn: streamAnthropic,
          streamGoogleFn: streamGoogle,
          streamQwenFn: streamQwen,
          svc,
          userId,
        });
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          write("error", {
            message: `Orchestration failed: ${err?.message ?? "unknown error"}`,
            recoverable: false,
          });
          return;
        }
      }
    } else {
      // ── Image generation shortcut (chat mode + explicit photo request) ────────
      if (mode === "chat" && isPhotoRequest(req.user_message) && !signal.aborted) {
        write("agent", {
          id: "illustrator",
          name: "Illustrator",
          status: "working",
          action: "Generating image with Gemini Imagen…",
        });

        const imageDataUrl = await generateImage(req.user_message, signal).catch(() => null);

        if (imageDataUrl && !signal.aborted) {
          const captionMatch = req.user_message.match(/\b(?:of|showing|depicting|illustrating|:)\s+(.+)/i);
          const caption = captionMatch ? captionMatch[1].trim().slice(0, 120) : "Generated image";
          fullResponse = `![${caption}](${imageDataUrl})\n\n*Generated with Gemini Imagen · Click to view full size*`;
          write("delta", { text: fullResponse });
          write("agent", {
            id: "illustrator",
            name: "Illustrator",
            status: "done",
            action: "Image generated",
          });

          // Persist and exit
          if (assistantId && fullResponse) {
            try { await svc.from("czar_messages").update({
              content: "[Image generated]",
              metadata: { mode, complexity },
            }).eq("id", assistantId); } catch {}
          }
          try { await svc.from("czar_conversations").update({
            mode, last_message: req.user_message.slice(0, 200), updated_at: new Date().toISOString(),
          }).eq("id", conversationId); } catch {}
          write("done", { conversation_id: conversationId, assistant_id: assistantId ?? "", words: 5 });
          return;
        }

        // Image generation failed — fall through to text response
        write("agent", {
          id: "illustrator",
          name: "Illustrator",
          status: "error",
          action: "Image generation unavailable — responding with SVG",
        });
      }

      // Direct model call for chat, plan, correct
      write("agent", {
        id: "writer",
        name: "CZAR Writer",
        status: "starting",
        action: `${mode} mode`,
      });

      const userContent = req.user_message + (fileContext ? "\n\n" + fileContext : "");
      const messages = [
        ...history.slice(-20),
        { role: "user", content: userContent },
      ];

      try {
        if (modelChoice.provider === "anthropic") {
          fullResponse = await streamAnthropic(
            modelChoice.model,
            system,
            messages,
            modelChoice.thinking,
            write,
            signal,
          );
        } else if (modelChoice.provider === "qwen") {
          fullResponse = await streamQwen(
            modelChoice.model,
            system,
            messages,
            write,
            signal,
          );
        } else {
          fullResponse = await streamGoogle(
            modelChoice.model,
            system,
            messages,
            write,
            signal,
          );
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          write("error", {
            message: `AI generation failed: ${err?.message ?? "unknown error"}`,
            recoverable: false,
          });
          return;
        }
      }

      write("agent", {
        id: "writer",
        name: "CZAR Writer",
        status: "done",
        action: `${countWords(fullResponse)} words generated`,
      });
    }

    // ── 13. Persist response ──────────────────────────────────────────────
    const wordCount = countWords(fullResponse);

    if (assistantId && fullResponse) {
      try {
        await svc
          .from("czar_messages")
          .update({
            content: fullResponse,
            metadata: { mode, complexity, word_count: wordCount },
          })
          .eq("id", assistantId);
      } catch (err: any) {
        write("error", {
          message: `Failed to save response: ${err?.message}`,
          recoverable: true,
        });
      }
    }

    // Update conversation last message
    try {
      await svc
        .from("czar_conversations")
        .update({
          mode,
          last_message: req.user_message.slice(0, 200),
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);
    } catch {
      // non-fatal
    }

    // ── 14. Deduct words ──────────────────────────────────────────────────
    if (wordCount > 0 && email !== ADMIN_EMAIL) {
      try {
        await svc.rpc("increment_czar_words_used", {
          _user_id: userId,
          _amount: wordCount,
        });
      } catch (err: any) {
        write("error", {
          message: `Word balance update failed: ${err?.message}`,
          recoverable: true,
        });
      }
    }

    // ── 15. Done ──────────────────────────────────────────────────────────
    write("done", {
      conversation_id: conversationId,
      assistant_id: assistantId ?? "",
      words: wordCount,
    });
  } catch (err: any) {
    const isAbort = err?.name === "AbortError";
    if (!isAbort) {
      try {
        write("error", {
          message: `Unexpected error: ${err?.message ?? String(err)}`,
          recoverable: false,
        });
      } catch {
        // stream may already be closed
      }
    }
  } finally {
    safeClose();
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing Authorization header" }),
      { status: 401, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  let body: CzarRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  if (!body.user_message || typeof body.user_message !== "string") {
    return new Response(
      JSON.stringify({ error: "user_message is required" }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  // Create SSE stream and return it immediately
  const { stream, write, close } = createSSE();

  // Run main logic in background — do NOT await
  Promise.resolve().then(() => runMain(body, authHeader, write, close)).catch((err) => {
    try {
      write("error", { message: String(err), recoverable: false });
    } catch {
      // ignore
    }
    close();
  });

  return new Response(stream, {
    headers: {
      ...CORS,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
