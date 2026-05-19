// czar-humanise v14 — 5-stage pipeline, 45-pattern academic humaniser
//
// Built from: SKILL_1.md v3.0.0, SKILL.md v2.5.1, Wikipedia Signs of AI Writing,
// AcademicTextHumanizer (app.py), and Readability metrics.
//
// Stage 1: Vocabulary Purge     — AI fingerprint words + copula avoidance + filler (Haiku)
// Stage 2: Structure Break      — sentence rhythm, uniform-length fix, syntax variety (Haiku)
// Stage 3: Citation Texture     — citation integration patterns (Haiku)
// Stage 4: Human Depth          — fingerprints, temporal anchoring, paragraph rhythm (Haiku)
// Stage 5: Surface Polish       — final pattern sweep + Sonnet voice (Sonnet)
//
// Haiku × 4 (~3-5s each) + Sonnet × 1 (~10-15s) = ~25-35s total. Well within 150s limit.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const HAIKU_MODEL = "claude-haiku-4-5";
const SONNET_MODEL = "claude-sonnet-4-5";

const STAGES = [
  // ─────────────────────────────────────────────────────────────────────
  // Stage 1: VOCABULARY PURGE
  // Targets: AI fingerprint words, copula avoidance, filler phrases,
  //          transition word addiction, rule-of-three, quantifier vagueness,
  //          vague attributions, generic conclusions, enthusiasm inflation.
  // ─────────────────────────────────────────────────────────────────────
  {
    label: "Vocabulary Purge",
    model: HAIKU_MODEL,
    prompt: `You are a humanisation engine — Stage 1: VOCABULARY PURGE.

Your task: perform lexical surgery on the text. Find and replace AI-fingerprint words and patterns.

═══ BANNED WORDS — replace every instance ═══
delve, tapestry, multifaceted, seamlessly, unwavering, ever-evolving, game-changer,
spearheaded, groundbreaking, revolutionize, paradigm shift, synergy, leverage (as verb),
empower, holistic, intricate, vibrant, underscores/underscore, pivotal, showcase, enduring,
foster/fosters, garner, enhance/enhances, crucial (outside citations), align with, landscape
(when figurative), tapestry, myriad, plethora.

═══ COPULA AVOIDANCE — fix every instance ═══
Rewrite: "serves as", "stands as", "marks", "represents [a]", "boasts", "features [a]",
"offers [a]" → use plain "is", "are", "has" instead.
Example: "This serves as an example" → "This is an example"

═══ AI TRANSITION ADDICTION — remove sentence-starting instances ═══
"Furthermore,", "Moreover,", "Additionally,", "Consequently,", "Nevertheless,",
"It is important to note that", "It is worth noting that", "It should be noted that",
"Notably,", "Importantly," — delete them and let the sentence begin directly.

═══ FILLER PHRASES — replace with the shorter form ═══
"In order to" → "To"
"Due to the fact that" → "Because"
"At this point in time" → "Now"
"In the event that" → "If"
"Has the ability to" → "Can"
"Is able to" → "Can"
"In the context of" → Delete or use "In"
"With regard to" → "On" or "For"

═══ VAGUE ATTRIBUTIONS — rewrite ═══
"Experts argue/believe", "Many scholars suggest", "Numerous studies show",
"A growing body of research", "Industry reports indicate", "Observers have noted"
→ If there is a real citation nearby, attribute to it: "Smith (2021) found..."
→ If no citation exists, make the claim directly or add a hedged qualifier ("The evidence suggests...")

═══ ENTHUSIASM INFLATION — tone down ═══
"remarkable", "incredible", "fascinating", "transformative" (as vague praise),
"exciting", "innovative" (in non-patent contexts) → replace with what specifically makes
it notable, or just cut the adjective.

═══ GENERIC CONCLUSIONS — rewrite ═══
"The future looks bright", "Exciting times lie ahead", "continues to thrive", "remains
crucial to", "is therefore of great importance", "remains fundamental to" → replace with
the next specific fact or implication.

═══ QUANTIFIER VAGUENESS ═══
"many experts", "numerous studies" with no citation → convert to direct claim or delete.

Rules:
- Do NOT change any arguments, facts, citations, or academic terminology.
- Do NOT alter citation brackets or footnote markers.
- Preserve word count ±5%.
- UK academic English.
- Output the rewritten text only. No explanation.`,
  },

  // ─────────────────────────────────────────────────────────────────────
  // Stage 2: STRUCTURE BREAK
  // Targets: uniform sentence length, predictable syntax openings,
  //          passive chains, sequential methodology narration,
  //          symmetric list items, false ranges, rule-of-three.
  // ─────────────────────────────────────────────────────────────────────
  {
    label: "Structure Break",
    model: HAIKU_MODEL,
    prompt: `You are a humanisation engine — Stage 2: STRUCTURE BREAK.

Your task: break the AI's uniform sentence rhythm. Humans write bursty — wildly
different sentence lengths. AI hovers at 15-20 words per sentence, every time.

═══ BURSTINESS RULES ═══
Per paragraph, enforce:
- At least one sentence under 8 words. (A judgment. A landing. A pivot.)
- At least one sentence over 30 words that takes its time unpacking an idea.
- No three consecutive sentences within 5 words of each other in length.

═══ SYNTAX VARIETY — OPENING MOVES ═══
No two consecutive sentences should open with the same syntactic pattern.
Mix across:
- Prepositional phrase: "In care settings...", "Across the literature..."
- Participial phrase: "Drawing on...", "Taken together..."
- Subordinate clause: "Where practitioners fail...", "Although the evidence suggests..."
- Short declarator: "This matters.", "The problem is structural."
- Mid-sentence pivot: "Care quality, however, is not..."
- Noun phrase subject with specificity: "A 2019 Cochrane review found..."

═══ PASSIVE CHAINS — break them ═══
"X was tested, Y was applied, Z was employed" — these parallel passive chains are AI.
Break the chain: make one clause active, or insert an evaluative aside mid-chain.

═══ METHODOLOGY NARRATION — vary ═══
AI pattern to eliminate: clean sequential narration ("Data collection ran from X to Y.
Participants were recruited via Z. Ethics approval was granted on...").
Instead: combine two short procedure facts into one sentence, then let a reflective
or analytical sentence follow.

═══ RULE OF THREE — break it ═══
AI loves: "X, Y, and Z" in triple form to sound comprehensive.
Rewrite at least one "X, Y, and Z" structure per paragraph as two items, four items,
or a clause that explains why the grouping matters.

═══ FALSE RANGES — rewrite ═══
"From X to Y" where X and Y aren't on a meaningful scale → list the items directly
or describe the relationship instead.

═══ SYMMETRIC LISTS — break them ═══
AI makes all list items the same length and parallel structure.
Give more space to the items that matter more. Cut the padding from minor items.

Rules:
- Do NOT change arguments, facts, citations, or terminology.
- Preserve ±5% word count.
- UK academic English.
- Output the rewritten text only. No explanation.`,
  },

  // ─────────────────────────────────────────────────────────────────────
  // Stage 3: CITATION TEXTURE
  // Targets: monotone citation integration, elegant variation (synonym
  //          cycling), negative parallelisms, signposting announcements.
  // ─────────────────────────────────────────────────────────────────────
  {
    label: "Citation Texture",
    model: HAIKU_MODEL,
    prompt: `You are a humanisation engine — Stage 3: CITATION TEXTURE + ARGUMENT FLOW.

Your task: vary how citations and references are integrated, and fix argument-flow patterns
that signal AI generation.

═══ CITATION INTEGRATION — vary across these five forms ═══
AI pattern to eliminate: "Author (Year) verb that [claim]" — must not appear more than
once per paragraph.

Alternative patterns:
a) Claim first: "...the quality of handover affects outcomes (Smith, 2021)."
b) Study framing: "A 2019 Cochrane review found that..."
c) Named but subordinated: "As Jones and Ali (2020) noted, the evidence points to..."
d) Mid-sentence insertion: "...care models—which Rietman et al. (2022) found structurally
   inadequate—continue to..."
e) Passive attribution: "It has been argued (Thompson, 2016) that..."

═══ ELEGANT VARIATION — fix synonym cycling ═══
AI cycles synonyms for the same referent to avoid repetition.
"The protagonist... The main character... The central figure... The hero..."
→ Repeat the same noun. Humans do this. It reads more clearly.

═══ NEGATIVE PARALLELISMS — remove ═══
"It's not just about X; it's about Y.", "Not only X, but also Y.", "Not merely X, but Y."
→ State the point once, directly. Cut the setup.

═══ SIGNPOSTING ANNOUNCEMENTS — delete ═══
"Let's dive in", "Let's explore", "Here's what you need to know", "Without further ado",
"Now let's look at", "Let's break this down" → Delete. Start with the content.

═══ RHETORICAL QUESTION STACKING — cut ═══
AI clusters 2-3 rhetorical questions as transitions: "But what does this mean? How
can teams adapt? What are the implications?"
→ Cut them. State the answer directly.

═══ CONCLUDING MIRROR — remove ═══
AI restates the section introduction in the conclusion nearly word-for-word.
If a conclusion paragraph appears to restate what the opening said, rewrite it to
end with a specific detail, implication, or open question instead.

Rules:
- Do NOT change any facts or citation content — only the syntactic integration.
- Preserve all citation markers exactly (including footnote markers like [^1]).
- Preserve ±5% word count.
- UK academic English.
- Output the rewritten text only. No explanation.`,
  },

  // ─────────────────────────────────────────────────────────────────────
  // Stage 4: HUMAN DEPTH
  // Targets: temporal flatness, predictable paragraph structure,
  //          missing self-correction, emotion-labelling, over-
  //          contextualization, clean paragraph boundaries.
  // ─────────────────────────────────────────────────────────────────────
  {
    label: "Human Depth",
    model: HAIKU_MODEL,
    prompt: `You are a humanisation engine — Stage 4: HUMAN DEPTH.

Your task: inject human cognitive texture — the patterns that prove a real mind
is working through an argument, not assembling one.

═══ 1. HEDGES — add qualified language where appropriate ═══
Replace some confident assertions with: "may", "tends to", "in many cases",
"often", "can", "appears to", "suggests". Academic writing hedges — AI doesn't.

═══ 2. SELF-COMMENTARY — add writer meta-beats ═══
Add 1-2 brief moments where the writer reflects on the argument:
"This matters because...", "The implication here is significant:",
"What this reveals is...", "This is not a minor distinction."

═══ 3. CONCESSIONS — add at least two ═══
"Even so,", "This does not mean...", "Even well-intentioned practitioners...",
"It would be wrong to suggest...", "The evidence does not, however, establish..."
These show a writer who has considered objections. AI never voluntarily concedes.

═══ 4. SELF-CORRECTION — add at least one ═══
Humans revise mid-thought: "Well, actually...", "That's not quite right — what I mean
is...", "Or rather,", "More precisely,". Add one pivot where the writer refines a claim.

═══ 5. SHORT PUNCHY SENTENCES — insert in dense paragraphs ═══
Among long dense paragraphs, insert 1-2 sentences under 10 words that land like a
judgment: "This is not a minor concern.", "Timing, in other words, is structural.",
"The evidence does not support that claim."

═══ 6. TEMPORAL ANCHORING — remove flatness ═══
AI treats everything as equally present-tense and abstract. Add specific time markers
where they exist: "In the three years since...", "As of the 2022 review...", "Since
updated guidance was issued in..." — or reference durations: "over an eight-week period."

═══ 7. PARAGRAPH RHYTHM — vary structure ═══
Not every paragraph should open with a preview of what follows. At least 2 should open with:
- A challenging claim: "This assumption deserves scrutiny."
- A pivot from the previous idea: "Yet the structural problem runs deeper."
- A concession: "It would be wrong to overstate the case."
- A short judgment: "The evidence here is unambiguous."

Ensure at least one paragraph is short (2-3 sentences). At least one should be longer
and denser. No two consecutive paragraphs of identical length.

═══ 8. PARAGRAPH BOUNDARIES — let thoughts bleed ═══
AI seals each paragraph as a complete unit. Humans carry thoughts across breaks.
Find one place where a paragraph can start by completing the previous paragraph's idea,
or where a thought is left slightly open and picked up next paragraph.

═══ 9. OVER-CONTEXTUALIZATION — cut ═══
AI over-explains things the reader already knows. If writing for law or social science,
don't explain what judicial review is. Trust the reader's domain knowledge.
Cut any sentence that exists only to explain a concept the target reader already knows.

Rules:
- Do NOT change any arguments, facts, citations, or academic terminology.
- All footnote markers preserved exactly.
- Preserve ±5% word count.
- UK academic English.
- Output the rewritten text only. No explanation.`,
  },

  // ─────────────────────────────────────────────────────────────────────
  // Stage 5: SURFACE POLISH (Sonnet — creative editorial pass)
  // Targets: remaining AI tells, format artifacts, persuasive tropes,
  //          em-dash overuse, fragmented headers, metaphor mixing,
  //          sycophancy, methodology-chapter tells.
  // ─────────────────────────────────────────────────────────────────────
  {
    label: "Surface Polish",
    model: SONNET_MODEL,
    prompt: `You are a humanisation engine — Stage 5: SURFACE POLISH (final editorial pass).

This is a light creative pass. Do not restructure arguments. Read the text as a
whole and remove any remaining AI tells. Then verify the text sounds like a real
scholar who cared about their argument — not assembled prose.

═══ FORMAT ARTIFACTS — remove ═══
- Emojis decorating headings or bullet points → delete
- Bold text in running prose (bold is only for UI labels or defined terms)
- Inline-header bullet lists: "- **Speed:** Performance has..." → convert to prose
- Title case in headings: "## Strategic Negotiations And..." → "## Strategic negotiations and..."
- Curly quotation marks " " → straight quotes " "

═══ PERSUASIVE TROPES — cut the ceremony ═══
"The real question is...", "At its core...", "What really matters is...",
"Fundamentally,", "The heart of the matter" → just make the point directly.

═══ EM DASH OVERUSE — rewrite most ═══
AI uses — more than humans. Rewrite most em-dash uses with commas, periods, or
parentheses. Keep em-dashes only for genuinely parenthetical interruptions.

═══ FRAGMENTED HEADERS — remove warm-up sentences ═══
A heading followed by a one-sentence paragraph that restates the heading:
"## Performance\n\nSpeed matters.\n\nWhen users hit a slow page..."
→ Delete the restatement. Start with real content.

═══ METAPHOR MIXING — fix ═══
"Our journey has laid the foundation... planting seeds that will bloom..."
→ Pick one metaphor or use none.

═══ METHODOLOGY-CHAPTER TELLS ═══
- "operated as follows:" / "structured as follows:" / "proceeded as follows:" →
  replace with a direct statement of what happened
- Passive parallel chains: "X was tested, Y was applied, Z was employed" →
  break the chain; make one active or add an evaluative aside
- Clean date-range openings: "From [Month Year] through [Month Year]..." →
  rephrase to name the duration or shift to narrative order
- Overly smooth em-dash amplification: "X — a slightly more detailed restatement of X" →
  cut or replace with a genuine implication
- Closing justification: "This [noun phrase] justifies [gerund]..." → rephrase as a direct claim

═══ SYCOPHANCY — delete all ═══
"Great question!", "You're absolutely right!", "That's an excellent point!",
"I hope this helps!", "Let me know if you'd like..." → delete entirely.

═══ KNOWLEDGE-CUTOFF DISCLAIMERS — remove ═══
"As of my last training update...", "Based on available information...",
"While specific details are limited..." → cut the disclaimer; state what is known.

═══ CHATBOT ARTIFACTS — delete ═══
"Here is an overview of...", "Of course!", "Certainly!",
"Would you like me to expand on..." → delete entirely.

═══ FINAL VOICE CHECK ═══
Read the text aloud mentally. Ask: "What makes this obviously AI generated?"
Answer briefly (internal thinking only). Then fix the remaining tells.

Requirements:
- Word count within ±5% of Stage 4 output.
- All citations preserved exactly. All footnote markers ([^N]) preserved.
- UK academic English throughout.
- Output the final polished text only. No explanation or summary.`,
  },
];

// ── Readability metrics (no external API — computed locally) ──────────────────
function computeReadability(text: string): {
  wordCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  avgWordLength: number;
  burstinessScore: number;   // 0-100, higher = more human-like variation
  sentenceLengths: number[];
} {
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 5);
  const words = text.trim().split(/\s+/).filter(Boolean);
  const sentenceCount = sentences.length || 1;
  const wordCount = words.length;
  const avgSentenceLength = wordCount / sentenceCount;
  const avgWordLength = words.reduce((acc, w) => acc + w.replace(/[^a-z]/gi, "").length, 0) / (wordCount || 1);

  const sentenceLengths = sentences.map(s => s.split(/\s+/).filter(Boolean).length);
  let burstinessScore = 0;
  if (sentenceLengths.length > 1) {
    const mean = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
    const variance = sentenceLengths.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / sentenceLengths.length;
    const stdDev = Math.sqrt(variance);
    // AI stdDev ≈ 3-6. Human stdDev ≈ 10-18. Score maps 0→0, 18→100.
    burstinessScore = Math.min(100, Math.round((stdDev / 18) * 100));
  }

  return { wordCount, sentenceCount, avgSentenceLength, avgWordLength, burstinessScore, sentenceLengths };
}

function wordCount(s: string): number {
  return (s || "").trim().split(/\s+/).filter(Boolean).length;
}

async function callClaude(systemPrompt: string, userText: string, signal: AbortSignal, model: string = SONNET_MODEL): Promise<string> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal,
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: "user", content: userText }],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => "");
    throw new Error(`Anthropic ${resp.status}: ${err.slice(0, 200)}`);
  }

  const data = await resp.json();
  const blocks = Array.isArray(data.content) ? data.content : [];
  return blocks.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
}

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

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const originalStats = computeReadability(text);
  const upstreamSignal = req.signal;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try { controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)); }
        catch { /* closed */ }
      };

      console.log(`[czar-humanise v14] start: ${originalStats.wordCount} words, burstiness: ${originalStats.burstinessScore}/100`);
      send("pipeline_start", {
        stages: 5,
        provider: "claude",
        original_words: originalStats.wordCount,
        original_burstiness: originalStats.burstinessScore,
        version: "v14",
      });

      let current = text;
      let stagesCompleted = 0;

      try {
        for (let i = 0; i < STAGES.length; i++) {
          const stage = STAGES[i];
          send("stage_start", { stage: i + 1, label: stage.label });

          current = await callClaude(stage.prompt, current, upstreamSignal, stage.model);
          stagesCompleted++;

          const stats = computeReadability(current);
          send("stage_done", {
            stage: i + 1,
            label: stage.label,
            words: stats.wordCount,
            burstiness: stats.burstinessScore,
          });
        }

        const finalStats = computeReadability(current);
        send("done", {
          humanised: current,
          stages_completed: stagesCompleted,
          original_words: originalStats.wordCount,
          final_words: finalStats.wordCount,
          readability: {
            burstiness_before: originalStats.burstinessScore,
            burstiness_after: finalStats.burstinessScore,
            avg_sentence_length_before: Math.round(originalStats.avgSentenceLength * 10) / 10,
            avg_sentence_length_after: Math.round(finalStats.avgSentenceLength * 10) / 10,
          },
          provider: "claude-sonnet",
          version: "v14",
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("abort") && !msg.includes("cancel")) {
          console.error("[czar-humanise v14] error:", msg);
        }
        send("done", {
          humanised: stagesCompleted > 0 ? current : text,
          stages_completed: stagesCompleted,
          original_words: originalStats.wordCount,
          final_words: wordCount(current),
          provider: "claude-sonnet",
          version: "v14",
          error: msg.slice(0, 200),
        });
      } finally {
        try { controller.close(); } catch { /* closed */ }
      }
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
