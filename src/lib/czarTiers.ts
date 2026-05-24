// CZAR word-pack tier definitions.
// Pricing is locked in USD per tier and processed in NGN at checkout.

export type CzarTierId = "none" | "plus" | "starter" | "standard" | "pro" | "custom";

export interface CzarTier {
  id: CzarTierId;
  label: string;
  blurb: string;
  words: number;
  priceUsd: number; // 0 for custom
  features: string[];
  highlight?: boolean;
}

export const CZAR_BONUS_WORDS = 1000;
export const CZAR_CUSTOM_USD_PER_WORD = 0.009;
export const DEFAULT_USD_TO_NGN_RATE = 1500;

export const PAPERSTUDIO_CZAR_BONUS: Record<string, number> = {
  free: 0,
  undergraduate: 5000,
  masters: 15000,
  phd: 40000,
};

export const CZAR_TIERS: CzarTier[] = [
  {
    id: "plus",
    label: "Plus",
    blurb: "50,000 words of full CZAR capability — essays, research, rewrites.",
    words: 50_000,
    priceUsd: 20,
    highlight: true,
    features: [
      "50,000 words",
      "All CZAR modes (Write, Research, Correct…)",
      "DOCX download on every response",
      "Unlimited conversations",
    ],
  },
  {
    id: "custom",
    label: "Custom",
    blurb: "Pick any word amount. Linear pricing, no surprises.",
    words: 0,
    priceUsd: 0,
    features: [
      "You choose the word count",
      "All Plus features",
      "Scales with your workload",
    ],
  },
];

export function customPriceUsd(words: number): number {
  const usd = Math.max(0, words) * CZAR_CUSTOM_USD_PER_WORD;
  return Math.max(2, Math.round(usd * 100) / 100);
}

// Back-compat helper used by older modal code paths.
export function usdFromWords(words: number): number {
  return customPriceUsd(words);
}

export function getTier(id: CzarTierId | string | null | undefined): CzarTier | null {
  return CZAR_TIERS.find((t) => t.id === id) ?? null;
}
