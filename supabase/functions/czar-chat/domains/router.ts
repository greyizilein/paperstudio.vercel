// CZAR Domain Router
// Routes requests to appropriate domain core based on content signals

import { ACADEMIC_DOMAIN_CORE } from "./academic.ts";
import { FICTION_DOMAIN_CORE } from "./fiction.ts";
import { PROFESSIONAL_DOMAIN_CORE } from "./professional.ts";

export type WritingDomain = 
  | "academic"
  | "fiction"
  | "professional"
  | "journalistic"
  | "personal"
  | "poetry"
  | "chat";

export interface DomainRouterSignals {
  user_message: string;
  attachment_count: number;
  filenames?: string[];
  requested_domain?: WritingDomain;
  conversation_context?: {
    last_domain: WritingDomain;
    domain_switch_count: number;
  };
}

const DOMAIN_KEYWORDS: Record<WritingDomain, RegExp[]> = {
  academic: [
    /\b(essay|research paper|literature review|dissertation|thesis|journal article|academic|scholarly|peer-reviewed)\b/,
    /\b(citation|reference|bibliography|APA|Harvard|Chicago|IEEE|MLA|OSCOLA)\b/,
    /\b(hypothesis|methodology|empirical|quantitative|qualitative|mixed methods)\b/,
    /\b(theoretical framework|conceptual model|validity|reliability)\b/,
  ],
  fiction: [
    /\b(story|novel|chapter|short story|flash fiction|narrative|tale)\b/,
    /\b(character|protagonist|antagonist|dialogue|scene|plot)\b/,
    /\b(screenplay|script|Fountain|INT\.|EXT\.|FADE IN)\b/,
    /\b(poem|poetry|stanza|verse|sonnet|villanelle)\b/,
  ],
  professional: [
    /\b(report|proposal|brief|memo|executive summary|business plan)\b/,
    /\b(technical documentation|API docs|SOP|procedure|guide)\b/,
    /\b(pitch deck|investor memo|white paper|case study)\b/,
    /\b(email|correspondence|board paper|policy brief)\b/,
  ],
  journalistic: [
    /\b(article|news story|feature|investigative|reporting)\b/,
    /\b(lede|nut graf|inverted pyramid|byline|dateline)\b/,
    /\b(source|interview|quote|attribution|fact-check)\b/,
  ],
  personal: [
    /\b(personal statement|cover letter|scholarship application)\b/,
    /\b(memoir|personal essay|reflective|narrative nonfiction)\b/,
    /\b(speech|toast|eulogy|wedding vows)\b/,
  ],
  poetry: [
    /\b(poem|poetry|verse|stanza|line break|enjambment)\b/,
    /\b(sonnet|villanelle|ghazal|haiku|ode|elegy|free verse)\b/,
    /\b(rhyme|meter|rhythm|alliteration|assonance)\b/,
  ],
  chat: [
    // Default - no specific domain keywords
  ],
};

export function detectDomain(signals: DomainRouterSignals): WritingDomain {
  const { user_message, requested_domain, conversation_context } = signals;
  const lower = user_message.toLowerCase();
  
  // 1. Respect explicit domain request
  if (requested_domain && requested_domain !== "chat") {
    return requested_domain;
  }
  
  // 2. Check for specialist domain keywords
  const scores: Record<WritingDomain, number> = {
    academic: 0,
    fiction: 0,
    professional: 0,
    journalistic: 0,
    personal: 0,
    poetry: 0,
    chat: 0,
  };
  
  for (const [domain, patterns] of Object.entries(DOMAIN_KEYWORDS)) {
    for (const pattern of patterns) {
      if (pattern.test(lower)) {
        scores[domain as WritingDomain] += 1;
      }
    }
  }
  
  // 3. Find highest scoring domain
  let maxScore = 0;
  let detectedDomain: WritingDomain = "chat";
  
  for (const [domain, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedDomain = domain as WritingDomain;
    }
  }
  
  // 4. If scores are tied or very low, consider conversation context
  if (maxScore <= 1 && conversation_context?.last_domain) {
    // Stay in current domain unless there's strong signal to switch
    return conversation_context.last_domain;
  }
  
  // 5. Return detected domain
  return detectedDomain;
}

export function getDomainCore(domain: WritingDomain): string {
  switch (domain) {
    case "academic":
      return ACADEMIC_DOMAIN_CORE;
    case "fiction":
      return FICTION_DOMAIN_CORE;
    case "professional":
      return PROFESSIONAL_DOMAIN_CORE;
    case "journalistic":
      // Fall back to professional for now - can be expanded
      return PROFESSIONAL_DOMAIN_CORE;
    case "personal":
      // Fall back to professional with relaxed constraints
      return PROFESSIONAL_DOMAIN_CORE;
    case "poetry":
      // Use fiction core which includes poetry conventions
      return FICTION_DOMAIN_CORE;
    case "chat":
      // No domain core needed for pure chat
      return "";
    default:
      // Default to academic as safest baseline
      return ACADEMIC_DOMAIN_CORE;
  }
}

export function buildDomainPrompt(
  domain: WritingDomain,
  styleOverlay?: Record<string, string>,
): string {
  const domainCore = getDomainCore(domain);
  
  if (!domainCore) {
    return "";
  }
  
  let prompt = domainCore;
  
  // Add style overlay if provided
  if (styleOverlay && Object.keys(styleOverlay).length > 0) {
    prompt += "\n\n# STYLE OVERLAY (User-Specified Preferences)\n";
    for (const [key, value] of Object.entries(styleOverlay)) {
      prompt += `- ${key}: ${value}\n`;
    }
  }
  
  return prompt;
}
