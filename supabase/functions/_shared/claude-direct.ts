// Direct Claude streaming helper — bypasses the Managed Agent for low-latency
// CZAR turns. Used when the CZAR_USE_AGENT secret is set to "false".
//
// Calls Anthropic's Messages API with stream=true and yields text deltas as
// they arrive (token-by-token), giving sub-3s time-to-first-word vs the
// 30–90s typical of the Managed Agent path.

const API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const ANTHROPIC_BETA = "files-api-2025-04-14";

function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`${name} not configured`);
  return v;
}

// Content blocks used when passing files via the Anthropic Files API.
export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "document"; source: { type: "file"; file_id: string }; title?: string }
  | { type: "image"; source: { type: "file"; file_id: string } };

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

export type ClaudeDirectEvent =
  | { kind: "text"; delta: string }
  | { kind: "thinking"; delta: string }
  | { kind: "done"; usage?: any }
  | { kind: "error"; message: string };

export async function* streamClaudeDirect(opts: {
  system: string;
  messages: ClaudeMessage[];
  model?: string;
  maxTokens?: number;
  thinking?: boolean;
  thinkingBudget?: number;
  signal?: AbortSignal;
}): AsyncGenerator<ClaudeDirectEvent> {
  const apiKey = requireEnv("ANTHROPIC_API_KEY");
  const model = opts.model || "claude-sonnet-4-5";
  const thinkingBudget = opts.thinkingBudget ?? 8000;
  // When thinking is on, max_tokens must exceed thinkingBudget. Anthropic counts
  // thinking tokens against max_tokens, leaving visible output = max_tokens - budget.
  let maxTokens = opts.maxTokens ?? 16000;
  if (opts.thinking && maxTokens <= thinkingBudget + 2000) {
    maxTokens = thinkingBudget + 8000;
  }
  if (maxTokens > 64000) maxTokens = 64000;

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    system: opts.system,
    messages: opts.messages,
    stream: true,
  };
  if (opts.thinking) {
    // Anthropic requires temperature=1 when extended thinking is enabled.
    body.thinking = { type: "enabled", budget_tokens: thinkingBudget };
    body.temperature = 1;
  }

  let resp: Response;
  try {
    resp = await fetch(API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "anthropic-beta": ANTHROPIC_BETA,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (e: any) {
    if (e?.name === "AbortError") return;
    yield { kind: "error", message: e?.message || "fetch failed" };
    return;
  }

  if (!resp.ok || !resp.body) {
    const txt = await resp.text().catch(() => "");
    yield { kind: "error", message: `claude ${resp.status}: ${txt.slice(0, 400)}` };
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let usage: any = undefined;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      let nlIdx: number;
      while ((nlIdx = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nlIdx).replace(/\r$/, "");
        buf = buf.slice(nlIdx + 1);
        if (!line || line.startsWith(":") || line.startsWith("event:")) continue;
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        let ev: any;
        try { ev = JSON.parse(payload); } catch { continue; }

        if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
          const text = ev.delta.text || "";
          if (text) yield { kind: "text", delta: text };
        } else if (ev.type === "content_block_delta" && ev.delta?.type === "thinking_delta") {
          const thinking = ev.delta.thinking || "";
          if (thinking) yield { kind: "thinking", delta: thinking };
        } else if (ev.type === "message_delta" && ev.usage) {
          usage = ev.usage;
        } else if (ev.type === "message_stop") {
          yield { kind: "done", usage };
          return;
        } else if (ev.type === "error") {
          yield { kind: "error", message: ev.error?.message || "claude stream error" };
          return;
        }
      }
    }
    yield { kind: "done", usage };
  } catch (e: any) {
    if (e?.name === "AbortError") return;
    yield { kind: "error", message: e?.message || "stream error" };
  }
}
