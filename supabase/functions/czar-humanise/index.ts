// CZAR / PaperStudio Humaniser — Academic Humaniser Pipeline v6 (2-STAGE)
//
// Collapses the previous 7-stage sequential pipeline into 2 calls:
//   Stage 1 — Comprehensive humanisation pass (structure + perplexity + texture + sweep)
//   Stage 2 — Verification + final output
//
// Total execution: ~30-50s vs ~140s for 7-stage. Stays well within Supabase's
// 150-second edge function execution limit.
//
// QWEN does all humanising. Caller passes `model` only to select fingerprint profile.
// On any stage failure, pipeline falls back to the previous stage's output.
//
// SSE events: pipeline_start | stage_start | stage_done | stage_skip | done

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DASHSCOPE_API_KEY = Deno.env.get("DASHSCOPE_API_KEY") || "";
const QWEN_MODEL = "qwen-plus";

type ProfileKey = "claude" | "gpt" | "gemini-flash" | "gemini-pro" | "qwen";

const TEMPERATURES = {
  rewrite: 1.0,
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

2. NO STANDALONE DRAMATIC FRAGMENTS for stylistic effect
   BANNED as standalone sentences: "Not trivial." "Hesitation is not possible."
   Every sentence must connect grammatically to its context.

3. NO FIGURATIVE LANGUAGE introduced by the rewriter
   BANNED unless verbatim from original: metaphors, similes, analogies.

4. NO REGISTER DRIFT
   BANNED: rhetorical questions for dramatic effect, second-person address,
   informal intensifiers, exclamatory structure, conversational phrasing.

5. WORD COUNT ANCHOR
   Output must be within ±8% of the original input word count. Enforced.
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
• Transition word openers — remove entirely, no replacement:
  "Furthermore", "Moreover", "Additionally", "In addition", "Simultaneously",
  "Subsequently", "It is important to note", "It is worth noting",
  "This demonstrates", "This highlights", "This underscores", "This illustrates"
• Closing summation sentences that restate the paragraph's opening claim
• Philosophical wrap-ups: "...remains essential/crucial/fundamental/vital to X"
• Connector openers: "This means...", "This involves...", "This ensures..."
• Evaluative openers: "X represents a remarkable/significant/notable Y"

STRUCTURAL:
• 3-part logical arc: broad claim → elaboration → summation — reconstruct
• Symmetric compound clauses: "X does A, while Y does B" (equal weight both sides)
• Chained participial endings: "...while X, allowing Y" / "...as Z, enabling W"
• Topic sentences that fully preview what the paragraph contains
• Three-part parallel lists with equal grammatical rhythm — break one item

PROBABILISTIC:
• High-frequency academic verbs used uniformly — replace at least one per paragraph:
  argue → put the case / hold / make the argument
  demonstrate → bear out / point toward / leave little doubt
  maintain → continue to insist / keep to the position
  highlight → draw attention to / flag / bring into view
  suggest → point toward / raise the question of
  represent → constitute / amount to / stand as
  achieve → produce / arrive at / reach
  allow/enable → make possible / open the way for
• Sentences of uniform length within a paragraph — fix with burstiness
`;

// ─── FEW-SHOT EXAMPLES ────────────────────────────────────────────────
// Drawn from real 0%-AI-detected student academic writing across multiple fields.
const FEW_SHOT_EXAMPLES = `
═══════════════════════════════════════════════
EXAMPLES — correct humanisation (academic register preserved)
Sourced from real 0%-AI-detected academic work across disciplines.
═══════════════════════════════════════════════

EXAMPLE 1 — Chained participial broken, direct argument entry:
BEFORE: "Political mismanagement has undermined Nigeria's development trajectory, demonstrating
the critical importance of leadership quality in determining national outcomes, while also
highlighting the role of institutional frameworks in enabling or constraining governance."
AFTER: "Nigeria's development failures are, in large part, a product of leadership. Danaher
et al. (2023) documented how misrule compounds across generations — each administration
inheriting not only the debts of the last but its institutional dysfunctions. The structural
problem runs deeper than any single government."

EXAMPLE 2 — Broad evaluative opener replaced with specific entry:
BEFORE: "Communication represents a fundamental and critical component of health and social care
practice, playing a crucial role in determining patient outcomes and service quality."
AFTER: "Poor communication in care settings has tangible harm: patients cannot understand the
treatment plan, feel unheard, and in some cases face life-threatening consequences. Danaher
et al. (2023) state that this is not incidental but structural — built into how services
are designed and delivered."

EXAMPLE 3 — Three-part balanced list broken, short punchy sentence added:
BEFORE: "Effective leaders demonstrate vision, integrity, and the capacity to mobilise
institutional resources toward collective goals, ensuring that governance remains aligned
with the needs of the population they serve."
AFTER: "Vision matters, but it is not enough on its own. A leader who cannot translate
intent into institutional action — who cannot move bureaucracies, negotiate opposition, and
hold coalitions together — will leave those goals largely unrealised (Burns, 2003). The
distance between aspiration and delivery is where leadership is actually tested."

EXAMPLE 4 — Symmetric clause broken, concessive opener used:
BEFORE: "Religion provides moral guidance in society, while secularism offers a framework
for governance that separates church from state, creating a balance between spiritual and
civic concerns."
AFTER: "It would be wrong to suggest that religion and governance operate in separate
spheres. Ezeanya (2018) writes that 'to attempt to build a nation without God is like
building a house without a foundation' — a claim that carries particular weight in societies
where religious identity shapes political allegiance more directly than party affiliation."

EXAMPLE 5 — Scaffold destroyed, argument-first structure, short punchy sentence:
BEFORE: "Communication is the foundation upon which all therapeutic relationships are built.
Without effective communication, practitioners cannot understand service users' needs or
deliver person-centred care. Thompson (2011) argued that communication is a dynamic relational
process rather than simple information transmission."
AFTER: "Without communication, care delivery becomes guesswork. Thompson (2011) put the
case plainly: this is not transmission but a relational process, in which meaning is
constructed between practitioner and service user. This distinction matters because it
changes how every assessment must be approached."

EXAMPLE 6 — Uniform sentence length fixed, burstiness introduced:
BEFORE: "The halo effect is a cognitive bias that influences how individuals perceive others.
It occurs when a positive impression in one domain influences overall evaluation. Research
has consistently demonstrated this phenomenon across multiple contexts."
AFTER: "The halo effect distorts. Once a positive first impression forms, it colours
every subsequent judgement — competence, honesty, physical attractiveness — in ways the
observer rarely notices (Thorndike, 1920). This is not a minor concern for recruitment or
clinical assessment: it is a structural problem in how humans process incomplete information,
and it is remarkably resistant to awareness alone."

EXAMPLE 7 — Meta-commentary opener replaced, evidence-first entry:
BEFORE: "This section will examine the relationship between social media use and adolescent
mental health, exploring various theoretical perspectives and empirical findings."
AFTER: "Adolescent depression rates rose 52% between 2005 and 2017 — a period that maps
almost exactly onto the expansion of social media use (Twenge et al., 2018). Whether the
relationship is causal, correlational, or confounded by third variables remains contested,
and the answer matters enormously for how clinicians and policymakers should respond."

WHAT NOT TO DO — banned outputs:
✗ "They commit." — standalone dramatic fragment
✗ "Not trivial." — standalone dramatic fragment
✗ "like a stone skipping across glass" — figurative language not in original
✗ Starting a paragraph with "Furthermore," or "Moreover,"
✗ Closing a paragraph with "...remains essential to X" or "...is of great importance"
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

5. THREE-PART PARALLEL ELABORATION — make one item substantially longer or shorter.

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
   The "while X, allowing/enabling Y" structure must be broken. Split into two sentences.

2. TRANSITION OVERLOAD — remove every "Furthermore", "Moreover", "Additionally",
   "Simultaneously", "It is important to note". No replacement.

3. RESTATEMENT PAIRS — second sentence is filler. Cut it.

4. META-STATEMENT CLOSERS — "This highlights the importance of X." Remove.

5. COMPOUND SENTENCE OVER-LOADING — maximum two clauses per sentence; split the rest.

6. HIGH-PROBABILITY VERBS TO REPLACE:
   highlight → draw attention to / flag / bring into view
   underscore → press / foreground / give particular weight to
   achieve → reach / produce / arrive at / generate
   represent → constitute / amount to / stand as
   allow → permit / make possible / open the way for`,
  },
  "gemini-flash": {
    name: "Gemini Flash",
    fingerprints: `
FINGERPRINTS TO TARGET (written by Gemini Flash):

1. BROAD EVALUATIVE OPENING CLAIMS — "X represents a remarkable/significant/notable Y"
   NEVER use: remarkable, significant, notable, important, critical, crucial as adjectives in openers.
   Replace with a specific claim, a mid-argument entry, or an acknowledged complexity.

2. PASSIVE PARTICIPIAL CLOSERS — ", achieved/enabled/facilitated/characterised by X"
   Restructure as active relative clause or separate sentence.

3. TRANSITION WORD OPENERS — remove "Simultaneously,", "Subsequently,", "Consequently,",
   "Additionally,", "Furthermore," at sentence start. No replacement.

4. SYMMETRIC PAIRED SENTENCES — merge into one complex sentence with subordination,
   or make one substantially longer.

5. HIGH-PROBABILITY VERBS TO REPLACE:
   represent → constitute / amount to / stand as
   function as → serve as / act as / operate as
   generate → produce / create / give rise to
   achieve → produce / arrive at / reach
   characterise → define / mark / distinguish`,
  },
  "gemini-pro": {
    name: "Gemini Pro",
    fingerprints: `
FINGERPRINTS TO TARGET (written by Gemini Pro):

1. OVER-HEDGING — one hedge per claim maximum. Make remaining claims direct.

2. ARCHAIC ACADEMIC VOCABULARY — "hitherto", "aforementioned", "with respect to".
   Replace with contemporary academic.

3. SYMMETRIC PARAGRAPH STRUCTURES — create deliberate asymmetry: one short, one dense.

4. OVER-CONTEXTUALISING OPENERS — cut the context-setter. Start with the claim or evidence.

5. HIGH-PROBABILITY VERBS TO REPLACE:
   demonstrate → bear out / point toward / leave little doubt
   illustrate → make visible / bring out / clarify
   corroborate → support / sit alongside / reinforce`,
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

5. HIGH-PROBABILITY VERBS TO REPLACE:
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
function wordRange(wc: number, pct: number) {
  return `${Math.round(wc * (1 - pct))}–${Math.round(wc * (1 + pct))} words`;
}

function buildBase(profile: { name: string; fingerprints: string }) {
  return `${REGISTER_LOCK}

${UNIVERSAL_FINGERPRINTS}

${profile.fingerprints}

${FEW_SHOT_EXAMPLES}`;
}

// Stage 1 — Comprehensive humanisation: structure destruction + sentence interior +
// perplexity injection + burstiness + citation patterns + human texture + fingerprint sweep
function stage1(p: { name: string; fingerprints: string }, wc: number) {
  return `${buildBase(p)}

═══════════════════════════════════════════════
STAGE 1: COMPREHENSIVE HUMANISATION
Target: ${wc} words (±8% = ${wordRange(wc, 0.08)})
═══════════════════════════════════════════════

Apply ALL of the following in a single pass. Every paragraph must be touched.

━━ STRUCTURE DESTRUCTION ━━
• Destroy the AI argument architecture: broad claim → elaboration → summation
• At least one paragraph opens mid-argument or with specific evidence — not a broad claim
• At least one paragraph ends on a citation, specific detail, or qualifier — not a summation
• Create length asymmetry: at least one noticeably shorter paragraph, one denser
• Remove every transition word opener — no replacement, continue directly
• Break every chained participial ("while X, allowing Y" → split into two sentences)
• Break every three-part parallel list — make one item substantially different length
• No two consecutive sentences share the same syntactic opening

━━ SENTENCE INTERIOR ━━
• Attack the internal structure of sentences. At least one per paragraph:
  - Front-loaded subordinate clause before a short main clause
  - Asymmetric pair: one long, one short complete sentence (not a fragment)
  - Colon split instead of a conjunction
  - Mid-sentence direction change
  - Genuine em-dash interruption (only where genuinely parenthetical)
• GPT priority: max two clauses per sentence — any sentence with "while X, allowing Y"
  must be split here

━━ PERPLEXITY + BURSTINESS ━━
Replace high-probability verbs (at least one per paragraph):
  argued → put the case / held / made the argument
  demonstrated → bore out / pointed toward / left little doubt that
  highlighted → drew attention to / flagged / brought into view
  suggested → pointed toward / raised the question of
  represent → constitute / amount to / stand as
  achieve → produce / arrive at / reach
  allow/enable → make possible / open the way for

For every paragraph (burstiness enforcement):
• At least one sentence under 12 words
• At least one sentence over 28 words
• No more than two consecutive sentences of similar length

━━ CITATION PATTERNS ━━
No two consecutive citations may use the same integration pattern. Use at least 3 of:
  a) Study-first: "A 2021 review by Jones et al. found that..."
  b) Mid-sentence: "...models — which Rietman et al. (2022) found structurally inadequate — continue to..."
  c) Passive: "It has been established (Smith, 2018) that..."
  d) Named without active verb: "As Jones (2013) observed, the picture is more complex."
  e) Evidence then source: "Outcomes worsen under delayed intervention (Brown, 2021)."
  f) Concessive: "Even Brown and Ali (2019)... acknowledged..."
  g) Temporal: "Since Thompson's (2011) foundational work..."

━━ HUMAN TEXTURE ━━
Each of the following must appear at least once:
• HEDGE: "may", "tends to", "in many cases", "can suggest", "often appears"
• CONCESSION: "Even so,", "This does not mean...", "It would be wrong to suggest..."
• SELF-COMMENTARY: "This matters because...", "What this reveals is...", "The implication here is..."
• SHORT COMPLETE SENTENCE (under 10 words) after a long dense one

━━ FINGERPRINT SWEEP ━━
Remove every instance of:
⛔ "Furthermore," "Moreover," "Additionally," "In addition,"
⛔ "It is important to note" "It is worth noting"
⛔ "This demonstrates" "This highlights" "This underscores" (as openers)
⛔ "...remains essential/crucial/fundamental to X"
⛔ "...is therefore of great importance"
⛔ Any paragraph ending that restates its opening claim
⛔ Any opening with "remarkable", "significant", "notable" as evaluative adjectives

REGISTER CHECK: No contractions. No standalone fragments. No figurative language added. Academic throughout.

Output the rewritten text only. No explanation. No preamble.`;
}

// Stage 2 — Verification: targeted fixes only, no wholesale rewrite
function stage2(_p: { name: string; fingerprints: string }, wc: number) {
  return `You are a final verification engine for academic humanised text.

${REGISTER_LOCK}

Original word count: ${wc} words. Acceptable range: ${wordRange(wc, 0.08)}.

═══════════════════════════════════════════════
STAGE 2: VERIFICATION + FINAL OUTPUT
═══════════════════════════════════════════════

Check each signal. For every FAIL, rewrite ONLY that sentence or phrase — do not rewrite the whole text.

AI DETECTION SIGNALS:
□ 1.  OPENING CLAIM — broad generalisation → start mid-argument or with evidence
□ 2.  CLOSING SUMMATION — restatement of opening claim → cut or replace with detail/citation
□ 3.  THREE-PART LIST — three parallel items of equal weight → make one longer, fold one
□ 4.  SYMMETRIC CLAUSE — balanced clauses joined by while/whereas → split asymmetrically
□ 5.  CHAINED PARTICIPIAL — "while X, allowing/enabling Y" → split into two sentences
□ 6.  TRANSITION WORDS — Furthermore/Moreover/Additionally → remove
□ 7.  RESTATEMENT — sentence saying same as previous → cut one
□ 8.  PHILOSOPHICAL WRAP — "...remains essential/crucial/fundamental" → cut or replace
□ 9.  BURSTINESS — all sentences within 8 words of each other → extend or split one
□ 10. VERB UNIFORMITY — same high-frequency verb twice in a paragraph → replace one
□ 11. CITATION PATTERN — two consecutive citations identical pattern → rewrite one
□ 12. TOPIC SENTENCE UNIFORMITY — over half preview the paragraph → replace with pivot opener
□ 13. CONNECTOR OPENER — "This means/involves/ensures..." → remove, start with content
□ 14. EVALUATIVE ADJECTIVE IN OPENER — remarkable/significant/notable → replace

REGISTER SIGNALS:
□ 15. CONTRACTIONS — any contraction → expand
□ 16. STANDALONE FRAGMENTS — one-sentence stylistic paragraph → merge or expand
□ 17. FIGURATIVE LANGUAGE — metaphor/simile not in original → rewrite literal
□ 18. REGISTER DRIFT — journalistic/conversational → rewrite formal academic
□ 19. WORD COUNT — outside ${wordRange(wc, 0.08)} → trim or expand qualifying clause

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

      console.log(`[czar-humanise v6] start: ${original_words} words, profile=${profile.name}, 2-stage`);
      send("pipeline_start", {
        stages: 2,
        provider: "qwen",
        model: QWEN_MODEL,
        profile: profile.name,
        original_words,
        version: "v6",
      });

      let current = text;
      let stagesCompleted = 0;
      let aborted = false;

      const stages = [
        { num: 1, label: "Comprehensive Humanisation", build: stage1, temp: TEMPERATURES.rewrite },
        { num: 2, label: "Verification & Final Output", build: stage2, temp: TEMPERATURES.verify },
      ];

      for (const s of stages) {
        if (upstreamSignal.aborted) { aborted = true; break; }
        send("stage_start", { stage: s.num, label: s.label });

        const ctrl = new AbortController();
        const onAbort = () => ctrl.abort();
        upstreamSignal.addEventListener("abort", onAbort, { once: true });
        // 60s per stage — each QWEN call should complete in 15-30s
        const timer = setTimeout(() => ctrl.abort(), 60_000);

        try {
          const sys = s.build(profile, original_words);
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
          console.error(`[czar-humanise v6] stage ${s.num} failed:`, e?.message || e);
          send("stage_skip", { stage: s.num, label: s.label, reason: String(e?.message || e).slice(0, 200) });
        }
      }

      const final_words = wc(current);
      console.log(`[czar-humanise v6] done: ${original_words} → ${final_words} words, stages=${stagesCompleted}/2, aborted=${aborted}`);

      send("done", {
        humanised: current,
        stages_completed: stagesCompleted,
        original_words,
        final_words,
        provider: "qwen",
        model: QWEN_MODEL,
        profile: profile.name,
        aborted,
        version: "v6",
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
