export interface AIModel {
  id: string;
  name: string;
  provider: string;
  tier: "standard" | "advanced" | "premium";
  description: string;
  capabilities: string[];
  gatewayModel: string;
  tierAccess: string[];
  /** If true, the model is only selectable when writing Chapter 4 (data analysis). */
  ch4Only?: boolean;
}

// PaperStudio user-facing model lineup. Tier-gated.
//   • Free            → Gemini 2.5 Flash
//   • Undergraduate   → + Gemini 3 Flash, GPT-5.2
//   • Masters         → + Gemini 2.5 Pro, Claude Sonnet 4.6
//   • PhD / Custom    → + Gemini 3 Pro
//
// IMPORTANT: Claude Opus 4.6 stays SYSTEM-ONLY (Agent mode complex tasks)
// and is intentionally NOT in this list.
export const AI_MODELS: AIModel[] = [
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    tier: "standard",
    description: "Fast, capable everyday model. Great for most writing tasks.",
    capabilities: ["Fast", "Long context", "Multimodal"],
    gatewayModel: "gemini-2.5-flash",
    tierAccess: ["free", "undergraduate", "masters", "phd", "custom"],
  },
  {
    id: "gemini-3-flash",
    name: "Gemini 3 Flash",
    provider: "Google",
    tier: "advanced",
    description: "Next-gen Gemini Flash preview. Better reasoning at low latency.",
    capabilities: ["Next-gen", "Fast", "Multimodal", "Long context"],
    gatewayModel: "gemini-2.0-flash",
    tierAccess: ["undergraduate", "masters", "phd", "custom"],
  },
  {
    id: "gpt-5.2",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    tier: "advanced",
    description: "Solid reasoning at low latency. Reliable everyday model.",
    capabilities: ["Fast", "Reliable reasoning", "Multimodal", "Long context"],
    gatewayModel: "gemini-2.5-flash",
    tierAccess: ["undergraduate", "masters", "phd", "custom"],
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "Google",
    tier: "premium",
    description: "Deep reasoning, big context, multimodal. Strong on complex chapters.",
    capabilities: ["Deep reasoning", "Long context", "Multimodal"],
    gatewayModel: "gemini-2.5-pro",
    tierAccess: ["masters", "phd", "custom"],
  },
  {
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    provider: "Anthropic",
    tier: "premium",
    description: "Best academic prose, adaptive thinking, tool use. Masters & above.",
    capabilities: ["Best academic prose", "Tool use", "Long context", "Adaptive thinking"],
    gatewayModel: "claude-sonnet-4-5",
    tierAccess: ["masters", "phd", "custom"],
  },
  {
    id: "gemini-3-pro",
    name: "Gemini 3 Pro",
    provider: "Google",
    tier: "premium",
    description: "Top-tier Gemini reasoning. PhD only.",
    capabilities: ["Top-tier reasoning", "Long context", "Multimodal"],
    gatewayModel: "gemini-2.0-flash",
    tierAccess: ["phd", "custom"],
  },
];

// Default — Gemini 2.5 Flash (works for all tiers, including free).
export const DEFAULT_MODEL_ID = "gemini-2.5-flash";
export const FREE_MODEL_ID = "gemini-2.5-flash";

export function getModelById(id: string): AIModel | undefined {
  return AI_MODELS.find((m) => m.id === id);
}

export function getGatewayModelId(modelId: string): string {
  const model = getModelById(modelId);
  return model?.gatewayModel || "gemini-2.5-flash";
}

/** Models the tier can actually USE. */
export function getModelsForTier(tier: string, _chapterType?: string): AIModel[] {
  const t = (tier || "free").toLowerCase();
  return AI_MODELS.filter((m) => m.tierAccess.includes(t));
}

/** True when the tier cannot use this model — UI should show a lock + upgrade hint. */
export function isModelLockedForTier(modelId: string, tier: string): boolean {
  const m = getModelById(modelId);
  if (!m) return true;
  const t = (tier || "free").toLowerCase();
  return !m.tierAccess.includes(t);
}

/** Friendly minimum tier label for the upgrade hint shown next to locked models. */
export function getMinTierLabel(modelId: string): string {
  const m = getModelById(modelId);
  if (!m) return "Upgrade required";
  const order = ["free", "undergraduate", "masters", "phd"];
  const min = order.find((t) => m.tierAccess.includes(t));
  if (!min || min === "free") return "Available";
  if (min === "undergraduate") return "Undergraduate +";
  if (min === "masters") return "Masters +";
  if (min === "phd") return "PhD only";
  return "Upgrade required";
}

export function getDefaultModelForTier(_tier: string): string {
  return DEFAULT_MODEL_ID;
}

export const TIER_COLORS: Record<string, string> = {
  standard: "bg-green-100 text-green-800 border-green-200",
  advanced: "bg-blue-100 text-blue-800 border-blue-200",
  premium: "bg-purple-100 text-purple-800 border-purple-200",
};
