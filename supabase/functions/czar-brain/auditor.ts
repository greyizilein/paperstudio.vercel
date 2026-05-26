// Deterministic post-generation audit for CZAR outputs.
// Complements the LLM's internal pre-output audit with code-level checks that
// cannot be hallucinated away — banned phrase detection, structural consistency,
// em-dash overuse, citation integrity, AND semantic markup validation.
//
// ARCHITECTURAL PRINCIPLE: Semantic Markup Output (Principle 3)
// All AI output must be Pandoc-flavored Markdown with YAML metadata and semantic
// annotation tags. Raw formatted documents are rejected. Rendering is handled by
// deterministic backend/frontend code.
//
// ARCHITECTURAL PRINCIPLE: Mandatory Verification Protocol (Principle 4)
// Every generation must validate structure, citations, narrative consistency,
// word count, and prose mechanics BEFORE producing user-visible output.
// Failure triggers regeneration, not warnings.

// ---------------------------------------------------------------------------
// SemanticAuditor — pre-generation prompt injection (Principle 3 & 4)
// ---------------------------------------------------------------------------

type WritingDomain = "academic" | "fiction" | "professional" | "technical" | "journalistic" | "personal" | "poetry" | "chat";

interface SemanticAuditResult {
  passed: boolean;
  requiresRegeneration: boolean;
  errors: string[];
  warnings: string[];
  correctedContent?: string;
}

export class SemanticAuditor {
  private domain: WritingDomain;
  private strictMode: boolean;

  constructor(domain: WritingDomain, strictMode = true) {
    this.domain = domain;
    this.strictMode = strictMode;
  }

  public async validate(content: string): Promise<SemanticAuditResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.hasSemanticHeadings(content)) {
      errors.push("CRITICAL: Improper heading hierarchy. Use standard Markdown # ## ###.");
    }

    if (this.domain === "academic") {
      if (!this.hasCitations(content)) {
        errors.push("CRITICAL: Academic content requires citations.");
      }
    } else if (this.domain === "fiction") {
      if (this.detectInstructionalTone(content)) {
        warnings.push("STYLE: Detected instructional tone in fiction — ensure show-don't-tell.");
      }
    } else if (this.domain === "technical") {
      if (!this.hasProcedureStructure(content)) {
        warnings.push("STYLE: Technical content should use numbered procedures.");
      }
    }

    const requiresRegeneration = errors.length > 0 && this.strictMode;
    return { passed: errors.length === 0, requiresRegeneration, errors, warnings, correctedContent: requiresRegeneration ? undefined : content };
  }

  public buildPreOutputAuditBlock(): string {
    const domainCheck = this.domain === "academic"
      ? "Verify all claims have citations."
      : this.domain === "technical"
      ? "Verify prerequisites precede procedures and code snippets have language specifiers."
      : "Verify narrative consistency and show-don't-tell principle.";

    return `
<audit_protocol>
MANDATORY SELF-CHECK BEFORE OUTPUT:
1. Verify semantic heading structure.
2. ${domainCheck}
3. If ANY check fails, REGENERATE immediately. Do not output failed draft.
</audit_protocol>
`;
  }

  private hasSemanticHeadings(text: string): boolean {
    return /^#{1,6}\s/m.test(text) || text.includes("#");
  }

  private hasCitations(text: string): boolean {
    return /@\w+|\[\d+\]/.test(text) || /\([A-Z][a-z]+,\s*\d{4}\)/.test(text);
  }

  private hasProcedureStructure(text: string): boolean {
    return /^\d+\./m.test(text) || /^- /m.test(text);
  }

  private detectInstructionalTone(text: string): boolean {
    const flags = ["you should", "the reader must", "in conclusion", "therefore"];
    return flags.some((flag) => text.toLowerCase().includes(flag));
  }
}

export function wrapWithSemanticTag(content: string, tag: string): string {
  if (content.includes(`<${tag}>`)) return content;
  return `<${tag}>\n${content}\n</${tag}>`;
}

export interface DeterministicAuditResult {
  passed: boolean;
  requiresRegeneration: boolean;  // true = must regenerate, false = can proceed with warnings
  issues: string[];
  domain: string;
  semanticMarkupValid: boolean;
  yamlMetadataPresent: boolean;
}

export interface SemanticMarkupConfig {
  requireYamlFrontmatter: boolean;
  requireSemanticTags: boolean;
  allowedHeadingLevels: number[];  // e.g., [1,2,3] means H1-H3 only
  maxHeadingLevel: number;
}

const DEFAULT_MARKUP_CONFIG: SemanticMarkupConfig = {
  requireYamlFrontmatter: false,  // Only for export, not streaming
  requireSemanticTags: false,      // Optional during draft, required for final
  allowedHeadingLevels: [1, 2, 3, 4],
  maxHeadingLevel: 4,
};

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

  // 8. Semantic markup validation (Principle 3)
  const config = settings.semanticMarkupConfig as SemanticMarkupConfig | undefined ?? DEFAULT_MARKUP_CONFIG;
  let semanticMarkupValid = true;
  let yamlMetadataPresent = false;

  // Check for YAML frontmatter if required
  if (config.requireYamlFrontmatter) {
    yamlMetadataPresent = /^---\n[\s\S]*?\n---/.test(text);
    if (!yamlMetadataPresent) {
      issues.push("Missing YAML frontmatter — required for this document type");
      semanticMarkupValid = false;
    }
  } else {
    // Still check if present (for export detection)
    yamlMetadataPresent = /^---\n[\s\S]*?\n---/.test(text);
  }

  // Check heading hierarchy doesn't exceed max level
  const headingMatches = text.match(/^#{1,6}\s+/gm) ?? [];
  for (const match of headingMatches) {
    const level = match.trim().length;
    if (level > config.maxHeadingLevel) {
      issues.push(`Heading level ${level} exceeds maximum allowed (${config.maxHeadingLevel})`);
      semanticMarkupValid = false;
    }
    if (!config.allowedHeadingLevels.includes(level)) {
      issues.push(`Heading level ${level} not in allowed levels [${config.allowedHeadingLevels.join(", ")}]`);
      semanticMarkupValid = false;
    }
  }

  // 9. Audit protocol: determine if regeneration is required
  // Critical failures that require regeneration:
  // - Banned phrases in high-stakes domains (academic, professional)
  // - Missing references section when citations present (academic)
  // - Heading hierarchy violations in long-form content
  // - Semantic markup violations when explicitly required
  const criticalIssues = issues.filter(issue => {
    const isBannedPhrase = issue.startsWith("Banned phrase");
    const isMissingReferences = issue.includes("no References/Bibliography section");
    const isHeadingViolation = issue.includes("heading hierarchy violation") || issue.includes("lacks section headings");
    const isSemanticViolation = issue.includes("Missing YAML") || issue.includes("Heading level");
    
    if (domain === "academic" || domain === "professional") {
      return isBannedPhrase || isMissingReferences || isHeadingViolation;
    }
    if (config.requireYamlFrontmatter || config.requireSemanticTags) {
      return isSemanticViolation;
    }
    return isBannedPhrase && (domain === "academic" || domain === "professional");
  });

  const requiresRegeneration = criticalIssues.length > 0;

  return {
    passed: issues.length === 0,
    requiresRegeneration,
    issues,
    domain,
    semanticMarkupValid,
    yamlMetadataPresent,
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

// ---------------------------------------------------------------------------
// Pre-Output Audit Block — injected into system prompt for LLM self-audit
// This is the hidden <audit> block that validates BEFORE user-visible output
// (Principle 4: Mandatory Verification Protocol)
// ---------------------------------------------------------------------------

export function buildPreOutputAuditBlock(domain: string, style: string): string {
  const domainChecks: Record<string, string[]> = {
    academic: [
      "Every evidence-based claim has an in-text citation.",
      "No bullet points in academic body prose.",
      "Register is formal, third-person, no contractions.",
      "References section is complete and alphabetized.",
      "Thesis statement appears in introduction as a contestable claim.",
      "No 'this essay will explore' or similar meta-commentary.",
    ],
    fiction: [
      "Scene is grounded in 2+ sensory registers within first 100 words.",
      "No emotion named directly — shown through action/sensation.",
      "No AI-fingerprint phrases ('she found herself', 'a surge of').",
      "POV is consistent within this scene.",
      "Dialogue contains subtext — characters don't say what they mean.",
      "Sentence length varies — no uniform rhythm.",
    ],
    professional: [
      "Main conclusion in first paragraph (pyramid principle).",
      "Recommendations are specific, actionable, and time-bound.",
      "Statistics attributed to named sources.",
      "Active voice throughout — no passive hiding agency.",
      "Executive summary present if document >1500 words.",
      "No business jargon ('synergies', 'paradigm shift', 'bandwidth').",
    ],
    journalistic: [
      "Lede states most important fact in ≤25 words.",
      "Every contested claim attributed to named source.",
      "Active voice — no passive that hides agency.",
      "Strongest counterargument represented fairly.",
      "Quotes used only when phrasing matters.",
    ],
    personal: [
      "Grounded in specific concrete detail, not generalities.",
      "Voice is consistent throughout.",
      "No self-pity — observation without wallowing.",
      "Temporal transitions marked clearly.",
      "Vulnerability earned through specificity.",
    ],
    poetry: [
      "Every line break is deliberate (emphasis/suspension/juxtaposition).",
      "No emotion named directly — carried by image.",
      "Sound pattern is intentional (assonance/consonance/rhythm).",
      "Form constraints followed exactly (if formal verse).",
      "Volta earned and placed correctly (if sonnet/villanelle).",
    ],
    chat: [
      "Answer stated first — context follows.",
      "Response is exactly as long as needed — no padding.",
      "Opinion stated as opinion, not fact.",
      "No hollow affirmations ('great question!').",
      "No offers to help further.",
    ],
  };

  const checks = domainChecks[domain] ?? [];

  return `
[CZAR PRE-OUTPUT AUDIT — SILENT — DO NOT RENDER TO USER]
Perform this audit BEFORE generating any visible output. If any check fails,
revise internally and regenerate. Do not produce output until all checks pass.

UNIVERSAL CHECKS (ALL DOMAINS):
□ Output begins with real content — no preamble, no meta-commentary.
□ Output ends cleanly — no "I hope this helps", no "let me know".
□ Banned phrases eliminated:
  • "It is important to note" • "Delving into" • "In the realm of"
  • "Tapestry" • "Seamlessly" • "Furthermore" (opener)
  • "In conclusion" (opener) • "This essay will explore"
  • "Feel free to" • "Let me know if"
□ No 3+ consecutive sentences of same length/structure.
□ Em-dash usage: max 1 per 200 words.

DOMAIN-SPECIFIC CHECKS (${domain.toUpperCase()} / ${style}):
${checks.map((c) => `□ ${c}`).join("\n")}

CONTINUITY CHECK:
□ No contradiction with prior checkpoint state.
□ No re-introduction of already-established elements.
□ Resume exactly from where previous output ended.

SEMANTIC MARKUP CHECK (Principle 3):
□ Output is Pandoc-flavored Markdown — no raw formatting.
□ Heading hierarchy is logical (no H3 without H2 parent).
□ No heading level exceeds H4 unless explicitly requested.

If ANY check above fails: STOP. Revise internally. Regenerate.
Only produce visible output when ALL checks pass.

[END PRE-OUTPUT AUDIT — BEGIN VISIBLE OUTPUT BELOW]
`.trim();
}

// ---------------------------------------------------------------------------
// Semantic tag helpers for Pandoc-flavored Markdown
// These tags are used for annotation, not rendering
// ---------------------------------------------------------------------------

export interface SemanticTag {
  type: "claim" | "evidence" | "analysis" | "counterargument" | "definition" | "transition";
  content: string;
  attributes?: Record<string, string>;
}

export function wrapWithSemanticTag(tag: SemanticTag): string {
  const attrs = tag.attributes
    ? Object.entries(tag.attributes)
        .map(([k, v]) => `${k}="${v}"`)
        .join(" ")
    : "";
  const attrStr = attrs ? ` {${attrs}}` : "";
  return `[${tag.content}]{.${tag.type}${attrStr}}`;
}

export function createCitationPlaceholder(info: { author?: string; year?: number; topic: string }): string {
  const parts: string[] = [];
  if (info.author) parts.push(info.author);
  if (info.year) parts.push(String(info.year));
  if (parts.length === 0) {
    return `[CITATION REQUIRED: ${info.topic}]`;
  }
  return `[CITATION REQUIRED: ${parts.join(", ")} — ${info.topic}]`;
}

export function createFootnoteMarker(id: string, content: string): string {
  return `${content}[^${id}]`;
}

export function createFootnoteDefinition(id: string, content: string): string {
  return `[^${id}]: ${content}`;
}
