import { type Methodology, type ChapterConfig } from "@/types/project";

export const VISUALIZATION_OPTIONS = [
  "Frequency / descriptive table", "Cross-tabulation table", "Regression output table",
  "Clustered bar chart", "Stacked bar chart", "Horizontal bar chart",
  "Line chart", "Scatter plot", "Box plot", "Histogram", "Pie / Donut chart",
  "Heatmap / correlation matrix", "ROC curve", "Odds ratio forest plot",
  "Kaplan-Meier curve", "Scree plot", "Radar / spider chart",
  "Funnel plot", "Treemap", "Sankey / alluvial chart",
  "Thematic Maps", "Word Clouds"
];

export const SAMPLING_OPTIONS = [
  "Probability Sampling", "Purposive Sampling", "Convenience Sampling",
  "Snowball Sampling", "Stratified Random", "Cluster Sampling",
  "Simple Random Sampling", "Systematic Sampling", "Quota Sampling",
  "Theoretical Sampling", "Other"
];

export const DATA_COLLECTION_OPTIONS = [
  "Surveys / Questionnaires", "Interviews", "Observation", "Focus Groups",
  "Secondary Data", "Document Analysis", "Experiment", "Case Study",
  "Mixed Methods", "Other"
];

export const FRAMEWORK_OPTIONS = [
  "None", "PICO", "PICOS", "PICOT", "PEO", "SPIDER", "PECO",
  "FINER", "SMART", "ECLIPSE", "SPICE", "CIMO", "BeHEMoTh", "PIO", "Custom"
];

export const FRAMEWORK_HINTS: Record<string, string> = {
  "None": "No framework — the AI will generate open research questions.",
  "PICO": "Population, Intervention, Comparison, Outcome — for clinical/systematic reviews.",
  "PICOS": "Extends PICO with Study Design — for evidence-based practice.",
  "PICOT": "PICO + Timeframe — for nursing and clinical sciences.",
  "PEO": "Population, Exposure, Outcome — for observational / qualitative health research.",
  "SPIDER": "Sample, Phenomenon, Design, Evaluation, Research type — for qualitative systematic reviews.",
  "PECO": "Population, Exposure, Comparator, Outcome — for environmental health.",
  "FINER": "Feasible, Interesting, Novel, Ethical, Relevant — quality checklist for your question.",
  "SMART": "Specific, Measurable, Achievable, Relevant, Time-bound — for objectives-led research.",
  "ECLIPSE": "Expectation, Client, Location, Impact, Professionals, SErvice — health service evaluation.",
  "SPICE": "Setting, Perspective, Intervention, Comparison, Evaluation — social science.",
  "CIMO": "Context, Intervention, Mechanism, Outcome — for realist synthesis.",
  "BeHEMoTh": "Behaviour, Health context, Exclusions, Models/Theories — behavioural science.",
  "PIO": "Population, Intervention, Outcome — simplified PICO without comparator.",
  "Custom": "Define your own framework components.",
};

export const ANALYSIS_OPTIONS = [
  "Descriptive statistics (mean, SD, frequencies)",
  "Chi-square test", "Binary logistic regression",
  "Independent samples t-test", "Paired samples t-test",
  "One-way ANOVA", "Two-way ANOVA",
  "Pearson correlation", "Spearman correlation",
  "Simple linear regression", "Multiple linear regression",
  "Mann-Whitney U test", "Kruskal-Wallis test",
  "Factor analysis (EFA)", "Cronbach's alpha",
  "Structural equation modelling (SEM)", "Cluster analysis",
  "Time series analysis", "Survival analysis (Kaplan-Meier)", "Meta-analysis",
];

export const QUALITATIVE_ANALYSIS_OPTIONS = [
  "Thematic analysis (Braun & Clarke 2006)", "Framework analysis",
  "Content analysis", "Grounded theory", "IPA (Interpretive Phenomenological Analysis)",
  "Discourse analysis", "Narrative analysis", "Ethnographic analysis", "Case study analysis",
];

export const ANALYSIS_SOFTWARE_OPTIONS = [
  "SPSS v27", "R (version 4.x)", "Stata", "NVivo",
  "ATLAS.ti", "MAXQDA", "Python (pandas / scipy)", "Excel"
];

export const FORMALITY_OPTIONS = [
  "Conversational academic", "Standard journal (default)", "Highly formal / theoretical"
];

export const HEDGING_OPTIONS = [
  "Low (confident)", "Medium (standard)", "High (extensive)"
];

export const VOICE_OPTIONS = [
  "Third person only", "Allow first person (I / we)"
];

export const PARAGRAPH_LENGTH_OPTIONS = [
  "Short (2–4 sentences)", "Medium (4–7 sentences)", "Long (7–12 sentences)"
];

export const SENTENCE_COMPLEXITY_OPTIONS = [
  "Simple (compound)", "Mixed (default)", "Complex (subordinate)"
];

export const TECHNICAL_DENSITY_OPTIONS = [
  "1 — Accessible", "2", "3 — Standard", "4", "5 — Expert"
];

export const TRANSITION_STYLE_OPTIONS = [
  "Formal connectors", "Casual bridges", "Implicit (logic only)"
];

export const LINE_SPACING_OPTIONS = [
  "1.0×", "1.5×", "2.0× (UK default)"
];

export const METHODOLOGY_DEPTH_OPTIONS = [
  "Standard",
  "Extended — with epistemological justification",
  "Extended + Critical realist position (PhD)"
];

export const CITATION_STYLES = [
  "Harvard", "APA 7th", "APA 6th", "MLA 9th",
  "Chicago (Author-Date)", "Chicago (Notes-Bibliography)",
  "Vancouver", "IEEE", "OSCOLA", "AGLC 4", "AMA", "Turabian"
];

export const LANGUAGE_STYLES = [
  "English (UK)", "English (US)", "English (Nigeria / West Africa)",
  "English (Australia)", "English (Canada)",
  "French (Beta)", "Spanish (Beta)", "Portuguese / Brazil (Beta)"
];

export const EXPORT_FORMATS = [
  { id: "txt",   name: ".txt — Plain text", desc: "Universal",                 tiers: ["free", "undergraduate", "masters", "phd", "custom"] },
  { id: "docx",  name: ".docx — Word",      desc: "Full formatting, tables",   tiers: ["undergraduate", "masters", "phd", "custom"] },
  { id: "pdf",   name: ".pdf — PDF",        desc: "Print-ready",               tiers: ["undergraduate", "masters", "phd", "custom"] },
  { id: "md",    name: ".md — Markdown",    desc: "YAML frontmatter, GFM",     tiers: ["masters", "phd", "custom"] },
  { id: "latex", name: ".tex — LaTeX",      desc: ".tex + .bib file",          tiers: ["phd", "custom"] },
];

// ═══ NEW OPTION ARRAYS (v5-3) ═══

export const SOURCE_TYPE_DISTRIBUTION = [
  "Journal articles (50–60% of sources)",
  "Books & edited volumes (20–30%)",
  "Government / institutional reports (10–15%)",
  "Conference papers (5–10%)",
  "Theses & dissertations (0–5%)",
];

export const EMPIRICAL_LEVEL_OPTIONS = [
  "Standard (50% empirical)",
  "High (70%+ with statistics)",
  "Maximum (90%+ with p-values, effect sizes, CIs)",
];

export const SEMINAL_WORKS_OPTIONS = [
  "No — recent sources only",
  "Yes — if foundational to the field",
  "Yes — always include where relevant",
];

export const DOI_OPTIONS = [
  "Auto (required for APA 7 & Vancouver)",
  "Always include DOI",
  "Never include DOI",
];

export const CONCLUSION_SECTIONS = [
  "Summary of key findings (by objective)",
  "Answer each research question directly",
  "Contribution to knowledge / theory",
  "Practical recommendations",
  "Recommendations for future research",
  "Limitations of the study",
  "Concluding paragraph",
  "Policy implications",
  "Reflexive statement (qualitative studies)",
];

export const ABSTRACT_TYPES = [
  "Unstructured (standard prose, 300–500 words)",
  "Structured — Objective / Methods / Results / Conclusion",
  "Extended structured (PhD — 500 words)",
];

export const ABSTRACT_WC_OPTIONS = [
  "300 words (Undergraduate default)",
  "350 words (Masters default)",
  "500 words (PhD default)",
  "Custom…",
];

export const MIXED_METHODS_OPTIONS = [
  "Sequential Explanatory (quant → qual explains)",
  "Sequential Exploratory (qual → quant tests)",
  "Concurrent Triangulation (parallel, compare)",
  "Embedded Design (one nested in other)",
  "Not applicable — single method",
];

export const CHART_COMPLEXITY_OPTIONS = [
  "Level 1 — Minimal",
  "Level 2 — Standard",
  "Level 3 — Full Academic (error bars, p-values)",
  "Level 4 — Publication-ready SVG (PhD)",
];

export const CHART_RESOLUTION_OPTIONS = [
  "150 DPI — digital",
  "300 DPI — print",
  "SVG — vector (PhD)",
];

export const FIGURE_NUMBERING_OPTIONS = [
  "Figure 1, 2, 3…",
  "Figure 4.1, 4.2…",
];

export const TABLE_NUMBERING_OPTIONS = [
  "Table 1, 2, 3…",
  "Table 4.1, 4.2…",
];

export const CAPTION_POSITION_OPTIONS = [
  "Above table (APA/Harvard default)",
  "Below table",
];

export const SOURCE_FORMAT_OPTIONS = [
  "Source: Author, Year",
  "Source: Primary data",
  "Source: Author (Year)",
];

// Statistical method descriptions for findings chapter
export const QUANT_METHOD_DESCRIPTIONS: Record<string, string> = {
  "Descriptive statistics (mean, SD, frequencies)": "Mean, SD, frequencies → histogram",
  "Chi-square test": "χ², Cramér's V → clustered bar",
  "Binary logistic regression": "OR, 95% CI, Wald → ROC + forest plot",
  "Independent samples t-test": "t, Cohen's d → box plot",
  "Paired samples t-test": "pre/post → line chart",
  "One-way ANOVA": "F, η², Tukey → error bar chart",
  "Two-way ANOVA": "interaction → interaction plot",
  "Pearson correlation": "r, r² → scatter + regression line",
  "Spearman correlation": "ρ → scatter with rank labels",
  "Simple linear regression": "R², equation → regression plot",
  "Multiple linear regression": "adjusted R², VIF → lollipop chart",
  "Mann-Whitney U test": "non-parametric → box plot",
  "Kruskal-Wallis test": "non-parametric 3+ groups → notched box",
  "Factor analysis (EFA)": "KMO, loadings → scree + heatmap",
  "Cronbach's alpha": "α, item-total → reliability chart",
  "Structural equation modelling (SEM)": "CFI, RMSEA, path coefficients → path diagram",
  "Cluster analysis": "dendrogram → cluster profile table",
  "Time series analysis": "ARIMA, ACF/PACF → trend line",
  "Survival analysis (Kaplan-Meier)": "log-rank p → KM curve",
  "Meta-analysis": "pooled ES, I², heterogeneity → forest + funnel plot",
};

export const QUAL_METHOD_DESCRIPTIONS: Record<string, string> = {
  "Thematic analysis (Braun & Clarke 2006)": "6-phase, 3–5 themes + frequency table",
  "Framework analysis": "matrix by categories",
  "Content analysis": "coding categories, Cohen's κ",
  "Grounded theory": "open → axial → selective codes",
  "IPA (Interpretive Phenomenological Analysis)": "superordinate themes, rich description",
  "Discourse analysis": "discursive strategies, power",
  "Narrative analysis": "narrative structure, thematic coding",
  "Ethnographic analysis": "cultural themes",
  "Case study analysis": "within-case + cross-case table",
};

// Theorist suggestion database keyed by field
export const THEORIST_DB: Record<string, string[]> = {
  psychology: ["Bandura (Social Learning)", "Vygotsky (ZPD)", "Piaget (Cognitive Dev.)", "Kohlberg (Moral Dev.)", "Erikson (Psychosocial Dev.)", "Maslow (Hierarchy of Needs)", "Skinner (Behaviourism)", "Bronfenbrenner (Ecological Systems)"],
  education: ["Vygotsky (ZPD)", "Bloom (Taxonomy)", "Dewey (Experiential)", "Piaget (Constructivism)", "Freire (Critical Pedagogy)", "Kolb (Learning Styles)", "Bandura (Self-Efficacy)", "Gardner (Multiple Intelligences)"],
  sociology: ["Bourdieu (Social Capital)", "Foucault (Discourse / Power)", "Giddens (Structuration)", "Marx (Historical Materialism)", "Weber (Bureaucracy)", "Durkheim (Social Facts)"],
  business: ["Porter (Competitive Advantage)", "Mintzberg (Strategy)", "Kotler (Marketing)", "Ansoff (Growth Matrix)", "Christensen (Disruption)", "Kotter (Change Model)"],
  management: ["Taylor (Scientific Management)", "Maslow (Motivation)", "Herzberg (Two-Factor)", "McGregor (Theory X/Y)", "Lewin (Force Field)", "Hofstede (Cultural Dimensions)"],
  marketing: ["Kotler (Marketing Mix)", "Aaker (Brand Equity)", "Rogers (Diffusion of Innovation)", "Keller (Brand Resonance)", "Ajzen (Theory of Planned Behaviour)"],
  health: ["Bandura (Self-Efficacy)", "Prochaska (Transtheoretical)", "Becker (Health Belief Model)", "Ajzen (Theory of Planned Behaviour)", "Marmot (Social Determinants)"],
  nursing: ["Henderson (Basic Nursing)", "Orem (Self-Care)", "Nightingale (Environment)", "Benner (Novice to Expert)", "Watson (Caring Theory)"],
  law: ["Hart (Legal Positivism)", "Dworkin (Law as Integrity)", "Rawls (Justice)", "Habermas (Discourse Theory)", "Foucault (Power/Law)"],
  economics: ["Keynes (Macroeconomics)", "Friedman (Monetarism)", "Smith (Invisible Hand)", "Schumpeter (Creative Destruction)", "Sen (Capability Approach)"],
  finance: ["Markowitz (Portfolio Theory)", "Sharpe (CAPM)", "Fama (Efficient Market)", "Modigliani & Miller (Capital Structure)"],
  technology: ["Rogers (Diffusion of Innovation)", "Davis (TAM)", "Venkatesh (UTAUT)", "Christensen (Disruptive Innovation)"],
  gender: ["Butler (Gender Performativity)", "Connell (Hegemonic Masculinity)", "Hooks (Feminism)", "Beauvoir (Second Sex)"],
  environment: ["Carson (Silent Spring)", "Brundtland (Sustainable Dev.)", "Hardin (Tragedy of Commons)", "Ostrom (Common Pool Resources)"],
  default: ["Braun & Clarke (Thematic Analysis)", "Creswell (Mixed Methods)", "Lincoln & Guba (Trustworthiness)", "Cohen (Statistical Power)"],
};

export function guessField(title: string, field: string): string {
  const text = (title + " " + field).toLowerCase();
  const keywords: Record<string, string[]> = {
    psychology: ["psychology", "behaviour", "cognitive", "mental", "learning", "child", "develop"],
    education: ["education", "teach", "school", "student", "classroom", "curriculum"],
    sociology: ["sociol", "society", "social", "culture", "community", "inequal"],
    business: ["business", "entrepren", "strateg", "organis", "firm", "corporat"],
    management: ["manag", "leadership", "HR", "human resource", "employee"],
    marketing: ["market", "brand", "consumer", "advertis", "customer", "digital market"],
    health: ["health", "disease", "clinic", "patient", "public health", "vaccin"],
    nursing: ["nurs", "care", "hospital", "patient", "midwif"],
    law: ["law", "legal", "right", "justice", "legislat", "court"],
    economics: ["econom", "GDP", "macro", "micro", "fiscal"],
    finance: ["financ", "invest", "portfolio", "asset", "equity"],
    technology: ["technol", "digital", "AI", "software", "innovati", "platform"],
    gender: ["gender", "female", "male", "women", "feminist"],
    environment: ["environ", "climate", "sustainab", "ecology", "green", "carbon"],
  };
  for (const [f, kws] of Object.entries(keywords)) {
    if (kws.some(k => text.includes(k))) return f;
  }
  return "default";
}

export const CHAPTER_CONFIGS: Record<Methodology, ChapterConfig[]> = {
  "Quantitative": [
    { type: "introduction", title: "CHAPTER ONE — INTRODUCTION", words: 1770, order: 1 },
    { type: "literature_review", title: "CHAPTER TWO — LITERATURE REVIEW", words: 2212, order: 2 },
    { type: "methodology", title: "CHAPTER THREE — RESEARCH METHODOLOGY", words: 1770, order: 3 },
    { type: "findings", title: "CHAPTER FOUR — DATA ANALYSIS", words: 2655, order: 4 },
    { type: "conclusion", title: "CHAPTER FIVE — SUMMARY, CONCLUSION, AND RECOMMENDATIONS", words: 1327, order: 5 },
    { type: "abstract", title: "ABSTRACT", words: 300, order: 6 },
  ],
  "Qualitative": [
    { type: "introduction", title: "CHAPTER ONE — INTRODUCTION", words: 1770, order: 1 },
    { type: "literature_review", title: "CHAPTER TWO — LITERATURE REVIEW", words: 2212, order: 2 },
    { type: "methodology", title: "CHAPTER THREE — RESEARCH METHODOLOGY", words: 1770, order: 3 },
    { type: "findings", title: "CHAPTER FOUR — FINDINGS AND DISCUSSION", words: 2655, order: 4 },
    { type: "conclusion", title: "CHAPTER FIVE — SUMMARY, CONCLUSION, AND RECOMMENDATIONS", words: 1327, order: 5 },
    { type: "abstract", title: "ABSTRACT", words: 300, order: 6 },
  ],
  "Mixed Methods": [
    { type: "introduction", title: "CHAPTER ONE — INTRODUCTION", words: 1770, order: 1 },
    { type: "literature_review", title: "CHAPTER TWO — LITERATURE REVIEW", words: 2212, order: 2 },
    { type: "methodology", title: "CHAPTER THREE — RESEARCH METHODOLOGY", words: 1770, order: 3 },
    { type: "findings", title: "CHAPTER FOUR — DATA ANALYSIS", words: 2655, order: 4 },
    { type: "conclusion", title: "CHAPTER FIVE — SUMMARY, CONCLUSION, AND RECOMMENDATIONS", words: 1327, order: 5 },
    { type: "abstract", title: "ABSTRACT", words: 300, order: 6 },
  ],
};

// Chapter proportional weights — MUST sum to exactly 1.0 so the user-selected
// total word count is preserved precisely (e.g. 10,000 distributes to 10,000).
export const CH_WEIGHTS: Record<string, number | null> = {
  introduction: 0.15,
  literature_review: 0.25,
  methodology: 0.18,
  findings: 0.28,
  conclusion: 0.14,
  abstract: null, // fixed per tier — added on top, never subtracted from body total
};

export const ABSTRACT_WC: Record<string, number> = {
  free: 300, undergraduate: 300, masters: 350, phd: 500
};

// Voice profile options for project creation
export const VOICE_PROFILE_OPTIONS = [
  { id: "formal" as const, label: "Formal", desc: "Traditional academic tone. Impersonal, measured, and convention-driven." },
  { id: "professional" as const, label: "Professional", desc: "Polished and clear. Reads like a well-written industry white paper." },
  { id: "masters" as const, label: "Masters", desc: "Balanced scholarly depth. Analytical without being impenetrable." },
  { id: "undergraduate" as const, label: "Undergraduate", desc: "Clear and accessible. Explains concepts without assuming deep background." },
  { id: "researcher" as const, label: "Researcher", desc: "Expert voice. Writes with the authority and nuance of someone who lives in this field." },
  { id: "custom" as const, label: "Custom", desc: "Define your own voice style." },
];

export const LANGUAGE_LEVEL_DESCRIPTIONS: Record<number, string> = {
  1: "Basic undergraduate — simple sentence structures, accessible vocabulary",
  2: "Intermediate undergraduate — clearer academic register, some field terms",
  3: "Advanced undergraduate / early Masters — field-specific terminology, solid structure",
  4: "Masters standard — balanced complexity, nuanced argumentation",
  5: "Advanced scholarly — multi-clause synthesis, sophisticated rhetorical strategies",
  6: "Expert scholarly — dense, layered prose with original conceptual contributions",
  7: "PhD / publication-grade — field-shaping language, maximal theoretical density",
};

export interface ChapterGuide {
  purpose: string;
  checklist: string[];
  tip: string;
}

export const CHAPTER_GUIDES: Record<string, ChapterGuide> = {
  introduction: {
    purpose: "Sets the stage for your entire dissertation. Tells the reader what you're researching, why it matters, what you set out to do, and how the dissertation is structured.",
    checklist: [
      "Research background and context — what is the problem or phenomenon?",
      "Problem statement — why is this gap worth investigating?",
      "Research aim and objectives — what will you achieve?",
      "Research questions — the specific questions you will answer",
      "Significance — why does this matter to theory or practice?",
      "Scope and limitations — what is and isn't covered",
      "Dissertation structure overview — a brief roadmap of each chapter",
    ],
    tip: "Write (or revise) the introduction last. Once you've completed your research you'll know exactly what the study is really about — your intro should reflect that, not your original assumptions.",
  },
  literature_review: {
    purpose: "Shows you know the field. Synthesises existing research to identify a gap or debate that your study addresses. It's not a list of summaries — it's a critical argument built from sources.",
    checklist: [
      "Thematic structure — organised by themes or debates, not author by author",
      "Critical engagement — evaluate, compare, and contrast rather than just describe",
      "Theoretical framework — identify the theory or model your study builds on",
      "Gap analysis — explicitly state what is missing in the existing literature",
      "Transition to methodology — explain why the gap justifies your chosen approach",
    ],
    tip: "Use linking phrases to build an argument: 'While Smith (2019) found X, Jones (2021) challenges this by…'. This signals critical thinking. Examiners reward synthesis over description.",
  },
  methodology: {
    purpose: "Explains and justifies HOW you conducted your research. Every choice — philosophy, design, sampling, collection, analysis — should be justified, not just described.",
    checklist: [
      "Research philosophy (positivism, interpretivism, pragmatism…)",
      "Research approach (deductive, inductive, abductive)",
      "Research design (experimental, survey, case study, ethnography…)",
      "Sampling strategy — who, how many, and why this group",
      "Data collection instruments (questionnaires, interviews, observations…)",
      "Data analysis method (thematic analysis, regression, content analysis…)",
      "Ethical considerations — consent, anonymity, data protection",
      "Reliability, validity, or trustworthiness of the approach",
    ],
    tip: "For every choice, answer two questions: (1) What did you do? (2) Why is this appropriate for your research question? Examiners penalise chapters that describe without justifying.",
  },
  findings: {
    purpose: "Presents and analyses your data. Reports results organised by research question or theme — then analyses what they mean. Does not simply list results.",
    checklist: [
      "Organised by research question or theme (not by data collection order)",
      "Every result connects back to the research questions",
      "Tables and figures are numbered, titled, and referenced in the text",
      "Quantitative: report significance levels, effect sizes, confidence intervals",
      "Qualitative: use direct quotes as evidence for each theme",
      "Analysis and interpretation follow each result — not just raw data",
    ],
    tip: "A common mistake: presenting results without analysis. After every table or quote, explain what it means: 'This indicates that…', 'These figures suggest…'. The examiner wants your interpretation.",
  },
  conclusion: {
    purpose: "Closes the argument. Directly answers your research questions, summarises key findings, discusses contributions to knowledge, and gives recommendations for practice and future research.",
    checklist: [
      "Summary of key findings — answer each research question explicitly",
      "Contribution to knowledge — what does your study add that didn't exist before?",
      "Practical implications — what should practitioners or policymakers do differently?",
      "Limitations of your study — be honest about what you couldn't control",
      "Recommendations for future research — what should come next?",
      "Concluding reflection — return to the problem statement from Chapter 1",
    ],
    tip: "Avoid introducing new evidence in the conclusion. Everything here should flow from what you've already established. Think of it as 'paying off' all the questions you raised in Chapter 1.",
  },
  abstract: {
    purpose: "A self-contained summary of the entire dissertation — problem, method, key findings, and conclusions — in 250–350 words. Written last, read first.",
    checklist: [
      "Background / context (1–2 sentences)",
      "Research gap or problem (1 sentence)",
      "Aim, objectives, or research questions (1–2 sentences)",
      "Methodology overview — design, sample, analysis method (2–3 sentences)",
      "Key findings (2–3 sentences)",
      "Conclusions and implications (1–2 sentences)",
      "Keywords — 5–7 terms listed below the abstract",
    ],
    tip: "Write the abstract after finishing all other chapters. Read your introduction, findings, and conclusion side by side, then summarise each section in 1–2 sentences. It should make sense to someone who hasn't read the dissertation.",
  },
};
