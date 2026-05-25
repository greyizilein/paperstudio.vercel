// Deterministic post-generation audit for CZAR outputs.
// Complements the LLM's internal pre-output audit with code-level checks that
// cannot be hallucinated away — banned phrase detection, structural consistency,
// em-dash overuse, and citation integrity.

export interface DeterministicAuditResult {
  passed: boolean;
  issues: string[];
  domain: string;
}

// Phrases that appear frequently in AI-generated text and are banned across all domains.
// Checked case-insensitively with word-boundary awareness.
const BANNED_PHRASES: string[] = [
  "In conclusion",
  "It is important to note",
  "It is worth noting",
  "It should be noted",
  "Delve into",
  "Delving into",
  "In the realm of",
  "Tapestry",
  "Multifaceted",
  "Seamlessly",
  "Game-changer",
  "Game changer",
  "Paradigm shift",
  "Underscore the importance",
  "Noteworthy",
  "Commendable",
  "This essay will explore",
  "This paper will argue",
  "Feel free to",
  "I hope this helps",
  "Let me know if",
  "In today's world",
  "In today's fast-paced",
  "The tapestry of",
  "A multitude of",
];

// Phrases that are only banned when used as sentence openers.
const BANNED_OPENERS: string[] = [
  "Furthermore,",
  "Moreover,",
  "Additionally,",
  "Importantly,",
];

export function runDeterministicAudit(
  text: string,
  domain: string,
  settings: Record<string, unknown> = {},
): DeterministicAuditResult {
  const issues: string[] = [];

  // 1. Banned phrases (universal, any position)
  for (const phrase of BANNED_PHRASES) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    const re = new RegExp(`\\b${escaped}\\b`, "i");
    if (re.test(text)) {
      issues.push(`Banned phrase: "${phrase}"`);
    }
  }

  // 2. Banned openers (only at sentence start)
  for (const opener of BANNED_OPENERS) {
    const escaped = opener.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?:^|[.!?]\\s+)${escaped}`, "im");
    if (re.test(text)) {
      issues.push(`Banned opener: "${opener}" — never start a sentence this way`);
    }
  }

  // 3. Em-dash overuse: more than 1 per 200 words
  const emDashCount = (text.match(/—/g) ?? []).length;
  const wc = text.trim().split(/\s+/).filter(Boolean).length;
  if (wc > 200 && emDashCount > Math.floor(wc / 200)) {
    issues.push(
      `Em-dash overuse: ${emDashCount} em-dashes in ${wc} words (max 1 per 200 words)`,
    );
  }

  // 4. Heading hierarchy for academic/professional long-form content
  if ((domain === "academic" || domain === "professional") && wc > 400) {
    const hasH2 = /^## /m.test(text);
    const hasH3 = /^### /m.test(text);

    if (!hasH2) {
      issues.push("Long-form academic/professional content lacks section headings (## )");
    }
    if (hasH3 && !hasH2) {
      issues.push("H3 heading (### ) present without H2 parent — heading hierarchy violation");
    }
  }

  // 5. Citation/References consistency for academic
  if (domain === "academic") {
    const apaPattern = /\([A-Za-z][A-Za-z\-]+(?:\s+et\s+al\.)?,\s*\d{4}(?:[a-z])?\)/g;
    const numericPattern = /\[\d+(?:,\s*\d+)*\]/g;
    const inTextAPA = (text.match(apaPattern) ?? []).length;
    const inTextNumeric = (text.match(numericPattern) ?? []).length;
    const totalCitations = inTextAPA + inTextNumeric;

    const hasReferences =
      /^## References\b/im.test(text) ||
      /^## Bibliography\b/im.test(text) ||
      /^## Works Cited\b/im.test(text) ||
      /^## Reference List\b/im.test(text);

    if (totalCitations > 0 && !hasReferences) {
      issues.push(
        `${totalCitations} in-text citation(s) detected but no References/Bibliography section found`,
      );
    }
  }

  // 6. Consecutive sentence-opener monotony (3+ sentences starting with same word)
  const sentenceOpeners = text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim().split(/\s+/)[0]?.toLowerCase())
    .filter((w): w is string => !!w && w.length > 2);

  for (let i = 0; i < sentenceOpeners.length - 2; i++) {
    if (
      sentenceOpeners[i] === sentenceOpeners[i + 1] &&
      sentenceOpeners[i + 1] === sentenceOpeners[i + 2]
    ) {
      issues.push(
        `Structural monotony: 3+ consecutive sentences starting with "${sentenceOpeners[i]}"`,
      );
      break; // report once only
    }
  }

  // 7. Passive voice overuse in professional/journalistic (rough heuristic)
  if (domain === "professional" || domain === "journalistic") {
    const passiveMatches = (
      text.match(/\b(?:is|are|was|were|been|being)\s+\w+ed\b/gi) ?? []
    ).length;
    if (wc > 100 && passiveMatches / (wc / 100) > 4) {
      issues.push(
        `High passive voice density: ~${passiveMatches} passive constructions in ${wc} words — prefer active voice`,
      );
    }
  }

  return {
    passed: issues.length === 0,
    issues,
    domain,
  };
}

// Generates a Pandoc-compatible YAML frontmatter header for academic/professional documents.
// Used by the DOCX export path — not prepended to streaming output.
export function generateYAMLHeader(
  title: string,
  style: string,
  author?: string,
  wordCount?: number,
): string {
  const escape = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  const fields: string[] = [
    `title: "${escape(title)}"`,
    `style: "${escape(style)}"`,
    "documentclass: article",
    "fontsize: 12pt",
    'mainfont: "Times New Roman"',
    "linestretch: 2.0",
    "toc: true",
    "geometry: margin=2.5cm",
  ];

  if (author) fields.push(`author: "${escape(author)}"`);
  if (wordCount) fields.push(`# Target word count: ${wordCount}`);

  return ["---", ...fields, "---", ""].join("\n") + "\n";
}
