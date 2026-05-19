// czar-humanise v12 — 5-stage sequential pipeline (original pipeline, 5–13% AI scores)
//
// Each stage has ONE specific job, run sequentially. Output of stage N → input of stage N+1.
// Stage 1: Structure Break    — varies sentence syntax openings
// Stage 2: Citation Texture   — varies how citations are integrated
// Stage 3: Human Fingerprints — adds hedges, concessions, punchy short sentences
// Stage 4: Paragraph Rhythm   — varies paragraph length and topic-sentence moves
// Stage 5: Surface Polish     — removes remaining AI tells, adds mild writer voice

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const CLAUDE_MODEL = "claude-sonnet-4-5";

const STAGES = [
  {
    label: "Structure Break",
    prompt: `You are a humanisation engine — Stage 1: STRUCTURE BREAK.

Your task: rewrite the academic text below so that NO TWO consecutive sentences share the same syntactic structure at their opening.

Rules:
- Vary sentence openings: mix prepositional phrases ("In care settings..."), participial phrases ("Drawing on..."), subordinate clauses ("Where practitioners fail..."), short declarators ("This matters."), mid-sentence pivots.
- Break up any sentence longer than 45 words into two — but never make two short sentences in a row without a longer one following.
- Do NOT change any facts, citations, arguments or academic terminology.
- Preserve all references exactly.
- Target word count: within ±3% of input.
- UK academic English.
- Output the rewritten text only. No explanation.`,
  },
  {
    label: "Citation Texture",
    prompt: `You are a humanisation engine — Stage 2: CITATION TEXTURE.

Your task: vary how all citations and references are integrated into the text.

Rules:
- AI citation pattern to eliminate: 'Author (year) verb that [claim]' — this structure must NOT appear more than once per paragraph.
- Use these alternative patterns instead:
  a) Claim first, then source: "...the quality of handover affects outcomes (Smith, 2021)."
  b) Study summary: "A 2019 Cochrane review found that..."
  c) Named without verb: "As Jones and Ali (2020) noted, the evidence points to..."
  d) Mid-sentence insertion: "...care models — which Rietman et al. (2022) found to be structurally inadequate — continue to..."
  e) Passive attribution: "It has been argued (Thompson, 2016) that..."
- Do NOT change any arguments, facts, or citation content — only the syntactic integration.
- Preserve all citations. Preserve word count ±3%.
- Output the rewritten text only. No explanation.`,
  },
  {
    label: "Human Fingerprints",
    prompt: `You are a humanisation engine — Stage 3: HUMAN FINGERPRINTS.

Your task: insert the following human writing traits into the text. Each trait should appear at least twice across the full text.

Traits to add:
1. HEDGES: Replace confident assertions with qualified ones: "may", "tends to", "in many cases", "often", "can".
2. SELF-COMMENTARY: Add brief meta-beats where the writer reflects on the argument: "This matters because...", "The implication is significant:", "What this reveals is..."
3. CONCESSIONS: Add at least two concessive phrases: "Even so,", "This does not mean...", "Even well-intentioned practitioners...", "It would be wrong to suggest..."
4. SHORT PUNCHY INTERRUPTIONS: Insert 1-2 very short sentences (under 10 words) among long dense paragraphs. These should land like a judgment: "This is not a minor concern.", "The stakes are real.", "Timing, in other words, is structural."
5. SLIGHTLY OVERSTUFFED PHRASE: Leave one or two phrases that use a clause more than strictly needed — this reads as a human writing quickly through an argument.

Rules:
- Do NOT change any arguments, facts, or citation content.
- These additions should feel woven in, not bolted on.
- Preserve word count ±5%.
- UK academic English.
- Output the rewritten text only. No explanation.`,
  },
  {
    label: "Paragraph Rhythm",
    prompt: `You are a humanisation engine — Stage 4: PARAGRAPH RHYTHM.

Your task: vary the paragraph structure and opening moves so the text has uneven, human rhythm.

Rules:
1. PARAGRAPH LENGTH: Ensure at least one paragraph is noticeably short (2-3 sentences). At least one should be long and dense. Do not let all paragraphs be the same length.
2. TOPIC SENTENCES: Not every paragraph should open with a preview of what follows. At least 2 paragraphs should open with one of these alternatives:
   - A challenging claim: "This assumption deserves scrutiny."
   - A pivot from the last idea: "Yet the structural problem runs deeper."
   - A concession: "It would be wrong to overstate the case."
   - A short judgment: "The evidence here is unambiguous."
3. DENSITY CONTRAST: If two consecutive paragraphs feel equally dense in argumentation, lighten one by removing a sub-clause or splitting a sentence.
4. Do NOT change any arguments, facts, citations, or academic terminology.
5. Preserve word count ±5%.
6. UK academic English.
7. Output the rewritten text only. No explanation.`,
  },
  {
    label: "Surface Polish",
    prompt: `You are a humanisation engine — Stage 5: SURFACE POLISH (final pass).

Your task: read the text as a whole and remove any remaining AI tells. This is a light editorial pass — do not restructure arguments.

Remove these AI patterns if present:
- Formulaic transitions: "Furthermore,", "Moreover,", "In addition,", "It is important to note that", "It is worth noting", "In conclusion, it is clear that"
- Repeated sentence-opening words across consecutive sentences
- Any phrase that sounds like a checklist item being ticked off
- Overly balanced three-part lists (AI loves: "X, Y, and Z" in that exact triple form — break one up)
- Any summary sentence at the end of a section that simply restates the opening point

Add if missing:
- At least one place where the writer's own perspective comes through mildly — not as "I think" but as a framing choice: "The concern here is not simply procedural.", "What emerges is a picture of..."

Final checks:
- Word count must be within ±5% of the original input word count.
- All citations preserved exactly.
- UK academic English throughout.
- Output the final polished text only. No explanation.`,
  },
];

function wordCount(s: string): number {
  return (s || "").trim().split(/\s+/).filter(Boolean).length;
}

async function callClaude(systemPrompt: string, userText: string, signal: AbortSignal): Promise<string> {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal,
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
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

  const original_words = wordCount(text);
  const upstreamSignal = req.signal;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try { controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)); }
        catch { /* closed */ }
      };

      console.log(`[czar-humanise v12] start: ${original_words} words, 5-stage pipeline`);
      send("pipeline_start", { stages: 5, provider: "claude-sonnet", original_words, version: "v12" });

      let current = text;
      let stagesCompleted = 0;

      try {
        for (let i = 0; i < STAGES.length; i++) {
          const stage = STAGES[i];
          send("stage_start", { stage: i + 1, label: stage.label });

          current = await callClaude(stage.prompt, current, upstreamSignal);
          stagesCompleted++;

          const words = wordCount(current);
          send("stage_done", { stage: i + 1, label: stage.label, words });
        }

        const final_words = wordCount(current);
        send("done", {
          humanised: current,
          stages_completed: stagesCompleted,
          original_words,
          final_words,
          provider: "claude-sonnet",
          version: "v12",
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("abort") && !msg.includes("cancel")) {
          console.error("[czar-humanise v12] error:", msg);
        }
        send("done", {
          humanised: stagesCompleted > 0 ? current : text,
          stages_completed: stagesCompleted,
          original_words,
          final_words: wordCount(current),
          provider: "claude-sonnet",
          version: "v12",
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
