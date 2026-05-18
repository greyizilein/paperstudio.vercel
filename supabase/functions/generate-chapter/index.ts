import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logAiUsage } from "../_shared/log-ai-usage.ts";
import { streamAnthropic, AnthropicRateLimitError, CLAUDE_MODEL } from "../_shared/anthropic.ts";
import { pickWriterModel, tierAllowsThinking } from "../_shared/pick-model.ts";
import { fetchZoteroItems, formatCitationsForPrompt } from "../_shared/zotero.ts";
import { summariseLargeText } from "../_shared/summarize-large-text.ts";
import {
  ABSTRACT_TEMPLATE,
  CHAPTER_ONE_TEMPLATE,
  CHAPTER_ONE_NURSING_TEMPLATE,
  CHAPTER_TWO_TEMPLATE,
  CHAPTER_THREE_TEMPLATE,
  CHAPTER_FOUR_QUAL_TEMPLATE,
  CHAPTER_FOUR_QUANT_TEMPLATE,
  CHAPTER_FIVE_TEMPLATE,
  SLR_TEMPLATE,
  CUSTOM_CHAPTER_TEMPLATE,
  SUPERIOR_PROMPT_TEMPLATE,
  buildUnifiedHeadingSchema,
} from "./templateContent.ts";
import {
  getWriterIdentity,
  getNaturalModeBannedPhraseOverride,
  getDissertationVoiceGuide,
  getLanguageLevelInstructions,
  getCraftModel,
  getContrastEngine,
  getSentenceRhythm,
  getBridgeSentences,
  getStatisticsDirective,
  getHumanWritingMandate,
} from "./writerIdentity.ts";
import { getQualityExemplars } from "./qualityExemplars.ts";
import { teeAndPersistChapterStream } from "../_shared/chapter-stream-persist.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BANNED_PHRASES = [
  "delve into", "it is worth noting", "it is important to", "in today's world",
  "in the modern era", "tapestry", "multifaceted", "nuanced", "shed light on",
  "in the realm of", "leverage", "furthermore", "moreover", "in conclusion",
  "it cannot be denied", "needless to say", "it goes without saying",
  "in a nutshell", "on the other hand", "as a matter of fact",
  "plays a crucial role", "a wide range of", "in light of the fact",
  "due to the fact that", "it is evident that", "it is clear that",
  "it is obvious that", "this paper will", "this study will",
];

  // ALLOWED_MODELS whitelist — curated PaperStudio lineup
const ALLOWED_MODELS: Record<string, string> = {
  "claude-sonnet-4-5": "claude-sonnet-4-5",
  "claude-sonnet-4-6": "claude-sonnet-4-5",
  "claude-opus-4": "claude-opus-4-1",
  "claude-opus-4-6": "claude-opus-4-5",
  "gpt-5.2": "gemini-2.5-flash",
  "gpt-5-flagship": "gemini-2.5-pro",
  "gemini-2.5-flash": "gemini-2.5-flash",
  "gemini-2.5-pro": "gemini-2.5-pro",
  "gemini-3-flash": "gemini-2.0-flash",
  "gemini-3-pro": "gemini-2.0-flash",
};

// Models reserved for SYSTEM use only (never user-selectable in PaperStudio).
const BLOCKED_USER_MODELS = new Set<string>([
  "claude-opus-4",
  "claude-opus-4-6",
  "claude-opus-4-7",
]);

// Per-tier access for user-picked models (mirrors src/lib/aiModels.ts).
const TIER_ACCESS: Record<string, string[]> = {
  "gemini-2.5-flash": ["free", "undergraduate", "masters", "phd", "custom"],
  "gemini-3-flash":   ["undergraduate", "masters", "phd", "custom"],
  "gpt-5.2":          ["undergraduate", "masters", "phd", "custom"],
  "gemini-2.5-pro":   ["masters", "phd", "custom"],
  "claude-sonnet-4-6":["masters", "phd", "custom"],
  "claude-sonnet-4-5":["masters", "phd", "custom"],
  "gemini-3-pro":     ["phd", "custom"],
  "gpt-5-flagship":   ["phd", "custom"],
};

function resolveModel(modelId?: string): string {
  if (!modelId) return "gemini-2.5-flash";
  if (BLOCKED_USER_MODELS.has(modelId)) {
    console.warn(`[generate-chapter] BLOCKED user-selected model "${modelId}" — falling back to Claude default`);
    return CLAUDE_MODEL;
  }
  return ALLOWED_MODELS[modelId] || "gemini-2.5-flash";
}

function buildStatisticsInstructions(chapterType: string, methodology: string): string {
  // Old hard rule ("minimum 10 statistics") removed — it forced robotic prose.
  // Statistics now serve argument; the density expectation lives in the craft model
  // and in chapter-specific guidance below.
  if (chapterType === "abstract") return "";

  const directive = getStatisticsDirective(chapterType);

  const perChapter: Record<string, string> = {
    introduction: `
For the Introduction chapter:
- Numbers should establish the stakes and scale of the problem (e.g., "approximately 1.3 million deaths annually (WHO, 2023)").
- Each cited figure must do argumentative work — never list statistics for their own sake.`,
    literature_review: `
For the Literature Review chapter:
- When citing an empirical study, include the key finding in numerical form WHERE IT SHARPENS THE CLAIM (e.g., "Smith (2021, n = 384) reported r = 0.68, p < .01 — a stronger association than earlier UK studies suggested").
- Numbers must be interpreted, not just reported. A figure dropped beside a citation does no work.`,
    methodology: `
For the Methodology chapter:
- Report sample size, response rate, reliability coefficients, and (where relevant) power analysis results.
- Each number must be tied to a defensible methodological choice — not listed mechanically.`,
    findings: `
For the Findings/Data Analysis chapter:
- This IS the numbers chapter. Every statistical test reports: test statistic, df, p-value, effect size.
- Tables present the data; the prose tells the reader what the numbers MEAN.
- Example: "Table 4.1 shows that 67.3% (n = 258) of respondents were female. The mean age was 28.4 years (SD = 6.72). A chi-square test revealed a significant association between gender and attitude (χ²(2) = 14.32, p < .001, Cramér's V = 0.19) — a small but reliable effect that aligns with Adebayo's (2022) Lagos sample."

## MANDATORY: Discussion of Findings Section (600-1200 words)
After presenting ALL statistical results and tables, you MUST include a section "## 4.X Discussion of Findings" (600-1200 words) that:
1. Synthesises results with the literature reviewed in Chapters 1 and 2
2. Interprets what the statistical results MEAN in the context of each research objective
3. Compares findings with prior studies cited in earlier chapters
4. Discusses theoretical implications — how do the results support or challenge the framework?
5. Addresses unexpected, contradictory, or non-significant findings with plausible explanations
6. Discusses practical implications for the field
This section is CRITICAL and must NOT be omitted.`,
    conclusion: `
For the Conclusion chapter:
- Reference key statistical findings from Chapter 4 when summarising — but only the figures that anchor the chapter's main argument.`,
  };

  return directive + (perChapter[chapterType] || "");
}

function buildChapterStructureTemplate(
  chapterType: string,
  methodology: string,
  degree: string,
  isNursing: boolean = false,
  includeHypotheses: boolean = false,
): string {
  const isQuant = methodology === "Quantitative" || methodology === "Mixed Methods";
  const isQual = methodology === "Qualitative" || methodology === "Mixed Methods";

  let template = "";

  switch (chapterType) {
    case "abstract":
      template = ABSTRACT_TEMPLATE;
      break;
    case "introduction":
      template = isNursing ? CHAPTER_ONE_NURSING_TEMPLATE : CHAPTER_ONE_TEMPLATE;
      break;
    case "literature_review":
      template = CHAPTER_TWO_TEMPLATE;
      break;
    case "methodology":
      template = CHAPTER_THREE_TEMPLATE;
      break;
    case "findings":
      template = isQual && !isQuant ? CHAPTER_FOUR_QUAL_TEMPLATE : CHAPTER_FOUR_QUANT_TEMPLATE;
      break;
    case "conclusion":
      template = CHAPTER_FIVE_TEMPLATE;
      break;
    case "systematic_literature_review":
      template = SLR_TEMPLATE;
      break;
    case "custom":
      template = CUSTOM_CHAPTER_TEMPLATE;
      break;
    default:
      // Unknown type: use the custom template so there's still guidance
      template = CUSTOM_CHAPTER_TEMPLATE;
      break;
  }

  const unifiedSchema = buildUnifiedHeadingSchema(chapterType, methodology, degree, includeHypotheses);

  return `## MASTER WRITING STANDARD (applies to this entire chapter)
${SUPERIOR_PROMPT_TEMPLATE}
${unifiedSchema}
## CHAPTER-SPECIFIC STRUCTURAL GUIDANCE — adapt to this project's specific topic, context, and themes
The template below defines structure and emphasis. Do NOT copy headings or phrases verbatim if they are generic placeholders. Rename any generic heading (e.g. "Theme 1", "Thematic Review —", "Key Author", "[Rename]") to a specific, topic-relevant heading that accurately names the content. The chapter must read as if written by a graduate student who deeply understands this specific research topic — not as if copied from a template.

IMPORTANT: Where the template below conflicts with the CANONICAL HEADING SCHEMA above, the canonical schema wins for heading naming, numbering, and inclusion/exclusion. The template's section-level guidance (word counts, intellectual depth, prohibitions) still applies to the corresponding canonical sections.
${template}`;
}

function buildObjectivesFormatInstructions(chapterType: string): string {
  if (chapterType === "introduction") {
    return `
## CRITICAL: Research Objectives, Questions & Hypotheses Formatting
When listing research objectives, research questions, or hypotheses in the chapter:
- They MUST be presented as numbered items (1, 2, 3, 4 or H1, H2, H3)
- Each item MUST be ONE LINE ONLY — a single clear statement
- Do NOT add explanations, elaborations, or paragraphs after each item
- Do NOT use bullet points — use numbered format only
- Example format:
  The research objectives are:
  1. To examine the relationship between X and Y.
  2. To identify factors influencing Z.
  3. To assess the impact of A on B.
  4. To evaluate the effectiveness of C.

  The research questions are:
  1. What is the relationship between X and Y?
  2. What factors influence Z?
  3. To what extent does A impact B?
  
  The hypotheses are:
  H1: There is a significant relationship between X and Y.
  H2: Factor Z significantly influences W.
  H3: A has a positive impact on B.`;
  }
  
  // For ALL non-introduction chapters
  return `
## CRITICAL: DO NOT LIST Research Objectives or Questions
You may REFER to research objectives and questions in flowing prose (e.g., "the first objective sought to examine..."), but you must NEVER reproduce them as a numbered or bulleted list. Listing objectives/questions is permitted ONLY in Chapter 1 (Introduction).
⛔ VIOLATION: Writing "The objectives of this study are: 1. To examine... 2. To identify..." in any chapter other than Chapter 1.
✅ CORRECT: "The first objective, which examined the relationship between X and Y, was addressed through..."`;
}

import { TERMS_OF_QUALITY } from "../_shared/quality-terms.ts";

const NO_META_RULE = `\n\n## NO META-COMMENTARY OR WORD-COUNT ANNOTATIONS\nEnd on the last substantive sentence of the chapter (or the References list). NEVER append:\n- Word count tallies: NEVER write "(Word count: X)" or "Word count: X" or any similar annotation anywhere in the document — not after sections, not at the end, not anywhere. Word count tracking is INTERNAL ONLY.\n- Section rewrites or second drafts: NEVER write a section, then write it again shorter. Produce ONE version of each section. If a section runs long, tighten it by mentally compressing as you generate — not by appending a revised copy.\n- Summaries of what you did, checklists, "[✓]" bullets, "Notes:" / "Audit:" trailers, or sentences beginning with "Produced…", "Rendered…", "Aligned…", "Delivered…", "I have…", "This response/chapter…".\nThe reader sees the work, not a debrief.`;

function buildSystemPrompt(project: any, chapter: any, draftConfig: any, chapterPlan?: any): string {
  const writingMode = project.writing_mode || "default";
  const isNaturalMode = writingMode === "natural";
  const writerIdentity = getWriterIdentity(writingMode);
  const languageLevel = getLanguageLevelInstructions(project.language_level ?? 4);
  const p = draftConfig.personalise || {};
  const currentDate = new Date().toISOString().split("T")[0];
  // Extract all personalise settings with defaults
  const formality = p.formality || "Standard journal (default)";
  const paragraphLength = p.paragraphLength || "Medium (4–7 sentences)";
  const sentenceComplexity = p.sentenceComplexity || "Mixed (default)";
  const hedging = p.hedging || "Medium (standard)";
  const voicePerson = p.voicePerson || "Third person only";
  const technicalDensity = p.technicalDensity || "3 — Standard";
  const transitionStyle = p.transitionStyle || "Formal connectors";
  const geoScope = p.geoScope || "Global";
  const customGeoScope = p.customGeoScope || "";
  const contentEmphasis = p.contentEmphasis || "";
  const selectedTheorists = p.selectedTheorists || [];
  const analysisMethods = p.analysisMethods || [];
  const qualMethods = p.qualMethods || [];
  const visualizations = p.visualizations || [];
  const software = p.software || [];
  const customSoftware = p.customSoftware || "";
  const notes = p.notes || "";
  const pastedInstructions = p.pastedInstructions || "";
  const sectionsToInclude = p.sectionsToInclude || [];
  const ontology = p.ontology || "";
  const epistemology = p.epistemology || "";
  const methodologyDepth = p.methodologyDepth || "Standard";
  const instrumentGenerate = p.instrumentGenerate || "No";
  const customSamplingDesc = p.customSamplingDesc || "";
  const includeHypotheses = p.includeHypotheses || false;
  const hypothesesText = p.hypothesesText || "";
  const researchObjectivesText = p.researchObjectivesText || "";
  const researchQuestionsText = p.researchQuestionsText || "";
  const chartColourScheme = p.chartColourScheme || "Default Academic";
  const chartBWFallback = p.chartBWFallback || false;
  const chartComplexity = p.chartComplexity || "Level 2 — Standard";
  const chartResolution = p.chartResolution || "300 DPI — print";
  const figureNumbering = p.figureNumbering || "Figure 4.1, 4.2…";
  const tableNumbering = p.tableNumbering || "Table 4.1, 4.2…";
  const significanceAsterisks = p.significanceAsterisks !== false;
  const confidenceIntervals = p.confidenceIntervals !== false;
  const boldSignificant = p.boldSignificant !== false;
  const standardisedBeta = p.standardisedBeta || false;
  const vifValues = p.vifValues || false;
  const nAnnotation = p.nAnnotation || false;
  const mixedMethodsApproach = p.mixedMethodsApproach || "";
  const includeTriangulation = p.includeTriangulation || false;
  const includeQuoteTables = p.includeQuoteTables || false;
  const captionPosition = p.captionPosition || "Above table (APA/Harvard default)";
  const sourceFormat = p.sourceFormat || "Source: Author, Year";
  const sourceTypeDistribution = p.sourceTypeDistribution || [];
  const empiricalLevel = p.empiricalLevel || "Standard (50% empirical)";
  const seminalWorks = p.seminalWorks || "No — recent sources only";
  const doiInclusion = p.doiInclusion || "Auto (required for APA 7 & Vancouver)";
  const specificAuthors = p.specificAuthors || [];
  const lineSpacing = p.lineSpacing || "2.0× (UK default)";
  const abstractType = p.abstractType || "";
  const abstractTargetWC = p.abstractTargetWC || "";
  const includeKeywords = p.includeKeywords || false;
  const dualLanguage = p.dualLanguage || false;
  const includeWCDeclaration = p.includeWCDeclaration || false;

  const dateRange = p.dateRange || `${draftConfig.source_year_start || 2016}-${draftConfig.source_year_end || 2024}`;
  const customDateFrom = p.customDateFrom || "2016";
  const customDateTo = p.customDateTo || "2024";
  const yearStart = dateRange === "Custom…" ? parseInt(customDateFrom) : parseInt(dateRange.split("-")[0]) || 2016;
  const yearEnd = dateRange === "Custom…" ? parseInt(customDateTo) : parseInt(dateRange.split("-")[1]) || 2024;

  const isReuseOnly = chapter.type === "findings";
  const isNoCite = chapter.type === "conclusion" || chapter.type === "abstract";

  const effectiveGeoScope = geoScope === "Custom…" && customGeoScope ? customGeoScope : geoScope;

  const statsInstructions = buildStatisticsInstructions(chapter.type, project.research_methodology || "Quantitative");
  const objectivesFormat = buildObjectivesFormatInstructions(chapter.type);
  const isNursing = (project.field_of_study || "").toLowerCase().includes("nurs") ||
                    (project.degree || "").toLowerCase().includes("nurs");
  // Project-level hypotheses toggle cascades into the schema. Falls back to per-chapter
  // setting if the project flag is absent (legacy projects).
  const projectIncludesHypotheses = !!(project as any).include_hypotheses || !!includeHypotheses;
  const chapterTemplate = buildChapterStructureTemplate(
    chapter.type,
    project.research_methodology || "Quantitative",
    project.degree || "",
    isNursing,
    projectIncludesHypotheses,
  );

  // === MODE-DEPENDENT SECTIONS ===
  // In Default mode: minimal identity, no voice guide, no banned phrases override, no dissertation voice
  // In Natural mode: full researcher persona, voice guide, reduced banned phrases

  const bannedSection = isNaturalMode
    ? getNaturalModeBannedPhraseOverride()
    : BANNED_PHRASES.map((ph) => `• "${ph}"`).join("\n");

  const dissertationVoice = isNaturalMode ? getDissertationVoiceGuide() : "";

  const citationStyle = draftConfig.citation_style || project.citation_style || "Harvard";

  const printReadyMandate = `
## Print-Ready Output Mandate
This chapter will be submitted directly to an academic institution. Standards are absolute:
- ZERO placeholder text: never write "TBD", "[insert X]", "[Author, Year]", "N/A", or any bracketed placeholders
- Every in-text citation MUST follow ${citationStyle} format exactly — no invented references
- Every heading MUST match the confirmed outline verbatim — no silent renames
- No meta-commentary ("In this section we will…", "This chapter examines…", "As discussed earlier…")
- Figure captions: **Figure N.M: Title** immediately below each figure marker
- Table captions: **Table N.M: Title** immediately above each table
- Every claim supported by evidence; every statistic cited`;

  // Build the opening preamble based on mode
  const preamble = isNaturalMode
    ? `You are a graduate researcher writing your dissertation. Not a text generator. Not an AI assistant. A researcher who has spent months with this material, formed opinions, identified gaps, and is now putting their intellectual work into words.

⚠️ STRUCTURAL RULE — FOLLOW THE USER'S CONFIRMED OUTLINE
Use the headings exactly as the user has confirmed them in the outline below. The user has full authority over heading names, numbering, order, inclusion, and word counts. Do NOT silently rename, reorder, merge, split, add, or omit headings the user has set. If the user has renamed a standard heading or added a custom one, honour that choice verbatim.

You MAY:
- Generate sub-subheadings (e.g. 2.4.1, 2.4.2) WITHIN any section the user provided, where the content warrants
- Vary voice, rhetorical rhythm, argumentative depth, synthesis style, and analytical framing freely
- Decide how deeply to engage each subtopic within a section

Your creative authority is over WRITING — voice, argumentation, analytical depth, rhetorical strategy, synthesis. The user's outline is your structural contract.

${writerIdentity}

${dissertationVoice}`
    : `You are an academic writing engine with deep research writer awareness, producing a dissertation chapter. You understand the scholarly context of this project and write accordingly — not generic filler but context-aware, precise academic content. Use the headings provided in the outline below exactly as the user confirmed them — do not rename, reorder, or omit them.

${writerIdentity}`;

  // Voice & style section — always present but lighter in default mode
  const voiceStyleSection = isNaturalMode ? `
# WRITING CRAFT

## Voice & Style
- Formality: ${formality}
- Paragraph length: ${paragraphLength}
- Sentence complexity: ${sentenceComplexity}
- Hedging intensity: ${hedging}
- Technical density: ${technicalDensity}
- Voice: ${voicePerson}
- Transition style: ${transitionStyle}
- Write with the confidence of someone who knows this field. Not arrogance — earned authority through evidence.
- Active voice predominantly. Passive voice no more than 30% of sentences.
- Sentence length variation is NON-NEGOTIABLE:
  - A 7-word declaration next to a 40-word multi-clause sentence creates emphasis. Do this deliberately.
  - If three consecutive sentences share similar length or structure, you have failed at this.
- Word choice: when the first word that comes to mind is a cliché, find the second one. Academic writing is precise, not predictable.
- Your analytical voice should be visible in how you frame evidence, where you place emphasis, and what you choose to challenge.` : `
# WRITING PARAMETERS
- Formality: ${formality}
- Paragraph length: ${paragraphLength}
- Sentence complexity: ${sentenceComplexity}
- Hedging intensity: ${hedging}
- Technical density: ${technicalDensity}
- Voice: ${voicePerson}
- Transition style: ${transitionStyle}`;

  const bannedPhrasesSection = isNaturalMode ? bannedSection : `## ⛔ BANNED PHRASES — AI FINGERPRINTS — NEVER USE THESE
Using any of the following is a CRITICAL FAILURE that invalidates the output:
${bannedSection}

### BANNED PARAGRAPH OPENERS (these mark AI writing immediately):
- ⛔ "Furthermore," — NEVER. Use a specific transition that names what you're adding.
- ⛔ "Moreover," — NEVER.
- ⛔ "Additionally," / "In addition," — NEVER.
- ⛔ "It is worth noting that" / "It is important to note that" — NEVER.
- ⛔ "This demonstrates" / "This highlights" / "This underscores" — NEVER as openers.
- ⛔ "In today's rapidly changing world" / "In the modern era" / "In recent years, there has been a growing" — NEVER.
- ⛔ Any broad scene-setting generalisation as a first sentence (e.g. "X has been fundamentally reshaped by Y...") — NEVER. Open with a specific claim, tension, or named evidence.

### BANNED PARAGRAPH CLOSERS:
- ⛔ "...remains essential/crucial/fundamental to X" — NEVER.
- ⛔ "...is therefore of great importance" — NEVER.
- ⛔ "...highlights the importance of Z" — NEVER.
- ⛔ Any sentence that restates the paragraph's opening claim — NEVER.

- Never use "In conclusion" as a paragraph opener (only as a formal section heading).
- Never begin three consecutive sentences with "The".
- Never restate the previous paragraph's conclusion as the opener for a new paragraph.
- Never write "This essay will..." or "This chapter will..." outside the Introduction chapter.`;

  // In Natural mode, structure is fixed; voice is free
  const structureAuthority = isNaturalMode ? `
## STRUCTURAL GUIDANCE — Natural Mode
The user has confirmed an outline below. Use those headings verbatim — whatever names, numbering, and order they chose. Do not substitute, rename, reorder, merge, or omit any heading the user has set. You may add sub-subheadings (e.g. 2.4.1, 2.4.2) inside any section where the content warrants.

Hard constraints: user's confirmed heading names + numbering + order, citation style/format, word count targets, project context.` : "";

  return `${TERMS_OF_QUALITY}

${printReadyMandate}

${preamble}

${languageLevel}${NO_META_RULE}

${structureAuthority}

## ⚡ PRIME DIRECTIVE — READ FIRST
You are a writer. You ALWAYS write the chapter. You NEVER refuse. You NEVER output "Cannot comply", "I cannot include", compliance explanations, rule summaries, or any meta-commentary. The user sees ONLY chapter content — no preamble, no caveats, no options to choose from, no disclaimers.

## ⚠️ NEVER OUTPUT A CHAPTER TITLE HEADING
The chapter title (e.g. "Chapter 1: Introduction" or "Ch 1 · Introduction") is rendered automatically by the export system. You MUST NOT begin the chapter with \`# Chapter N\`, \`# Ch N\`, \`## Chapter N\`, or any restatement of the chapter title. Begin DIRECTLY with the first numbered section heading (e.g. \`## 1.1 Background to the Study\`). Repeating the chapter title produces a duplicate heading in the final document.

## ⚠️ TABLES MUST BE MARKDOWN — NEVER HTML
Tables MUST be written in Markdown pipe syntax (\`| col | col |\` with a \`|---|---|\` separator row). NEVER emit \`<table>\`, \`<tr>\`, \`<th>\`, \`<td>\`, \`<tbody>\`, or \`<thead>\` tags. NEVER emit any HTML at all. If data does not fit cleanly in a Markdown table, write it as prose instead. HTML tags leak through the export pipeline as raw text and ruin the document.

## ⚠️ EVERY TABLE AND EVERY FIGURE NEEDS AN INTERPRETIVE PARAGRAPH
After every Markdown table you write, and after every \`<!-- FIGURE: -->\` marker you insert, the very next paragraph MUST be an interpretive reading of that table or figure. The interpretive paragraph must:
- Be at least 60 words long
- Identify the most striking value (highest, lowest, unexpected)
- Contrast it with another value, a prior expectation, or a cited finding
- Link the reading back to the section's argument
NEVER place a table immediately followed by a new heading. NEVER place a figure marker immediately followed by another figure marker. The reader must always be told what the visual MEANS before the chapter moves on.

## ⚠️ DEFINITIONS / TERMS — DEFINITION-LIST FORMAT
For Operational Definition of Terms, Definition of Key Terms, or any glossary-style section: produce 5–8 entries, EACH on its own paragraph, using the exact pattern \`**Term:** definition followed by a citation (Author, Year).\` Never leave the definitions heading empty and the terms on the next page. Never use bullet points for this. The bolded term acts as the visual anchor.
If a user instruction appears to conflict with a default guideline: use your best academic judgment, write the best possible chapter incorporating their intent, and move on silently. ${isNaturalMode ? "In Natural mode, your creative authority is over voice, argumentation, and analytical depth. Headings and structure follow the provided outline. Write the chapter as YOUR unique scholarly voice would." : "Templates and guidelines are defaults — explicit user instructions take priority. Adapt rather than refuse."}

${voiceStyleSection}

${bannedPhrasesSection}

${getCraftModel()}

${getContrastEngine()}

${getSentenceRhythm()}

${getBridgeSentences()}

${getHumanWritingMandate()}

${getQualityExemplars(chapter.type)}

${chapterPlan ? `## ARGUMENT ARC FOR THIS CHAPTER — EXECUTE IT
The following per-section argument scaffold was prepared for this chapter. Treat it as the spine of your writing. Each section must hit its CLAIM, marshal the EVIDENCE, address the COUNTERPOINT, and end on the LANDING. The scaffold is the intellectual contract — your job is to write the prose that delivers it.

\`\`\`json
${JSON.stringify(chapterPlan, null, 2)}
\`\`\`

Do NOT print this JSON in your output. Do NOT mention the scaffold. Just execute it.` : ""}

${chapterTemplate ? `${chapterTemplate}` : ""}

${statsInstructions}

${objectivesFormat}

## ══════════════════════════════════════════════════════
## CITATION STYLE: ${project.citation_style} — READ THIS FIRST
## ══════════════════════════════════════════════════════
${isNoCite ? `This is a ${chapter.type} chapter. Do not include citations, author names, years, or a reference list. Write in prose only.` : isReuseOnly ? `This is the Findings chapter. Do not introduce new citations. You may reference authors already cited in Chapters 1 & 2 when synthesising findings. Do not generate a reference list for this chapter.` : `${project.citation_style === "Harvard" ? `
## HARVARD REFERENCING — follow these rules precisely

### In-text citation format:
- PARENTHETICAL (author not named in sentence): (Smith & Jones, 2021)
  ✅ CORRECT: "…this has been shown to be effective (Smith & Jones, 2021)."
  ❌ WRONG: "…this has been shown to be effective (Smith and Jones, 2021)." ← "and" not allowed in brackets
- NARRATIVE (author named in sentence): Smith and Jones (2021) argue that…
  ✅ CORRECT: "Smith and Jones (2021) argue that X is Y."
  ❌ WRONG: "Smith & Jones (2021) argue that X is Y." ← "&" not allowed outside brackets
- 1 author: (Smith, 2021) or Smith (2021)
- 2 authors: (Smith & Jones, 2021) or Smith and Jones (2021)
- 3+ authors: (Smith et al., 2021) or Smith et al. (2021)
- Multiple citations in one bracket: (Jones, 2019; Smith, 2021; Brown, 2023) — chronological, semicolons
- Direct quotes: (Smith, 2021, p. 45) or Smith (2021, p. 45) states "…"

### Reference list format (Harvard):
Author, A.B. (Year) *Title of article*. *Journal Name*, Volume(Issue), pp. XX–XX.
For books: Author, A.B. (Year) *Title of Book*. Edition. Place: Publisher.
For websites: Author, A.B. (Year) *Title of page*. Available at: https://specific-url [Accessed: ${currentDate}].
- List alphabetically by first author surname
- Do NOT number the references
- Year immediately after author name in brackets
- Do NOT use "Retrieved from" — use "Available at:"` : ""}
${project.citation_style === "APA 7th" ? `
## APA 7th REFERENCING — STRICT RULES
- In-text: (Author, Year) or Author (Year). Two authors: (Smith & Jones, 2021) in brackets, "Smith and Jones (2021)" in text.
- 3+ authors: (Smith et al., 2021) from first citation.
- Multiple sources: (Brown, 2020; Smith, 2021) — alphabetical by first author.
- Quotes: (Author, Year, p. XX).
- Reference list — alphabetical, hanging indent:
  Author, A. B. (Year). Title of article. *Journal Name*, *Volume*(Issue), pp–pp. https://doi.org/xxxxx
  For no DOI: Retrieved from https://specific-page-url` : ""}
${project.citation_style === "Vancouver" ? `
## VANCOUVER REFERENCING — STRICT RULES
- Number all citations in ORDER OF FIRST APPEARANCE: [1], [2], [3]…
- Use superscript OR square brackets — pick one style and be CONSISTENT
- Same source = same number throughout.
- Reference list NUMBERED in order of appearance:
  1. Author AB, Author CD. Title of article. Journal Abbrev. Year;Volume(Issue):pages.
  2. Author EF. Title of Book. Place: Publisher; Year.
  For websites: [Accessed ${currentDate}]. Available from: https://specific-url` : ""}
${project.citation_style === "IEEE" ? `
## IEEE REFERENCING — STRICT RULES
- Number all citations in ORDER OF FIRST APPEARANCE using square brackets: [1], [2], [3]
- Same source = same number throughout.
- Reference list NUMBERED in order of first citation:
  [1] A. Author, "Title of article," *Journal Name*, vol. X, no. Y, pp. ZZ–ZZ, Month Year.
  [2] A. Author, *Title of Book*. City: Publisher, Year.
  [3] A. Author. (Year). Title. [Online]. Available: https://specific-url. [Accessed: ${currentDate}]` : ""}
${project.citation_style === "MLA 9th" ? `
## MLA 9th REFERENCING — STRICT RULES
- In-text: (Author Page) — e.g., (Smith 45) or Smith argues (45)
- No year in in-text citation
- Works Cited list — alphabetical:
  Author, First. "Article Title." *Journal*, vol. X, no. Y, Year, pp. ZZ–ZZ, DOI or URL. Accessed ${currentDate}.` : ""}
${project.citation_style === "Chicago (Author-Date)" ? `
## CHICAGO AUTHOR-DATE REFERENCING — STRICT RULES
- In-text: (Author Year, page) — e.g., (Smith 2021, 45) or Smith (2021) argues…
- Two authors: (Smith and Jones 2021) — use "and" NOT "&"
- 3+ authors: (Smith et al. 2021)
- Reference list — alphabetical:
  Author, First. Year. "Article Title." *Journal* Volume (Issue): pages. https://doi-or-url.` : ""}
${project.citation_style === "OSCOLA" ? `
## OSCOLA REFERENCING — STRICT RULES
- Footnote citations (numbered superscripts in text, full citation in footnote)
- Subsequent references to same source: ibid. or short-form (Author, Short Title (Year) page)
- Cases: *Case Name* [Year] Court Abbreviation Report page.
- Legislation: Legislation Title Year (jurisdiction).
- Journal articles: Author, 'Title' (Year) Volume(Issue) Journal Abbreviation First page.
- Books: Author, *Title* (Edition, Publisher Year) page.` : ""}

### Citation Integrity Rules (ALL styles):
1. Every in-text citation MUST have a matching reference list entry.
2. Every reference entry MUST be cited in-text.
3. NEVER fabricate DOI numbers — only include https://doi.org/xxxxx if you are confident the DOI exists.
4. For websites: use the SPECIFIC PAGE URL, not the homepage.
5. Add "Accessed: ${currentDate}" or equivalent for all online sources.
6. Total sources: EXACTLY ${p.totalSources || 18} (±2). Count before finishing.
7. Citation density: ${p.minPerThousand && p.minPerThousand !== "System default" ? p.minPerThousand : "2–4"} per 1,000 words.
${sourceTypeDistribution.length > 0 ? `8. Source type distribution:\n${sourceTypeDistribution.map((s: string) => `   • ${s}`).join("\n")}` : ""}
- Empirical evidence level: ${empiricalLevel}
- Seminal works: ${seminalWorks}
- Year range: ${yearStart}–${yearEnd}
- FINAL SELF-CHECK: (1) citation↔reference parity, (2) ${project.citation_style} format correct, (3) online sources have specific URLs + access date.`}

${!includeHypotheses ? `## Hypotheses — disabled for this project
The user has not enabled hypotheses. By default, do not include H1/H2/H3 numbered hypotheses. If the user explicitly requests them in their instructions, use judgment.` : ""}

${chapter.type === "literature_review" ? `## Literature Review — content guidelines (apply silently, adapt if user requests otherwise)
By default, the Literature Review focuses on existing scholarship only. Avoid including:
- Research objectives or "To examine / To identify" goal statements (these belong in Ch 1)
- Research questions (Ch 1)
- Description of your own data collection or sampling method (Ch 3)
- Discussion of your own collected data or results (Ch 4)
- Conclusions or recommendations (Ch 5)
- Sentences like "This study will…" or "This researcher intends to…"
Focus on: synthesising existing literature, identifying themes, presenting the theoretical/conceptual framework, identifying the research gap.
Write as many thematic sections as the topic genuinely requires — do not cap at 3 themes if more are needed.` : ""}

${chapter.type === "methodology" ? `## Methodology — content guidelines (apply silently, adapt if user requests otherwise)
By default: describe your research DESIGN — not results or data not yet collected. Avoid presenting findings or participant responses (Ch 4). Avoid tables unless the user explicitly requested one. Avoid listing research objectives as numbered items (Ch 1). If the user's personalisation or notes request something different, incorporate it.` : ""}

${notes ? `## Revision instructions — incorporate fully
This chapter is being revised. Follow the user's revision notes below. For sections not mentioned, preserve existing content. Incorporate the user's instructions directly — do not explain what you're doing, just write.
Defaults: preserve existing headings and structure unless the notes ask for changes. Do not add hypotheses unless enabled. Do not add research objectives to chapters other than Ch 1.` : ""}

## DYNAMIC WRITING AUTHORITY — read carefully
You are a skilled academic writer with full authority to produce high-quality, original dissertation content. Exercise that authority:
- **Headings come from the user's confirmed outline** — use them verbatim, in the order and with the names the user set. If the user kept the standard names (e.g. "1.1 Background to the Study", "2.4 Empirical Review", "3.7 Method of Data Analysis"), use them. If they renamed or reordered them, honour that exactly.
- **Subheadings within sections may be specific and topic-relevant**: e.g. inside "2.4 Empirical Review" you may create subheadings like "2.4.1 Digital Marketing and Consumer Trust in Post-Pandemic Retail Environments". Parent headings stay as the user wrote them.
- **Literature Review separates Conceptual Framework from Theoretical Framework**: 2.2 Conceptual Framework defines and clarifies core constructs; 2.3 Theoretical Framework discusses theories/models that underpin the research. These are distinct canonical sections — never merge them.
- **Thematic depth lives in subheadings**: each thematic discussion under "2.4 Empirical Review" must centre on a distinct debate, concept, or empirical strand — but the parent heading stays canonical.
- **Writing must be unique and project-specific**: every paragraph must engage directly with the title, field, objectives, and context of THIS project. Generic academic filler (e.g. "This chapter reviews the literature on X" without follow-through) is not acceptable.
- **Depth over breadth**: develop each argument fully with evidence, critical analysis, and synthesis — do not skim over points to meet section count.
- Templates and structural guidance are defaults; your judgment about what makes this chapter excellent takes priority.

${chapter.type === "literature_review" ? `## Literature Review — Conceptual vs. Theoretical (CRITICAL DISTINCTION)
- **Conceptual Definitions section**: Define and clarify the core constructs of the study (e.g. "digital marketing", "consumer behaviour", "trust") using academic literature. Discuss how scholars have defined these concepts, where definitional debates exist, and which definition this study adopts.
- **Theoretical Framework section**: Discuss the specific theories and theoretical models (e.g. TAM, Social Learning Theory, Resource-Based View) that inform the study's design and analysis. Explain why each theory was selected and how it relates to the research objectives.
These two sections serve different functions and must NOT be merged into one.` : ""}

## MANDATORY: USE REAL, VERIFIABLE ACADEMIC SOURCES
- Every author cited MUST be a real scholar who publishes in the relevant field — verifiable on Google Scholar
- Every journal MUST be a real, peer-reviewed journal (e.g. Journal of Business Research, The Lancet, Academy of Management Review)
- Every article/book title MUST be a real publication that can be found on Google Scholar or Google — NEVER invent or fabricate a title
- Do NOT cite publications dated after ${currentDate.split("-")[0]}
- DO NOT invent DOI numbers — only include a DOI URL if you are certain it exists
- DO NOT use placeholder citations like "[Author, Year]", "[Surname, YYYY]", or "Author (Year)" without knowing the real source
- If you are uncertain whether a specific paper exists: do NOT cite it. Rephrase the claim as general academic knowledge without a citation, or omit the claim entirely.
- Prefer widely cited, verifiable researchers (e.g. Creswell, Saunders, Bryman, Hair, Kothari, Patton, Strauss, Bandura, Vygotsky, etc.)
- SELF-CHECK before writing the reference list: every entry must be a source you are CERTAIN is real and findable online

## Research Objectives & Questions — Preserve Exactly
The research objectives and questions below were set by the researcher. Reference them EXACTLY as written — do NOT paraphrase, reorder, rename, combine, or add new objectives.
If only ONE objective is listed: write the chapter around that single objective only. Do NOT generate additional objectives.
If the researcher has provided their own objectives/questions in the project context, use ONLY those — never substitute your own.

## QUALITY CHECKS — apply between sections while writing
After each section, silently verify: content fits this chapter type; cited authors are real; reference list will appear once at the end; no sections skipped. Correct any issues inline and continue writing.

## Structure
- Use numbered heading hierarchy: Chapter N → N.1 → N.1.1 → N.1.1.1
- Each section under a heading must contain substantive content — no single-sentence sections.
- Ensure logical flow between sections with implicit transitions (not mechanical connectors).
- Line spacing: ${lineSpacing}
- Table caption position: ${captionPosition}
- Table source format: ${sourceFormat}

# PROJECT CONTEXT
- Title: "${project.title}"
- Degree: ${project.degree}
- Field: ${project.field_of_study}
- University: ${project.university}
- Methodology: ${project.research_methodology}
- Data Collection: ${project.data_collection_method}
- Sampling: ${project.sampling_technique} (n=${project.sample_size})
- Framework: ${project.research_framework}
${project.framework_justification ? `- Framework Justification: ${project.framework_justification}` : ""}
- Research Objectives: ${(project.research_objectives || []).filter(Boolean).map((o: string, i: number) => `\n  ${i + 1}. ${o}`).join("")}
- Research Questions: ${(project.research_questions || []).filter(Boolean).map((q: string, i: number) => `\n  ${i + 1}. ${q}`).join("")}
- Citation Style: ${project.citation_style}
- Language: ${project.language_style}

# CHAPTER TO WRITE
- Chapter Type: ${chapter.type}
- Chapter Title: "${chapter.title}"
- Target Word Count: **${draftConfig.target_words} words** (BINDING — body content must land between ${Math.floor(draftConfig.target_words * 0.97)} and ${Math.ceil(draftConfig.target_words * 1.03)} words. The References section is outside this count.)
- Minimum empirical evidence/statistics to include: ${draftConfig.stats_count || 5}

## CHAPTER WORD-COUNT DISTRIBUTION — MANDATORY
The user has explicitly allocated ${draftConfig.target_words} words to this chapter. You MUST scale every section in the canonical heading schema proportionally to fit within this total. If the canonical schema would naturally produce a longer chapter, tighten each section's depth without dropping any required heading. If it would produce a shorter chapter, deepen analysis within each section — never invent extra headings to pad length.
${draftConfig.headings?.length > 0
  ? "The user has also confirmed an outline below with explicit per-section word budgets — those overrides take precedence over the canonical defaults."
  : "When no outline overrides are provided, distribute the chapter target across the canonical headings using sensible weighting (background-heavy chapters allocate more to context; methodology chapters allocate more to design and analysis)."}

## HEADING WORD COUNTS — ${isNaturalMode ? "REQUIRED HEADINGS (Natural Mode — use these exact headings, vary voice and depth)" : "USER OVERRIDE"}
If the user has specified custom word counts per heading below, those OVERRIDE any default word counts in the template. Follow user heading word counts exactly.

${draftConfig.headings?.length > 0 ? `## Required Headings — BINDING per-section budgets (use these exact headings in order${isNaturalMode ? " — you may add subheadings within each section" : ""}):\n${draftConfig.headings.map((h: any, i: number) => {
  const lo = Math.floor((h.target_words || 0) * 0.9);
  const hi = Math.ceil((h.target_words || 0) * 1.1);
  return `${i + 1}. "${h.text}" — STRICT ${lo}–${hi} words (target ${h.target_words})`;
}).join("\n")}\n\n⚠️ STRICT: Each section MUST land within its ${"±10%"} window. A section more than 10% over its allocation is a contract violation — you MUST move on to the next heading once you reach the upper bound. Use these exact heading titles in order.${isNaturalMode ? " You may generate subheadings within these sections but must NOT rename, reorder, or remove the main headings." : ""}` : ""}

# PERSONALISATION

## Geographic Scope
${effectiveGeoScope !== "Global" ? `Focus the literature and examples specifically on: ${effectiveGeoScope}` : "Global scope — use international literature and examples."}

${contentEmphasis ? `## Content Emphasis\n${contentEmphasis}` : ""}

${selectedTheorists.length > 0 ? `## Key Theorists & Frameworks to Include\n${selectedTheorists.map((t: string) => `- ${t}`).join("\n")}` : ""}

${specificAuthors.length > 0 ? `## Specific Authors to Include\n${specificAuthors.map((a: string) => `- ${a}`).join("\n")}` : ""}

${chapter.type === "introduction" && researchObjectivesText ? `## Research Objectives (user-defined)\n${researchObjectivesText}\nIMPORTANT: List these objectives EXACTLY as provided above — numbered, one per line, no elaboration.` : ""}
${chapter.type === "introduction" && researchQuestionsText ? `## Research Questions (user-defined)\n${researchQuestionsText}\nIMPORTANT: List these questions EXACTLY as provided above — numbered, one per line, no elaboration.` : ""}
${includeHypotheses && hypothesesText ? `## Hypotheses to Include\n${hypothesesText}\nIMPORTANT: List these hypotheses EXACTLY as provided above — numbered (H1, H2, H3…), one per line, no elaboration.` : ""}

${sectionsToInclude.length > 0 ? `## Required Sections\nInclude these sections in the chapter:\n${sectionsToInclude.map((s: string) => `- ${s}`).join("\n")}` : ""}

${chapter.type === "methodology" ? `## Research Philosophy
- Ontology: ${ontology}
- Epistemology: ${epistemology}
- Methodology Depth: ${methodologyDepth}
${customSamplingDesc ? `- Custom sampling description: ${customSamplingDesc}` : ""}
${instrumentGenerate !== "No" ? `\n## Instrument Generation\nGenerate a ${instrumentGenerate.replace("Yes — ", "")} as an appendix section at the end of the chapter.` : ""}` : ""}

${analysisMethods.length > 0 ? `## Quantitative Analysis Methods — MANDATORY
You MUST perform and report results for EACH of these analyses. Omitting any selected method is a FAILURE.
${analysisMethods.map((a: string) => `- ${a}: You MUST present this test, report exact statistics (test statistic, df, p-value, effect size), and include a results table`).join("\n")}
Each method above MUST have its own dedicated subsection with at minimum: (1) a description of the test performed, (2) exact statistical values, (3) a Markdown table of results.` : ""}

${qualMethods.length > 0 ? `## Qualitative Analysis Methods — MANDATORY
You MUST perform and report results for EACH of these analyses. Omitting any selected method is a FAILURE.
${qualMethods.map((a: string) => `- ${a}: You MUST present this analysis with themes/codes identified, participant quotes, and a summary table`).join("\n")}
Each method above MUST have its own dedicated subsection with at minimum: (1) description of the analytical process, (2) key themes/findings with supporting quotes, (3) a summary table.` : ""}

${[...software, ...(customSoftware ? [customSoftware] : [])].length > 0 ? `## Analysis Software\nReference the use of: ${[...software, ...(customSoftware ? [customSoftware] : [])].join(", ")}` : ""}

${visualizations.length > 0 ? `## Visualisations to Reference\nInclude references to or descriptions of these chart/table types:\n${visualizations.map((v: string) => `- ${v}`).join("\n")}
${chapter.type === "findings" ? `\nFor each analysis, present results in a structured format with:
1. A descriptive table (with caption using "${tableNumbering.replace("…", "")}" numbering)
2. Statistical test results with exact values (χ², p, OR, CI, etc.)
3. Reference to the corresponding chart type (using "${figureNumbering.replace("…", "")}" numbering)
- Colour scheme for charts: ${chartColourScheme}
- Chart complexity: ${chartComplexity}
- Chart resolution: ${chartResolution}
${chartBWFallback ? "- Ensure all charts are also readable in black & white print." : ""}
${significanceAsterisks ? "- Include significance asterisks (* p<.05, ** p<.01, *** p<.001)" : ""}
${confidenceIntervals ? "- Include 95% CIs in all regression tables" : ""}
${boldSignificant ? "- Bold statistically significant results" : ""}
${standardisedBeta ? "- Include standardised (β) alongside unstandardised (B) coefficients" : ""}
${vifValues ? "- Include VIF values for multicollinearity assessment" : ""}
${nAnnotation ? "- Include n= annotation on each chart" : ""}` : ""}` : ""}

${chapter.type === "findings" && mixedMethodsApproach && mixedMethodsApproach !== "Not applicable — single method" ? `## Mixed Methods Integration
- Approach: ${mixedMethodsApproach}
${includeTriangulation ? "- Include a triangulation matrix / integration summary" : ""}
${includeQuoteTables ? "- Include participant quote tables alongside quantitative results" : ""}` : ""}

${chapter.type === "abstract" ? `## Abstract Format
- Type: ${abstractType}
- Target word count: ${abstractTargetWC}
${includeKeywords ? "- Include 5 keywords below the abstract" : ""}
${dualLanguage ? "- Include a dual-language version" : ""}
${includeWCDeclaration ? "- Include word count declaration" : ""}

## ABSOLUTE ABSTRACT RULES — ANY VIOLATION INVALIDATES THE ABSTRACT:
- NO in-text citations (no author names, no years, no numbered references of any kind)
- NO reference list at the end
- NO tables (express data as prose)
- NO figures, charts, or graphical content
- NO footnotes or endnotes
- MUST be a single cohesive prose section following the ${abstractType} structure
- Word count is STRICTLY ±1% of ${abstractTargetWC} — count every word before finalising` : ""}

${draftConfig.analysis_types?.length > 0 ? `## Additional Analysis Types: ${draftConfig.analysis_types.join(", ")}` : ""}
${draftConfig.uploaded_data ? `## User-Provided Data (READ IN FULL — every row matters):\n\`\`\`\n${draftConfig.uploaded_data.substring(0, 400000)}\n\`\`\`\nAnalyse this data end-to-end and incorporate findings into the chapter. Do NOT skim — every row, column, and figure is in scope.` : ""}
${draftConfig.visual_instructions ? `## Figures and Tables to Include IN THIS CHAPTER
The user has requested the following visuals be incorporated into THIS specific chapter only. For each one:
- For tables: write a FULL Markdown table with realistic data at the appropriate section
- For images/figures: insert a [Space for Figure X.X: description] placeholder with bold title and italic description
Do NOT include visuals meant for other chapters. Only include what is listed below:
${draftConfig.visual_instructions}` : ""}
${(() => {
  const ss = draftConfig.style_settings || {};
  const hints: string[] = [];
  if (ss.paragraph_length === "Short (3–5 sentences)") hints.push("Keep paragraphs short — 3 to 5 sentences each.");
  else if (ss.paragraph_length === "Long (8–12 sentences)") hints.push("Use long, developed paragraphs of 8–12 sentences each.");
  if (ss.evidence_style === "Heavy citation density") hints.push("Cite frequently — aim for a citation every 2–3 sentences.");
  else if (ss.evidence_style === "Light citation density") hints.push("Cite sparingly — only for direct quotes and key claims.");
  if (ss.transition_style === "Explicit signposting") hints.push("Use explicit signposting phrases between sections (e.g. 'As discussed above…', 'Turning to…').");
  else if (ss.transition_style === "Minimal transitions") hints.push("Keep transitions minimal and unobtrusive.");
  if (ss.sentence_complexity === "Simple") hints.push("Favour shorter, simpler sentences for clarity.");
  else if (ss.sentence_complexity === "Complex") hints.push("Use complex, multi-clause sentences appropriate for advanced academic writing.");
  if (ss.output_language_variant === "American English") hints.push("Use American English spelling and conventions throughout.");
  else if (ss.output_language_variant === "Australian English") hints.push("Use Australian English spelling and conventions throughout.");
  return hints.length > 0 ? `## User Style Preferences\n${hints.map(h => `- ${h}`).join("\n")}` : "";
})()}

${notes ? `# REVISION INSTRUCTIONS
${notes}
Incorporate all of the above into the chapter. Write the chapter directly — no explanations or preamble.` : ""}
${pastedInstructions ? `# USER INSTRUCTIONS
${pastedInstructions}
Incorporate the above into the chapter. Write the chapter directly — no explanations or preamble.` : ""}

# OUTPUT FORMAT
Write the chapter in Markdown format. Use ## for main headings, ### for sub-headings, #### for sub-sub-headings. Begin writing immediately — first line is chapter content.

## WORD COUNT — STRICT CONTRACT (NON-NEGOTIABLE)
- Body target: EXACTLY ${draftConfig.target_words} words. Hard floor: ${Math.floor(draftConfig.target_words * 0.97)}. Hard ceiling: ${Math.ceil(draftConfig.target_words * 1.03)}.
- The References section is OUTSIDE this count.
- Per-heading allocations listed above are BINDING (±10%). When a section reaches its upper bound, you MUST move on — even if you have more to say.
- **Section-by-section budget discipline.** Track word spend mentally as you write each section. If you sense a section is running over its ±10% window, compress the remaining sentences of THAT section (shorter phrasing, fewer qualifiers, merged points) before moving to the next heading. NEVER output a second version of a section. NEVER print word counts. One pass — one version — internally calibrated.
- Running ledger you MUST track INTERNALLY (never printed) as you write:
  · After section 1 of N: spent ≤ ${Math.ceil(draftConfig.target_words / Math.max(1, draftConfig.headings?.length || 5) * 1.05)} words
  · After section k of N: spent ≤ k × (target / N) × 1.10 words
  · Final section: lands within ±3% of ${draftConfig.target_words}
- If you find yourself at 70% of target with sections remaining, COMPRESS each remaining section.
- If you find yourself at 30% of target with one section to go, DEEPEN — never pad with filler.
- Never stop mid-section. Never add summary trailers, audit notes, or post-conclusion remarks.
- VIOLATION: Body that exceeds ${Math.ceil(draftConfig.target_words * 1.03)} words OR falls below ${Math.floor(draftConfig.target_words * 0.97)} words is a CRITICAL FAILURE.
${isNoCite || isReuseOnly ? "\nDo NOT include a reference list at the end of this chapter." : `
## MANDATORY: Reference List — EXACTLY ONE — AT THE VERY END
⚠️ CRITICAL RULE: The ## References section MUST be the ABSOLUTE LAST thing in the chapter.
- Write ALL body content FIRST — every single section must be fully completed before you even begin thinking about references
- After ALL body sections are complete and you have written the full target word count of BODY content, THEN and ONLY THEN add ONE "## References" section
- NEVER start writing ## References before all body sections are complete
- If you feel you are running out of space: KEEP WRITING BODY CONTENT. The reference list does NOT count toward word count.
- This MUST be the ONLY reference list in the chapter — do NOT include partial reference lists mid-chapter
- The heading must be exactly: ## References
- List ALL cited sources in ${project.citation_style} format
- References do NOT count toward the word count
- For online sources: include specific URL + "Accessed: ${currentDate}"
- Ensure EVERY in-text citation has a matching entry and vice versa
- ⛔ VIOLATION: Any text appearing AFTER the ## References section. Nothing should follow the reference list.`}

${(chapter.type !== "abstract" && chapter.type !== "conclusion") ? `## MANDATORY: Tables
${chapter.type === "methodology" ? "For Methodology chapters: DO NOT include tables unless the user has explicitly requested one in their revision notes or personalisation settings." : `You MUST use proper Markdown tables (using | column | syntax) for:
- Demographic data (e.g., respondent profiles, gender/age breakdown)
- Statistical test results (e.g., regression output, correlation matrices, chi-square results)
- Summary of findings per objective/hypothesis
- Likert-scale frequency distributions
- Any data that is best presented in tabular form`}

Example table format:
| Variable | Mean | SD | t | p |
|----------|------|------|-------|-------|
| Satisfaction | 4.12 | 0.89 | 3.45 | .001 |

Every table MUST have a caption above it (e.g., **Table 4.1: Demographic Profile of Respondents**).
All text in the chapter must be written in justified alignment style — full formal academic prose.

## Charts and Visualisations — Inline Figure Markers (MANDATORY when user enabled figures)
The user has enabled figure generation for this chapter. You MUST emit figure markers — NEVER substitute a Markdown table for a figure that the user requested. Tables and figures are different artefacts; both can coexist.

For each figure/chart/graph, insert this EXACT marker on its own line (no other content on that line):

<!-- FIGURE:4.1:Distribution of Respondents by Age Group:Bar chart showing frequency distribution across age categories 18-24 (n=45), 25-34 (n=78), 35-44 (n=52), 45+ (n=31) -->

The marker format is: <!-- FIGURE:{number}:{title}:{detailed description with exact data values} -->

Rules for figure markers:
1. Each marker MUST be on its own line — never inline within a paragraph.
2. The description MUST include specific data values, axis labels, chart type, and sample size.
3. Use the chapter number prefix for figure numbering (e.g., 4.1, 4.2 for Chapter 4).
4. Include 1-3 figure markers in findings chapters, 1 in literature chapters where appropriate.
5. Do NOT also write [Space for Figure X.X] — the marker replaces that entirely.
6. Do NOT replace a figure with a table — render the figure marker AND any related table separately.
7. Tables remain as full Markdown pipe tables (not markers). Figures are the marker. Both have captions.` : `## No Tables, Figures, or Charts in this chapter
This chapter type uses prose only — no Markdown tables, figure placeholders, chart code blocks, or image references. All content in paragraph form.`}

${chapter.type === "conclusion" ? `## Chapter 5 — default style
Prose paragraphs only: no tables, figures, charts. Use only the headings in the outline above. Reference findings from earlier chapters without introducing new citations unless directly needed. Refer to objectives in prose ("the first objective examined…") rather than numbered lists.` : ""}

IMPORTANT: Write the COMPLETE chapter. Do NOT stop before reaching the target word count. If you are running low on space, do NOT skip sections — write them all.

${!isNoCite && !isReuseOnly ? `## REFERENCE COUNT — FINAL CHECK (HARD REQUIREMENT)
FINAL STEP before outputting: Count your unique references in the ## References section.
- Target: EXACTLY ${p.totalSources || 18} (±2) unique sources.
- If fewer than ${(p.totalSources || 18) - 2}, add more relevant sources until the target is met.
- If more than ${(p.totalSources || 18) + 2}, remove the least relevant excess sources.
- This is a HARD requirement — failure to meet the count is unacceptable.` : ""}

${draftConfig.previousChaptersContext ? `# CONTEXT FROM PREVIOUS CHAPTERS
You are writing a sequential dissertation. Here is what has already been written in earlier chapters. Use this context to:
- Maintain consistency in arguments, terminology, and theoretical framing
- Reference earlier points naturally (e.g., "As established in Chapter 1…")
- Avoid repeating content that was already covered
- Build on arguments progressively
- Ensure findings chapter discusses results in context of the literature review

${draftConfig.previousChaptersContext}` : ""}

## FINAL WORD-COUNT REMINDER (RE-READ BEFORE WRITING)
- Body floor: ${Math.floor(draftConfig.target_words * 0.97)} words. Body ceiling: ${Math.ceil(draftConfig.target_words * 1.03)} words. References excluded.
- Per-heading windows are listed in the Required Headings section above and are BINDING (±10%).
- The final sentence of the last body section is your stopping point. Do NOT add summary trailers, "in conclusion" wrap-ups, audit notes, or "I have…" debriefs.

${!isNoCite && !isReuseOnly ? `## FINAL CITATION REMINDER (ALL MODELS — READ CAREFULLY)
This is your LAST instruction before writing. You MUST:
1. Use ${project.citation_style} format for EVERY citation — no exceptions
2. Every in-text citation format MUST match the style rules above EXACTLY
3. The ## References section format MUST match ${project.citation_style} conventions EXACTLY
4. Count: EXACTLY ${p.totalSources || 18} unique sources (±2)
5. Year range: ${yearStart}–${yearEnd} only
6. EVERY cited source must appear in References. EVERY References entry must appear in-text.
Failure to follow these rules invalidates the entire chapter.` : ""}

Begin writing the chapter now.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { project, chapter, draftConfig, modelId, continuation, chapterPlan } = await req.json();

    if (!project || !chapter || !draftConfig) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: project, chapter, draftConfig" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_AI_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Server-side tier lock + admin bypass ──
    let resolvedModel = resolveModel(modelId);
    let userTier = "free";
    let userEmail: string | null = null;
    let userIdResolved: string | null = null;
    {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
        if (supabaseUrl && supabaseKey) {
          try {
            const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
              headers: { Authorization: authHeader, apikey: supabaseKey },
            });
            if (userResp.ok) {
              const userData = await userResp.json();
              const userId = userData?.id;
              userEmail = userData?.email ?? null;
              userIdResolved = userId ?? null;
              if (userId) {
                const { data: sub } = await createClient(supabaseUrl, supabaseKey)
                  .from("subscriptions").select("tier").eq("user_id", userId).maybeSingle();
                if (sub?.tier) userTier = String(sub.tier).toLowerCase();
              }
            }
          } catch (e) {
            console.warn("tier lookup failed (non-fatal):", e);
          }
        }
      }
    }

    const isAdmin = !!userEmail && userEmail.toLowerCase() === "grey.izilein@gmail.com";
    // Admin always reads as PhD tier internally — full Claude + thinking access.
    if (isAdmin) userTier = "phd";

    // Hard lock: free tier (non-admin) never uses paid models — only Flash.
    // Admin bypasses this lock entirely and honours the picked model.
    if (!isAdmin && (userTier === "free" || userTier === "none")) {
      resolvedModel = "gemini-2.5-flash";
    }

    // If the user didn't explicitly pick a model, upgrade paid tiers (and admin) to Claude.
    if (!modelId && (isAdmin || (userTier !== "free" && userTier !== "none"))) {
      resolvedModel = CLAUDE_MODEL;
    }

    // Tier-gate explicit model picks: if a user picks a model their tier doesn't
    // permit, downgrade silently to Gemini 2.5 Flash. Admin bypasses.
    if (!isAdmin && modelId) {
      const allowed = TIER_ACCESS[modelId];
      if (allowed && !allowed.includes(userTier)) {
        console.warn(`[generate-chapter] tier ${userTier} blocked from ${modelId}; using Gemini 2.5 Flash`);
        resolvedModel = "gemini-2.5-flash";
      }
    }

    // ── Routing decision log (no secrets) ──
    console.log(
      `[generate-chapter] user=${userEmail || "anon"} tier=${userTier} admin=${isAdmin} ` +
      `requested=${modelId || "(none)"} resolved=${resolvedModel}`
    );



    // ── Map-reduce summarisation for oversized uploaded data ──
    // If the user pasted a 300-page PDF or massive CSV, we previously truncated
    // at 80k chars (≈ 12k words). Now: chunk → Gemini Flash summarise → stitch
    // head + summarised middle + tail so the writer has semantic access to the
    // ENTIRE document, not just the opening pages.
    if (typeof draftConfig.uploaded_data === "string" && draftConfig.uploaded_data.trim().length > 0) {
      try {
        const mr = await summariseLargeText(draftConfig.uploaded_data, {
          apiKey: LOVABLE_API_KEY,
          label: `chapter-${chapter.type}-uploaded_data`,
          totalBudgetMs: isAdmin ? 180_000 : 90_000,
        });
        draftConfig.uploaded_data = mr.text;
        if (mr.wasSummarized) {
          console.log(
            `[generate-chapter] uploaded_data map-reduced: ${mr.originalWords} → ${mr.finalWords} words across ${mr.chunkCount} chunk(s) (${mr.chunksSummarized} summarised, ${mr.chunksFallback} fallback).`,
          );
        }
      } catch (e) {
        console.warn("[generate-chapter] uploaded_data summarisation failed (using raw):", e);
      }
    }

    let systemPrompt = buildSystemPrompt(project, chapter, draftConfig, chapterPlan);

    // ── Pre-fetch real academic sources for ALL models (universal web source verification) ──
    const isNoCite = chapter.type === "conclusion" || chapter.type === "abstract";
    const isReuseOnly = chapter.type === "findings";
    if (!isNoCite) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
        if (supabaseUrl && supabaseKey) {
          const sourcesResp = await fetch(`${supabaseUrl}/functions/v1/search-academic-sources`, {
            method: "POST",
            headers: { Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              topic: `${project.title} ${project.field_of_study}`,
              field: project.field_of_study,
              degree: project.degree,
              count: 14,
            }),
          });
          if (sourcesResp.ok) {
            const { sources } = await sourcesResp.json();
            if (sources && sources.length > 0) {
              const sourceList = sources.map((s: any) =>
                `- ${s.authors} (${s.year}). "${s.title}". ${s.journal}.${s.url ? ` Available at: ${s.url}` : ""}`
              ).join("\n");
              systemPrompt += `\n\n## Web-Verified Academic Sources — Prioritise These\nThe following sources have been retrieved from Google Scholar and are verified as real and findable online. Prioritise citing these where relevant:\n${sourceList}\n\nYou may also cite other sources you are CERTAIN are real. NEVER fabricate sources.`;
            }
          }
        }
      } catch (e) {
        console.error("Source search (non-fatal):", e);
      }
    }

    // ── Inject Zotero citations for chapters that need references ──
    if (!isNoCite && !isReuseOnly) {
      try {
        const query = `${project.field_of_study || ""} ${project.title || ""}`.trim();
        const zoteroItems = await fetchZoteroItems(query, 50);
        if (zoteroItems.length > 0) {
          const zoteroContext = formatCitationsForPrompt(zoteroItems, project.citation_style || "Harvard");
          systemPrompt += `\n\n${zoteroContext}`;
        }
      } catch (e) {
        console.error("Zotero fetch (non-fatal):", e);
      }
    }

    // Build the user-turn message once — reused across all providers
    const userContent = continuation
      ? (() => {
          const bodyOnly = continuation.existingContent.replace(/^#{1,3}\s+(references?|reference list|bibliography)[\s\S]*/im, "").trim();
          const wrote = (bodyOnly.match(/\b\w+\b/g) || []).length;
          const remaining = Math.max(continuation.remainingWords, 0);
          const ceiling = Math.ceil(remaining * 1.05);
          return `Continue writing the "${chapter.title}" chapter from EXACTLY where the previous generation stopped. Here is the body content written so far (references section stripped — you will add ONE at the end):\n\n---BEGIN EXISTING CONTENT---\n${bodyOnly.slice(-6000)}\n---END EXISTING CONTENT---\n\nContinue writing from EXACTLY where this left off. Do NOT repeat ANY content already written. Do NOT rewrite headings or sections that already exist.\n\n## STRICT WORD-COUNT CONTINUATION CONTRACT\n- You have written ${wrote} of ${draftConfig.target_words} body words.\n- Your continuation MUST add EXACTLY ${remaining} more body words (±5%, hard ceiling ${ceiling}).\n- Every required heading from the outline that is not yet present MUST appear in this continuation.\n- If a sentence was cut off mid-way, complete it first before continuing.\n- Do NOT exceed the ceiling. Do NOT stop short of the floor with sections still missing.\n\nMaintain the same style, tone, heading hierarchy, and citation format.\n\nIMPORTANT: Do NOT add a ## References section mid-chapter. Add EXACTLY ONE ## References section at the very end, after ALL body content is complete.`;
        })()
      : `Write the complete "${chapter.title}" chapter for this ${project.degree} dissertation on "${project.title}".

WORD COUNT — STRICT: ${draftConfig.target_words} body words (floor ${Math.floor(draftConfig.target_words * 0.97)}, ceiling ${Math.ceil(draftConfig.target_words * 1.03)}). Per-heading windows in the system prompt are BINDING (±10%).

REMEMBER (the system prompt is the contract; this is just a checklist):
1. Every paragraph follows the four-move structure: Claim → Evidence chain → Counterpoint/hinge → Interpretive landing.
2. Every paragraph contains at least one rhetorical hinge (however / yet / what was once… / this complicates / the divergence is instructive).
3. Sentence rhythm varies — no three consecutive sentences of similar length. At least one sentence under 12 words and one over 28 words per paragraph.
4. Sections bridge to each other: the closing sentence of section N gestures toward section N+1.
5. Numbers serve argument, never the other way around.
6. Literature Review chapters: NO research objectives, questions, hypotheses, or methodology descriptions.
7. Methodology chapters: NO tables (unless explicitly requested), NO collected data.
8. Research objectives/questions/hypotheses appear ONLY in Chapter 1, as a numbered list (1, 2, 3 or H1, H2, H3), one per line.
9. Follow ${project.citation_style} format exactly. Every in-text citation matches an entry in the References section.
10. Exactly ONE ## References section at the very end. All cited authors and journals must be real and verifiable.
11. ⛔ NEVER use: "Furthermore,", "Moreover,", "Additionally,", "It is important to note", "This demonstrates", "This highlights", "In today's world", "In the modern era", or any banned phrase from the system prompt. These are AI fingerprints that fail the output.
12. ⛔ NEVER open with a broad scene-setting claim. Start mid-argument or with specific evidence.
13. ⛔ NEVER print word counts. NEVER write "(Word count: X)" anywhere. NEVER write a section twice.`;

    const isClaude = resolvedModel === CLAUDE_MODEL || resolvedModel.startsWith("claude");
    const isQwen = resolvedModel.startsWith("qwen");

    // Resume support: if the client supplies chapter.id and we know the userId,
    // we tee the upstream into the client AND persist incrementally so the user
    // can close the tab / get disconnected and resume from where it left off.
    const canPersist = !!(chapter?.id && userIdResolved);
    const continuationPrefix = continuation?.existingContent
      ? continuation.existingContent.replace(/^#{1,3}\s+(references?|reference list|bibliography)[\s\S]*/im, "").trim() + "\n\n"
      : "";

    // ── Claude branch (Anthropic) ──
    if (isClaude) {
      try {
        const allowThinking = tierAllowsThinking(userTier);
        // Compute a real visible-token budget tied to target_words.
        // Claude generates roughly 0.75 words per token in academic English →
        // budget ~1.5 tokens per target word, plus 30% safety margin for
        // closing paragraphs, references, and any per-section overshoot.
        // For short chapters we shrink the thinking budget so visible-output
        // gets the headroom it needs.
        const targetW = draftConfig.target_words || 3000;
        const visibleTokens = Math.ceil(targetW * 1.5 * 1.3);
        const thinkBudget = allowThinking ? (targetW <= 3000 ? 4000 : 8000) : 0;
        const computedMax = Math.min(64000, thinkBudget + visibleTokens + 2000);
        console.log(`[generate-chapter] → Anthropic ${resolvedModel} thinking=${allowThinking} target=${targetW}w max_tokens=${computedMax} thinkBudget=${thinkBudget}`);
        // Detached upstream abort — independent of req.signal so client tab close
        // does NOT kill generation. Server keeps writing to DB until done.
        const upstreamAbort = new AbortController();
        const claudeResp = await streamAnthropic({
          system: systemPrompt,
          messages: [{ role: "user", content: userContent }],
          model: resolvedModel,
          thinking: allowThinking,
          maxTokens: computedMax,
          thinkingBudget: thinkBudget || undefined,
          temperature: allowThinking ? 1 : ((project.writing_mode === "natural") ? 0.85 : 0.6),
          signal: upstreamAbort.signal,
        });
        logAiUsage({
          userId: project.user_id,
          tier: userTier,
          action: "generate_chapter",
          model: resolvedModel,
          inputText: systemPrompt + userContent,
          outputTokens: Math.ceil((draftConfig.target_words || 3000) * 1.4),
        });
        if (canPersist) {
          return teeAndPersistChapterStream({
            upstream: claudeResp,
            upstreamAbort,
            chapterId: chapter.id,
            userId: userIdResolved!,
            existingDraftConfig: draftConfig,
            model: resolvedModel,
            continuationPrefix,
          });
        }
        return new Response(claudeResp.body, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (e instanceof AnthropicRateLimitError) {
          console.warn(`[generate-chapter] Claude rate-limited (${e.status}) — falling back to GPT-5.2`);
          resolvedModel = "gemini-2.5-flash";
          // fall through to gateway path below
        } else {
          // Auth/quota errors: try GPT-5.2 fallback for paid tiers/admin instead of failing hard.
          const isAuthOrQuota = /401|403|402|429|529|unauthor|forbidden|invalid.*key|api.*key|quota|credit|insufficient/i.test(msg);
          if (isAuthOrQuota && (isAdmin || userTier !== "free")) {
            console.warn(`[generate-chapter] Claude failed (${msg.slice(0, 120)}) — falling back to GPT-5.2`);
            resolvedModel = "gemini-2.5-flash";
            // fall through
          } else {
            console.error("[generate-chapter] Claude error (no fallback):", msg.slice(0, 300));
            return new Response(JSON.stringify({
              error: "Claude generation failed. Please try again or pick a different model.",
              detail: msg.slice(0, 300),
            }), {
              status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }
    }

    // ── Qwen / Google AI branch (with credit-aware fallback) ──
    // If the chosen non-Claude provider returns 402 (credits exhausted),
    // automatically try the next available model so the user isn't stranded.
    // Detached upstream abort for gateway path too — independent of req.signal.
    const upstreamAbortGw = new AbortController();
    async function callGateway(modelToTry: string): Promise<Response> {
      const isQ = modelToTry.startsWith("qwen");
      const url = isQ
        ? "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions"
        : "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
      const key = isQ ? Deno.env.get("DASHSCOPE_API_KEY") : LOVABLE_API_KEY;
      if (!key) throw new Error(isQ ? "DashScope API key not configured." : "AI gateway key not configured.");
      console.log(`[generate-chapter] → ${isQ ? "DashScope" : "Google AI"} model=${modelToTry}`);
      return await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelToTry,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          stream: true,
          temperature: (project.writing_mode === "natural") ? 0.85 : 0.6,
        }),
        signal: upstreamAbortGw.signal,
      });
    }

    // Fallback chain — try resolved model first, then GPT-5.2, then Gemini Flash for paid/admin.
    const fallbackChain: string[] = [resolvedModel];
    if (isAdmin || (userTier !== "free" && userTier !== "none")) {
      if (!fallbackChain.includes("gemini-2.5-flash")) fallbackChain.push("gemini-2.5-flash");
      if (!fallbackChain.includes("gemini-2.5-flash")) fallbackChain.push("gemini-2.5-flash");
    }

    let response: Response | null = null;
    let usedModel = resolvedModel;
    let lastErrorStatus = 0;
    let lastErrorBody = "";
    for (const candidate of fallbackChain) {
      try {
        const r = await callGateway(candidate);
        if (r.ok) { response = r; usedModel = candidate; break; }
        lastErrorStatus = r.status;
        lastErrorBody = await r.text().catch(() => "");
        if (r.status !== 402 && r.status !== 429) {
          // Non-credit error — no point retrying
          console.error(`[generate-chapter] gateway error (${candidate}): ${r.status} ${lastErrorBody.slice(0, 200)}`);
          break;
        }
        console.warn(`[generate-chapter] ${candidate} returned ${r.status} — trying next fallback`);
      } catch (e) {
        console.warn(`[generate-chapter] ${candidate} threw — trying next fallback:`, e);
      }
    }

    if (!response) {
      if (lastErrorStatus === 402) {
        return new Response(
          JSON.stringify({ error: "All available AI providers are out of credits. Please try again later or contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (lastErrorStatus === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "AI generation failed. Please try again.", detail: lastErrorBody.slice(0, 300) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (usedModel !== resolvedModel) {
      console.log(`[generate-chapter] FALLBACK applied: ${resolvedModel} → ${usedModel}`);
    }

    // Log usage (fire-and-forget, estimate tokens from prompt size)
    const inputText = JSON.stringify({ project: project.title, chapter: chapter.title, config: draftConfig.target_words });
    logAiUsage({
      userId: project.user_id,
      tier: userTier,
      action: "generate_chapter",
      model: usedModel,
      inputText: inputText + (systemPrompt || ""),
      outputTokens: Math.ceil((draftConfig.target_words || 3000) * 1.4),
    });

    if (canPersist) {
      return teeAndPersistChapterStream({
        upstream: response,
        upstreamAbort: upstreamAbortGw,
        chapterId: chapter.id,
        userId: userIdResolved!,
        existingDraftConfig: draftConfig,
        model: usedModel,
        continuationPrefix,
      });
    }
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Model-Used": usedModel },
    });
  } catch (e) {
    console.error("generate-chapter error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
