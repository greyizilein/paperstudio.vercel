// czar-humanise-doc — Discipline-aware academic humaniser
// Completely separate from czar-humanise. Can be improved or deleted independently.
//
// Pipeline:
//   Stage 0: Discipline Detection  (Haiku  — JSON context)
//   Stage 1: Pre-processing        (regex  — no API call)
//   Stage 2: Structural Rewrite    (Opus   — rhythm, active voice, sentence variety)
//   Stage 3: Field-Aware Paraphrase(Opus   — discipline-native word choices)
//   Stage 4: Word Count Trim       (Haiku  — only runs if output > 101% of input)
//
// All stages preserve headings, citations, reference lists, and figure/table captions.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const MODEL_DETECT  = "claude-haiku-4-5-20251001";
const MODEL_REWRITE = "claude-sonnet-4-6";
const MODEL_TRIM    = "claude-haiku-4-5-20251001";

// ── Detect prompt ─────────────────────────────────────────────────────────────

const DETECT_PROMPT =
  "You are an academic text classifier. Analyse the text and return ONLY a valid JSON object — no explanation, no markdown.\n" +
  '{"discipline":"e.g. Sociology","subdiscipline":"e.g. Urban Sociology","level":"undergraduate|postgraduate|doctoral",' +
  '"style":"e.g. empirical-quantitative","register":"e.g. formal-analytical","hedging_norms":"e.g. statistical confidence intervals",' +
  '"typical_verbs":"e.g. demonstrates, indicates","avoided_words":"e.g. prove, feel, obviously","voice_notes":"e.g. passive preferred in methods"}';

// ── Pre-processing (regex, no API) ────────────────────────────────────────────

const FILLER_STRIPS: [RegExp, string][] = [
  [/\bit is worth noting that,?\s*/gi, ""],
  [/\bit is worth noting,?\s*/gi, ""],
  [/\bit is important to note that,?\s*/gi, ""],
  [/\bit is important to note,?\s*/gi, ""],
  [/\bit should be noted that,?\s*/gi, ""],
  [/\bit should be noted,?\s*/gi, ""],
  [/\bit can be observed that,?\s*/gi, ""],
  [/\bit goes without saying that,?\s*/gi, ""],
  [/\bneedless to say,?\s*/gi, ""],
  [/\bas previously mentioned,?\s*/gi, ""],
  [/\bas stated above,?\s*/gi, ""],
  [/\bit is clear that,?\s*/gi, ""],
  [/\bit is evident that,?\s*/gi, ""],
  [/\butilise\b/gi, "use"],
  [/\butilises\b/gi, "uses"],
  [/\butilised\b/gi, "used"],
  [/\butilising\b/gi, "using"],
  [/\butilization\b/gi, "use"],
  [/\butilisation\b/gi, "use"],
  [/\bin order to\b/gi, "to"],
  [/\bper cent\b/gi, "%"],
  [/\bpercent\b/gi, "%"],
  [/\bper-cent\b/gi, "%"],
];

function preProcess(text: string): string {
  let t = text;
  for (const [pattern, replacement] of FILLER_STRIPS) {
    t = t.replace(pattern, replacement);
  }
  return t.replace(/  +/g, " ").replace(/ ,/g, ",").trim();
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface DisciplineCtx {
  discipline: string;
  subdiscipline: string;
  level: string;
  style: string;
  register: string;
  hedging_norms: string;
  typical_verbs: string;
  avoided_words: string;
  voice_notes: string;
}

const DEFAULT_CTX: DisciplineCtx = {
  discipline:    "Academic",
  subdiscipline: "",
  level:         "postgraduate",
  style:         "analytical",
  register:      "formal-analytical",
  hedging_norms: "theoretical tentativeness",
  typical_verbs: "demonstrates, indicates, suggests",
  avoided_words: "prove, feel, obviously",
  voice_notes:   "formal academic register throughout",
};

// ── Stage prompts ─────────────────────────────────────────────────────────────

const PRESERVE_NOTICE =
  "PRESERVE EXACTLY — do not alter:\n" +
  "- Lines starting with # (headings of any level)\n" +
  "- In-text citations like (Author, Year) or (Author et al., Year, p. X)\n" +
  "- Numbered reference list entries (bibliographic items)\n" +
  "- Lines beginning with Figure, Table, Chart, Appendix, or a lone number followed by a full stop\n" +
  "- Footnote markers such as [1], (1), or superscript numbers\n\n" +
  "ONLY rewrite body paragraph prose.";

function buildPass1(ctx: DisciplineCtx): string {
  return (
    "You are a senior " + ctx.discipline + " scholar rewriting AI-generated text as natural human-authored scholarship. UK English.\n\n" +
    PRESERVE_NOTICE + "\n\n" +
    "Field: " + ctx.discipline + (ctx.subdiscipline ? " (" + ctx.subdiscipline + ")" : "") + ". " +
    "Style: " + ctx.style + ". Register: " + ctx.register + ".\n" +
    "Hedging: " + ctx.hedging_norms + ". Typical verbs: " + ctx.typical_verbs + ". Avoid: " + ctx.avoided_words + ".\n\n" +
    "VARY sentence length hard — short, then long, then short. NEVER three consecutive similar-length sentences.\n" +
    "REWRITE from scratch any sentence containing: Furthermore / Moreover / Additionally / In conclusion / " +
    "This highlights / This underscores / This demonstrates / plays a crucial role / a myriad of / multifaceted / " +
    "shed light on / in today's world / it is worth noting / it is important to note.\n" +
    "PASSIVE to ACTIVE where the actor is known and relevant.\n" +
    "Break the claim-evidence-conclusion triad. Apply human hedging throughout.\n" +
    "Preserve word count within plus or minus 5%.\n\n" +
    "Output ONLY the rewritten text — no explanation, no preamble."
  );
}

function buildPass2(ctx: DisciplineCtx): string {
  return (
    "Aggressive context-aware paraphrasing of " + ctx.discipline + " academic text. " +
    "Up to 100% of words in body prose can change — every choice must be natural and native to " +
    ctx.discipline + " at " + ctx.level + " level. UK English.\n\n" +
    PRESERVE_NOTICE + "\n\n" +
    "Rebuild prose sentences from scratch with different syntax. " +
    "Use precise " + ctx.discipline + "-appropriate verbs. " +
    "Vary how each concept is referred to across the text. " +
    "Voice fingerprint: " + ctx.voice_notes + ". " +
    "Human hedging: " + ctx.hedging_norms + ". " +
    "Avoid: " + ctx.avoided_words + ".\n" +
    "No phrase should appear twice in the same form. Concrete over abstract. " +
    "All meaning, citations, and statistics unchanged.\n\n" +
    "Output ONLY the rewritten text — no explanation, no preamble."
  );
}

function buildTrim(ctx: DisciplineCtx, targetWords: number, currentWords: number): string {
  const excess = currentWords - targetWords;
  return (
    "You are a precise " + ctx.discipline + " academic editor. " +
    "The text is " + currentWords + " words. Reduce to approximately " + targetWords + " words (remove about " + excess + " words). " +
    "Stay within 1% of " + targetWords + ". " +
    "Preserve all headings, citations, reference lists, humanised voice and rhythm. UK English.\n\n" +
    "Prefer: cutting redundant qualifiers, collapsing verbose phrases, removing restatements, shortening parentheticals. " +
    "Remove full sentences only as a last resort.\n\n" +
    "Output ONLY the trimmed text — no explanation."
  );
}

// ── Claude call ───────────────────────────────────────────────────────────────

async function callClaude(
  systemPrompt: string,
  userText: string,
  signal: AbortSignal,
  model: string,
  maxTokens = 8000,
): Promise<string> {
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
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userText }],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => "");
    throw new Error("Anthropic " + resp.status + ": " + err.slice(0, 200));
  }

  const data = await resp.json();
  const blocks = Array.isArray(data.content) ? data.content : [];
  return blocks.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
}

function wordCount(s: string): number {
  return (s || "").trim().split(/\s+/).filter(Boolean).length;
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { text: string };
  try { body = await req.json(); }
  catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
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

  const originalWords = wordCount(text);
  const signal = req.signal;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode("event: " + event + "\ndata: " + JSON.stringify(data) + "\n\n")
          );
        } catch { /* stream closed */ }
      };

      send("start", { original_words: originalWords });

      let current = text;
      let ctx: DisciplineCtx = { ...DEFAULT_CTX };

      try {
        // Stage 0: Analysis (discipline detection)
        send("stage_start", { stage: 0, label: "Analysis" });
        try {
          const raw = await callClaude(DETECT_PROMPT, text.slice(0, 3000), signal, MODEL_DETECT, 512);
          const parsed = JSON.parse(raw.replace(/```json|```/gi, "").trim());
          ctx = { ...ctx, ...parsed };
        } catch {
          // silently fall back to defaults
        }
        send("stage_done", { stage: 0, label: "Analysis" });

        // Stage 1: Preparation (pre-process)
        send("stage_start", { stage: 1, label: "Preparation" });
        current = preProcess(text);
        send("stage_done", { stage: 1, label: "Preparation", words: wordCount(current) });

        // Stage 2: Pass I (structural rewrite)
        send("stage_start", { stage: 2, label: "Pass I" });
        current = await callClaude(buildPass1(ctx), current, signal, MODEL_REWRITE);
        send("stage_done", { stage: 2, label: "Pass I", words: wordCount(current) });

        // Stage 3: Pass II (field-aware paraphrase)
        send("stage_start", { stage: 3, label: "Pass II" });
        current = await callClaude(buildPass2(ctx), current, signal, MODEL_REWRITE);
        send("stage_done", { stage: 3, label: "Pass II", words: wordCount(current) });

        // Stage 4: Calibration (trim, conditional)
        const ceiling = Math.ceil(originalWords * 1.01);
        const afterWords = wordCount(current);
        if (afterWords > ceiling) {
          send("stage_start", { stage: 4, label: "Calibration" });
          current = await callClaude(buildTrim(ctx, originalWords, afterWords), current, signal, MODEL_TRIM);
          send("stage_done", { stage: 4, label: "Calibration", words: wordCount(current) });
        }

        send("done", {
          humanised:      current,
          discipline:     ctx,
          original_words: originalWords,
          final_words:    wordCount(current),
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("abort") && !msg.includes("cancel")) {
          console.error("[czar-humanise-doc] error:", msg);
        }
        send("done", {
          humanised:      current,
          discipline:     ctx,
          original_words: originalWords,
          final_words:    wordCount(current),
          error:          msg.slice(0, 200),
        });
      } finally {
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
    },
  });
});
