import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Cost per 1K tokens (USD)
const COST_MAP: Record<string, { input: number; output: number }> = {
  "gemini-2.5-flash": { input: 0.0001, output: 0.0004 },
  "gemini-2.0-flash-lite": { input: 0.00005, output: 0.0002 },
  "gemini-2.5-pro": { input: 0.00125, output: 0.005 },
  "gemini-2.0-flash": { input: 0.0001, output: 0.0004 },
  "gemini-2.0-flash-preview-image-generation": { input: 0.0001, output: 0.0004 },
  "qwen3.6-plus": { input: 0.0008, output: 0.002 },
  "anthropic/claude-sonnet-4-5": { input: 0.003, output: 0.015 },
  "claude-sonnet-4-5": { input: 0.003, output: 0.015 },
};

function estimateTokens(text: string): number {
  // ~4 chars per token for English
  return Math.ceil(text.length / 4);
}

export async function logAiUsage(params: {
  userId?: string;
  tier?: string;
  action: string;
  model: string;
  inputText?: string;
  outputText?: string;
  inputTokens?: number;
  outputTokens?: number;
}) {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;

    const sb = createClient(url, key);

    const inTok = params.inputTokens ?? (params.inputText ? estimateTokens(params.inputText) : 0);
    const outTok = params.outputTokens ?? (params.outputText ? estimateTokens(params.outputText) : 0);

    const rates = COST_MAP[params.model] || { input: 0.0002, output: 0.0008 };
    const cost = (inTok / 1000) * rates.input + (outTok / 1000) * rates.output;

    await sb.from("ai_usage_logs").insert({
      user_id: params.userId || "00000000-0000-0000-0000-000000000000",
      tier: params.tier || "unknown",
      action: params.action,
      model: params.model,
      input_tokens: inTok,
      output_tokens: outTok,
      estimated_cost_usd: cost,
    });
  } catch (e) {
    console.error("logAiUsage error (non-fatal):", e);
  }
}
