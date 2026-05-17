// Writing Engine Spec v2 — extracted from PAPERSTUDIO_Writing_Engine_Spec_v2.docx
// These templates are injected verbatim into chapter generation prompts

// ─────────────────────────────────────────────────────────────────────────────
// UNIFIED HEADING SCHEMA (level- and methodology-aware)
// Source: PAPERSTUDIO consolidated structural schema for academic research projects.
// KEY: [ALL] = UG/MS/PhD; [MS/PhD] = Masters & PhD only; [PhD] = PhD only;
//      [Quant] = Quantitative or Mixed Methods only.
// Preliminary Pages and Back Matter (References, Appendices) are produced by the
// export module — NOT by the writing engine.
// ─────────────────────────────────────────────────────────────────────────────

type DegreeLevel = "ug" | "masters" | "phd";

function normaliseDegree(degree: string | undefined | null): DegreeLevel {
  const d = (degree || "").toLowerCase();
  if (d.includes("phd") || d.includes("doctor") || d.includes("dphil")) return "phd";
  if (d.includes("master") || d.includes("msc") || d.includes("ma ") || d.startsWith("ma") || d.includes("mba") || d.includes("mphil")) return "masters";
  return "ug";
}

interface SchemaSection {
  num: string;
  title: string;
  scope: "all" | "ms_phd" | "phd" | "quant" | "ms_phd_quant";
  note?: string;
}

const CHAPTER_SCHEMAS: Record<string, SchemaSection[]> = {
  introduction: [
    { num: "1.1", title: "Background to the Study", scope: "all" },
    { num: "1.2", title: "Statement of the Problem", scope: "all" },
    { num: "1.3", title: "Aim and Objectives of the Study", scope: "all" },
    { num: "1.4", title: "Research Questions", scope: "all" },
    { num: "1.5", title: "Research Hypotheses", scope: "quant", note: "PhD: Required; UG: Optional" },
    { num: "1.6", title: "Significance of the Study", scope: "all" },
    { num: "1.7", title: "Scope and Delimitations of the Study", scope: "all" },
    { num: "1.8", title: "Operational Definition of Terms", scope: "all", note: "PhD: Extensive; UG: Basic" },
    { num: "1.9", title: "Organization of the Study", scope: "ms_phd" },
  ],
  literature_review: [
    { num: "2.1", title: "Introduction", scope: "all" },
    { num: "2.2", title: "Conceptual Framework", scope: "ms_phd", note: "UG: Optional" },
    { num: "2.3", title: "Theoretical Framework", scope: "ms_phd", note: "UG: Optional / Basic" },
    { num: "2.4", title: "Empirical Review", scope: "all" },
    { num: "2.5", title: "Summary of Literature and Gap Identification", scope: "all", note: "PhD: Critical Emphasis" },
  ],
  methodology: [
    { num: "3.1", title: "Research Design", scope: "all" },
    { num: "3.2", title: "Population of the Study", scope: "all" },
    { num: "3.3", title: "Sample and Sampling Technique", scope: "all" },
    { num: "3.4", title: "Instrument for Data Collection", scope: "all" },
    { num: "3.5", title: "Validity and Reliability of Instrument", scope: "ms_phd", note: "UG: Basic" },
    { num: "3.6", title: "Method of Data Collection", scope: "all" },
    { num: "3.7", title: "Method of Data Analysis", scope: "all" },
    { num: "3.8", title: "Ethical Considerations", scope: "ms_phd", note: "UG: Optional / Brief" },
  ],
  findings: [
    { num: "4.1", title: "Introduction", scope: "all" },
    { num: "4.2", title: "Demographic Data Presentation", scope: "all" },
    { num: "4.3", title: "Analysis of Research Questions", scope: "all" },
    { num: "4.4", title: "Test of Hypotheses", scope: "quant" },
    { num: "4.5", title: "Discussion of Findings", scope: "ms_phd", note: "UG: Often combined with 4.3 / 4.4" },
  ],
  conclusion: [
    { num: "5.1", title: "Summary of Findings", scope: "all" },
    { num: "5.2", title: "Conclusion", scope: "all" },
    { num: "5.3", title: "Recommendations", scope: "all" },
    { num: "5.4", title: "Contribution to Knowledge", scope: "phd", note: "MS: Optional; UG: Not Required" },
    { num: "5.5", title: "Suggestions for Further Studies", scope: "all" },
  ],
};

function isSectionApplicable(scope: SchemaSection["scope"], level: DegreeLevel, isQuant: boolean): boolean {
  switch (scope) {
    case "all": return true;
    case "ms_phd": return level === "masters" || level === "phd";
    case "phd": return level === "phd";
    case "quant": return isQuant;
    case "ms_phd_quant": return (level === "masters" || level === "phd") && isQuant;
  }
}

export function buildUnifiedHeadingSchema(
  chapterType: string,
  methodology: string,
  degree: string,
  includeHypotheses: boolean = false,
): string {
  const sections = CHAPTER_SCHEMAS[chapterType];
  if (!sections) return "";
  const level = normaliseDegree(degree);
  const isQuant = methodology === "Quantitative" || methodology === "Mixed Methods";
  const applicable = sections.filter(s => {
    if (!isSectionApplicable(s.scope, level, isQuant)) return false;
    // Suppress hypothesis-specific sections when the study has no hypotheses.
    if (!includeHypotheses) {
      if (s.title === "Research Hypotheses") return false;
      if (s.title === "Test of Hypotheses") return false;
    }
    return true;
  });
  const lines = applicable.map(s => `- ${s.num} ${s.title}${s.note ? ` _(level note: ${s.note})_` : ""}`).join("\n");
  const hypothesesNote = !includeHypotheses
    ? `\nIMPORTANT — HYPOTHESES DISABLED: This study has NO formal research hypotheses. Do NOT introduce, list, test, or reference hypotheses anywhere in this chapter. Skip hypothesis-related sections entirely.\n`
    : "";
  return `
## CANONICAL HEADING SCHEMA — ABSOLUTE AUTHORITY (level + methodology aware)
Degree level: ${level.toUpperCase()} · Methodology: ${methodology} · Hypotheses: ${includeHypotheses ? "INCLUDED" : "EXCLUDED"}
${hypothesesNote}
The following are the FIXED, canonical numbered headings for this chapter. They are the same for every dissertation in this engine — they do NOT change with topic, writing mode, or AI creativity. Use them VERBATIM as the structural backbone.

${lines}

RULES (apply in BOTH default and natural mode):
- Use these headings exactly as written — do NOT rename, paraphrase, replace, merge, split, reorder, or omit any of them
- You MAY add subheadings (e.g., 2.4.1, 2.4.2, 3.7.1) WITHIN any canonical section to organise topic-specific content
- Subheading TITLES may and should be study-specific (e.g., under "2.4 Empirical Review" you can have "2.4.1 Mobile Banking Adoption in Sub-Saharan Africa")
- Topic-specific creativity belongs in SUBHEADINGS and the prose itself — NEVER in the canonical heading names

If the chapter-specific template below contains heading suggestions that conflict with this canonical schema, the canonical schema WINS. The template's word counts, depth guidance, and prohibitions still apply, but to the canonical sections — not to the template's own heading names.

NOTE: Preliminary Pages (Title Page, Declaration, Dedication, Acknowledgements, Abstract, Table of Contents, Lists of Tables/Figures/Abbreviations) and Back Matter (References, Appendices) are produced by the export module — do NOT include them in this chapter's body output.
`;
}


export const SUPERIOR_PROMPT_TEMPLATE = `
PRINCIPLES OF EXCELLENT DISSERTATION WRITING — Internalise These

1. WRITE LIKE A SCHOLAR, NOT A SUMMARISER
The difference between a first-class dissertation and an adequate one is not word count or citation density — it is intellectual ownership. Every paragraph must show that you have thought about the material, not just read it. When you cite a source, you are not paying tribute — you are marshalling evidence for YOUR argument. If a paragraph could appear in any dissertation on any topic with minor word swaps, it is too generic. Delete it mentally and write something that could only belong in THIS dissertation.

2. DEPTH IS NOT LENGTH
A deep paragraph doesn't use more words — it does more intellectual work per sentence. It defines, demonstrates, locates in evidence, identifies limits, and explains why it matters to THIS study. A shallow paragraph reports information. A deep paragraph interprets, compares, judges, and connects. Before writing any paragraph, ask: "What is this paragraph ARGUING?" If the answer is "nothing — it's just covering a topic," rethink it.

3. JUSTIFY LIKE A RESEARCHER DEFENDING THEIR CHOICES
Every significant claim requires justification that goes beyond "because the literature says so." A proper justification answers: Why this? Why here? On what evidence? In which setting? Under what conditions? For whom? With what consequences? A one-sentence justification is almost always insufficient. A strong justification makes the reader think "yes, that's the right choice and I understand exactly why."

4. EVALUATE — DON'T JUST DESCRIBE
When you present competing positions, evaluate them. Explain why one interpretation may be more persuasive than another. Distinguish between what evidence demonstrates and what an author merely infers from it. Academic evaluation is not about being negative — it is about making disciplined judgements about the strength, weakness, applicability, and limits of ideas.

5. CRITICAL ANALYSIS IS SURGICAL, NOT DESTRUCTIVE
Critical analysis means examining the assumptions, limitations, and blind spots that shape a body of knowledge. A critical paragraph should not dismiss — it should dissect. "Smith's (2021) framework accounts well for institutional contexts in East Africa but struggles to explain the informal-sector dynamics that Okafor (2023) documents in West African markets, suggesting the model's boundary conditions are narrower than claimed."

6. SYNTHESIS CREATES NEW UNDERSTANDING
Synthesis is not summarising three studies in one paragraph. Synthesis is bringing sources together so they produce meaning that no single source contained. When three studies converge, say what that convergence reveals. When two studies contradict, explain why — don't just note the contradiction. The reader should gain insight from YOUR synthesis that they wouldn't get from reading the individual sources.

7. EVIDENCE IS AMMUNITION, NOT DECORATION
Every statistic, every finding, every citation must serve a purpose in your argument. Data without interpretation is decoration. A citation dropped into a paragraph without analysis is name-dropping, not scholarship. Every piece of evidence must be: introduced (what it is), interpreted (what it means), and connected (why it matters here).

8. SOURCE HIERARCHY MATTERS
Peer-reviewed empirical studies, systematic reviews, meta-analyses, respected academic publishers, and credible institutional reports — in that order. Use current sources where recency matters and seminal works where foundational importance justifies their age. Every source must work for its place in your bibliography.

9. NAME YOUR GAPS PRECISELY
"There is a gap in the literature" is the academic equivalent of saying nothing. What KIND of gap? Conceptual? Theoretical? Methodological? Empirical? Contextual? What exactly is missing? Why does it persist? What are the consequences of leaving it unresolved? A research gap must be argued for, not declared.

10. BUILD MOMENTUM
Every paragraph advances the chapter's argument. The reader should feel the chapter building toward something — from establishing context to identifying problems to analysing evidence to reaching insight. If a paragraph could be removed without the reader noticing, it shouldn't exist.

11. WRITE LIKE A HUMAN WHO CARES ABOUT IDEAS
Vary sentence length — sharply. Some ideas need a short, direct statement. Others need a complex, multi-clause construction that holds several moving parts in tension. If three consecutive sentences have similar rhythm, rewrite one. No paragraph should sound like it was produced by a formula. The prose should be direct, intellectually confident, and occasionally — when the evidence warrants it — surprising.

12. CITATIONS ARE A SCHOLARLY CONVERSATION
Every non-obvious claim, empirical statement, contested position, and statistical figure must be cited. But citation is not just compliance — it is you positioning yourself within a scholarly conversation. Cite to agree, to build on, to challenge, to contextualise. Avoid overdependence on any single author. No paragraph should end with a bare citation standing alone — always follow with your interpretation.

SELF-CHECK (apply silently between sections):
- Does each paragraph argue something, or just describe?
- Is every piece of evidence interpreted, not just cited?
- Have I made at least one evaluative judgment visible?
- Does the prose have rhythmic variation — short punch after long complexity?
- Would this paragraph make sense ONLY in this specific dissertation?
- Am I building toward insight, or just filling space under headings?
If any answer is "no," revise before moving on.
`;

export const ABSTRACT_TEMPLATE = `
ABSTRACT — STRICT TEMPLATE

Configuration:
- Word Count: 250–300 words (UG) | 300–350 words (Masters) | 400–500 words (PhD)
- Form: Single paragraph only — NO headings, NO bullet points, NO line breaks
- Tense: Past tense throughout
- NO citations of any kind — no author names, no dates, no institutional references

Core Principle:
The abstract is the distilled intellectual whole of the dissertation in one paragraph. It must move through five intellectual moves in this exact order, with no visible breaks between them. Every sentence must carry informational weight. There must be no filler, no decorative language, no generic academic phrasing.

The Five-Move Arc (one continuous paragraph):

Move 1 — BACKGROUND (1–2 sentences): Establish the research problem and why it matters. Open with a tightly framed account of the empirical or conceptual gap the study addresses.

Move 2 — AIM (1 sentence): State the overall aim of the study in a single, decisive sentence. The aim must align exactly with Chapter 1.

Move 3 — METHOD (2–3 sentences): State research design, sample size using numerals, participant type or data source, data collection instrument, and analytical technique. The Okrika exemplar opens its methodology with: "A positivist, deductive, quantitative design was adopted." That is the cadence to match — short, declarative, decisive.

Move 4 — FINDINGS (3–5 sentences, the analytical centre): For quantitative studies, report the most important findings with exact statistical values where they sharpen the claim. For qualitative studies, state principal themes and what they revealed. Findings must be interpreted, not merely listed.

Move 5 — CONTRIBUTION (1–2 sentences): State whether the aim was achieved, then identify the contribution to theory and practice. The final sentence must state what the study CHANGED in understanding, practice, or explanation.

KEYWORDS LINE (mandatory if includeKeywords is enabled):
After the abstract paragraph, add ONE blank line, then a single line in the exact format:
**Keywords:** keyword1; keyword2; keyword3; keyword4; keyword5
- Exactly 5 keywords, separated by semicolons
- Each keyword should be a noun phrase, not a sentence
- Lowercase unless proper nouns

Hard Rules:
- No citations of any kind — no author names, no years, no numbered references
- No headings, bullet points, numbering, or line breaks WITHIN the abstract paragraph
- No first-person language. No contractions.
- No stock AI phrasing
- No new concepts not in Chapters One to Five
- Sentence rhythm must vary sharply — short declaration after long analytical sentence
- Traceability: aim=Ch1, methodology=Ch3, findings=Ch4, conclusion=Ch5
- NO tables (no Markdown table syntax)
- NO figures, charts, or graphical content of any kind
- NO footnotes or endnotes
`;


export const CHAPTER_ONE_TEMPLATE = `
CHAPTER ONE: INTRODUCTION — STRICT TEMPLATE

BOUNDARY RULE: This chapter introduces the research problem, establishes context, states aims/objectives/questions, and outlines the dissertation structure. It must NOT discuss methodology details (that belongs in Chapter 3), must NOT present findings (Chapter 4), and must NOT include a literature review (Chapter 2).

Section Architecture (follow EXACTLY in this order):

## 1.1 Background to the Study (600–750 words)
Funnel structure: global significance → sectoral level → local context.
- Open with broad empirical grounding (OECD, UNESCO, WHO etc.)
- Define [DEPENDENT VARIABLE] using ≥3 scholarly definitions, compared for overlap and divergence
- Introduce explanatory variables
- Include ≥2 empirical contradictions
- 8–20 statistically supported claims integrated analytically
- Minimum 20–25 distinct citations across the chapter

## 1.2 Statement of the Problem / Rationale (~150 words)
- Justify why this study must be undertaken
- Identify ONE principal gap only (theoretical, methodological, contextual, empirical, or policy-related)
- Explain what gap is, why it persists, what consequences follow from leaving it unresolved
- ≥4 scholarly sources

## 1.3 Research Aim and Objectives (~150 words)
- Research Aim: ONE precise sentence
- Research Objectives: 4 distinct, non-overlapping objectives — numbered, one per line, NO elaboration
- Research Questions: 4 analytical "What" questions aligned exactly to objectives — numbered, one per line
- Tightly controlled — no introductory commentary

## 1.4 Significance of the Study (~150 words)
- Identify ≥3 beneficiary groups
- Explain precisely how each group benefits
- Clarify mechanism through which findings become useful
- ≥4 citations not previously used in chapter

## 1.5 Research Deliverable (~100 words)
- State precisely what the study produces (conceptual framework, contextual model, empirical evidence base, etc.)
- Explain contribution to theory and practice in concrete terms

## 1.6 Dissertation Structure (~100 words)
- Summarise ALL chapters analytically from Chapter 1 to Chapter 5 — not as table of contents in sentence form
- Explain how each chapter (including Chapter 1) advances the intellectual work

STRICT PROHIBITIONS FOR CHAPTER 1:
- Do NOT discuss research methodology, sampling, data collection, or analysis methods
- Do NOT present any findings or results
- Do NOT include a literature review section
- Do NOT discuss theoretical frameworks in depth (brief mention only)
- Do NOT include a reference list discussion or gap analysis (that belongs in Chapter 2)
`;

export const CHAPTER_ONE_NURSING_TEMPLATE = `
CHAPTER ONE: INTRODUCTION (NURSING/HEALTHCARE VARIANT) — STRICT TEMPLATE

This variant follows the same structural architecture as the Standard Introduction. The critical difference is in the Research Questions section.

BOUNDARY RULE: Same as standard — NO methodology details, NO findings, NO literature review.

Section Architecture: Same as standard Chapter One EXCEPT:

## Research Questions (replaces standard RQ section)
- ONE main research question only
- Must be constructed using the most appropriate question-framing framework (PICO, PICOT, PEO, SPIDER, SPICE, ECLIPSE, CIMO)
- Must be precise, academically rigorous, aligned with aim, objectives, variables, population, and context
- Immediately after the main research question, identify the framework used
- Explain why the chosen framework is the best fit (~100 words)

All other sections follow the Standard Introduction template exactly.
`;

export const CHAPTER_TWO_TEMPLATE = `
CHAPTER TWO: LITERATURE REVIEW — STRICT TEMPLATE

Configuration:
- Total Word Count: As specified by user target
- Citations Required: 25–35 distinct citations minimum
- Execution Mode: Section by section

BOUNDARY RULE: This chapter reviews and synthesises existing literature. It must NOT present primary research findings (Chapter 4), must NOT discuss the study's own methodology in detail (Chapter 3), and must NOT restate research objectives/questions from Chapter 1 beyond brief contextual reference.

CRITICAL: DO NOT list research objectives or research questions in this chapter. A brief reference to the study's focus is acceptable in the introduction, but do NOT reproduce the numbered objectives or questions — they belong in Chapter 1 only.

Section Architecture:

## 2.1 Chapter Introduction (100–150 words)
- Explain scope, logic, and progression of the literature review
- Indicate how chapter is organised and how that organisation supports the research problem
- Cite 1–2 methodological sources on literature review practice
- Do NOT list research objectives or questions here

## 2.2–2.4 Thematic Literature Sections (per structure)
Theoretical & Conceptual Foundations:
- Compare scholarly definitions of key variables
- Evaluate strengths and weaknesses of each relevant theory
- Examine how well each theory explains the study phenomenon
- Integrate empirical tests of theory where available
- Select and justify principal theoretical framework

Empirical Review:
- Structured thematically or by variable
- Must preserve study-level detail: location, year, design, sample size, sampling, population, instrument, variables, analysis method, key findings
- Identify patterns, contradictions, methodological tendencies
- Explain why contradictions emerged
- Must critically evaluate recurring design weaknesses

## 2.X Conceptual Framework
- Synthesise theoretical and empirical review into a conceptual model
- Identify main convergences, contradictions, and unresolved issues
- Show expected relationships among variables and explain the logic

## 2.X Literature Gaps
- Arrive at gaps through accumulated critique — not generic declarations
- Articulate gap type: theoretical, methodological, contextual, conceptual, or empirical
- Each gap must be tied directly to evidence with sources

## 2.X Chapter Summary
- Summarise conceptual debates, theoretical tensions, empirical patterns, methodological weaknesses, and literature gaps
- Prepare transition to methodology
- No new citations

STRICT PROHIBITIONS FOR CHAPTER 2:
- Do NOT list research objectives or research questions (they belong in Chapter 1 only)
- Do NOT discuss the study's own methodology or data collection
- Do NOT present primary findings or results
- Do NOT include a methodology section
- Do NOT discuss the study's own sample or participants
`;

export const CHAPTER_THREE_TEMPLATE = `
CHAPTER THREE: RESEARCH METHODOLOGY — STRICT TEMPLATE

Configuration:
- Total Word Count: As specified by user target
- Framework: Saunders's Research Onion (mandatory organising structure)
- Citations Required: 30–35 distinct citations

BOUNDARY RULE: This chapter describes and defends the research methodology. It must NOT present findings or results (Chapter 4), must NOT include a literature review (Chapter 2), and must NOT restate the research problem at length (Chapter 1).

Core Methodological Principle:
This chapter must be written as a defence of methodological judgement. Every methodological choice must be justified rigorously and contextually. It must explain not only what was chosen, but why it was chosen, why it is more suitable than relevant alternatives, what assumptions it rests on, what limitations it introduces, what kind of knowledge it enables, and why that trade-off is acceptable.

Five-Layer Reasoning Standard (for each major methodological choice):
1. Define the concept or decision
2. Compare plausible alternatives
3. Justify the selected option in relation to the topic, objectives, variables, and context
4. Acknowledge limitations or trade-offs
5. Explain why those limitations do not invalidate the study

Section Architecture:

## 3.1 Introduction (100 words)
- Frame purpose, scope, and internal logic
- Signal philosophical stance, approach, strategy, sampling, collection, analysis, and ethical safeguards
- 1–2 methodological citations

## 3.2 Research Design Framework (120 words)
- Define Saunders's research onion and explain why it is useful
- Show each layer
- ≥3 citations

## 3.3 Research Philosophy (320 words)
- Define philosophy
- Compare ≥3 paradigms (positivism, interpretivism, pragmatism, critical realism) — assumptions, strengths, limitations, suitability
- Justify selected philosophy with direct reference to study variables and objectives
- Explicitly reject ≥1 alternative
- ≥4 new citations

## 3.4 Research Approach (220 words)
- Define deductive, inductive, and abductive reasoning
- Justify chosen approach
- ≥4 new citations

## 3.5 Research Strategy & Design (320 words)
- Address control, data type needed, breadth/depth, feasibility, time horizon
- What the design cannot do
- ≥4 new citations

## 3.6 Time Horizon (150–300 words)
- Define cross-sectional and longitudinal
- Justify selected time horizon
- Include Gantt chart (24-week project)
- Follow with 70–100 word interpretation paragraph

## 3.7 Population, Sampling & Sample Size (320 words)
- Define target population
- Compare probability vs non-probability techniques
- Justify technique selected
- For quantitative: include sample size calculation with formula
- Address sampling bias and mitigation
- ≥4 new citations

## 3.8 Data Collection (240 words)
- Define instrument used
- Justify choice
- Explain operationalisation of variables
- Describe administration process
- ≥3 new citations

## 3.9 Data Analysis (220 words)
- State analytical software and justify
- For quantitative: define and justify descriptive and inferential statistics
- For qualitative: define coding strategy, analytic procedure, interpretive logic
- ≥3 new citations

## 3.10 Rigour, Validity, Reliability & Trustworthiness (300 words)
- Quantitative: internal validity, external validity, construct validity, reliability, pilot testing, Cronbach's alpha with threshold
- Qualitative: credibility, transferability, dependability, confirmability
- How rigour is actively secured, not merely declared

## 3.11 Ethical Considerations (200 words)
- Applied to specific realities of population/context
- Informed consent process
- Confidentiality and anonymity
- GDPR compliance
- Right to withdraw

## 3.12 Chapter Summary (100 words)
- Consolidate logic of all methodological choices as one coherent chain
- Clear transition to Chapter Four

STRICT PROHIBITIONS FOR CHAPTER 3:
- Do NOT present any findings or results
- Do NOT include a literature review
- Do NOT discuss theoretical frameworks (that belongs in Chapter 2)
- Do NOT restate the research problem at length
`;

export const CHAPTER_FOUR_QUANT_TEMPLATE = `
CHAPTER FOUR: DATA ANALYSIS & FINDINGS (QUANTITATIVE) — STRICT TEMPLATE

Configuration:
- Total Word Count: As specified by user target
- Key Inputs: [SAMPLE SIZE], [STATISTICAL SOFTWARE]

BOUNDARY RULE (ABSOLUTE — ANY VIOLATION IS A CRITICAL FAILURE):
This chapter presents and analyses findings ONLY. Substantive literature comparison belongs in Chapter Five (if separate) or a dedicated Discussion section within this chapter. Do NOT write sections that belong in other chapters. Do NOT include a chapter summary that transitions into recommendations (that belongs in Chapter 5). Do NOT perform additional analyses AFTER the chapter summary.

Core Analytical Principle:
Every table must be introduced, every figure must have a clear purpose, every result must be interpreted conceptually, and every analytical step must be linked to the research questions. Reporting a mean is not analysis. Reporting a p-value is not analysis. Analysis explains what the number represents, how strong it is, what pattern it indicates, how it relates to the research question, and whether it is substantively meaningful.

Section Architecture (FOLLOW THIS EXACT ORDER — DO NOT REARRANGE):

## 4.1 Introduction (120–150 words)
- Identify dataset: final valid sample size, instrument used, key variables, statistical software
- Explain chapter sequence
- State that analysis addresses research objectives through structured quantitative analysis

## 4.2 Data Preparation, Cleaning & Screening (300 words)
- Explain raw dataset preparation
- State screening methods (completeness, duplicates, careless responses, out-of-range values)
- Explain missing data handling with justification
- Address outlier examination
- Assess normality, linearity, homoscedasticity, multicollinearity where relevant
- Include compact data screening summary table

## 4.3 Demographic / Contextual Profile (300 words)
- Frequency and percentage table for each demographic/contextual variable
- All percentage columns must total 100%
- Each table introduced by paragraph explaining analytical importance
- Followed by paragraph interpreting distribution pattern, representativeness

## 4.4–4.X Descriptive Analysis per Research Question (300 words per RQ)
- One research question at a time
- Identify dependent and independent variables involved
- Full Likert-scale distribution table: SA/A/N/D/SD frequencies and percentages, item mean and SD
- Interpretation must examine concentration, dispersion, skewness, convergence/divergence across items
- No literature citations here

## 4.X Advanced Statistical Analysis per RQ (300–600 words per RQ)
- Correlation and/or regression (and ANOVA if applicable)
- Use real equations with detailed explanations
- Present results in tables including models and model summaries
- Explain coefficients, significance levels, R²
- Include figure placeholders with 70–100 word interpretation beneath each

## 4.X Discussion of Findings (500–800 words)
- Integrate analytical discussions across all research questions into one coherent narrative
- Identify overarching patterns, convergences, divergences, and unexpected results
- Compare findings with literature from Chapters 1 and 2

## 4.X Chapter Summary (70–100 words)
- Summarise main findings
- Serve as bridge to next chapter
- Highlight key insights and how they address research objectives
- THIS MUST BE THE LAST SECTION — do NOT add anything after this

STRICT PROHIBITIONS FOR CHAPTER 4:
- Do NOT add any sections AFTER the Chapter Summary
- Do NOT include "Additional Analysis" sections after the summary
- Do NOT write methodology descriptions (that belongs in Chapter 3)
- Do NOT include a literature review
- Do NOT include recommendations (that belongs in Chapter 5)
- Do NOT restate the full research problem (brief reference only)
`;

export const CHAPTER_FOUR_QUAL_TEMPLATE = `
CHAPTER FOUR: DATA ANALYSIS & FINDINGS (QUALITATIVE) — STRICT TEMPLATE

Configuration:
- Total Word Count: As specified by user target
- Key Inputs: [PARTICIPANT COUNT], [DATA TYPE], [ANALYSIS METHOD], [QDA SOFTWARE]

BOUNDARY RULE (ABSOLUTE — ANY VIOLATION IS A CRITICAL FAILURE):
This chapter presents and analyses findings ONLY. Comparison with prior literature belongs in Chapter Five. Do NOT include sections that belong in other chapters. The Chapter Summary MUST be the final section.

Core Analytical Principle:
This chapter must demonstrate that the researcher can interpret qualitative evidence with authority, discipline, sensitivity, and depth. It must not read as a sequence of quotations with labels attached. It must read as a controlled analytical argument grounded in data.

Quotation Rule:
Every quotation must be selected because it reveals something analytically significant. Quotations must always be followed by commentary that explains what the quotation demonstrates, why it matters, and how it relates to the theme. Quotes without interpretation are not evidence of good analysis.

Section Architecture (FOLLOW THIS EXACT ORDER):

## 4.1 Introduction (150–200 words)
- Identify qualitative dataset: total participants, nature of data, preparation process
- State analytical method and justify it
- Identify QDA software if used
- Explain chapter structure

## 4.2 Profile of Participants (400–500 words)
- Participant profile matrix table: Participant ID | Role | Experience | Key Context
- Interpretive discussion: diversity, commonality, range of perspectives
- Note interpretive limitations from sample profile
- No literature citations

## 4.3 Data Familiarisation, Coding & Analytic Development (600–700 words)
- Explain familiarisation process
- Explain initial coding type
- Show how codes were refined, merged, split, discarded, elevated into themes
- Address reflexivity and positionality
- Include coding tree diagram
- Include credibility strategies
- Cite methodological sources

## 4.4–4.X Main Research Findings per RQ (300 words per RQ)
- One RQ at a time
- Reintroduce RQ and constructs examined
- Identify 2–4 major themes per RQ
- Verbatim quotes using anonymised participant IDs
- Followed by interpretation (dominant, minority, deviant, emotionally charged)
- Theme and illustrative quotes table per RQ

## 4.X Discussion of Themes (550 words)
- Synthesise findings across all RQs into one coherent analytical narrative
- Compare findings to literature
- Show convergence, divergence, and surprise

## 4.X Chapter Summary (150–180 words)
- Consolidate principal themes and higher-order patterns
- Show what has been established
- Prepare transition to Chapter Five
- No new citations
- THIS MUST BE THE LAST SECTION

STRICT PROHIBITIONS FOR CHAPTER 4 (QUALITATIVE):
- Do NOT add sections after the Chapter Summary
- Do NOT include methodology descriptions (Chapter 3)
- Do NOT include a literature review (Chapter 2)
- Do NOT include recommendations (Chapter 5)
`;

export const CHAPTER_FIVE_TEMPLATE = `
CHAPTER FIVE: SUMMARY, CONCLUSION & RECOMMENDATIONS — STRICT TEMPLATE

Configuration:
- Total Word Count: As specified by user target (typically 1,500 words)
- Tense: Past tense throughout except timeless theoretical/policy implications
- Citations: Minimal — only to position theoretical contribution, justify practical implication, or frame future research

BOUNDARY RULE: This chapter synthesises and concludes. It must NOT introduce new data or findings not discussed in Chapter 4. It must NOT include a new literature review. It must NOT rewrite the methodology.

Core Principle:
This chapter is not an administrative closing section. It is the point at which the dissertation must demonstrate intellectual control over the entire study. It must show that the researcher can move from findings to meaning, from evidence to judgement, from analysis to contribution, and from limitation to future inquiry without becoming repetitive, vague, or formulaic.

Section Architecture:

## 5.1 Summary (250–300 words)
- Concise but analytically controlled recap of entire study
- Restate research aim and objectives (without verbatim copy from Ch. 1)
- Summarise methodology: state what was done, not why
- Synthesise key findings across all research questions — show overall trajectory from problem to insight

## 5.2 Conclusion (300 words)
- Definitively answer the research problem
- State explicitly whether the research aim was achieved
- Address each research question directly, integrated into one broader conclusion
- Produce one overarching concluding statement capturing the central contribution

## 5.3 Contribution to Theory (150 words max)
- Identify the theoretical framework(s) the study advanced, confirmed, challenged, extended, or applied in a new context
- Be specific — not "the study contributes to theory" but what exactly was contributed

## 5.4 Contribution to Practice (150 words max)
- Explain the practical knowledge or actionable insights generated for stakeholders
- Be specific about who benefits and how

## 5.5 Recommendations (300 words)
- Evidence-based, actor-specific, and operational
- State: what should be done, by whom, on the basis of which finding, through what mechanism, toward what outcome
- Must not drift beyond the evidence

## 5.6 Limitations (200 words)
- Discuss limitations as boundaries of inference, not confessions of failure
- Each limitation: identify the constraint, explain how it affects interpretation/validity

## 5.7 Areas for Further Research (200 words)
- Emerge logically from what the study could not settle
- State: what should be studied, in which context, using which design, and for what reason
- End with a strong closing statement

STRICT PROHIBITIONS FOR CHAPTER 5:
- Do NOT introduce new findings or data
- Do NOT include a new literature review
- Do NOT rewrite the methodology in detail
- Do NOT add sections after "Areas for Further Research"
- Do NOT use tables, figures, charts, or graphical content of any kind — ALL findings must be in paragraph form
- Do NOT use headings like "Descriptive Analysis" or "Inferential Analysis" — use ONLY the headings specified in the outline
- Do NOT cite any NEW source — only reference sources already cited in earlier chapters if directly relevant
- Do NOT reproduce numbered objectives or questions — refer to them in prose only
- Do NOT include bullet points or numbered lists — use flowing prose paragraphs only
`;
