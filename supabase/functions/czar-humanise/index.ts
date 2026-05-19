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
const CLAUDE_MODEL = "claude-3-5-sonnet-latest";

const SYSTEM_PROMPT = `You are an expert academic editor and ghostwriter. Your sole function is to rewrite text to achieve a 0% AI-detection score (maximum burstiness and maximum perplexity) while strictly maintaining the academic integrity, citations, and data of the original text.

You must follow these core directives:

1. VOCABULARY AND PERPLEXITY (The "Anti-AI" Lexicon)
- DO NOT use common AI markers: delve, tapestry, robust, testament, crucial, underscore, pivotal, seamless, landscape, realm, beacon, myriad, facilitate, utilize.
- DO NOT use standard AI transitional phrases at the start of sentences (e.g., Furthermore, Moreover, Additionally, In conclusion, It is important to note, Consequently).
- Replace highly probable academic verbs with less common, but highly accurate, synonyms (e.g., instead of "demonstrated," use "established" or "evidenced").

2. SENTENCE STRUCTURE AND BURSTINESS
- Humans do not write with perfect rhythmic symmetry. You must drastically vary sentence length.
- Mix short, punchy declarative sentences (5-10 words) immediately alongside longer, complex sentences featuring subordinate clauses.
- Break up long, compound lists into separate, distinct sentences.
- Do not start consecutive sentences with the same part of speech.

3. ACADEMIC INTEGRITY
- NEVER alter, remove, or hallucinate citations (e.g., Smith, 2023). Keep them exactly where they belong contextually.
- Do not change technical terminology, scientific names (e.g., Exocoetidae), or raw data.
- The tone must remain objective and formal, but the syntax should feel slightly less polished than a machine would generate. Allow for slight, natural-sounding phrasing choices over rigid perfection.

PROCESS: Read the user's input. Rewrite it entirely applying the rules above. Output ONLY the rewritten text. Do not include introductory or concluding remarks.`;

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
