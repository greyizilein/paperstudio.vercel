// czar-chat edge function — CZAR AI writing handler
// Handles chat, write, correct, research, and plan modes.
// Streams SSE events back to the client.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { CZAR_BRAIN_SYSTEM_PROMPT } from "./brain.ts";

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

type CzarMode = "chat" | "write" | "correct" | "research" | "plan";

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
  if (requestedMode) return requestedMode;

  const lower = message.toLowerCase();

  if (/\b(correct|fix|improve|proofread|edit)\b/.test(lower) && hasFiles) return "correct";
  if (/\b(research|find sources|literature|bibliography)\b/.test(lower)) return "research";
  if (/\b(plan|outline|structure)\b/.test(lower)) return "plan";

  // Heuristic: long message with no files that looks like a writing brief
  if (!hasFiles && message.length > 300 && /\b(write|draft|essay|report|paper)\b/.test(lower)) {
    return "write";
  }

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
  provider: "anthropic" | "google";
  model: string;
  thinking: boolean;
  label: string;
}

const ADMIN_EMAIL = "grey.izilein@gmail.com";

function pickModel(
  tier: string,
  mode: CzarMode,
  complexity: "low" | "medium" | "high",
  email?: string | null,
): ModelChoice {
  const isAdmin = !!email && email.toLowerCase() === ADMIN_EMAIL;
  const effectiveTier = isAdmin ? "phd" : tier.toLowerCase();

  // Chat and Plan are always lightweight — Gemini Flash
  if (mode === "chat" || mode === "plan") {
    return { provider: "google", model: "gemini-2.5-flash", thinking: false, label: "standard" };
  }

  // Hardest case only: PhD/enterprise/admin, high complexity, write or research
  // This is where Anthropic's reasoning depth actually matters
  const isPremiumTier = effectiveTier === "phd" || effectiveTier === "enterprise" || effectiveTier === "custom" || isAdmin;
  if (isPremiumTier && complexity === "high" && (mode === "write" || mode === "research")) {
    return {
      provider: "anthropic",
      model: "claude-opus-4-7",
      thinking: true,
      label: "deep reasoning",
    };
  }

  // Everything else: Gemini 2.5 Pro for quality write/correct/research
  return { provider: "google", model: "gemini-2.5-pro", thinking: false, label: "enhanced" };
}

// ---------------------------------------------------------------------------
// Mode directives
// ---------------------------------------------------------------------------

function modeDirective(mode: CzarMode, hasFiles: boolean): string {
  switch (mode) {
    case "correct":
      return `You are reviewing uploaded content. Read all files carefully. Identify: grammar errors, argument weaknesses, citation gaps, structural issues, register problems. Then produce the corrected version with changes marked as ~~old~~ → **new**. Explain significant changes.`;
    case "research":
      return `You are a research agent. Find real sources, verify citations, synthesise literature. Always end with a full ## References section.`;
    case "plan":
      return `Produce a structured document plan only. No prose. Format as: ## Overview, ## Sections (numbered with description and target word count), ## Sources (to research), ## Key Arguments. Be specific and actionable.`;
    case "write":
      return `You are writing a full document. Write completely. Do not stop mid-section. Do not ask permission to continue. Write all sections fully.`;
    case "chat":
    default:
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

      if (att.mime === "text/plain" || att.mime === "text/markdown" || att.filename.endsWith(".md") || att.filename.endsWith(".txt")) {
        text = await data.text();
      } else if (att.mime === "application/pdf" || att.filename.endsWith(".pdf")) {
        // Extract printable ASCII from the PDF buffer — best-effort
        const buf = await data.arrayBuffer();
        const bytes = new Uint8Array(buf);
        const raw = new TextDecoder("latin1").decode(bytes);
        // Pull out text between BT/ET markers and plain readable runs
        const matches = raw.match(/\(([^\)]{1,400})\)/g) ?? [];
        const decoded = matches
          .map((m) => m.slice(1, -1).replace(/\\[nrt\\()]/g, " ").trim())
          .filter((s) => s.length > 2 && /[a-zA-Z]{2,}/.test(s));
        text = decoded.join(" ");
        if (text.length < 50) {
          text = `[PDF: ${att.filename} — text extraction yielded limited content. Please paste the key sections directly.]`;
        }
      } else if (att.mime.startsWith("text/") || att.mime === "application/json") {
        text = await data.text();
      } else {
        text = `[File: ${att.filename} (${att.mime}) — binary format, content not extractable as text.]`;
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
    const systemParts = [CZAR_BRAIN_SYSTEM_PROMPT];
    if (settingsBlock) systemParts.push(settingsBlock);
    if (directive) systemParts.push("\n\n" + directive);
    const system = systemParts.join("\n");

    // ── 10. Build messages array ──────────────────────────────────────────
    let history: { role: string; content: string }[] = [];
    try {
      history = await loadConversationHistory(conversationId, svc);
      // Remove the user message we just inserted (it's the last one) and the empty assistant
      // The history already includes the user message we saved above — strip the last two
      // (user + empty assistant placeholder) so we can rebuild cleanly
      while (
        history.length > 0 &&
        (history[history.length - 1].role === "assistant" && history[history.length - 1].content.trim() === "")
      ) {
        history.pop();
      }
    } catch {
      // non-fatal — continue without history
    }

    const userContent = req.user_message + (fileContext ? "\n\n" + fileContext : "");
    const messages = [
      ...history.slice(-20), // keep last 20 turns max
      { role: "user", content: userContent },
    ];

    // ── 11. Emit writer agent starting ───────────────────────────────────
    write("agent", {
      id: "writer",
      name: "CZAR Writer",
      status: "starting",
      action: `${mode} mode`,
    });

    // ── 12. Stream AI response ────────────────────────────────────────────
    let fullResponse = "";
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
      const isAbort = err?.name === "AbortError";
      if (!isAbort) {
        write("error", {
          message: `AI generation failed: ${err?.message ?? "unknown error"}`,
          recoverable: false,
        });
        return;
      }
      // Aborted — still save whatever we have
    }

    write("agent", {
      id: "writer",
      name: "CZAR Writer",
      status: "done",
      action: `${countWords(fullResponse)} words generated`,
    });

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
