// CZAR Domain Router — maps user input to a Domain + Style with confidence scoring.
// Operates both client-side (optimistic UI) and server-side (authoritative routing).

import type {
  DomainType,
  StyleOverlay,
  RouterDecision,
  RouterSignal,
  UserPreferences,
} from "@/types/czar";
import { DEFAULT_DOMAIN_STYLES } from "@/types/czar";

// ---------------------------------------------------------------------------
// Signal catalogue
// ---------------------------------------------------------------------------

const DOMAIN_SIGNALS: RouterSignal[] = [
  // Academic — strong signals
  { keyword: "essay", weight: 0.7, domain: "academic" },
  { keyword: "dissertation", weight: 0.9, domain: "academic" },
  { keyword: "thesis", weight: 0.85, domain: "academic" },
  { keyword: "literature review", weight: 0.95, domain: "academic" },
  { keyword: "systematic review", weight: 0.95, domain: "academic" },
  { keyword: "research paper", weight: 0.9, domain: "academic" },
  { keyword: "academic essay", weight: 0.95, domain: "academic" },
  { keyword: "coursework", weight: 0.85, domain: "academic" },
  { keyword: "assignment", weight: 0.7, domain: "academic" },
  { keyword: "references", weight: 0.5, domain: "academic" },
  { keyword: "citation", weight: 0.6, domain: "academic" },
  { keyword: "apa", weight: 0.8, domain: "academic", styleHint: "apa" },
  { keyword: "harvard referencing", weight: 0.8, domain: "academic", styleHint: "harvard" },
  { keyword: "chicago", weight: 0.7, domain: "academic", styleHint: "chicago" },
  { keyword: "mla format", weight: 0.8, domain: "academic", styleHint: "mla" },
  { keyword: "ieee", weight: 0.8, domain: "academic", styleHint: "ieee" },
  { keyword: "vancouver", weight: 0.75, domain: "academic", styleHint: "vancouver" },
  { keyword: "case study", weight: 0.7, domain: "academic" },
  { keyword: "chapter", weight: 0.5, domain: "academic" },
  { keyword: "abstract", weight: 0.7, domain: "academic" },
  { keyword: "methodology", weight: 0.8, domain: "academic" },
  { keyword: "empirical", weight: 0.8, domain: "academic" },
  { keyword: "hypothesis", weight: 0.75, domain: "academic" },
  { keyword: "critically analyse", weight: 0.9, domain: "academic" },
  { keyword: "compare and contrast", weight: 0.85, domain: "academic" },
  { keyword: "evaluate the extent", weight: 0.9, domain: "academic" },
  { keyword: "discuss the argument", weight: 0.8, domain: "academic" },
  { keyword: "research gap", weight: 0.85, domain: "academic" },

  // Fiction — strong signals
  { keyword: "short story", weight: 0.9, domain: "fiction" },
  { keyword: "novel", weight: 0.75, domain: "fiction" },
  { keyword: "opening chapter", weight: 0.85, domain: "fiction" },
  { keyword: "scene", weight: 0.5, domain: "fiction" },
  { keyword: "character", weight: 0.4, domain: "fiction" },
  { keyword: "dialogue", weight: 0.55, domain: "fiction" },
  { keyword: "flash fiction", weight: 0.9, domain: "fiction" },
  { keyword: "narrative", weight: 0.45, domain: "fiction" },
  { keyword: "protagonist", weight: 0.75, domain: "fiction" },
  { keyword: "plot", weight: 0.55, domain: "fiction" },
  { keyword: "creative writing", weight: 0.8, domain: "fiction" },
  { keyword: "minimalist", weight: 0.6, domain: "fiction", styleHint: "literary_minimalist" },
  { keyword: "stream of consciousness", weight: 0.85, domain: "fiction", styleHint: "stream_of_consciousness" },
  { keyword: "first person", weight: 0.4, domain: "fiction" },
  { keyword: "third person", weight: 0.35, domain: "fiction" },

  // Professional — strong signals
  { keyword: "business report", weight: 0.9, domain: "professional" },
  { keyword: "executive summary", weight: 0.85, domain: "professional", styleHint: "executive" },
  { keyword: "white paper", weight: 0.85, domain: "professional" },
  { keyword: "business proposal", weight: 0.9, domain: "professional" },
  { keyword: "strategy document", weight: 0.85, domain: "professional" },
  { keyword: "management report", weight: 0.85, domain: "professional" },
  { keyword: "stakeholder", weight: 0.65, domain: "professional" },
  { keyword: "recommendation", weight: 0.4, domain: "professional" },
  { keyword: "mckinsey", weight: 0.9, domain: "professional", styleHint: "executive" },
  { keyword: "consulting", weight: 0.7, domain: "professional", styleHint: "consulting" },
  { keyword: "technical documentation", weight: 0.9, domain: "professional", styleHint: "technical" },
  { keyword: "api documentation", weight: 0.9, domain: "professional", styleHint: "technical" },
  { keyword: "memo", weight: 0.7, domain: "professional" },
  { keyword: "board paper", weight: 0.9, domain: "professional", styleHint: "executive" },
  { keyword: "market analysis", weight: 0.8, domain: "professional" },
  { keyword: "cover letter", weight: 0.6, domain: "professional" },

  // Journalistic — strong signals
  { keyword: "news article", weight: 0.9, domain: "journalistic", styleHint: "inverted_pyramid" },
  { keyword: "press release", weight: 0.85, domain: "journalistic" },
  { keyword: "investigative", weight: 0.85, domain: "journalistic", styleHint: "investigative" },
  { keyword: "feature article", weight: 0.85, domain: "journalistic", styleHint: "feature" },
  { keyword: "op-ed", weight: 0.85, domain: "journalistic", styleHint: "editorial" },
  { keyword: "editorial", weight: 0.8, domain: "journalistic", styleHint: "editorial" },
  { keyword: "blog post", weight: 0.6, domain: "journalistic" },
  { keyword: "newsletter", weight: 0.65, domain: "journalistic" },
  { keyword: "explainer", weight: 0.7, domain: "journalistic" },
  { keyword: "article", weight: 0.35, domain: "journalistic" },
  { keyword: "interview", weight: 0.4, domain: "journalistic" },
  { keyword: "breaking news", weight: 0.9, domain: "journalistic", styleHint: "inverted_pyramid" },

  // Personal — strong signals
  { keyword: "personal statement", weight: 0.9, domain: "personal", styleHint: "personal_statement" },
  { keyword: "memoir", weight: 0.9, domain: "personal", styleHint: "memoir" },
  { keyword: "personal essay", weight: 0.85, domain: "personal" },
  { keyword: "diary", weight: 0.85, domain: "personal", styleHint: "journal" },
  { keyword: "journal entry", weight: 0.9, domain: "personal", styleHint: "journal" },
  { keyword: "letter to", weight: 0.7, domain: "personal", styleHint: "personal_letter" },
  { keyword: "reflective", weight: 0.6, domain: "personal" },
  { keyword: "my experience", weight: 0.5, domain: "personal" },
  { keyword: "my story", weight: 0.65, domain: "personal" },
  { keyword: "ucas", weight: 0.9, domain: "personal", styleHint: "personal_statement" },
  { keyword: "application statement", weight: 0.85, domain: "personal", styleHint: "personal_statement" },

  // Poetry — strong signals
  { keyword: "poem", weight: 0.95, domain: "poetry" },
  { keyword: "poetry", weight: 0.9, domain: "poetry" },
  { keyword: "sonnet", weight: 0.95, domain: "poetry", styleHint: "formal" },
  { keyword: "villanelle", weight: 0.95, domain: "poetry", styleHint: "formal" },
  { keyword: "haiku", weight: 0.95, domain: "poetry", styleHint: "formal" },
  { keyword: "free verse", weight: 0.9, domain: "poetry", styleHint: "free_verse" },
  { keyword: "lyric essay", weight: 0.9, domain: "poetry", styleHint: "lyric_essay" },
  { keyword: "prose poem", weight: 0.9, domain: "poetry", styleHint: "prose_poetry" },
  { keyword: "terza rima", weight: 0.95, domain: "poetry", styleHint: "formal" },
  { keyword: "stanza", weight: 0.7, domain: "poetry" },
  { keyword: "rhyme", weight: 0.5, domain: "poetry" },
  { keyword: "meter", weight: 0.55, domain: "poetry" },
  { keyword: "iambic", weight: 0.85, domain: "poetry", styleHint: "formal" },
];

// ---------------------------------------------------------------------------
// Explicit domain override keywords
// ---------------------------------------------------------------------------

const OVERRIDE_MAP: Record<string, { domain: DomainType; style?: StyleOverlay }> = {
  "as an academic essay":       { domain: "academic" },
  "in academic style":          { domain: "academic" },
  "as a news article":          { domain: "journalistic", style: "inverted_pyramid" },
  "as a feature":               { domain: "journalistic", style: "feature" },
  "as a short story":           { domain: "fiction", style: "literary_minimalist" },
  "as a poem":                  { domain: "poetry", style: "free_verse" },
  "as a sonnet":                { domain: "poetry", style: "formal" },
  "in a professional tone":     { domain: "professional", style: "executive" },
  "as a business report":       { domain: "professional", style: "executive" },
  "as a personal statement":    { domain: "personal", style: "personal_statement" },
  "as a memoir":                { domain: "personal", style: "memoir" },
};

// ---------------------------------------------------------------------------
// Main router
// ---------------------------------------------------------------------------

export function detectDomainAndStyle(
  userMessage: string,
  priorDomain: DomainType | null,
  userPrefs: UserPreferences,
  overrideDomain?: DomainType,
  overrideStyle?: StyleOverlay,
): RouterDecision {
  const lower = userMessage.toLowerCase();

  // 1. Explicit override from UI
  if (overrideDomain) {
    const style = overrideStyle ?? (userPrefs.domainDefaults?.[overrideDomain]) ?? DEFAULT_DOMAIN_STYLES[overrideDomain];
    return {
      domain: overrideDomain,
      style,
      confidence: 1.0,
      reasoning: "Explicit domain override from request.",
      detectedSignals: ["override"],
      overridden: true,
    };
  }

  // 2. Inline override phrases
  for (const [phrase, target] of Object.entries(OVERRIDE_MAP)) {
    if (lower.includes(phrase)) {
      const style = target.style ?? (userPrefs.domainDefaults?.[target.domain]) ?? DEFAULT_DOMAIN_STYLES[target.domain];
      return {
        domain: target.domain,
        style,
        confidence: 0.95,
        reasoning: `Detected explicit phrasing: "${phrase}".`,
        detectedSignals: [phrase],
        overridden: true,
      };
    }
  }

  // 3. Signal scoring
  const scores: Record<DomainType, number> = {
    academic:     0,
    fiction:      0,
    professional: 0,
    journalistic: 0,
    personal:     0,
    poetry:       0,
    chat:         0,
  };

  const detectedSignals: string[] = [];
  const styleHints: Partial<Record<DomainType, StyleOverlay>> = {};

  for (const signal of DOMAIN_SIGNALS) {
    if (lower.includes(signal.keyword)) {
      scores[signal.domain] = Math.min(1.0, scores[signal.domain] + signal.weight);
      detectedSignals.push(signal.keyword);
      if (signal.styleHint && !styleHints[signal.domain]) {
        styleHints[signal.domain] = signal.styleHint as StyleOverlay;
      }
    }
  }

  // 4. Boost for continuation (if prior domain had strong signals)
  if (priorDomain && priorDomain !== "chat" && scores[priorDomain] > 0) {
    scores[priorDomain] = Math.min(1.0, scores[priorDomain] + 0.25);
    detectedSignals.push(`continuation_of_${priorDomain}`);
  }

  // 5. If no signals and there's a prior non-chat domain, continue it
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore < 0.3 && priorDomain && priorDomain !== "chat") {
    const style = userPrefs.domainDefaults?.[priorDomain] ?? DEFAULT_DOMAIN_STYLES[priorDomain];
    return {
      domain: priorDomain,
      style,
      confidence: 0.5,
      reasoning: "No strong domain signals — continuing prior session domain.",
      detectedSignals: [],
      overridden: false,
    };
  }

  // 6. Default to chat if no signals
  if (maxScore < 0.3) {
    return {
      domain: "chat",
      style: userPrefs.domainDefaults?.chat ?? "direct_expert",
      confidence: 0.6,
      reasoning: "No domain signals detected — defaulting to chat.",
      detectedSignals: [],
      overridden: false,
    };
  }

  // 7. Pick winner
  const winner = (Object.entries(scores) as [DomainType, number][])
    .sort((a, b) => b[1] - a[1])[0][0];

  const runnerUp = (Object.entries(scores) as [DomainType, number][])
    .sort((a, b) => b[1] - a[1])[1][0];

  // Confidence: gap between winner and runner-up normalised
  const winnerScore = scores[winner];
  const runnerScore = scores[runnerUp];
  const confidence = Math.min(0.98, 0.5 + (winnerScore - runnerScore) / 2);

  // 8. Resolve style
  let style: StyleOverlay =
    styleHints[winner] ??
    userPrefs.domainDefaults?.[winner] ??
    DEFAULT_DOMAIN_STYLES[winner];

  // Apply user's preferred citation style for academic domain
  if (winner === "academic" && userPrefs.preferredCitationStyle && !styleHints.academic) {
    style = userPrefs.preferredCitationStyle;
  }

  return {
    domain: winner,
    style,
    confidence,
    reasoning: buildReasoning(winner, detectedSignals, confidence, priorDomain),
    detectedSignals,
    overridden: false,
  };
}

function buildReasoning(
  domain: DomainType,
  signals: string[],
  confidence: number,
  prior: DomainType | null,
): string {
  const sigList = signals.filter((s) => !s.startsWith("continuation_")).slice(0, 3).join(", ");
  let r = `Domain: ${domain} (${Math.round(confidence * 100)}% confidence).`;
  if (sigList) r += ` Signals: ${sigList}.`;
  if (prior && prior !== domain) r += ` (Previously: ${prior}.)`;
  return r;
}

// ---------------------------------------------------------------------------
// Style resolution (standalone helper for UI use)
// ---------------------------------------------------------------------------

export function resolveStyle(
  domain: DomainType,
  prefs: UserPreferences,
  requestedStyle?: StyleOverlay,
): StyleOverlay {
  if (requestedStyle) return requestedStyle;
  if (domain === "academic" && prefs.preferredCitationStyle) return prefs.preferredCitationStyle;
  return prefs.domainDefaults?.[domain] ?? DEFAULT_DOMAIN_STYLES[domain];
}

// ---------------------------------------------------------------------------
// Confidence description (for UI display)
// ---------------------------------------------------------------------------

export function confidenceLabel(confidence: number): string {
  if (confidence >= 0.9) return "high";
  if (confidence >= 0.65) return "medium";
  return "low";
}
