export interface AIModel {
  id: string;
  name: string;
  provider: string;
  tier: "standard" | "advanced" | "premium";
  description: string;
  capabilities: string[];
  gatewayModel: string;
  tierAccess: string[];
}

// PaperStudio user-facing model tiers. Three abstract capability levels.
// Users never see model names — only the tier label.
//
//   • Instant          → Gemini Flash — all tiers
//   • Extended Thinking → Claude Sonnet — Masters+
//   • Deep Reasoning    → Claude Opus  — PhD / Custom
//
export const AI_MODELS: AIModel[] = [
  {
    id: "instant",
    name: "Instant",
    provider: "Google",
    tier: "standard",
    description: "Fast generation. Great for all writing tasks.",
    capabilities: ["Fast", "Long context", "All tiers"],
    gatewayModel: "gemini-2.5-flash",
    tierAccess: ["free", "undergraduate", "masters", "phd", "custom"],
  },
  {
    id: "extended-thinking",
    name: "Extended Thinking",
    provider: "Anthropic",
    tier: "advanced",
    description: "More careful reasoning and longer context. Best for complex chapters.",
    capabilities: ["Deep reasoning", "Long context", "Tool use"],
    gatewayModel: "claude-sonnet-4-6",
    tierAccess: ["masters", "phd", "custom"],
  },
  {
    id: "deep-reasoning",
    name: "Deep Reasoning",
    provider: "Anthropic",
    tier: "premium",
    description: "Maximum quality and heaviest processing. For dissertations that demand the best.",
    capabilities: ["Maximum quality", "Heaviest model", "PhD-grade"],
    gatewayModel: "claude-opus-4-7",
    tierAccess: ["phd", "custom"],
  },
];

export const DEFAULT_MODEL_ID = "instant";
export const FREE_MODEL_ID = "instant";

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
