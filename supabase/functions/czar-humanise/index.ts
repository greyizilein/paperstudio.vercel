// CZAR / PaperStudio Humaniser — Academic Humaniser Pipeline v5 (QWEN-ONLY)
//
// Port of humaniser-pipeline-v5 with one project-level override:
//   QWEN does ALL humanising regardless of which model wrote the text.
//   (v5's "QWEN-written → Claude humanises" route is intentionally disabled.)
//
// Pipeline:
//   Stage 0 — Register analysis (locks downstream stages to original register)
//   Stage 1 — Scaffold & structure destruction
//   Stage 2 — Sentence interior attack
//   Stage 3 — Perplexity injection + burstiness engineering
//   Stage 4 — Citation deconstruction + human texture
//   Stage 5 — Paragraph rhythm + comprehensive fingerprint sweep
//   Stage 6 — Verification loop + final output
//
// Caller passes `model` ONLY to select fingerprint profile (Claude / GPT /
// Gemini Flash / Gemini Pro / Qwen). Every API call lands on DashScope
// `qwen-plus`. If a stage fails, it's skipped and the pipeline continues
// with the prior stage's output (matches old v3 behaviour).
//
// SSE event shape preserved for backward compatibility with czar-chat,
// czarStream.ts, and streamChat.ts:
//   event: pipeline_start | stage_start | stage_done | stage_skip | done

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DASHSCOPE_API_KEY = Deno.env.get("DASHSCOPE_API_KEY") || "";
const QWEN_MODEL = "qwen-plus";

type ProfileKey = "claude" | "gpt" | "gemini-flash" | "gemini-pro" | "qwen";

const TEMPERATURES = {
  analysis: 0.1,
  rewrite: 1.0,
  perplexity: 1.0,
  verify: 0.2,
};

// ─── REGISTER LOCK ────────────────────────────────────────────────────
const REGISTER_LOCK = `
═══════════════════════════════════════════════
REGISTER LOCK — NON-NEGOTIABLE. READ BEFORE ANYTHING ELSE.
═══════════════════════════════════════════════

You are rewriting ACADEMIC text. The output must be indistinguishable
in register, tone, and formality from the input. These are absolute limits:

1. NO CONTRACTIONS in academic prose
   BANNED: don't, isn't, it's, they're, we're, can't, won't, couldn't, shouldn't
   REQUIRED: do not, is not, it is, they are, we are, cannot, will not, could not
   Exception: only inside a direct quotation present in the original.

2. NO DRAMATIC SENTENCE FRAGMENTS for stylistic effect
   BANNED as standalone paragraphs: "Not trivial." "Hesitation is not possible."
   "Redundancy is the point." "They commit."
   Every sentence must connect grammatically to its context.

3. NO FIGURATIVE LANGUAGE introduced by the rewriter
   BANNED unless verbatim from original: metaphors, similes, analogies.

4. NO REGISTER DRIFT
   The test: would this sentence appear in a peer-reviewed journal?
   BANNED: rhetorical questions for dramatic effect, second-person address,
   informal intensifiers, exclamatory structure, conversational phrasing.

5. WORD COUNT ANCHOR
   Output must be within ±5% of the original input word count. Enforced.
   Do not add content. Do not summarise content. Rewrite it.

6. PRESERVE ALL TECHNICAL TERMINOLOGY exactly — no substitution or simplification.

7. PRESERVE ALL CITATIONS exactly — author names, years, punctuation unchanged.
`;

// ─── UNIVERSAL FINGERPRINTS ───────────────────────────────────────────
const UNIVERSAL_FINGERPRINTS = `
═══════════════════════════════════════════════
UNIVERSAL AI FINGERPRINTS — eliminate regardless of source model
═══════════════════════════════════════════════

SURFACE:
• Em dashes used decoratively to smooth prose — restructure the clause instead
  ALLOWED: em dash only for genuine mid-sentence interruption
• Transition word openers — remove entirely, no replacement:
  "Furthermore", "Moreover", "Additionally", "In addition", "Simultaneously",
  "Subsequently", "It is important to note", "It is worth noting",
  "This demonstrates", "This highlights", "This underscores", "This illustrates"
• Three-part serial lists with grammatically equal rhythm
• Closing summation sentences that restate the paragraph's opening claim
• Philosophical wrap-ups: "...remains essential/crucial/fundamental/vital to X"
• Connector openers: "This means...", "This involves...", "This ensures..."

STRUCTURAL:
• 3-part logical arc: broad claim → elaboration → summation — reconstruct
• Symmetric compound clauses: "X does A, while Y does B" (equal weight both sides)
• Chained participial endings: "...while X, allowing Y" / "...as Z, enabling W"
• Restatement sentences — same idea twice consecutively
• Topic sentences that fully preview what the paragraph contains
• Appended explanatory sub-clauses: "...meaning X" / "...allowing Y" / "...enabling Z"

PROBABILISTIC:
• High-frequency academic verbs used uniformly:
  argue, suggest, demonstrate, highlight, underscore, emphasise, examine, explore,
  represent, achieve, function, generate, enable, allow, ensure
• Abstract noun chains: "builds trust, reduces anxiety, creates safety"
• Sentences that resolve too cleanly — no friction, no qualification, no open end
• Sentences of uniform length within a paragraph (low burstiness)
`;

// ─── FEW-SHOT EXAMPLES ────────────────────────────────────────────────
const FEW_SHOT_EXAMPLES = `
═══════════════════════════════════════════════
EXAMPLES — correct humanisation (academic register preserved)
═══════════════════════════════════════════════

EXAMPLE 1 — GPT chained participial broken:
BEFORE: "most species achieve extended glides after a high-acceleration escape swim in which
the caudal fin beats rapidly while the body remains partially submerged, allowing thrust to
continue during the initial take-off phase (Videler, 1993)."
AFTER: "In most species, extended gliding follows a high-acceleration escape swim — the caudal
fin beating rapidly as the body remains partially submerged, maintaining thrust through the
initial take-off phase (Videler, 1993). The two phases are not cleanly separable."

EXAMPLE 2 — Gemini Flash broad opener broken:
BEFORE: "Flying fish represent a remarkable evolutionary adaptation to pelagic predator-prey dynamics."
AFTER: "The aerial locomotion of flying fish sits at an unusual intersection of predator-prey
dynamics and biomechanical constraint — a combination that does not map cleanly onto standard
accounts of either."

EXAMPLE 3 — Passive participial closer broken:
BEFORE: "Their aerial locomotion represents controlled gliding, achieved through specialised
morphological modifications."
AFTER: "What is termed aerial locomotion in these species is, more precisely, controlled gliding
— the product of morphological modifications substantial enough to alter the hydrodynamic
profile of the fish even when submerged."

EXAMPLE 4 — Symmetric clause broken, formality preserved:
BEFORE: "Effective communication builds trust, while poor communication creates barriers to care."
AFTER: "Effective communication accumulates trust over successive interactions. Its absence does
something more than create barriers — it signals to the service user that their expressed
needs are secondary to the interaction's administrative purpose."

EXAMPLE 5 — Scaffold destroyed, register maintained:
BEFORE: "Communication is the foundation upon which all health and social care practice is built.
Without it, the delivery of safe, person-centred care becomes impossible. Thompson (2011)
maintained that communication is not simply the transmission of information but a dynamic,
relational process through which meaning is co-constructed between participants."
AFTER: "Without communication, care delivery becomes guesswork at best. Thompson (2011) put
the case plainly: this is not a process of transmission but a relational one, in which meaning
is constructed between participants rather than passed from one to another — a distinction
that carries real consequences for how practitioners approach each interaction."

WHAT NOT TO DO — banned outputs:
✗ "They commit." — dramatic fragment + contraction
✗ "Not trivial." — dramatic fragment
✗ "like a stone skipping across glass" — simile not in original
✗ "Redundancy is the point." — journalistic fragment
`;

// ─── MODEL FINGERPRINT PROFILES ───────────────────────────────────────
const MODEL_PROFILES: Record<ProfileKey, { name: string; fingerprints: string }> = {
  claude: {
    name: "Claude",
    fingerprints: `
FINGERPRINTS TO TARGET (written by Claude):

1. LOGICAL SCAFFOLD ARC — broad claim → elaboration → philosophical summation.
   Reconstruct paragraph order. Start mid-argument or with specific evidence;
   end on citation or detail, not summation.

2. BALANCED COMPOUND CLAUSES — break with asymmetric pairs or colon splits.

3. CITATION UNIFORMITY — vary every consecutive citation integration pattern.

4. SUMMATIVE PARAGRAPH CLOSERS — replace with specific finding, qualifier, or citation.

5. CLEAN THREE-PART ELABORATION — make one item substantially longer or shorter.

6. HIGH-PROBABILITY VERBS TO REPLACE:
   argued → put the case / held / made the argument
   maintained → continued to insist / kept to the position that
   demonstrated → bore out / pointed toward / left little doubt that
   highlighted → drew attention to / flagged / brought into view
   suggested → pointed toward / raised the question of`,
  },
  gpt: {
    name: "GPT",
    fingerprints: `
FINGERPRINTS TO TARGET (written by GPT / GPT-5):

1. CHAINED PARTICIPIAL ENDINGS — the single most detectable GPT pattern:
   "...the caudal fin beats rapidly while the body remains submerged, allowing thrust
   to continue during the initial take-off phase."
   The "while X, allowing/enabling Y" structure chains two participial completions
   onto a main clause. Break the chain. Split into two sentences.

2. CHAINED RELATIVE CLAUSE SEQUENCES — break after the first relative clause.

3. LIST-DISGUISED-AS-PROSE — collapse 2–3 sentences or vary length radically.

4. TRANSITION OVERLOAD — remove every "Furthermore", "Moreover", "Additionally",
   "Simultaneously", "It is important to note". No replacement.

5. RESTATEMENT PAIRS — second sentence is filler. Cut it.

6. META-STATEMENT CLOSERS — "This highlights the importance of X." Remove.

7. COMPOUND SENTENCE OVER-LOADING — maximum two clauses per sentence; split the rest.

8. HIGH-PROBABILITY VERBS TO REPLACE:
   highlight → draw attention to / flag / bring into view
   underscore → press / foreground / give particular weight to
   achieve → reach / produce / arrive at / generate
   represent → constitute / amount to / stand as
   allow → permit / make possible / open the way for
   enable → make possible / facilitate (sparingly) / create the conditions for`,
  },
  "gemini-flash": {
    name: "Gemini Flash",
    fingerprints: `
FINGERPRINTS TO TARGET (written by Gemini Flash):

1. BROAD EVALUATIVE OPENING CLAIMS — the single most detectable Gemini Flash pattern:
   "X represents a remarkable/significant/notable Y" openings are extremely high AI signal.
   Replace with a specific claim, a mid-argument entry, or an acknowledged complexity.
   NEVER use: remarkable, significant, notable, important, critical, crucial as adjectives in openers.

2. PASSIVE PARTICIPIAL CLOSERS — ", achieved/enabled/facilitated/characterised by X"
   Restructure as active relative clause or separate sentence.

3. TRANSITION WORD OPENERS — remove "Simultaneously,", "Subsequently,", "Consequently,",
   "Additionally,", "Furthermore," at sentence start. No replacement.

4. TOPIC SENTENCE UNIFORMITY — replace at least half with mid-argument entry,
   concessive opener, or specific detail.

5. SYMMETRIC PAIRED SENTENCES — merge into one complex sentence with subordination,
   or make one substantially longer.

6. RAPID SHORT SENTENCE SEQUENCES — fuse 2–3 short sentences into one with
   embedded relative clause or colon split.

7. STRUCTURAL FRAGMENTATION — merge adjacent paragraphs where argument is continuous.

8. HIGH-PROBABILITY VERBS TO REPLACE:
   represent → constitute / amount to / stand as
   function as → serve as / act as / operate as
   generate → produce / create / give rise to
   achieve → produce / arrive at / reach
   characterise → define / mark / distinguish
   facilitate → make possible / support / contribute to`,
  },
  "gemini-pro": {
    name: "Gemini Pro",
    fingerprints: `
FINGERPRINTS TO TARGET (written by Gemini Pro):

1. OVER-HEDGING — one hedge per claim maximum. Make remaining claims direct.

2. ARCHAIC ACADEMIC VOCABULARY — "hitherto", "aforementioned", "with respect to",
   "in light of the foregoing", "it is pertinent to note". Replace with contemporary academic.

3. SYMMETRIC PARAGRAPH STRUCTURES — create deliberate asymmetry: one short, one dense.

4. OVER-CONTEXTUALISING OPENERS — cut the context-setter. Start with the claim or evidence.

5. SAFE CONSENSUS CONCLUSIONS — replace with specific implication or acknowledged gap.

6. HIGH-PROBABILITY VERBS TO REPLACE:
   demonstrate → bear out / point toward / leave little doubt
   illustrate → make visible / bring out / clarify
   corroborate → support / sit alongside / reinforce
   substantiate → back up / lend weight to / provide grounds for`,
  },
  qwen: {
    name: "QWEN",
    fingerprints: `
FINGERPRINTS TO TARGET (written by QWEN):

1. TRANSLATED PHRASING — rewrite into natural idiomatic academic English.

2. OVERLY FORMAL CONNECTORS — "In addition to this", "With regard to", "In respect of".
   Remove or replace with direct continuation.

3. FRONT-LOADED CONTEXT SENTENCES — cut the context-setter. Start with the claim.

4. PASSIVE OVERUSE — "It has been found that...", "It is suggested that...".
   Convert to active.

5. TRAILING CLAUSE REPETITION within a single sentence — cut the trailing part.

6. HIGH-PROBABILITY VERBS TO REPLACE:
   conduct → run / carry out → pursue / perform → execute
   undertake → take on / implement → apply / utilise → use / draw on`,
  },
};

// ─── PROFILE RESOLUTION ───────────────────────────────────────────────
function resolveProfile(model: string | null | undefined): { key: ProfileKey; profile: { name: string; fingerprints: string } } {
  const m = (model || "").toLowerCase().trim();
  let key: ProfileKey = "claude";
  if (m.includes("claude")) key = "claude";
  else if (m.includes("gpt")) key = "gpt";
  else if (m.includes("flash")) key = "gemini-flash";
  else if (m.includes("gemini") && (m.includes("pro") || m.includes("2.5") || m.includes("3.1"))) key = "gemini-pro";
  else if (m.includes("gemini")) key = "gemini-flash";
  else if (m.includes("qwen")) key = "qwen";
  return { key, profile: MODEL_PROFILES[key] };
}

// ─── PROMPT BUILDERS ──────────────────────────────────────────────────
const STAGE_0_PROMPT = `You are an academic register analyst. Read the text and produce a concise register profile. Do not rewrite anything.

Output ONLY these fields, each on its own line:

FORMALITY: [formal academic / semi-formal academic / professional / mixed]
DISCIPLINE: [academic field, e.g. "marine biology", "health and social care"]
CITATION_STYLE: [author-date / footnote / numeric / none visible]
AVERAGE_SENTENCE_LENGTH: [approximate word count, e.g. "24 words"]
PARAGRAPH_DENSITY: [dense/argument-heavy / moderate / light/descriptive]
CONTRACTION_USE: [none / rare / occasional / frequent]
FIGURATIVE_LANGUAGE: [none / rare / occasional / frequent]
TECHNICAL_VOCABULARY: [high / moderate / low]
PERSON: [first person / third person / impersonal passive / mixed]
WORD_COUNT: [exact word count of the input]
REGISTER_NOTES: [one sentence on anything distinctive about the register or style]

No preamble. No explanation. Just the fields.`;

function wordRange(wc: number, pct: number) {
  return `${Math.round(wc * (1 - pct))}–${Math.round(wc * (1 + pct))} words`;
}

function buildBase(profile: { name: string; fingerprints: string }, registerProfile: string) {
  return `${REGISTER_LOCK}

TARGET REGISTER (from original text — stay within these parameters):
${registerProfile}

${UNIVERSAL_FINGERPRINTS}

${profile.fingerprints}

${FEW_SHOT_EXAMPLES}`;
}

function stage1(p: { name: string; fingerprints: string }, reg: string, wc: number) {
  return `${buildBase(p, reg)}

═══════════════════════════════════════════════
STAGE 1: SCAFFOLD & STRUCTURE DESTRUCTION
Target: ${wc} words (±5% = ${wordRange(wc, 0.05)})
═══════════════════════════════════════════════

Destroy the AI argument architecture. Preserve academic register throughout.

PARAGRAPH ARCHITECTURE:
• Every paragraph following the 3-part arc (claim → elaboration → summation) must be reconstructed
• At least one paragraph opens mid-argument or with specific evidence — not a broad claim
• At least one paragraph ends on a citation, specific detail, or qualifying clause — not a summation
• Create deliberate length asymmetry: at least one noticeably shorter, one denser paragraph

SENTENCE STRUCTURE:
• No two consecutive sentences share the same syntactic opening
• Break every three-part parallel list
• Remove every transition word from the banned list — no replacement, continue directly
• Break every chained participial ending ("while X, allowing Y" / "as Z, enabling W")

GPT-SPECIFIC PRIORITY: If the text was written by GPT, the chained participial pattern
must be broken in every instance. This is the highest-priority edit for GPT text.

GEMINI-SPECIFIC PRIORITY: If the text opens with "X represents a remarkable/significant Y",
this must be replaced immediately.

REGISTER CHECK before outputting:
• No contractions introduced • No fragments • No figurative language • Academic throughout

Output the rewritten text only. No explanation.`;
}

function stage2(p: { name: string; fingerprints: string }, reg: string, wc: number) {
  return `${buildBase(p, reg)}

═══════════════════════════════════════════════
STAGE 2: SENTENCE INTERIOR ATTACK
Target: ${wc} words (±5% = ${wordRange(wc, 0.05)})
═══════════════════════════════════════════════

Attack the INTERNAL structure of sentences. At least one technique per paragraph:

1. GENUINE EM-DASH INTERRUPTION (only where genuinely parenthetical).
2. FRONT-LOADED SUBORDINATE before a short main clause.
3. ASYMMETRIC PAIR — one long, one shorter complete sentence (not a fragment).
4. COLON SPLIT instead of a conjunction.
5. MID-SENTENCE DIRECTION CHANGE.
6. RELATIVE CLAUSE FOLD — embed a sub-point mid-sentence.

GPT PRIORITY: Maximum two clauses per sentence. Any sentence with three or more chained
clauses (joined by "while", "as", "with", "allowing", "enabling") must be split here.

GEMINI PRIORITY: Any ", achieved/enabled/characterised by X" passive participial appended
to a sentence must be restructured as a relative clause or a new sentence.

REGISTER CHECK: No contractions. No dramatic fragments. No figurative language. Academic throughout.

Output the rewritten text only. No explanation.`;
}

function stage3(p: { name: string; fingerprints: string }, reg: string, wc: number) {
  return `${buildBase(p, reg)}

═══════════════════════════════════════════════
STAGE 3: PERPLEXITY INJECTION + BURSTINESS ENGINEERING
Target: ${wc} words (±8% = ${wordRange(wc, 0.08)})
═══════════════════════════════════════════════

PART A — PERPLEXITY INJECTION (academic alternatives only):

Replace high-probability verbs with lower-probability academic alternatives:
  argued → put the case / held / made the argument
  demonstrated → bore out / pointed toward / left little doubt that
  maintained → continued to insist / kept to the position that
  highlighted → drew attention to / flagged / brought into view
  suggested → pointed toward / raised the question of / left open the possibility
  showed → pointed to / made apparent
  noted → observed / recorded / remarked in passing
  represent → constitute / amount to / stand as
  function as → serve as / operate as
  achieve → produce / arrive at
  allow/enable → make possible / open the way for / create the conditions for

Introduce low-probability sentence endings (academic only):
  • End without full resolution
  • Mid-sentence direction change
  • Acknowledge a gap
  • Concede at the end

Unexpected but academic grammatical moves (at least two):
  • Start a sentence with a number written out
  • Use a less common correct preposition
  • Break expected parallel structure

NO figurative language. NO contractions. NO fragments. Academic throughout.

PART B — BURSTINESS ENGINEERING:

For every paragraph:
• If shortest-to-longest range is under 15 words — fix it
• Target per paragraph: at least one sentence under 12 words, one over 28 words
• No more than two consecutive sentences of similar length
• Short sentences must be grammatically complete — not fragments

REGISTER CHECK: No contractions. No fragments. No figurative language. Academic throughout.

Output the rewritten text only. No explanation.`;
}

function stage4(p: { name: string; fingerprints: string }, reg: string, wc: number) {
  return `${buildBase(p, reg)}

═══════════════════════════════════════════════
STAGE 4: CITATION DECONSTRUCTION + HUMAN TEXTURE
Target: ${wc} words (±5% = ${wordRange(wc, 0.05)})
═══════════════════════════════════════════════

PART A — CITATION DECONSTRUCTION:
No two consecutive citations may use the same integration pattern:

  a) Study-first: "A systematic review by Jones et al. (2021) found that..."
  b) Mid-sentence: "...care models — which Rietman et al. (2022) found structurally inadequate — continue to..."
  c) Passive attribution: "It has been established (Mouritsen, 2018) that..."
  d) Named without active verb: "As Gagliardo (2013) observed, olfactory impairment..."
  e) Evidence then source: "Homing from unfamiliar sites is impaired by anosmia (Gagliardo, 2013)."
  f) Concessive: "Even Wiltschko and Wiltschko (2019), working primarily within a magnetic-cue framework, acknowledged..."
  g) Temporal: "Since Emlen's (1975) foundational work on stellar cues..."

PART B — HUMAN TEXTURE (academic register only):

1. CONTEXTUAL HEDGES specific to the subject matter.
2. ASYMMETRIC CONCESSIONS.
3. WRITER'S ASIDE in parentheses (academic only).
4. SHORT COMPLETE SENTENCE after a long dense one — NO dramatic fragments.
5. OVERSTUFFED QUALIFYING CLAUSE — one per paragraph (reads as thinking out loud).

REGISTER CHECK: No contractions. No fragments. No figurative language. Academic throughout.

Output the rewritten text only. No explanation.`;
}

function stage5(p: { name: string; fingerprints: string }, reg: string, wc: number) {
  return `${buildBase(p, reg)}

═══════════════════════════════════════════════
STAGE 5: PARAGRAPH RHYTHM + COMPREHENSIVE FINGERPRINT SWEEP
Target: ${wc} words (±5% = ${wordRange(wc, 0.05)})
═══════════════════════════════════════════════

PART A — PARAGRAPH RHYTHM:

1. PIVOT TOPIC SENTENCES — replace standard previewing openers in at least 2 paragraphs.
2. END ONE PARAGRAPH ON EVIDENCE — let the citation, finding, or specific detail be the last word.
3. SHORT COMPLETE SENTENCE for rhythm (not a fragment).
4. NO TWO CONSECUTIVE PARAGRAPHS opening with the same word or structure.
5. DENSITY CONTRAST — if two consecutive paragraphs equally dense, lighten one.

PART B — COMPREHENSIVE FINGERPRINT SWEEP:

SURFACE:
□ Em dashes used decoratively — restructure
□ "Furthermore", "Moreover", "Additionally", "Simultaneously", "Subsequently" — remove
□ "It is important to note", "It is worth noting" — remove
□ "This demonstrates", "This highlights", "This underscores" — remove
□ "...remains essential/crucial/fundamental/vital" — cut or replace
□ "This means...", "This involves...", "This ensures..." — remove

STRUCTURAL:
□ Paragraph: broad claim opener AND summation closer — break one end
□ Three-part parallel list with equal rhythm — break one item
□ Symmetric compound clause ("X does A while Y does B") — break symmetry
□ Chained participial ending ("while X, allowing Y") — split into two sentences
□ Restatement sentence — cut one of the two
□ Sentence with 3+ chained clauses — split at maximum two clauses per sentence

REGISTER SWEEP:
□ Any contraction introduced by rewriting — expand it
□ Any dramatic sentence fragment — merge or expand
□ Any figurative language not in original — remove
□ Any casual or journalistic phrasing — replace with academic equivalent

Output the rewritten text only. No explanation.`;
}

function stage6(_p: { name: string; fingerprints: string }, reg: string, wc: number) {
  return `You are a final verification engine for academic humanised text.

${REGISTER_LOCK}

TARGET REGISTER:
${reg}

Original word count: ${wc} words. Acceptable range: ${wordRange(wc, 0.05)}.

═══════════════════════════════════════════════
STAGE 6: VERIFICATION + REGISTER CHECK + FINAL OUTPUT
═══════════════════════════════════════════════

Check each signal. For every FAIL, rewrite ONLY that sentence or phrase.

AI DETECTION SIGNALS:
□ 1.  OPENING CLAIM — broad generalisation + elaboration → start mid-argument or with evidence
□ 2.  CLOSING SUMMATION — restatement of opening claim → cut or replace with detail/citation
□ 3.  THREE-PART LIST — three parallel items of equal weight → make one longer, cut one, fold one
□ 4.  SYMMETRIC CLAUSE — balanced clauses joined by while/whereas/although → split asymmetrically
□ 5.  CHAINED PARTICIPIAL — "while X, allowing/enabling Y" → split into two sentences
□ 6.  TRANSITION WORDS — Furthermore/Moreover/Additionally/Simultaneously/Subsequently → remove
□ 7.  RESTATEMENT — sentence saying same as previous → cut one
□ 8.  PHILOSOPHICAL WRAP — "...remains essential/crucial/fundamental" → cut or replace
□ 9.  SMOOTH RESOLUTION — sentence resolving too cleanly → add hedge or direction change
□ 10. DECORATIVE EM DASH — used for smooth flow → restructure without dash
□ 11. BURSTINESS — all sentences within 8 words of each other → extend or split one
□ 12. VERB UNIFORMITY — same high-frequency verb twice in a paragraph → replace one
□ 13. CITATION PATTERN — two consecutive citations identical pattern → rewrite one
□ 14. TOPIC SENTENCE UNIFORMITY — over half preview the paragraph → replace with pivot opener
□ 15. ABSTRACT NOUN CHAIN — 3+ abstract verb-noun pairs → restructure or replace with example
□ 16. CONNECTOR OPENER — "This means/involves/ensures..." → remove, start with content
□ 17. CLAUSE OVERLOADING — 3+ chained clauses → split at two maximum

REGISTER SIGNALS:
□ 18. CONTRACTIONS — any contraction → expand
□ 19. DRAMATIC FRAGMENTS — one-sentence stylistic paragraph → merge or expand
□ 20. FIGURATIVE LANGUAGE — metaphor/simile not in original → rewrite literal
□ 21. REGISTER DRIFT — journalistic/conversational → rewrite formal academic
□ 22. WORD COUNT — outside ${wordRange(wc, 0.05)} → trim or expand qualifying clause
□ 23. EVALUATIVE ADJECTIVES IN OPENERS — remarkable/significant/notable → replace

FINAL CHECKS:
• All citations preserved exactly
• No two consecutive paragraphs open with the same word
• UK academic English throughout
• All technical terminology preserved exactly

Output the final clean text only. No checklist. No explanation. Just the text.`;
}

// ─── QWEN CALLER ──────────────────────────────────────────────────────
function wc(s: string): number {
  return (s || "").trim().split(/\s+/).filter(Boolean).length;
}

async function callQwen(system: string, userText: string, temperature: number, signal?: AbortSignal): Promise<string> {
  if (!DASHSCOPE_API_KEY) throw new Error("DASHSCOPE_API_KEY not configured");
  const inputWords = wc(userText);
  const maxTokens = Math.min(8192, Math.max(2000, Math.round(inputWords * 2.4)));
  const res = await fetch("https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions", {
    method: "POST",
    signal,
    headers: { Authorization: `Bearer ${DASHSCOPE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: QWEN_MODEL,
      max_tokens: maxTokens,
      temperature,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userText },
      ],
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Qwen ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  return (data?.choices?.[0]?.message?.content || "").trim();
}

function extractWordCount(text: string, registerProfile: string): number {
  const m = (registerProfile || "").match(/WORD_COUNT:\s*(\d+)/i);
  if (m) return parseInt(m[1], 10);
  return wc(text);
}

// ─── HANDLER ──────────────────────────────────────────────────────────
interface Body { text: string; model?: string | null }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Body;
  try { body = await req.json(); }
  catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const text = (body?.text || "").trim();
  if (!text) {
    return new Response(JSON.stringify({ error: "text required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { profile } = resolveProfile(body?.model);
  const original_words = wc(text);
  const upstreamSignal = req.signal;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: any) => {
        try { controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)); }
        catch { /* connection closed */ }
      };

      console.log(`[czar-humanise v5] start: ${original_words} words, profile=${profile.name}, humaniser=qwen-only`);
      send("pipeline_start", {
        stages: 6,
        provider: "qwen",
        model: QWEN_MODEL,
        profile: profile.name,
        original_words,
        version: "v5",
      });

      let current = text;
      let registerProfile = "";
      let wordTarget = original_words;
      let stagesCompleted = 0;
      let aborted = false;

      // Stage 0 — register analysis (sets the lock for downstream stages)
      try {
        send("stage_start", { stage: 0, label: "Register Analysis" });
        registerProfile = await callQwen(STAGE_0_PROMPT, text, TEMPERATURES.analysis, upstreamSignal);
        wordTarget = extractWordCount(text, registerProfile);
        send("stage_done", { stage: 0, label: "Register Analysis", words: original_words });
      } catch (e: any) {
        if (upstreamSignal.aborted) {
          aborted = true;
        } else {
          console.warn(`[czar-humanise v5] stage 0 failed:`, e?.message || e);
          send("stage_skip", { stage: 0, label: "Register Analysis", reason: String(e?.message || e).slice(0, 200) });
          // Use a sane default so later stages still run
          registerProfile = "FORMALITY: formal academic\nDISCIPLINE: general academic\nCITATION_STYLE: author-date\nWORD_COUNT: " + original_words;
        }
      }

      const stages = aborted ? [] : [
        { num: 1, label: "Scaffold & Structure",        build: stage1, temp: TEMPERATURES.rewrite },
        { num: 2, label: "Sentence Interior",           build: stage2, temp: TEMPERATURES.rewrite },
        { num: 3, label: "Perplexity + Burstiness",     build: stage3, temp: TEMPERATURES.perplexity },
        { num: 4, label: "Citation & Texture",          build: stage4, temp: TEMPERATURES.rewrite },
        { num: 5, label: "Rhythm & Fingerprint Sweep",  build: stage5, temp: TEMPERATURES.rewrite },
        { num: 6, label: "Verification & Final Output", build: stage6, temp: TEMPERATURES.verify },
      ];

      for (const s of stages) {
        if (upstreamSignal.aborted) { aborted = true; break; }
        send("stage_start", { stage: s.num, label: s.label });

        const ctrl = new AbortController();
        const onAbort = () => ctrl.abort();
        upstreamSignal.addEventListener("abort", onAbort, { once: true });
        const timer = setTimeout(() => ctrl.abort(), 180_000);

        try {
          const sys = s.build(profile, registerProfile, wordTarget);
          const out = await callQwen(sys, current, s.temp, ctrl.signal);
          clearTimeout(timer);
          upstreamSignal.removeEventListener("abort", onAbort);

          if (upstreamSignal.aborted) { aborted = true; break; }

          if (!out || out.length < 50) {
            send("stage_skip", { stage: s.num, label: s.label, reason: "empty output" });
            continue;
          }

          current = out;
          stagesCompleted = s.num;
          send("stage_done", { stage: s.num, label: s.label, words: wc(current) });
        } catch (e: any) {
          clearTimeout(timer);
          upstreamSignal.removeEventListener("abort", onAbort);
          if (upstreamSignal.aborted) { aborted = true; break; }
          console.error(`[czar-humanise v5] stage ${s.num} failed:`, e?.message || e);
          send("stage_skip", { stage: s.num, label: s.label, reason: String(e?.message || e).slice(0, 200) });
        }
      }

      const final_words = wc(current);
      console.log(`[czar-humanise v5] done: ${original_words} → ${final_words} words, stages=${stagesCompleted}/6, aborted=${aborted}`);

      send("done", {
        humanised: current,
        stages_completed: stagesCompleted,
        original_words,
        final_words,
        provider: "qwen",
        model: QWEN_MODEL,
        profile: profile.name,
        aborted,
        version: "v5",
      });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});
