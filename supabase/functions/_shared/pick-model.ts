// Single source of truth for which model handles which task.
// Claude Sonnet 4.6 is the REASONING model for ALL tiers (including free).
// Writing models are tier-gated:
//   Free → Gemini 2.5 Flash
//   Undergraduate → Gemini 2.5 Flash / GPT-5.2
//   Masters → Gemini + GPT-5.2 + Claude Sonnet 4.6
//   PhD / Custom → All models (Claude + Gemini + GPT-5.2 + Qwen)
// Admin (grey.izilein@gmail.com) is treated as PhD tier.

export const ANTHROPIC_MODEL = "claude-sonnet-4-5";
export const FALLBACK_GPT = "gemini-2.5-flash";
export const FREE_MODEL = "gemini-2.5-flash";
export const QWEN_MODEL = "qwen3.6-plus";

export const ADMIN_EMAIL = "grey.izilein@gmail.com";

export type Tier = "free" | "undergraduate" | "masters" | "phd" | "custom" | "none";

export interface PickOpts {
  /** Allow extended thinking (only respected for Masters/PhD or admin). */
  allowThinking?: boolean;
  /** Utility tasks (classify, ingest, ai-score) always use Flash regardless of tier. */
  isUtility?: boolean;
  /** User email — if it's the admin email, treat as PhD tier (full Claude access). */
  email?: string | null;
  /** Whether this is a reasoning task (always uses Claude regardless of tier). */
  isReasoning?: boolean;
}

export interface PickResult {
  /** Provider key — "anthropic" | "google" | "qwen" */
  provider: "anthropic" | "google" | "qwen";
  /** Concrete model id used in API calls. */
  model: string;
  /** Whether extended thinking should be enabled (Anthropic only). */
  thinking: boolean;
}

const CLAUDE_TIERS = new Set(["masters", "phd", "custom"]);
const THINKING_TIERS = new Set(["masters", "phd", "custom"]);

/** Centralised admin check. */
export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase() === ADMIN_EMAIL;
}

/** Resolve effective tier: admin always reads as "phd". */
export function effectiveTier(tier: string | null | undefined, email?: string | null): string {
  if (isAdminEmail(email)) return "phd";
  return (tier || "free").toLowerCase();
}

export function pickWriterModel(tier: string | null | undefined, opts: PickOpts = {}): PickResult {
  const isAdmin = isAdminEmail(opts.email);
  const t = isAdmin ? "phd" : (tier || "free").toLowerCase();

  // Utility calls always use the cheapest model — even for admin.
  if (opts.isUtility) {
    return { provider: "google", model: FREE_MODEL, thinking: false };
  }

  // REASONING tasks always use Claude for ALL tiers (including free).
  if (opts.isReasoning) {
    return {
      provider: "anthropic",
      model: ANTHROPIC_MODEL,
      thinking: !!opts.allowThinking && (isAdmin || THINKING_TIERS.has(t)),
    };
  }

  if (!isAdmin && (t === "free" || t === "none")) {
    return { provider: "google", model: FREE_MODEL, thinking: false };
  }

  // Undergraduate: Gemini/GPT-5.2, no Claude writing access
  if (t === "undergraduate") {
    return { provider: "google", model: FREE_MODEL, thinking: false };
  }

  // Masters/PhD/Custom/Admin: Claude writing access
  if (isAdmin || CLAUDE_TIERS.has(t)) {
    return {
      provider: "anthropic",
      model: ANTHROPIC_MODEL,
      thinking: !!opts.allowThinking && (isAdmin || THINKING_TIERS.has(t)),
    };
  }

  return { provider: "google", model: FREE_MODEL, thinking: false };
}

/** Whether the given tier is allowed to escalate to Claude thinking mode. */
export function tierAllowsThinking(tier: string | null | undefined, email?: string | null): boolean {
  if (isAdminEmail(email)) return true;
  return THINKING_TIERS.has((tier || "").toLowerCase());
}
