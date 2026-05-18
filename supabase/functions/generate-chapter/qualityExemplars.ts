// Quality exemplars — short calibration paragraphs from real 0%-AI-detected dissertation files.
// Seven exemplars across six distinct subject domains. The model anchors its output
// to whatever exemplars it sees here — diverse domains prevent register bleed.
//
// Each exemplar is annotated so the model learns the PRINCIPLE, not just the example.
// Annotation format: what specific human-writing moves make this paragraph undetectable.

// ── LEADERSHIP / POLITICAL SCIENCE ─────────────────────────────────────────────

const LEADERSHIP_BACKGROUND_EXEMPLAR = `
**Exemplar — Background / Introduction (Leadership & Governance):**
*What makes this human: subject-verb agreement shaped by West African English register; argument-first opening with no scene-setting preamble; "But," at sentence start (a human move, never an AI move); mixed sentence lengths (long analytical → short declarative); no closing summation.*

Nigeria have suffered so much misrule since independence that the question of good governance is no longer merely academic. The expectation, articulated by Nkrumah (1965) and echoed by subsequent pan-African theorists, was that political independence would yield developmental sovereignty — yet the record of the first six decades is largely one of borrowed frameworks and failed delivery. Corruption at the executive level alone costs the Nigerian economy an estimated $18 billion annually (Transparency International, 2022), a figure that acquires meaning only when set against the 133 million Nigerians living in multidimensional poverty (NBS, 2022). But, experiences since independence show that the problem is not merely fiscal. Leadership failure in Nigeria is structural: a pattern of post-colonial governance in which the extractive logic of colonialism has been reproduced by indigenous political elites rather than dismantled (Ake, 1996). Transformational leadership theory, developed primarily in Western organisational contexts, must therefore be interrogated before it can be transplanted.
`;

const LEADERSHIP_LITREVIEW_EXEMPLAR = `
**Exemplar — Literature Review (Development Ideology & Leadership Theory):**
*What makes this human: hinge move ("The contrast matters") used mid-paragraph, not as a section opener; evidence with specific data (percentages, authors) woven into reasoning rather than appended; interpretive landing in the writer's voice.*

Burns's (1978) distinction between transactional and transformational leadership remains foundational, yet its application to post-colonial African governance exposes assumptions the original framework does not acknowledge. Burns theorised transformation as a process in which leaders and followers jointly raise one another toward higher moral purpose — a vision premised on a relatively stable civil society in which followers can credibly hold leaders to account. Ake (1996) identified precisely why this condition is absent across much of sub-Saharan Africa: where institutions are weak and patronage networks substitute for formal accountability, the transformational leader's "moral purpose" is easily captured by elite interests. The contrast matters. Atkinson and Mwenda (2011, n = 24 African states, 1990–2008) found that leadership style explained less than 12% of variance in developmental outcomes, with institutional strength accounting for the remainder — a finding Chemers (2014) confirmed in a separate meta-analysis of 47 leadership studies conducted in low-income economies. What the literature reveals, collectively, is that transformational leadership is not an inherently portable construct: its effects are conditional on precisely the institutional architecture that post-colonial states have most consistently failed to build.
`;

// ── HEALTH & SOCIAL CARE ────────────────────────────────────────────────────────

const HEALTH_INTRO_EXEMPLAR = `
**Exemplar — Introduction / Background (Health Communication):**
*What makes this human: opens with a specific concrete claim, not a scene-setting generality; evidence woven into the reasoning with consequence stated ("tangible harm"); short declarative sentence landing the paragraph's key implication; no paragraph-closing summation.*

Communication in healthcare is not a soft skill. Danaher et al. (2023) state that poor communication in care settings has tangible consequences: patients cannot understand the treatment plan, feel unheard, and in some cases face life-threatening delays because a clinical concern was not articulated clearly enough to trigger escalation. The scale of the problem in the United Kingdom is measurable: the NHS Resolution annual report (2022) attributed 38% of settled clinical negligence claims, at least in part, to communication failures between clinician and patient. That is not a margin of error. It is a systemic pattern that has persisted across three decades of NHS reform, surviving the introduction of patient-led outcome measures, communication training mandates, and successive inquiry recommendations (Francis, 2013; Ockenden, 2022). The persistence of the problem suggests that the issue lies not in staff willingness but in the structural conditions under which care is delivered — conditions that shape whether communication functions as a genuine exchange of meaning or as a procedural transaction.
`;

const HEALTH_LITREVIEW_EXEMPLAR = `
**Exemplar — Literature Review (Patient-Centred Care & Therapeutic Relationship):**
*What makes this human: theory applied to specific context rather than described generically; counterpoint introduced with "yet" to turn the paragraph from reporting to arguing; interpretive landing names the implication for this study's field.*

Mead and Bower's (2000) five-dimensional model of patient-centredness remains the most cited framework for understanding the therapeutic relationship, yet its uptake in nursing practice research has been uneven in ways that reveal an underlying tension. The model positions patient-centredness as a relationship in which both clinical expertise and the patient's subjective experience are simultaneously held — what Mead and Bower call "biopsychosocial perspective" alongside "the patient-as-person". Where the model has been operationalised in acute care settings, however, the biopsychosocial dimension tends to be crowded out by the biomedical. McCabe (2004, n = 8 ward nurses, Ireland) found that nurses described care as patient-centred while their practice observations showed predominantly task-focused interaction — patients spoken to about procedures, rarely about their concerns. Bridges et al. (2013) confirmed this pattern in a systematic review of 19 studies: attentiveness to the patient as a person, the dimension most valued by patients themselves, was the most consistently underdeveloped. The discrepancy between stated values and observable practice is not explained by staff indifference; it is better explained by time, workload, and the institutional incentives that reward clinical throughput over relational depth.
`;

// ── RELIGIOUS & MORAL PHILOSOPHY ───────────────────────────────────────────────

const RELIGION_THEORY_EXEMPLAR = `
**Exemplar — Theoretical Framework (Religion, Morality & Governance):**
*What makes this human: direct quote from a named scholar in the scholar's own voice; short declarative sentence following a long analytical one; argument-first opening with no preview; hinge move ("What this means, practically") to drive toward interpretation.*

Ezeanya (2012) writes: "To attempt to build a nation without God is to build without a foundation." The statement is easy to dismiss as rhetorical, and many secular governance theorists have done exactly that. But the empirical question Ezeanya raises — whether societies organised around shared moral frameworks sustain lower corruption and higher institutional trust — has attracted serious scholarly attention. Putnam's (1993) landmark study of Italian regions found that civic engagement rooted in religious association was the strongest predictor of institutional effectiveness, outperforming economic development as an explanatory variable. Norris and Inglehart (2004), working from the World Values Survey across 78 countries, qualified this finding: religiosity correlates with institutional trust most strongly in contexts of existential insecurity, where formal state provision is absent or unreliable. What this means, practically, is that the moral ordering function of religion is not universal — it is activated by the conditions of governance failure that characterise precisely the states this study examines. Religion is not a substitute for institutions; it is, in weak-state contexts, what holds social order together while institutions are being built.
`;

const RELIGION_DISCUSSION_EXEMPLAR = `
**Exemplar — Discussion (Religion, Moral Order & Nation Building):**
*What makes this human: evaluates rather than reports; names what the evidence shows and then what it does NOT show; "That said," as a natural transition (not "However,"); ends on an open implication, not a summary.*

The finding that religious identity functions as a primary source of civic obligation among participants challenges the secularisation thesis more directly than most governance literature in the West African context has been willing to acknowledge. Where Norris and Inglehart (2004) positioned religious salience as a response to insecurity that declines with modernisation, this study's data suggest a more durable relationship: participants across income quartiles and educational levels reported that their understanding of accountability — to community, to leadership, to institutions — derived from religious frameworks rather than civic or legal ones. That said, the data do not support the conclusion that religiosity produces better governance outcomes in the absence of structural reform. What they show, rather, is that moral legitimacy in this context is conferred through religious rather than legal channels — and that any governance intervention which does not engage that channel will face an legitimacy deficit that technical reform alone cannot close. The practical implication is not that governance should be theocratic, but that policy designers operating in this context cannot afford to treat religion as a private matter irrelevant to institutional design.
`;

// ── METHODOLOGY ─────────────────────────────────────────────────────────────────

const METHODOLOGY_EXEMPLAR = `
**Exemplar — Methodology (Quantitative, Survey-Based):**
*What makes this human: design choice explained with a "why", not just stated; sample size justified through a named technique with exact figures; reliability reported with honest limitation acknowledged; interpretive close ("defensible inference") rather than boilerplate.*

A positivist, deductive, quantitative design was adopted. The choice was deliberate: the research questions concerned the strength and direction of relationships between price perception, perceived quality, and consumer preference — questions best answered through measurement rather than interpretation. A cross-sectional survey was administered to 312 adult shoppers across three Lagos markets (Yaba, Balogun, and Aswani), selected because they represent the densest concentrations of Okrika trade in the metropolitan area. Sample size was determined through G*Power analysis, which indicated that detecting a medium effect (f² = 0.15) at α = 0.05 with 80% power required a minimum of 153 respondents; the achieved sample exceeds this threshold and supports robust subgroup analysis. The instrument, adapted from Sweeney and Soutar's (2001) PERVAL scale, demonstrated acceptable internal consistency across all four subscales (Cronbach's α between 0.78 and 0.87). Transferability to non-urban or non-Nigerian second-hand contexts remains uncertain — a limitation discussed in §3.10 — but the design supports defensible inference within the studied population.
`;

export function getQualityExemplars(chapterType: string): string {
  // Route two exemplars per call — primary matches chapter type; secondary
  // offers a second register anchor from a contrasting subject domain.
  let primary = LEADERSHIP_BACKGROUND_EXEMPLAR;
  let secondary = HEALTH_INTRO_EXEMPLAR;

  switch (chapterType) {
    case "introduction":
    case "abstract":
      primary = LEADERSHIP_BACKGROUND_EXEMPLAR;
      secondary = HEALTH_INTRO_EXEMPLAR;
      break;
    case "literature_review":
      primary = LEADERSHIP_LITREVIEW_EXEMPLAR;
      secondary = HEALTH_LITREVIEW_EXEMPLAR;
      break;
    case "methodology":
      primary = METHODOLOGY_EXEMPLAR;
      secondary = LEADERSHIP_LITREVIEW_EXEMPLAR;
      break;
    case "findings":
      primary = HEALTH_LITREVIEW_EXEMPLAR;
      secondary = METHODOLOGY_EXEMPLAR;
      break;
    case "conclusion":
      primary = RELIGION_DISCUSSION_EXEMPLAR;
      secondary = LEADERSHIP_LITREVIEW_EXEMPLAR;
      break;
    case "systematic_literature_review":
      primary = LEADERSHIP_LITREVIEW_EXEMPLAR;
      secondary = HEALTH_LITREVIEW_EXEMPLAR;
      break;
    default:
      primary = RELIGION_THEORY_EXEMPLAR;
      secondary = HEALTH_INTRO_EXEMPLAR;
  }

  return `
## Quality Exemplars — Match This Register and Density
The two paragraphs below are drawn from real dissertations that scored 0% on AI detection tools. They are your QUALITY BAR. Match their argumentative shape, citation integration, sentence-rhythm variation, and human writing moves. Do NOT copy their topic, wording, or examples — only their register and structural moves.

Each exemplar includes an annotation explaining what specific techniques make it human. Study the techniques, not the content.

${primary}

${secondary}

What these exemplars demonstrate (your output must replicate ALL of these):
- Opens with a CLAIM or specific evidence — never a broad scene-setting sentence
- Evidence is woven INTO the argument, not dropped beside it as a trailing citation
- Numbers are anchored to a source AND a meaning — never floating statistics
- A rhetorical hinge (yet / but / that said / what this means / the contrast matters) turns the paragraph from description into argument
- Sentence lengths vary deliberately — a 50-word analytical sentence next to a short declarative one
- The writer's interpretive voice lands the paragraph — an implication, not a summary
- No paragraph ends with "this demonstrates the importance of X" or any variant
`;
}
