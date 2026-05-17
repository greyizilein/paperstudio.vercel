// Canonical dissertation chapter heading schema.
// Source of truth for both the outline modal (UI) and the writing engine (edge functions).
// The schema in supabase/functions/generate-chapter/templateContent.ts MUST mirror this.

export type DegreeLevel = "ug" | "masters" | "phd";
export type SchemaScope = "all" | "ms_phd" | "phd" | "quant" | "ms_phd_quant";

export interface CanonicalSection {
  num: string;
  title: string;
  scope: SchemaScope;
  /** default % of chapter word count for this section (sums to ~100 within scope) */
  defaultPct: number;
  note?: string;
}

export function normaliseDegree(degree: string | undefined | null): DegreeLevel {
  const d = (degree || "").toLowerCase();
  if (d.includes("phd") || d.includes("doctor") || d.includes("dphil")) return "phd";
  if (d.includes("master") || d.includes("msc") || d.includes("ma ") || d.startsWith("ma") || d.includes("mba") || d.includes("mphil")) return "masters";
  return "ug";
}

export function isSectionApplicable(scope: SchemaScope, level: DegreeLevel, isQuant: boolean): boolean {
  switch (scope) {
    case "all": return true;
    case "ms_phd": return level === "masters" || level === "phd";
    case "phd": return level === "phd";
    case "quant": return isQuant;
    case "ms_phd_quant": return (level === "masters" || level === "phd") && isQuant;
  }
}

// ─── Canonical chapter schemas ──────────────────────────────────────────────
// These are the FIXED main headings. The AI may NOT rename, replace, or reorder them.

export const CANONICAL_SCHEMAS: Record<string, CanonicalSection[]> = {
  introduction: [
    { num: "1.1", title: "Background to the Study", scope: "all", defaultPct: 30 },
    { num: "1.2", title: "Statement of the Problem", scope: "all", defaultPct: 12 },
    { num: "1.3", title: "Aim and Objectives of the Study", scope: "all", defaultPct: 10 },
    { num: "1.4", title: "Research Questions", scope: "all", defaultPct: 8 },
    { num: "1.5", title: "Research Hypotheses", scope: "quant", defaultPct: 8, note: "PhD: Required; UG: Optional" },
    { num: "1.6", title: "Significance of the Study", scope: "all", defaultPct: 10 },
    { num: "1.7", title: "Scope and Delimitations of the Study", scope: "all", defaultPct: 8 },
    { num: "1.8", title: "Operational Definition of Terms", scope: "all", defaultPct: 8, note: "PhD: Extensive; UG: Basic" },
    { num: "1.9", title: "Organization of the Study", scope: "ms_phd", defaultPct: 6 },
  ],
  literature_review: [
    { num: "2.1", title: "Introduction", scope: "all", defaultPct: 5 },
    { num: "2.2", title: "Conceptual Framework", scope: "ms_phd", defaultPct: 18, note: "UG: Optional" },
    { num: "2.3", title: "Theoretical Framework", scope: "ms_phd", defaultPct: 18, note: "UG: Optional / Basic" },
    { num: "2.4", title: "Empirical Review", scope: "all", defaultPct: 40 },
    { num: "2.5", title: "Summary of Literature and Gap Identification", scope: "all", defaultPct: 19, note: "PhD: Critical Emphasis" },
  ],
  methodology: [
    { num: "3.1", title: "Research Design", scope: "all", defaultPct: 14 },
    { num: "3.2", title: "Population of the Study", scope: "all", defaultPct: 11 },
    { num: "3.3", title: "Sample and Sampling Technique", scope: "all", defaultPct: 13 },
    { num: "3.4", title: "Instrument for Data Collection", scope: "all", defaultPct: 14 },
    { num: "3.5", title: "Validity and Reliability of Instrument", scope: "ms_phd", defaultPct: 12, note: "UG: Basic" },
    { num: "3.6", title: "Method of Data Collection", scope: "all", defaultPct: 12 },
    { num: "3.7", title: "Method of Data Analysis", scope: "all", defaultPct: 14 },
    { num: "3.8", title: "Ethical Considerations", scope: "ms_phd", defaultPct: 10, note: "UG: Optional / Brief" },
  ],
  findings: [
    { num: "4.1", title: "Introduction", scope: "all", defaultPct: 5 },
    { num: "4.2", title: "Demographic Data Presentation", scope: "all", defaultPct: 15 },
    { num: "4.3", title: "Analysis of Research Questions", scope: "all", defaultPct: 45 },
    { num: "4.4", title: "Test of Hypotheses", scope: "quant", defaultPct: 20 },
    { num: "4.5", title: "Discussion of Findings", scope: "ms_phd", defaultPct: 15, note: "UG: Often combined with 4.3 / 4.4" },
  ],
  conclusion: [
    { num: "5.1", title: "Summary of Findings", scope: "all", defaultPct: 25 },
    { num: "5.2", title: "Conclusion", scope: "all", defaultPct: 22 },
    { num: "5.3", title: "Recommendations", scope: "all", defaultPct: 25 },
    { num: "5.4", title: "Contribution to Knowledge", scope: "phd", defaultPct: 13, note: "MS: Optional; UG: Not Required" },
    { num: "5.5", title: "Suggestions for Further Studies", scope: "all", defaultPct: 15 },
  ],
  abstract: [
    { num: "—", title: "Problem context, aim, and objectives", scope: "all", defaultPct: 20 },
    { num: "—", title: "Methodology", scope: "all", defaultPct: 20 },
    { num: "—", title: "Key Findings", scope: "all", defaultPct: 40 },
    { num: "—", title: "Conclusion and Contribution", scope: "all", defaultPct: 20 },
  ],
};

export interface CanonicalSectionsOpts {
  /** Whether the study includes formal research hypotheses. Defaults to false. */
  includeHypotheses?: boolean;
}

export function getCanonicalSections(
  chapterType: string,
  methodology: string,
  degree: string,
  opts: CanonicalSectionsOpts = {},
): CanonicalSection[] {
  const sections = CANONICAL_SCHEMAS[chapterType];
  if (!sections) return [];
  const level = normaliseDegree(degree);
  const isQuant = methodology === "Quantitative" || methodology === "Mixed Methods";
  const includeHypotheses = !!opts.includeHypotheses;
  return sections.filter(s => {
    if (!isSectionApplicable(s.scope, level, isQuant)) return false;
    // Suppress hypothesis-specific sections if the study has no hypotheses.
    // Match by canonical title to be unambiguous.
    if (!includeHypotheses) {
      if (s.title === "Research Hypotheses") return false;
      if (s.title === "Test of Hypotheses") return false;
    }
    return true;
  });
}

export function getChapterNumber(chapterType: string): string {
  switch (chapterType) {
    case "introduction": return "1";
    case "literature_review": return "2";
    case "methodology": return "3";
    case "findings": return "4";
    case "conclusion": return "5";
    default: return "";
  }
}

// ─── Approved-bank optional sections ────────────────────────────────────────
// These are STANDARD academic subsections users can add. They are NOT a free-form
// AI invention — they come from a recognised academic vocabulary. The AI may
// recommend a SUBSET of these (filtered by study context) but cannot invent
// brand-new section names that fall outside this bank.

export interface OptionalSectionDef {
  text: string;
  defaultPct: number;
  /** which chapter types this optional section is appropriate for */
  appliesTo: string[];
}

export const OPTIONAL_SECTIONS_BANK: OptionalSectionDef[] = [
  // Introduction
  { text: "Theoretical Framework Overview", defaultPct: 8, appliesTo: ["introduction"] },
  { text: "Contribution to Knowledge", defaultPct: 6, appliesTo: ["introduction"] },
  { text: "Assumptions Underpinning the Study", defaultPct: 4, appliesTo: ["introduction"] },
  { text: "Context and Setting of the Study", defaultPct: 8, appliesTo: ["introduction"] },
  { text: "Relationship Between Chapters", defaultPct: 4, appliesTo: ["introduction"] },

  // Literature Review
  { text: "Historical Evolution of the Field", defaultPct: 10, appliesTo: ["literature_review"] },
  { text: "Policy and Regulatory Context", defaultPct: 8, appliesTo: ["literature_review"] },
  { text: "International and Cross-Cultural Perspectives", defaultPct: 8, appliesTo: ["literature_review"] },
  { text: "Critical Analysis of Methodological Approaches in the Literature", defaultPct: 10, appliesTo: ["literature_review"] },
  { text: "Contradictions and Debates in the Literature", defaultPct: 8, appliesTo: ["literature_review"] },
  { text: "Synthesis and Integration of Themes", defaultPct: 8, appliesTo: ["literature_review"] },

  // Methodology
  { text: "Research Philosophy", defaultPct: 8, appliesTo: ["methodology"] },
  { text: "Research Approach (Deductive/Inductive)", defaultPct: 6, appliesTo: ["methodology"] },
  { text: "Time Horizon", defaultPct: 5, appliesTo: ["methodology"] },
  { text: "Pilot Study and Pre-Testing", defaultPct: 6, appliesTo: ["methodology"] },
  { text: "Software and Analytical Tools", defaultPct: 4, appliesTo: ["methodology"] },
  { text: "Researcher Positionality and Reflexivity", defaultPct: 6, appliesTo: ["methodology"] },
  { text: "Limitations of the Methodology", defaultPct: 5, appliesTo: ["methodology"] },
  { text: "Triangulation Strategy", defaultPct: 5, appliesTo: ["methodology"] },

  // Findings
  { text: "Reliability and Validity of Measures", defaultPct: 6, appliesTo: ["findings"] },
  { text: "Factor Analysis Results", defaultPct: 8, appliesTo: ["findings"] },
  { text: "Mediation / Moderation Analysis", defaultPct: 8, appliesTo: ["findings"] },
  { text: "Sensitivity and Robustness Checks", defaultPct: 6, appliesTo: ["findings"] },
  { text: "Unexpected and Contrary Findings", defaultPct: 6, appliesTo: ["findings"] },
  { text: "Cross-Participant Comparison", defaultPct: 8, appliesTo: ["findings"] },
  { text: "Negative Cases and Disconfirming Evidence", defaultPct: 6, appliesTo: ["findings"] },

  // Conclusion
  { text: "Policy Implications", defaultPct: 8, appliesTo: ["conclusion"] },
  { text: "Managerial Implications", defaultPct: 8, appliesTo: ["conclusion"] },
  { text: "Revised Conceptual Model", defaultPct: 8, appliesTo: ["conclusion"] },
  { text: "Reflexivity and Researcher Positionality", defaultPct: 5, appliesTo: ["conclusion"] },
  { text: "Limitations of the Study", defaultPct: 8, appliesTo: ["conclusion"] },
  { text: "Dissemination Plan", defaultPct: 4, appliesTo: ["conclusion"] },
];

export function getOptionalSectionsForChapter(chapterType: string): OptionalSectionDef[] {
  return OPTIONAL_SECTIONS_BANK.filter(s => s.appliesTo.includes(chapterType));
}
