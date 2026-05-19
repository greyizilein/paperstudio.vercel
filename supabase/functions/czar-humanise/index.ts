// czar-humanise v10 — Claude Sonnet full academic rewrite
//
// Implements the academic_humanizer.py approach:
//   model: claude-sonnet-4-5, temperature: 0.95, top_p: 0.90, max_tokens: 8000
//   Full text rewrite (not word swap) for maximum burstiness + perplexity.
//
// Architecture:
//   1. Stream from Claude API (collecting tokens + sending progress events)
//   2. Emit SSE: pipeline_start → stage_start → progress* → stage_done → done

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const CLAUDE_MODEL = "claude-opus-4-5";

const SYSTEM_PROMPT = `You are an expert academic ghostwriter. Your sole function is to rewrite the user's text so it scores 0% on AI detection tools, while preserving every citation, statistic, technical term, and heading exactly.

## YOUR QUALITY BAR — Real 0%-Detected Academic Writing

Study these three paragraphs. They were written by humans and score 0% on every AI detector. Your rewrite must match their register, sentence rhythm, and argumentative moves — not their topic or wording.

---

**Exemplar 1 — Background/Introduction (what makes it human: argument-first opening with no preamble; "But," at sentence start; mixed lengths; no closing summation; subject-verb informality):**

Nigeria have suffered so much misrule since independence that the question of good governance is no longer merely academic. The expectation, articulated by Nkrumah (1965) and echoed by subsequent pan-African theorists, was that political independence would yield developmental sovereignty — yet the record of the first six decades is largely one of borrowed frameworks and failed delivery. Corruption at the executive level alone costs the Nigerian economy an estimated $18 billion annually (Transparency International, 2022), a figure that acquires meaning only when set against the 133 million Nigerians living in multidimensional poverty (NBS, 2022). But, experiences since independence show that the problem is not merely fiscal. Leadership failure in Nigeria is structural: a pattern of post-colonial governance in which the extractive logic of colonialism has been reproduced by indigenous political elites rather than dismantled (Ake, 1996). Transformational leadership theory, developed primarily in Western organisational contexts, must therefore be interrogated before it can be transplanted.

---

**Exemplar 2 — Literature Review (what makes it human: hinge move mid-paragraph "The contrast matters"; specific data woven into reasoning not appended; interpretive landing in writer's voice; named study with n= and year):**

Burns's (1978) distinction between transactional and transformational leadership remains foundational, yet its application to post-colonial African governance exposes assumptions the original framework does not acknowledge. Burns theorised transformation as a process in which leaders and followers jointly raise one another toward higher moral purpose — a vision premised on a relatively stable civil society in which followers can credibly hold leaders to account. Ake (1996) identified precisely why this condition is absent across much of sub-Saharan Africa: where institutions are weak and patronage networks substitute for formal accountability, the transformational leader's "moral purpose" is easily captured by elite interests. The contrast matters. Atkinson and Mwenda (2011, n = 24 African states, 1990–2008) found that leadership style explained less than 12% of variance in developmental outcomes, with institutional strength accounting for the remainder — a finding Chemers (2014) confirmed in a separate meta-analysis of 47 leadership studies conducted in low-income economies. What the literature reveals, collectively, is that transformational leadership is not an inherently portable construct: its effects are conditional on precisely the institutional architecture that post-colonial states have most consistently failed to build.

---

**Exemplar 3 — Methodology (what makes it human: design choice explained with a "why"; sample size justified through named technique with exact figures; honest limitation named; interpretive close rather than boilerplate):**

A positivist, deductive, quantitative design was adopted. The choice was deliberate: the research questions concerned the strength and direction of relationships between price perception, perceived quality, and consumer preference — questions best answered through measurement rather than interpretation. A cross-sectional survey was administered to 312 adult shoppers across three Lagos markets (Yaba, Balogun, and Aswani), selected because they represent the densest concentrations of Okrika trade in the metropolitan area. Sample size was determined through G*Power analysis, which indicated that detecting a medium effect (f² = 0.15) at α = 0.05 with 80% power required a minimum of 153 respondents; the achieved sample exceeds this threshold and supports robust subgroup analysis. The instrument, adapted from Sweeney and Soutar's (2001) PERVAL scale, demonstrated acceptable internal consistency across all four subscales (Cronbach's α between 0.78 and 0.87). Transferability to non-urban or non-Nigerian second-hand contexts remains uncertain — a limitation discussed in §3.10 — but the design supports defensible inference within the studied population.

---

## Rules Your Rewrite Must Follow

**SENTENCE RHYTHM — enforce within every paragraph:**
- Minimum one sentence under 10 words and one sentence over 30 words per paragraph
- Never two consecutive sentences of similar length
- Vary how sentences open: subordinate clause, concessive opener, evidence-first, claim-first, "But," or "Yet," to start a sentence

**BANNED OPENERS (AI fingerprints — never use):**
- "Furthermore," / "Moreover," / "Additionally," / "In addition,"
- "This demonstrates" / "This highlights" / "This underscores" / "This suggests"
- "It is important to note" / "It is worth noting"
- "This study/investigation/research aims to / seeks to / endeavours to"
- Any sentence beginning with "This [noun]" that summarises what just came before

**BANNED CLOSERS (paragraph-ending AI fingerprints):**
- "...remains essential/crucial/fundamental to X"
- "...is therefore of great importance"
- Any sentence that restates the paragraph's opening claim

**ARGUMENT MOVES — at least one per section:**
- A hinge sentence that turns description into argument: "The contrast matters." / "What this reveals is..." / "That said," / "Yet the data do not support..."
- A concessive opener: "Burns's distinction remains foundational, yet..."
- A short declarative landing after a long analytical sentence

**EVIDENCE:**
- Every citation must have a named finding, not just an author-year tag
- Named statistics anchor to their source AND their implication
- No trailing citations: "(Smith, 2023)." alone at the end of a sentence is an AI move

**BANNED WORDS:** delve, tapestry, robust, testament, crucial, underscore, pivotal, seamless, landscape, realm, beacon, myriad, facilitate, utilize, multifaceted, nuanced

**ACADEMIC INTEGRITY — non-negotiable:**
- Every citation reproduced exactly as in the original
- Every statistic, percentage, p-value, alpha, n= preserved exactly
- All headings, section numbers, and technical terms unchanged
- Output ONLY the rewritten text — no preamble, no remarks`;

function wordCount(s: string): number {
  return (s || "").trim().split(/\s+/).filter(Boolean).length;
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

      console.log(`[czar-humanise v10] start: ${original_words} words, claude-sonnet full-rewrite`);
      send("pipeline_start", { stages: 1, provider: "claude-sonnet", original_words, version: "v10" });
      send("stage_start", { stage: 1, label: "Rewriting chapter..." });

      try {
        const anthropicResp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          signal: upstreamSignal,
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: CLAUDE_MODEL,
            max_tokens: 8000,
            temperature: 0.95,
            stream: true,
            system: SYSTEM_PROMPT,
            messages: [
              { role: "user", content: `Humanize this academic text:\n\n${text}` },
            ],
          }),
        });

        if (!anthropicResp.ok) {
          const errTxt = await anthropicResp.text().catch(() => "");
          throw new Error(`Anthropic ${anthropicResp.status}: ${errTxt.slice(0, 200)}`);
        }
        if (!anthropicResp.body) throw new Error("Anthropic empty body");

        const reader = anthropicResp.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let accumulated = "";
        let lastProgressAt = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let nlIdx: number;
          while ((nlIdx = buf.indexOf("\n")) !== -1) {
            const line = buf.slice(0, nlIdx).trim();
            buf = buf.slice(nlIdx + 1);
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const ev = JSON.parse(payload);
              if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta" && ev.delta?.text) {
                accumulated += ev.delta.text;
                // Send progress heartbeat every 500 chars to keep connection alive
                if (accumulated.length - lastProgressAt >= 500) {
                  lastProgressAt = accumulated.length;
                  send("progress", { chars: accumulated.length });
                }
              }
            } catch { /* ignore parse errors */ }
          }
        }

        const final_words = wordCount(accumulated);
        send("stage_done", { stage: 1, label: "Rewrite complete", words: final_words });
        send("done", {
          humanised: accumulated,
          stages_completed: 1,
          original_words,
          final_words,
          provider: "claude-sonnet",
          version: "v10",
        });
      } catch (e: unknown) {
        const msg = (e instanceof Error ? e.message : String(e));
        if (!msg.includes("abort") && !msg.includes("cancel")) {
          console.error("[czar-humanise v10] error:", msg);
        }
        send("done", {
          humanised: text,
          stages_completed: 0,
          original_words,
          final_words: original_words,
          provider: "claude-sonnet",
          version: "v10",
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
