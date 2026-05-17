// Quality exemplars — short calibration paragraphs lifted from publication-grade
// dissertation prose. The model anchors output quality to whatever exemplars it
// sees in-context. Three short exemplars do more work than fifty lines of rules.
//
// Source register: Okrika-style dissertation (Master's, mixed methods, business).
// Each exemplar demonstrates: argument-led opening, integrated evidence,
// conceptual contrast, precise hedging, interpretive landing.

const BACKGROUND_EXEMPLAR = `
**Exemplar — Background paragraph (Ch 1):**

The Nigerian second-hand clothing trade has long occupied an awkward space between informal commerce and formal market activity. What was once regarded as residual charity — bales of donated Western clothing redistributed through religious networks — has, over the last two decades, evolved into a structured import industry valued at approximately $5.6 billion in 2023, with projected annual growth rates between 5% and 8% (UN Comtrade, 2023; Hansen, 2004). The contrast matters. Where earlier scholarship framed second-hand clothing as a stopgap for the urban poor, recent consumer surveys in Lagos and Onitsha indicate that roughly 62% of Okrika buyers are middle-income earners purchasing for reasons of style and quality rather than necessity (Adebayo & Chukwu, 2022). This shift unsettles the assumption that price perception in this market operates as a simple function of affordability; it suggests, instead, a more layered evaluative process in which value, authenticity, and social signalling are jointly negotiated at the point of purchase.
`;

const LITERATURE_EXEMPLAR = `
**Exemplar — Literature Review paragraph (Ch 2):**

Zeithaml's (1988) means-end model remains the dominant lens for theorising perceived value, yet its application to second-hand markets has been uneven. The model assumes that consumers trade off price against quality cues to arrive at a value judgement — a logic that holds neatly in branded retail contexts but falters where provenance is uncertain. Monroe (2003) extended Zeithaml's framework by introducing the notion of acquisition-transaction utility, arguing that the perceived "deal" itself becomes part of the value calculation. Empirical work in West African contexts has begun to test these claims with mixed results: Adebayo and Chukwu (2022, n = 384) found that price-quality inference explained approximately 45% of variance in Okrika preference, whereas Mensah's (2021, n = 612) Ghanaian study reported a far weaker association (β = 0.18, p < .05), suggesting that cultural meaning may absorb much of what Zeithaml's model attributes to price. The divergence is instructive. It indicates that price perception in second-hand markets is not a stable cognitive operation but a context-dependent one, shaped by what Bourdieu (1984) would call the field-specific logic of taste — a dimension the dominant value models do not capture.
`;

const METHODOLOGY_EXEMPLAR = `
**Exemplar — Methodology paragraph (Ch 3):**

A positivist, deductive, quantitative design was adopted. The choice was deliberate: the research questions concerned the strength and direction of relationships between price perception, perceived quality, and consumer preference — questions best answered through measurement rather than interpretation. A cross-sectional survey was administered to 312 adult shoppers across three Lagos markets (Yaba, Balogun, and Aswani), selected because they represent the densest concentrations of Okrika trade in the metropolitan area. Sample size was determined through G*Power analysis, which indicated that detecting a medium effect (f² = 0.15) at α = 0.05 with 80% power required a minimum of 153 respondents; the achieved sample exceeds this threshold and supports robust subgroup analysis. The instrument, adapted from Sweeney and Soutar's (2001) PERVAL scale, demonstrated acceptable internal consistency across all four subscales (Cronbach's α between 0.78 and 0.87). Transferability to non-urban or non-Nigerian second-hand contexts remains uncertain — a limitation discussed in §3.10 — but the design supports defensible inference within the studied population.
`;

export function getQualityExemplars(chapterType: string): string {
  // Pick the exemplar most relevant to the chapter being written.
  // We always include at least one so the model has a register anchor.
  let primary = BACKGROUND_EXEMPLAR;
  let secondary = "";

  switch (chapterType) {
    case "introduction":
    case "abstract":
      primary = BACKGROUND_EXEMPLAR;
      secondary = LITERATURE_EXEMPLAR;
      break;
    case "literature_review":
      primary = LITERATURE_EXEMPLAR;
      secondary = BACKGROUND_EXEMPLAR;
      break;
    case "methodology":
      primary = METHODOLOGY_EXEMPLAR;
      secondary = LITERATURE_EXEMPLAR;
      break;
    case "findings":
    case "conclusion":
      primary = LITERATURE_EXEMPLAR;
      secondary = METHODOLOGY_EXEMPLAR;
      break;
    default:
      primary = BACKGROUND_EXEMPLAR;
      secondary = LITERATURE_EXEMPLAR;
  }

  return `
## Quality Exemplars — Match This Register and Density
The two short paragraphs below are the QUALITY BAR. Match their argumentative
shape, citation integration, hedging precision, and sentence-rhythm variation.
Do not copy their topic, wording, or examples — only their register.

${primary}

${secondary}

What these exemplars demonstrate (and what your output must replicate):
- Each paragraph opens with a CLAIM, not a summary
- Evidence is woven INTO the argument, never dropped beside it
- Numbers are always attached to a source AND a meaning
- A conceptual contrast (however / yet / what was once… / the divergence is instructive) acts as the rhetorical hinge
- Sentence lengths vary deliberately (a 50-word analytical sentence next to a 6-word declaration)
- The writer's interpretive voice is visible in the final sentence of every paragraph
`;
}
