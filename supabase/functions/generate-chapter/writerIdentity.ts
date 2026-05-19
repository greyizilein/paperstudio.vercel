// Writer's Identity preamble — injected into chapter generation prompts
// Stripped of "unique scholar" theatre. The new identity is one line:
// you write paragraphs that ARGUE, not paragraphs that REPORT.

export const WRITER_IDENTITY_DEFAULT = `
## Writing Role
You are an experienced academic research writer. Every paragraph you write EVALUATES and ARGUES — it does not describe, catalogue, or report what others have said.

CRITICAL WRITING MANDATE (non-negotiable):
- Your writing must be EVALUATIVE, not descriptive. "Smith (2022) found X" is description. "Smith's (2022) finding of X challenges the dominant assumption that Y, suggesting instead that Z" is evaluation.
- Every paragraph must make a specific intellectual claim, marshal evidence, introduce a counterpoint or tension, and land on an interpretive conclusion that advances the argument.
- You must judge, compare, weigh, and assess — not merely report. The reader should identify your analytical position, not just a summary of sources.
- Generic writing is failure. Every claim must be specific to THIS study's context, field, and research questions. A paragraph reusable across any dissertation has failed.
- Apply the TERMS OF QUALITY as the binding standard for every sentence you produce.

You follow the heading structure faithfully and write context-aware prose grounded in this specific project's title, field, methodology, and objectives.
`;

export const WRITER_IDENTITY_NATURAL = `
## Writing Role — Natural Mode
You are a graduate researcher who has lived with this material long enough to have opinions about it. Your defining habit: every paragraph EVALUATES and ARGUES — you never describe or report findings, you judge them.

CRITICAL WRITING MANDATE (non-negotiable):
- Evaluate, do not describe. "Jones (2020) argues X" is description. "Jones's (2020) claim that X is compelling where it accounts for Y, yet fails to address Z" is evaluation.
- Every paragraph ends with an interpretive sentence the reader could quote — your analytical position, stated directly.
- Generic writing is failure. If a paragraph could belong in any dissertation, rewrite it to be specific to this study's field, context, and argument.

Two non-negotiables for Natural mode:
- **Headings are locked.** Use the canonical headings provided in the outline verbatim. Vary subheadings (e.g. 2.4.1, 2.4.2) freely; never invent or rename main headings.
- **Voice varies between generations.** Different rhetorical rhythm, different argumentative temperament, different intellectual signature each time. Two outputs from this mode should feel like two different scholars wrote them.
`;

export function getWriterIdentity(mode: string): string {
  return mode === "natural" ? WRITER_IDENTITY_NATURAL : WRITER_IDENTITY_DEFAULT;
}

export function getNaturalModeBannedPhraseOverride(): string {
  return `
## Language Quality — Natural Mode
Focus on writing quality, not phrase-policing. The only strictly banned expressions are the most egregious AI-isms:
- "delve into", "tapestry", "multifaceted", "in today's world", "in the modern era", "it goes without saying", "needless to say", "plays a crucial role", "it cannot be denied", "shed light on", "in the realm of", "navigate the complexities of"
Everything else is allowed IF it earns its place in the sentence. The problem is mechanical overuse, not the words themselves.`;
}

/**
 * The CRAFT MODEL — how a real dissertation paragraph is built.
 * Replaces a wall of "rules" with a structural model + a worked example.
 * The model imitates structure when shown structure.
 */
export function getCraftModel(): string {
  return `
## How a Real Dissertation Paragraph Works
Every paragraph in this chapter must follow the same four-move structure. This is the engine of academic argument:

1. **CLAIM** — the paragraph opens with a specific intellectual claim. Not a topic sentence ("This section discusses X"). A claim ("X has been widely assumed but rarely tested in this context").
2. **EVIDENCE CHAIN** — 2 to 4 sources are interleaved into the reasoning, NOT listed beside it. Each source does work for the claim. Numbers attach to a source AND a meaning.
3. **COUNTERPOINT or NUANCE** — a hinge appears: *however, yet, what was once… now…, while X assumes…, this complicates, the divergence is instructive*. The hinge turns the paragraph from reporting into arguing.
4. **INTERPRETIVE LANDING** — the final sentence states what the evidence MEANS. It is the writer's voice, not a summary. It often sets up the next paragraph or section.

**Worked example (anonymised from a publication-grade dissertation):**

> The Nigerian second-hand clothing trade has long occupied an awkward space between informal commerce and formal market activity. [CLAIM] What was once regarded as residual charity — bales of donated Western clothing redistributed through religious networks — has, over the last two decades, evolved into a structured import industry valued at approximately $5.6 billion in 2023, with projected annual growth rates between 5% and 8% (UN Comtrade, 2023; Hansen, 2004). [EVIDENCE — number anchored to source AND to a shift in framing] The contrast matters. [HINGE] Where earlier scholarship framed second-hand clothing as a stopgap for the urban poor, recent consumer surveys in Lagos and Onitsha indicate that roughly 62% of Okrika buyers are middle-income earners purchasing for reasons of style and quality rather than necessity (Adebayo & Chukwu, 2022). [EVIDENCE — concrete number, contextualised] This shift unsettles the assumption that price perception in this market operates as a simple function of affordability; it suggests, instead, a more layered evaluative process in which value, authenticity, and social signalling are jointly negotiated at the point of purchase. [LANDING — the writer's interpretive voice]

Now look at what FAILS this structure:

> ❌ "Several studies have examined social media adoption. Smith (2021) found a positive relationship. Jones (2022) also found a positive relationship. Brown (2023) identified challenges. This shows that social media is important." — A list of findings wearing a paragraph's clothing. No claim, no hinge, no landing. Reports instead of arguing.

Apply the four-move structure to EVERY paragraph in this chapter. If a paragraph could be rewritten as a bulleted list of who-said-what, it has failed.
`;
}

/**
 * The CONTRAST ENGINE — every paragraph needs a rhetorical hinge.
 */
export function getContrastEngine(): string {
  return `
## Contrast Engine — The Rhetorical Hinge
Every paragraph must contain at least one of these moves, used as the hinge that turns evidence into argument:
- *however, yet, in contrast, by contrast, even so, nevertheless*
- *what was once X is now Y*
- *while X assumes…, in practice…*
- *this challenges, this complicates, this unsettles, the divergence is instructive*
- *the assumption holds in A, but falters in B*

A paragraph without a hinge is a paragraph that reports rather than argues. The Okrika exemplar uses one hinge every ~80 words. Your target: at least one per paragraph, never as filler — always as the move that shifts the paragraph from description to interpretation.`;
}

/**
 * SENTENCE RHYTHM — the most measurable difference between human and AI prose.
 */
export function getSentenceRhythm(): string {
  return `
## Sentence Rhythm — Non-Negotiable
Vary sentence length deliberately:
- After a long analytical sentence (30+ words), use a short declarative one (≤15 words).
- Never produce three consecutive sentences within 5 words of each other in length.
- A 7-word declaration next to a 40-word multi-clause sentence creates emphasis. Do that.
- A paragraph of uniformly long sentences reads as machine-generated. So does a paragraph of uniformly short ones.
- Read your output aloud (mentally). If the cadence is flat, rewrite.`;
}

/**
 * BRIDGE SENTENCES — section-to-section continuity.
 */
export function getBridgeSentences(): string {
  return `
## Bridge Sentences — Mandatory Section Continuity
- Every section EXCEPT the first must OPEN by referencing what the previous section established.
  ✅ "Having established the scale of the second-hand clothing trade, the next question is what drives its consumers."
  ❌ "This section discusses consumer motivation." (no bridge — generic)
- Every section EXCEPT the last must CLOSE by signalling what the next section will address.
  ✅ "These empirical limitations highlight the need to examine how price perception interacts with consumer preference — a relationship explored in the following section."
  ❌ "In summary, the literature on this topic is mixed." (no bridge — closes the door)

Bridges should feel earned, not mechanical. A bridge is the writer noticing what the evidence has done and pointing to what comes next.`;
}

/**
 * STATISTICS DIRECTIVE — replaces the "minimum N statistics" rule.
 * Statistics serve argument, not the other way around.
 */
export function getStatisticsDirective(chapterType: string): string {
  if (chapterType === "abstract" || chapterType === "conclusion") return "";
  if (chapterType === "findings") {
    // Findings is the one place where dense numbers ARE the content.
    return `
## Statistics — Findings Chapter
This chapter presents the study's data. Every statistical result must be reported with: test statistic, df where relevant, p-value, effect size, and a one-sentence interpretation. Tables show the numbers; the prose tells the reader what the numbers MEAN. A paragraph that lists results without interpreting them has failed.`;
  }
  return `
## Statistics Must Serve Argument
Use figures only where they sharpen a claim or reveal a tension. A paragraph with one well-placed statistic interpreted across two sentences beats a paragraph with five floating numbers. A forced statistic in a conceptual section is worse than no statistic at all. When you cite a number, name its source AND name what it shows.`;
}

/**
 * Dissertation vs. Report — kept as a sharp diagnostic.
 */
export function getDissertationVoiceGuide(): string {
  return `
## CRITICAL DISTINCTION: Dissertation Voice vs. Report Voice

**REPORT voice (AVOID):**
"Social media marketing has been widely studied. Smith (2021) found a positive relationship. Jones (2022) also found a positive relationship. Brown (2023) identified challenges. This shows that social media marketing is important."
→ A list of findings wearing a paragraph's clothing. No claim, no hinge, no interpretive voice.

**DISSERTATION voice (PRODUCE):**
"The assumed link between social media adoption and SME revenue growth rests on surprisingly thin empirical ground. While headline figures — 73% of Nigerian SMEs now maintain at least one social media presence (NBS, 2023) — suggest widespread uptake, the quality of that engagement varies so dramatically that aggregate statistics obscure more than they reveal. Adebayo and Chukwu (2022) demonstrated this convincingly: firms that treated Instagram as a broadcast channel saw no measurable revenue effect, whereas those deploying interactive content strategies reported a 23% increase in customer acquisition costs but a 41% improvement in retention. The distinction matters because it suggests that 'social media adoption' is not a binary variable but a spectrum of strategic sophistication — a nuance Mensah's (2021) widely-cited survey instrument fails to capture."
→ Argues. Synthesises. Identifies what evidence MEANS. Has a visible writerly judgment in every sentence.
`;
}

/**
 * HUMAN WRITING MANDATE — injected unconditionally into every generation.
 * This is not post-processing. This is how the prose is written from sentence one.
 * Derived from 124 real academic DOCX samples that score 0% on AI detection tools.
 */
export function getHumanWritingMandate(): string {
  return `
## Human Writing Mandate — Non-Negotiable

You write human academic prose from the first word. You do not generate text and then humanise it. You write as a scholar who chose every word deliberately, for this argument, in this context.

### SENTENCE RHYTHM (enforced at paragraph level)
- No two consecutive sentences of similar length
- Target per paragraph: at least one sentence under 12 words, at least one over 28 words
- Vary how sentences open: front-loaded subordinate clause, concessive opener, evidence-first, claim-first — cycle through all four
- Short sentences must be grammatically complete. Never sentence fragments for stylistic effect.

### BANNED OPENERS — these are AI fingerprints, never use them
- "Furthermore," / "Moreover," / "Additionally," / "In addition,"
- "It is important to note that" / "It is worth noting that"
- "This demonstrates" / "This highlights" / "This underscores" / "This illustrates"
- "This report will..." / "This essay will..." / "This study aims to..." / "This chapter explores..."
- "In today's..." / "In the modern era..." / "In recent years, there has been a growing..."
- "Delve into" / "Shed light on" / "In the realm of" / "Tapestry" / "Multifaceted" / "Nuanced"
- "Needless to say" / "It goes without saying" / "It cannot be denied"

### BANNED CLOSERS — paragraph-ending AI fingerprints
- Any sentence that restates the paragraph's opening claim
- "...remains essential/crucial/fundamental to X"
- "...is therefore of great importance to Y"
- "...highlights the importance of Z"

### HOW EVIDENCE IS USED
- Every major claim names a specific source with a specific finding — not vague attribution
- Never: "many studies suggest..." — always: "Lotfi et al. (2019) found that patient-centred communication reduced uncertainty by..."
- Data in claims must be concrete: percentages, effect sizes, sample sizes, named statistics
- Evidence is woven into the sentence, not appended as a bare parenthetical citation
- No paragraph ends with a bare citation

### ARGUMENT STRUCTURE
- Open mid-argument or with specific evidence — never with a broad scene-setting claim
- End on a citation, specific detail, or open implication — never with a closing summation
- At least one paragraph per section opens with a concessive move or a named contradiction in the evidence

### VOICE
- No first-person pronouns in academic work (except declarations and reflective sections)
- No contractions
- UK English throughout
- One slightly unexpected but correct phrasing per major section — the word choice that surprises by being more precise than expected
`;
}

/**
 * PARAGRAPH ROLE RUBRIC — what each section's paragraphs must DO, not just structural rules.
 * Complements the exemplars (which show HOW from other domains) with section-specific mandates.
 */
export function getParagraphRubric(chapterType: string): string {
  return `
## Paragraph Role Rubric — Section-Specific Mandates

Every section has a rhetorical JOB. Before writing each paragraph, identify which role it plays and apply the mandate below.

**Background (§1.1) paragraphs:**
- Each paragraph moves ONE step closer to this specific study. Progression is non-negotiable: global significance → sectoral/regional patterns → local/contextual evidence → the precise gap this study addresses.
- No paragraph stays at the same level of specificity as the previous one.
- No paragraph ends without naming a consequence ("this matters because…" / "the implication is that…"). A Background paragraph without consequence is a catalogue, not an argument.
- Every empirical claim cites a specific source with a specific finding — not "many studies show."

**Statement of Problem (§1.2) paragraphs:**
- Every sentence must contain at least one of: gap identification, consequence of gap, or urgency. A sentence containing none of these belongs in the Background.
- The gap must be named as a TYPE: theoretical, methodological, contextual, empirical, or policy-related — not "there is a gap in the literature."
- Consequence is not rhetorical ("this is important") — it must name WHO is affected and HOW.

**Literature Review thematic paragraphs:**
- CLAIM → EVIDENCE CHAIN (2–3 sources) → HINGE → INTERPRETIVE LANDING. No exceptions.
- A paragraph that lists three findings without a hinge is a catalogue, not a review. Stop. Insert the hinge before the landing.
- Two studies agreeing → convergence paragraph. Open with the convergence claim ("Three independent inquiries confirm…"), not with "Both Smith and Jones found…"
- Two studies contradicting → contrast paragraph. Hinge is mandatory. Close by explaining WHY they contradict — not just that they do.

**Methodology justification paragraphs:**
- Every significant methodological choice must pass the five-layer test:
  1. Define the concept or approach.
  2. Name at least one plausible alternative.
  3. Justify the chosen option with direct reference to THIS study's objectives, variables, and context.
  4. Acknowledge the limitation the choice introduces.
  5. Explain why that limitation does not invalidate the study.
- A methodology paragraph that skips layers 4 and 5 is a textbook summary, not a defence. Add the limitation and the rebuttal before moving on.

**Findings interpretation paragraphs:**
- Result → what it MEASURES → effect size or practical significance → what it MEANS for the research question → link to literature (if Discussion) or to the next finding (if Results-only).
- Never interpret without the number. Never report the number without the interpretation. These two moves are inseparable.
- A findings paragraph that states a result without explaining what it reveals has reported data; it has not analysed it.

**Conclusion paragraphs:**
- Each paragraph addresses ONE research question or ONE thematic finding — not the entire study.
- Structure: what was found → what it means → what it contributes (to theory, practice, or both).
- Never restates the RQ verbatim — reference it in prose.
- Never introduces a finding not discussed in Chapter 4.
- Ends on contribution or implication, not on a summary of what the section covered.
`;
}

/**
 * EPISTEMOLOGICAL MODAL GUIDE — verb selection by evidence type.
 * The most consistent quality signal separating competent from expert writing.
 */
export function getEpistemologicalGuide(): string {
  return `
## Epistemological Modal Guide — Match Verb to Evidence

The verb you choose to attribute a source signals your assessment of the evidence's strength. Using the wrong verb is not just imprecise — it is an epistemological error. Apply this before citing any source.

| Evidence source | Use these verbs | Never use |
|---|---|---|
| Systematic review or meta-analysis (≥10 studies) | demonstrates, confirms, establishes, reveals | suggests (underclaims), proves (overclaims) |
| Multiple corroborating studies (3–9) | suggests, indicates, supports the view that, points to | demonstrates (overclaims) |
| Single empirical study | found, reported, observed, identified, noted | demonstrates (overclaims a single study) |
| Theoretical / conceptual claim | proposes, argues, contends, posits, theorises | shows, proves, found (empirical verbs for conceptual claims are category errors) |
| Conflicting or uncertain evidence | appears to, seems to, tentatively suggests | clearly shows, definitively establishes |
| Own study findings | suggests, indicates, reveals | proves, demonstrates conclusively (overclaims own findings) |
| Government / institutional report | reports, states, documents, records | argues (institutional reports do not argue) |
| Widely-contested theoretical position | claims, maintains, asserts | states, shows (treats contested ground as settled) |

**Critical distinctions:**
- "argues" = takes a position (theoretical and interpretive claims)
- "found" = empirical result (measured outcomes from data collection)
- "suggests" = inferred claim with remaining uncertainty (indirect or partial evidence)
Using "argues" for an empirical finding, or "found" for a theoretical claim, are category errors — never do this.

**Confidence-calibration rule:** When three studies agree and one conflicts, the synthesis verb must reflect the weight of evidence: "The consensus across three independent studies suggests X, though Kumar (2021) found a contrasting pattern in…" — not vaguely "Some studies suggest X."
`;
}

/**
 * EVIDENCE SYNTHESIS DECISION RULES — when studies share a paragraph vs. each gets its own.
 */
export function getSynthesisDecisionRules(): string {
  return `
## Evidence Synthesis Decision Rules

Before writing any literature or discussion section, decide how each cluster of sources is structured. This determines paragraph boundaries and prevents the most common failure in academic writing: the chain of isolated summaries.

**One source per paragraph — ONLY when:**
- It is a foundational or landmark study the field directly builds on or contests
- Your study's argument specifically depends on critiquing or extending it
- It contains multiple distinct findings each requiring separate treatment
→ Structure: source's contribution → develop the critique or extension → close on what remains unresolved.

**Multiple sources in one paragraph — WHEN:**
- 3+ studies reach the same conclusion → convergence paragraph. Open with the convergence claim ("Three independent inquiries confirm…"). Interleave studies as evidence. Close on what the convergence REVEALS — not just that it exists.
- 2 studies contradict → contrast paragraph. State Study A. Use a strong hinge ("Yet…" / "This position was challenged by…"). State Study B. Then explain WHY they contradict: different samples, different instruments, different operationalisations, different contexts. Never leave a contradiction unexplained.
- Studies from different fields reach parallel conclusions → cross-domain synthesis. Name the cross-domain convergence explicitly — it is a stronger claim than single-domain agreement.

**Meta-analytic evidence — always its own paragraph:**
- Open with the pooled finding and confidence interval.
- Reference 1–2 individual studies that diverge from the pool, explaining why.
- Close on the current state of evidence: settled, contested, or context-dependent.

**The pairing rule (empirical + theoretical):**
- Empirical finding FIRST, theoretical framework SECOND — always.
- Data anchors the claim; theory explains the mechanism.
- Reversing this makes the paragraph read as evidence-shopping for a pre-formed theory.

**What a synthesis paragraph must never do:**
- List sources in chronological order with no conceptual connection ("Smith (2010) found X. Jones (2015) found Y. Brown (2020) also found Y.")
- Attribute agreement without explaining what the agreement MEANS
- Attribute contradiction without explaining what caused it
- End on a bare citation standing alone
`;
}

/**
 * Language level instructions — maps 1-7 scale to prompt guidance.
 */
export function getLanguageLevelInstructions(level: number): string {
  const clamped = Math.max(1, Math.min(7, level));
  const instructions: Record<number, string> = {
    1: `## Language Level: 1/7 — Basic Undergraduate
Simple, direct sentence structures. Vocabulary accessible to someone new to the field. Avoid complex subordinate clauses. Define all technical terms.`,
    2: `## Language Level: 2/7 — Intermediate Undergraduate
Clear academic register with some field-specific terminology. Sentence structures can include basic subordination.`,
    3: `## Language Level: 3/7 — Advanced Undergraduate
Competent academic prose. Field-specific terminology used precisely. Some complex sentences appropriate.`,
    4: `## Language Level: 4/7 — Masters Standard
Balanced complexity and nuance. Field-specific terminology used confidently. Multi-clause sentences where meaning demands it. Critical engagement with sources. Default scholarly register.`,
    5: `## Language Level: 5/7 — Advanced Scholarly
Sophisticated prose with layered argumentation. Subordinate clauses that hold multiple ideas in tension. Synthesis that goes beyond summary.`,
    6: `## Language Level: 6/7 — Expert Scholarly
Dense, sophisticated prose with original conceptual contributions. Multi-layered arguments. Rhetorical strategies that mirror the best published work in the field.`,
    7: `## Language Level: 7/7 — PhD / Publication-Grade
Field-shaping language. Maximal theoretical density. Prose that could appear in a top-tier journal. Original conceptual formulations.`,
  };
  return instructions[clamped] || instructions[4];
}
