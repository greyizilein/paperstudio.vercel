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
// Signal catalogue — regex-based for precision (no false matches on substrings)
// ---------------------------------------------------------------------------

interface RegexSignal {
  pattern: RegExp;
  weight: number;
  domain: DomainType;
  styleHint?: StyleOverlay;
}

const REGEX_SIGNALS: RegexSignal[] = [
  // Academic
  { pattern: /\b(essay|research paper|literature review|dissertation|thesis|journal article|academic|scholarly|peer-reviewed)\b/i, weight: 0.8, domain: "academic" },
  { pattern: /\b(citation|reference|bibliography|APA|Harvard|Chicago|IEEE|MLA|OSCOLA|Vancouver)\b/i, weight: 0.7, domain: "academic" },
  { pattern: /\b(hypothesis|methodology|empirical|quantitative|qualitative|mixed methods)\b/i, weight: 0.8, domain: "academic" },
  { pattern: /\b(theoretical framework|conceptual model|validity|reliability|systematic review)\b/i, weight: 0.85, domain: "academic" },
  { pattern: /\b(coursework|assignment|case study|abstract|research gap)\b/i, weight: 0.7, domain: "academic" },
  { pattern: /\b(critically analyse|compare and contrast|evaluate the extent|discuss the argument)\b/i, weight: 0.9, domain: "academic" },
  { pattern: /\bAPA\b/, weight: 0.8, domain: "academic", styleHint: "apa" },
  { pattern: /\bHarvard referencing\b/i, weight: 0.85, domain: "academic", styleHint: "harvard" },
  { pattern: /\bChicago style\b/i, weight: 0.8, domain: "academic", styleHint: "chicago" },
  { pattern: /\bMLA( format| style)?\b/i, weight: 0.8, domain: "academic", styleHint: "mla" },
  { pattern: /\bIEEE\b/, weight: 0.8, domain: "academic", styleHint: "ieee" },
  { pattern: /\bVancouver( style)?\b/i, weight: 0.75, domain: "academic", styleHint: "vancouver" },
  { pattern: /\bOSCOLA\b/i, weight: 0.8, domain: "academic", styleHint: "oscola" },

  // Fiction
  { pattern: /\b(story|novel|chapter|short story|flash fiction|narrative|tale)\b/i, weight: 0.75, domain: "fiction" },
  { pattern: /\b(character|protagonist|antagonist|dialogue|scene|plot)\b/i, weight: 0.55, domain: "fiction" },
  { pattern: /\b(creative writing|opening chapter|flash fiction)\b/i, weight: 0.85, domain: "fiction" },
  { pattern: /\b(stream of consciousness)\b/i, weight: 0.9, domain: "fiction", styleHint: "stream_of_consciousness" },
  { pattern: /\b(minimalist prose|literary minimalism)\b/i, weight: 0.8, domain: "fiction", styleHint: "literary_minimalist" },
  { pattern: /\b(screenplay|script|Fountain|INT\.|EXT\.|FADE IN)\b/i, weight: 0.9, domain: "fiction" },

  // Professional
  { pattern: /\b(report|proposal|brief|memo|executive summary|business plan)\b/i, weight: 0.8, domain: "professional" },
  { pattern: /\b(technical documentation|API docs|SOP|procedure|guide)\b/i, weight: 0.85, domain: "professional", styleHint: "technical" },
  { pattern: /\b(pitch deck|investor memo|white paper|board paper|policy brief)\b/i, weight: 0.85, domain: "professional", styleHint: "executive" },
  { pattern: /\b(strategy document|management report|stakeholder|market analysis)\b/i, weight: 0.8, domain: "professional" },
  { pattern: /\b(executive summary)\b/i, weight: 0.85, domain: "professional", styleHint: "executive" },
  { pattern: /\b(consulting report|McKinsey|pyramid principle|BLUF)\b/i, weight: 0.9, domain: "professional", styleHint: "consulting" },

  // Journalistic
  { pattern: /\b(article|news story|feature|investigative|reporting)\b/i, weight: 0.7, domain: "journalistic" },
  { pattern: /\b(lede|nut graf|inverted pyramid|byline|dateline)\b/i, weight: 0.9, domain: "journalistic" },
  { pattern: /\b(source|attribution|fact.check|press release)\b/i, weight: 0.7, domain: "journalistic" },
  { pattern: /\b(news article|breaking news)\b/i, weight: 0.9, domain: "journalistic", styleHint: "inverted_pyramid" },
  { pattern: /\b(op.ed|editorial|opinion piece)\b/i, weight: 0.85, domain: "journalistic", styleHint: "editorial" },
  { pattern: /\b(feature article|longform|profile piece)\b/i, weight: 0.85, domain: "journalistic", styleHint: "feature" },
  { pattern: /\b(investigative report|data journalism)\b/i, weight: 0.9, domain: "journalistic", styleHint: "investigative" },

  // Personal
  { pattern: /\b(personal statement|scholarship application)\b/i, weight: 0.9, domain: "personal", styleHint: "personal_statement" },
  { pattern: /\b(memoir|personal essay|narrative nonfiction)\b/i, weight: 0.85, domain: "personal", styleHint: "memoir" },
  { pattern: /\b(reflective|reflection|reflective journal)\b/i, weight: 0.7, domain: "personal" },
  { pattern: /\b(speech|toast|eulogy|wedding vows)\b/i, weight: 0.8, domain: "personal" },
  { pattern: /\b(UCAS|application essay|common app)\b/i, weight: 0.9, domain: "personal", styleHint: "personal_statement" },
  { pattern: /\b(journal entry|diary entry)\b/i, weight: 0.9, domain: "personal", styleHint: "journal" },
  { pattern: /\b(cover letter)\b/i, weight: 0.7, domain: "personal" },

  // Poetry
  { pattern: /\b(poem|poetry|verse|stanza|line break|enjambment)\b/i, weight: 0.85, domain: "poetry" },
  { pattern: /\b(sonnet|villanelle|ghazal|haiku|ode|elegy|free verse)\b/i, weight: 0.95, domain: "poetry", styleHint: "formal" },
  { pattern: /\b(rhyme|meter|rhythm|alliteration|assonance|iambic)\b/i, weight: 0.7, domain: "poetry" },
  { pattern: /\b(free verse)\b/i, weight: 0.9, domain: "poetry", styleHint: "free_verse" },
  { pattern: /\b(lyric essay)\b/i, weight: 0.9, domain: "poetry", styleHint: "lyric_essay" },
  { pattern: /\b(prose poem)\b/i, weight: 0.9, domain: "poetry", styleHint: "prose_poetry" },
  { pattern: /\b(terza rima|blank verse|villanelle|sonnet)\b/i, weight: 0.95, domain: "poetry", styleHint: "formal" },
];

// Lightweight string-based signals kept for backward compatibility and performance
const DOMAIN_SIGNALS: RouterSignal[] = [
  { keyword: "dissertation", weight: 0.9, domain: "academic" },
  { keyword: "research gap", weight: 0.85, domain: "academic" },
  { keyword: "flash fiction", weight: 0.9, domain: "fiction" },
  { keyword: "business proposal", weight: 0.9, domain: "professional" },
  { keyword: "investigative", weight: 0.85, domain: "journalistic", styleHint: "investigative" },
  { keyword: "personal statement", weight: 0.9, domain: "personal", styleHint: "personal_statement" },
  { keyword: "memoir", weight: 0.9, domain: "personal", styleHint: "memoir" },
  { keyword: "ucas", weight: 0.9, domain: "personal", styleHint: "personal_statement" },
  { keyword: "poem", weight: 0.95, domain: "poetry" },
  { keyword: "sonnet", weight: 0.95, domain: "poetry", styleHint: "formal" },
  { keyword: "villanelle", weight: 0.95, domain: "poetry", styleHint: "formal" },
  { keyword: "haiku", weight: 0.95, domain: "poetry", styleHint: "formal" },
  { keyword: "free verse", weight: 0.9, domain: "poetry", styleHint: "free_verse" },
  { keyword: "lyric essay", weight: 0.9, domain: "poetry", styleHint: "lyric_essay" },
  { keyword: "prose poem", weight: 0.9, domain: "poetry", styleHint: "prose_poetry" },
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

  // 3. Signal scoring — regex first (precise), then string fallback
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

  // Regex signals (higher precision — word-boundary aware)
  for (const signal of REGEX_SIGNALS) {
    const match = signal.pattern.exec(lower);
    if (match) {
      scores[signal.domain] = Math.min(1.0, scores[signal.domain] + signal.weight);
      detectedSignals.push(match[0]);
      if (signal.styleHint && !styleHints[signal.domain]) {
        styleHints[signal.domain] = signal.styleHint as StyleOverlay;
      }
    }
  }

  // String signals (lightweight, for high-confidence keywords not covered above)
  for (const signal of DOMAIN_SIGNALS) {
    if (lower.includes(signal.keyword) && scores[signal.domain] < 0.5) {
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
