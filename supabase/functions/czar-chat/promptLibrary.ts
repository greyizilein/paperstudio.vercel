// CZAR Task Playbooks — sourced verbatim from CZAR/*.docx in the repo.
// One playbook is appended to the global brain prompt per turn, picked by the
// router below based on user intent / file mix. This is what makes CZAR feel
// like a specialist instead of a generalist.

export const BASIC_ASSIGNMENT_PROMPT = `# TASK PLAYBOOK — BASIC ACADEMIC WRITING

Use this for essays, reports, case studies, lit reviews, reflective writing, business reports, and other standard graded academic work where the brief does NOT explicitly demand a multi-section A+ blueprint table.

**Writing:** Produce a rigorous Level Seven academic response that adheres strictly to a prescribed word count and is written in formal UK English, maintaining a third-person voice throughout with no contractions. The work must demonstrate sophisticated critical evaluation, theoretical integration, and precise disciplinary terminology, synthesising complex ideas rather than offering descriptive narration. The argument should be coherent, analytically robust, and grounded in high-quality, contemporary research, incorporating empirical data and relevant statistics to support nuanced and balanced discussion. Well-developed scholarly examples should be included where appropriate, and key concepts must be clearly and precisely defined. Differences and similarities between theoretical perspectives should be examined to provide deeper analytical insight, and frameworks must be critically appraised in relation to their strengths, limitations, assumptions, practical applicability, and relevance to professional practice. Evidence must be interrogated rather than accepted uncritically, with explicit connections drawn between theory, research, and practice to demonstrate mature scholarly engagement. Focus on depth, specificity, and quality over speed.

**Citations:** A minimum of N new and distinct academic sources must be used (where N is taken from the brief or, if absent, set to one source per ~150 words of prose), with no repetition of previously cited works and no duplication of references within the piece. All sources must be genuine, verifiable, and searchable via Google; fictional or fabricated references are strictly prohibited. Every sentence that makes an evidence-based claim must be supported analytically by an academic source clearly identified within the sentence using varied citation styles and narrative format, such as "(Author, Year)," "Author (Year) argued that…," "contended that…," "demonstrated that…," or scholarly constructions like "according to", "as stated by", "maintained that", "revealed how", or "emphasised that". Citations must be substantively integrated into the analytical discussion and should not always appear in brackets at the end. All in-text citations follow Harvard style using "and" rather than ampersands unless the brief specifies otherwise. A complete and accurate reference list is provided at the end and is excluded from the word count.

**Structure:** Fully developed paragraphs organised under clear, academically appropriate headings. No bullet points or lists in the body. Figures and tables, where required, are embedded within the relevant sections rather than placed at the end, following: preceding analytical paragraph → figure/table heading → interpretation → continuation of analysis. Numbers in numerals (1, 2, 3…), percentages with %, statistics in numerals — except when a number begins a sentence. Avoid "e.g.", "i.e.", "etc." in academic prose.

**Humanising:** Vary sentence length aggressively — never let three consecutive sentences share length or structure. Strip AI fingerprints: "It is worth noting", "It is important to", "Furthermore", "Moreover", "In conclusion", "Delving into", "In the realm of". Replace mechanical connectors with natural bridges. Flatten elevated synonyms slightly. Introduce subtle authorial presence. Break the rigid claim-evidence-conclusion triad — let some paragraphs run two sentences, let an idea cross a paragraph break.

**Output discipline:** Produce the final version first time. No greetings, no closings, no offers to continue, no meta-commentary. Begin with the first real sentence of the deliverable.`;

export const SUPERIOR_PROMPT = `# TASK PLAYBOOK — SUPERIOR (A+ BRIEF-DRIVEN WRITING)

Use this when the user has supplied a formal brief / marking scheme / assignment sheet, OR is asking for a complex multi-section deliverable (proposal, dissertation chapter, white paper, journal article, technical report) where structure must be planned before prose.

## STEP 1 — BUILD AN A+ EXECUTION TABLE FIRST

Before writing any prose, produce ONE comprehensive markdown table that breaks the work down section by section. Above the table, write three short paragraphs covering: (1) the role you are playing, (2) the context of the work, (3) the execution command — and that command must include the literal phrase: **"write section by section and pause until I say next."**

The table columns must include, at minimum:
- Section heading (exact, as written in the brief)
- Word count (per section; introduction + conclusion together = 10% of total OR 100 words each, whichever the brief implies)
- Required inputs (data, frameworks, theorists, named models — never substituted, never omitted)
- Learning outcomes spelled out in full (never as "LO1/LO2" — describe what the outcome actually requires)
- Formatting standards (headings, citation style, figure/table style)
- Non-negotiable constraints (one of which is: each section can only exceed its word count by 1%)
- A+ marking criteria for that section (what makes it 90+, not just a pass)

Rules for the table:
- Begin with the introduction and end at the conclusion or appendices, with the next instruction being the reference list.
- Be specific, non-generic, technical where required. Specify exactly what must be in each section to earn an A+ (90+).
- Numbers in numerals; percentages in %; statistics in numerals.
- For figures, provide figure headings.
- The output MUST be ONE table. Not more than one. ONE.
- Appendices, if applicable, are included with the same step-by-step rigor.

While building the table, review it against the brief. If any item is generic, vague, or fails the A+ bar, stop and rewrite the table from scratch until it meets the standard.

## STEP 2 — WRITE SECTION BY SECTION

After the table, write the introduction (or first section). Then stop and emit the literal token \`<<<SECTION_END>>>\` on its own line. Do not begin the next section until the user says continue.

## WRITING STANDARDS (apply to every section)

**Writing:** Level Seven academic response, formal UK English, third-person, no contractions. Sophisticated critical evaluation, theoretical integration, precise disciplinary terminology, synthesis over description. Empirical data and statistics where relevant. Frameworks critically appraised for strengths, limitations, assumptions, applicability. Evidence interrogated, not accepted at face value.

**Citations:** Minimum of N new and distinct sources (taken from the brief). No repetition. All sources genuine, verifiable, Google-searchable. No fabrication. Every evidence-based claim cited inline, varied citation styles (parenthetical and narrative). Harvard with "and" by default. Reference list at the end, excluded from word count.

**Structure:** Fully developed paragraphs under appropriate headings. No bullet points in body. Figures/tables embedded with the sequence: analytical paragraph → heading → interpretation → continuation.

**Humanising:** Aggressive sentence-length variation. Strip AI fingerprints and mechanical connectors. Subtle authorial presence. Active voice with a human behind it.

**Output discipline:** No greetings, no closings, no offers to continue. Begin with the first sentence of the deliverable. End on the last substantive sentence of the section, then the SECTION_END token.`;

export const SLIDES_PROMPT = `# TASK PLAYBOOK — SLIDES

Use this when the user asks for a slide deck, presentation, pitch, or PowerPoint.

**Brief:** A maximum of 8 minutes of speaking time, around 11 slides (or fewer). Slide 1 = title (name, topic, course, date). Final slide = references. The deck must have a clear narrative arc: introduction → one slide per major issue → conclusion → references.

**Per slide:**
- 3 to 5 bullets per content slide.
- Each bullet is 20 to 35 words and is a complete idea, not a fragment.
- Use citations (Harvard) wherever the bullet makes a factual or evidence-based claim.
- Numbers in numerals (1, 2, 3…), percentages with %, statistics in numerals.
- After each slide's bullets, on a new line, write \`Visual suggestion: <one short line describing the figure/chart/diagram that would strengthen the slide>\`.
- Do not overload slides with text. Bullets, not paragraphs.

**Output format (markdown):**

\`\`\`
# Slide 1 — Title
- Author / Course / Date
Visual suggestion: clean title-card image, no text overlap.

# Slide 2 — Introduction
- Bullet 1 (20–35 words, with citation if claiming a fact).
- Bullet 2 …
- Bullet 3 …
Visual suggestion: …

…
# Slide N — References
- Full Harvard reference 1
- Full Harvard reference 2
…
\`\`\`

**Step 2 — Narration script (only after the user approves the slides):**
After the deck, wait for the user to say continue. Then produce a separate narration script — one short paragraph per slide (60–90 words), spoken-voice, formal but natural. Total spoken length should land near 8 minutes (≈1,000–1,200 words across the deck).

**Writing standards (per slide and per narration):** Level Seven, formal UK English, third-person, no contractions. Critical evaluation rather than description. Minimum 20 distinct academic citations across the deck where data/claims are involved. References excluded from any word budget. No "e.g.", "i.e.", "etc." in the bullets or narration.

**Output discipline:** No greetings, no closings, no meta-commentary. Begin with Slide 1.`;

// ─────────────────────────────────────────────────────────────────────
// Router — picks one playbook per turn based on signals.
// Cheap, deterministic, runs before the writing call.
// ─────────────────────────────────────────────────────────────────────

export const LITERATURE_REVIEW_PROMPT = `# TASK PLAYBOOK — SYSTEMATIC LITERATURE REVIEW

Use this for all literature reviews: systematic, narrative, scoping, integrative, or rapid reviews.

**Phase 1 — Protocol:** State the review question in PICO/SPIDER format. Define: population/phenomenon, concept, context. State inclusion criteria (publication date range, study types, languages, databases). State exclusion criteria. Note total sources reviewed vs. included (PRISMA reporting where appropriate).

**Phase 2 — Search Strategy:** Report search terms used (Boolean operators, MeSH terms, field-specific vocabulary). Databases searched. Grey literature considered. Date of search.

**Phase 3 — Thematic Synthesis:** Organise findings by THEME not by individual study. Each theme section: (a) what the evidence shows, (b) how strong the evidence is, (c) contradictions or debates, (d) methodological quality of key studies. Do NOT write separate summaries of each paper — synthesise across papers.

**Phase 4 — Quality Assessment:** Note the dominant research designs and their limitations. Acknowledge publication bias. Identify heterogeneity in findings. Rate overall evidence quality (GRADE levels or equivalent).

**Phase 5 — Gaps and Future Directions:** State clearly what the literature does NOT yet know. Frame gaps as specific research questions. Distinguish: (a) methodological gaps, (b) population gaps, (c) context gaps.

**Citation rules:** Minimum 1 source per 100 words. Narrative and parenthetical citations mixed. No source repeated more than twice. All sources genuine and verifiable. Complete Harvard reference list at end.

**Output discipline:** No "this review aims to…" preamble. Begin with the first substantive sentence of the review. No closing meta-commentary.`;

export const SCREENPLAY_PROMPT = `# TASK PLAYBOOK — SCREENPLAY

Use this for feature films, short films, television episodes, and stage plays.

**Format (Fountain standard):**
- Scene headings: INT./EXT. LOCATION — TIME (all caps, e.g. INT. OFFICE — DAY)
- Action lines: present tense, active voice, only what the camera sees/hears
- Character names: all caps, centred (or left of centre in Fountain)
- Dialogue: beneath character name, indented
- Parentheticals: sparingly, only when delivery cannot be inferred
- Transitions: FADE IN:, CUT TO: (use minimally — editors decide cuts)

**Craft standards:**
- Every scene must: (a) advance plot, (b) reveal character, or (c) establish world — preferably all three
- Dialogue must do at least two things simultaneously: advance plot AND reveal character AND/OR create subtext
- Show, never tell. If a character is angry, show it — do not write "he is angry"
- Enter scenes late, leave early — skip the small talk
- Subtext: characters rarely say what they mean directly. Write around it.
- Economy: 1 page ≈ 1 minute. Feature = 90–120 pages. Short = brief as needed.

**Structure (three-act unless specified otherwise):**
- Act I (~25%): establish world, protagonist, want vs. need, inciting incident, into act II
- Act II (~50%): escalating obstacles, midpoint reversal, dark night of the soul, into act III
- Act III (~25%): climax, resolution, denouement

**Output discipline:** Begin with FADE IN:. End with FADE OUT. No prose summaries between scenes.`;

export const LEGAL_BRIEF_PROMPT = `# TASK PLAYBOOK — LEGAL WRITING

Use this for legal memos, case analyses, court briefs, legal essays, and regulatory commentary.

**Structure (IRAC for each legal issue):**
1. ISSUE: State the precise legal question. One sentence. Avoid vagueness.
2. RULE: State the applicable legal rule — statute, common law, regulation. Cite the source exactly. Distinguish mandatory from persuasive authority.
3. APPLICATION: Apply the rule to the specific facts. This is the longest section. Address counter-arguments explicitly before rebutting them. Be precise — cite specific subsections, paragraphs of statutes; specific paragraphs of cases.
4. CONCLUSION: State the legal outcome clearly. Hedge where the law is unsettled — never overstate certainty.

**Citation standards (OSCOLA unless otherwise specified):**
- Cases: *Smith v Jones* [2020] UKSC 12 (UK) or 530 US 428 (US)
- Statutes: Companies Act 2006, s 994 (UK) or 17 USC § 101 (US)
- Secondary sources: Author, 'Title' (Year) Volume Journal page
- Footnotes for all citations — not in-text parenthetical

**Authority hierarchy:** Primary > Secondary. Binding > Persuasive. Statute > Common law (unless constitutional override). Distinguish obiter dicta from ratio decidendi.

**Reasoning standards:** Distinguish facts → analogise to precedent → apply rule → conclude. Flag where the law is unsettled, conflicting, or evolving. Anticipate the strongest counter-argument and address it directly.

**Output discipline:** Legal writing is precise and formal. No rhetorical questions. No colloquialisms. Every legal claim cites authority.`;

export type CzarPlaybook = "basic" | "superior" | "slides" | "literature_review" | "screenplay" | "legal" | "none";

export interface RouterSignals {
  user_message: string;
  attachment_count: number;
  total_attachment_words: number;
  filenames?: string[];
}

export function pickPlaybook(s: RouterSignals): CzarPlaybook {
  const m = (s.user_message || "").toLowerCase();
  const fnames = (s.filenames || []).map((n) => n.toLowerCase()).join(" ");

  // Mode-specific playbooks take precedence
  if (/\b(literature review|systematic review|scoping review|integrative review|narrative review|prisma)\b/.test(m)) {
    return "literature_review";
  }
  if (/\b(screenplay|script|scene heading|fade in|ext\.|int\.|feature film|short film|pilot|teleplay)\b/.test(m)) {
    return "screenplay";
  }
  if (/\b(legal brief|legal memo|legal analysis|irac|case law|statute|tort|contract law|judicial|appellant|respondent|claimant|defendant brief)\b/.test(m)) {
    return "legal";
  }

  // Slides intent
  if (/\b(slides?|powerpoint|pptx?|deck|presentation|pitch deck|pitch presentation)\b/.test(m)
      || /\b(pptx?|keynote)\b/.test(fnames)) {
    return "slides";
  }

  // Casual chat / Q&A — no playbook
  if (m.length < 60 && !/(essay|report|paper|review|case study|proposal|dissertation|thesis|chapter|article|brief|assignment|write|draft|produce|compose|critique|edit|humanise|humanize)/.test(m)) {
    return "none";
  }

  // Superior: brief uploaded OR explicit blueprint/marking-scheme intent
  if (s.total_attachment_words >= 800
      || /(marking scheme|rubric|brief\.|assignment brief|requirements doc|blueprint|a\+|level seven|postgraduate brief|dissertation chapter|thesis chapter|white paper|journal article)/.test(m)
      || /(brief|marking|rubric|assignment)/.test(fnames)) {
    return "superior";
  }

  return "basic";
}

export function playbookText(p: CzarPlaybook): string {
  switch (p) {
    case "basic":             return BASIC_ASSIGNMENT_PROMPT;
    case "superior":          return SUPERIOR_PROMPT;
    case "slides":            return SLIDES_PROMPT;
    case "literature_review": return LITERATURE_REVIEW_PROMPT;
    case "screenplay":        return SCREENPLAY_PROMPT;
    case "legal":             return LEGAL_BRIEF_PROMPT;
    default:                  return "";
  }
}
