// Anthropic Claude adapter — translates between OpenAI-style messages
// (which the rest of the codebase already produces) and Anthropic's
// /v1/messages SSE protocol. Re-emits as OpenAI-shaped SSE so existing
// stream parsers (streamCzar, streamChat, generate-chapter) work unchanged.
//
// Usage:
//   const resp = await streamAnthropic({ messages, model: "claude-sonnet-4-5", thinking: true });
//   return new Response(resp.body, { headers: { "Content-Type": "text/event-stream", ... } });

export const CLAUDE_MODEL = "claude-sonnet-4-5";

export class AnthropicRateLimitError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "AnthropicRateLimitError";
  }
}

// Content blocks for the Anthropic Files API (PDFs, images uploaded via file_id).
export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "document"; source: { type: "file"; file_id: string }; title?: string }
  | { type: "image"; source: { type: "file"; file_id: string } };

interface OAIMsg { role: string; content: string | ContentBlock[] }

interface StreamOpts {
  messages: OAIMsg[];
  system?: string;
  model?: string;
  thinking?: boolean;
  /** When true, thinking_delta events are forwarded as `event: thinking` SSE frames. */
  emitThinking?: boolean;
  maxTokens?: number;
  /** Tokens reserved for extended thinking. Defaults to 8000. Caller can shrink for short chapters. */
  thinkingBudget?: number;
  temperature?: number;
  /** Optional abort signal for the upstream request (used for explicit-stop wiring). */
  signal?: AbortSignal;
}

// Convert OpenAI-style messages → Anthropic shape.
// - extracts the leading system message into `system`
// - merges consecutive same-role messages
// - ensures the conversation alternates user/assistant
function toAnthropicShape(messages: OAIMsg[], extraSystem?: string) {
  const sysParts: string[] = [];
  if (extraSystem) sysParts.push(extraSystem);

  const rest: OAIMsg[] = [];
  for (const m of messages) {
    if (m.role === "system") {
      sysParts.push(typeof m.content === "string" ? m.content : "");
    } else {
      rest.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.content ?? "" });
    }
  }

  // Merge consecutive same-role messages (Anthropic requires alternation).
  // Messages with array content (file blocks) are never merged — they are
  // always the last user turn and kept intact.
  const merged: OAIMsg[] = [];
  for (const m of rest) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role && typeof last.content === "string" && typeof m.content === "string") {
      last.content = `${last.content}\n\n${m.content}`;
    } else {
      merged.push({ ...m });
    }
  }

  // Anthropic requires the first message to be `user`
  if (merged.length === 0 || merged[0].role !== "user") {
    merged.unshift({ role: "user", content: "(continue)" });
  }

  return {
    system: sysParts.filter(Boolean).join("\n\n").trim() || undefined,
    messages: merged.map((m) => ({ role: m.role, content: m.content })),
  };
}

export async function streamAnthropic(opts: StreamOpts): Promise<Response> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const { emitThinking = false } = opts;
  const { system, messages } = toAnthropicShape(opts.messages, opts.system);

  // When thinking is enabled, max_tokens must exceed thinking.budget_tokens.
  // Anthropic counts thinking tokens against max_tokens, so the visible-output
  // budget = max_tokens - budget_tokens. Caller can override thinkingBudget
  // for short chapters (saves visible-token headroom for the actual prose).
  const thinkingBudget = opts.thinkingBudget ?? 8000;
  // Claude Sonnet 4.5 supports up to 64k max_tokens. Default to a large budget
  // so chapters don't get truncated mid-sentence.
  let maxTokens = opts.maxTokens ?? 64000;
  if (opts.thinking && maxTokens <= thinkingBudget + 2000) {
    maxTokens = thinkingBudget + 8000; // ensure at least 8k visible tokens
  }
  // Hard cap at Anthropic's 64k ceiling.
  if (maxTokens > 64000) maxTokens = 64000;

  const body: Record<string, unknown> = {
    model: opts.model || CLAUDE_MODEL,
    max_tokens: maxTokens,
    stream: true,
    messages,
  };
  if (system) body.system = system;
  if (typeof opts.temperature === "number") body.temperature = opts.temperature;
  if (opts.thinking) {
    body.thinking = { type: "enabled", budget_tokens: thinkingBudget };
    // Anthropic requires temperature=1 when thinking is enabled
    body.temperature = 1;
  }

  console.log(`[anthropic] streaming model=${body.model} max_tokens=${maxTokens} thinking=${!!opts.thinking} thinkingBudget=${opts.thinking ? thinkingBudget : 0}`);

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "files-api-2025-04-14",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    if (resp.status === 429 || resp.status === 529) {
      throw new AnthropicRateLimitError(resp.status, `Anthropic rate-limited: ${txt.slice(0, 300)}`);
    }
    throw new Error(`Anthropic ${resp.status}: ${txt.slice(0, 500)}`);
  }
  if (!resp.body) throw new Error("Anthropic empty body");

  // Re-emit as OpenAI-shaped SSE
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const out = new ReadableStream({
    async start(controller) {
      let buf = "";
      try {
        while (true) {
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
              if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta" && ev.delta?.text) {
                // Forward visible text as OpenAI-shaped delta
                const oai = { choices: [{ delta: { content: ev.delta.text } }] };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(oai)}\n\n`));
              } else if (emitThinking && ev.type === "content_block_delta" && ev.delta?.type === "thinking_delta" && ev.delta?.thinking) {
                // Forward Claude's reasoning as a named SSE event so the client can render it
                const thinkEv = { thinking: ev.delta.thinking };
                controller.enqueue(encoder.encode(`event: thinking\ndata: ${JSON.stringify(thinkEv)}\n\n`));
              } else if (ev.type === "message_stop") {
                controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              }
            } catch { /* ignore parse errors */ }
          }
        }
        controller.close();
      } catch (e) {
        try { controller.error(e); } catch { /* ignore */ }
      }
    },
  });

  return new Response(out, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// Non-streaming convenience for places that just want one JSON answer.
export async function callAnthropic(opts: StreamOpts): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const { system, messages } = toAnthropicShape(opts.messages, opts.system);

  const thinkingBudget = opts.thinkingBudget ?? 8000;
  let maxTokens = opts.maxTokens ?? 4000;
  if (opts.thinking && maxTokens <= thinkingBudget + 1000) {
    maxTokens = thinkingBudget + 4000;
  }
  if (maxTokens > 64000) maxTokens = 64000;

  const body: Record<string, unknown> = {
    model: opts.model || CLAUDE_MODEL,
    max_tokens: maxTokens,
    messages,
  };
  if (system) body.system = system;
  if (typeof opts.temperature === "number") body.temperature = opts.temperature;
  if (opts.thinking) {
    body.thinking = { type: "enabled", budget_tokens: thinkingBudget };
    body.temperature = 1;
  }

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "files-api-2025-04-14",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    if (resp.status === 429 || resp.status === 529) {
      throw new AnthropicRateLimitError(resp.status, txt.slice(0, 300));
    }
    throw new Error(`Anthropic ${resp.status}: ${txt.slice(0, 500)}`);
  }
  const json = await resp.json();
  // content is an array of blocks; collect text blocks only.
  const blocks = Array.isArray(json.content) ? json.content : [];
  return blocks.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
}

// ── JSON helpers ──────────────────────────────────────────────────────────
// Tolerantly extract a JSON object/array from a text response (Claude
// sometimes wraps JSON in fences or adds a trailing sentence).
export function extractJson<T = any>(text: string): T | null {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  // Try direct parse first
  try { return JSON.parse(trimmed) as T; } catch { /* fall through */ }
  // Strip ```json ... ``` fences
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try { return JSON.parse(fence[1].trim()) as T; } catch { /* fall through */ }
  }
  // Find first {...} or [...] balanced block
  const firstObj = trimmed.indexOf("{");
  const firstArr = trimmed.indexOf("[");
  let start = -1;
  if (firstObj === -1) start = firstArr;
  else if (firstArr === -1) start = firstObj;
  else start = Math.min(firstObj, firstArr);
  if (start === -1) return null;
  const open = trimmed[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (ch === "\\") { esc = true; continue; }
      if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        const slice = trimmed.slice(start, i + 1);
        try { return JSON.parse(slice) as T; } catch { return null; }
      }
    }
  }
  return null;
}

// Convenience: call Claude and parse JSON out of the response.
export async function callAnthropicJson<T = any>(opts: StreamOpts): Promise<T | null> {
  const text = await callAnthropic(opts);
  return extractJson<T>(text);
}
