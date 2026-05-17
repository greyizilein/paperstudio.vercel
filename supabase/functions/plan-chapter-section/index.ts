// plan-chapter-section
// Natural-mode "plan pass" — runs BEFORE the write pass.
// Produces a per-section argument arc that the write pass executes.
// The output is a hidden scaffold the user never sees; it gives the chapter
// a spine to follow rather than improvising paragraph by paragraph.
//
// Returns JSON: { sections: [{ id, heading, claim, evidence, counterpoint, landing }] }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logAiUsage } from "../_shared/log-ai-usage.ts";
import { callAnthropic, AnthropicRateLimitError, CLAUDE_MODEL } from "../_shared/anthropic.ts";
import { resolveTier, shouldUseClaude, shouldUseThinking } from "../_shared/resolve-tier.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_MODEL = "gemini-2.5-pro";

function buildPlanPrompt(project: any, chapter: any, draftConfig: any): string {
  const headings: any[] = draftConfig?.headings || [];
  const headingsBlock = headings.length
    ? headings
        .map((h: any, i: number) => `${i + 1}. ${h.title || h.heading || h.name || "(untitled)"}${h.target_words ? ` [~${h.target_words} words]` : ""}`)
        .join("\n")
    : "(no explicit outline — infer canonical headings for this chapter type)";

  const objectives = (project.research_objectives || [])
    .filter(Boolean)
    .map((o: string, i: number) => `  ${i + 1}. ${o}`)
    .join("\n");

  return `You are planning the argument arc for a single dissertation chapter BEFORE it is written. You produce a hidden scaffold the writer will execute.

# PROJECT
- Title: "${project.title}"
- Field: ${project.field_of_study}
- Degree: ${project.degree}
- Methodology: ${project.research_methodology}
- Objectives:
${objectives}

# CHAPTER
- Type: ${chapter.type}
- Title: "${chapter.title}"
- Target words: ${draftConfig.target_words}

# SECTIONS (canonical headings — keep them exactly)
${headingsBlock}

# YOUR TASK
For EACH section above, produce a 4-part argument arc:
1. CLAIM — the single intellectual point this section advances (one sentence)
2. EVIDENCE — 2 to 4 specific source-types or data anchors that will support it (e.g. "World Bank 2023 mobile money penetration data", "Davis 1989 TAM extension", "Adebayo 2022 Lagos SME survey")
3. COUNTERPOINT — the tension, complication, or alternative reading this section must acknowledge
4. LANDING — the interpretive sentence that closes the section AND sets up the next one (a bridge)

Return ONLY valid JSON in this exact shape, with no prose before or after:

{
  "sections": [
    {
      "id": "1.1",
      "heading": "Background to the Study",
      "claim": "...",
      "evidence": ["...", "...", "..."],
      "counterpoint": "...",
      "landing": "..."
    }
  ]
}

Rules:
- Keep each field SHORT — claim/counterpoint/landing under 30 words; evidence items under 12 words each.
- Every section must argue something specific to "${project.title}" — never generic placeholders.
- Landing sentences should bridge to the NEXT section (e.g. "...which raises the question addressed in 1.2").
- Do not invent headings — use only the ones listed.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { project, chapter, draftConfig } = await req.json();
    if (!project || !chapter || !draftConfig) {
      return new Response(
        JSON.stringify({ error: "Missing project, chapter, or draftConfig" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_AI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = buildPlanPrompt(project, chapter, draftConfig);
    const tier = await resolveTier(req);
    const useClaude = shouldUseClaude(tier);
    const useThinking = shouldUseThinking(tier);
    const systemMsg = "You are a senior dissertation supervisor planning the argument arc of a chapter. Return only valid JSON. No prose, no markdown fences.";

    let content = "";
    let modelUsed = useClaude ? CLAUDE_MODEL : PLAN_MODEL;

    // ── Claude branch (paid/admin) — uses extended thinking when allowed ──
    if (useClaude) {
      try {
        content = await callAnthropic({
          model: CLAUDE_MODEL,
          system: systemMsg,
          messages: [{ role: "user", content: prompt }],
          thinking: useThinking,
          maxTokens: 4000,
        });
      } catch (e) {
        if (e instanceof AnthropicRateLimitError) {
          console.warn("plan-chapter-section: Claude rate-limited, falling back to Gemini");
        } else {
          console.warn("plan-chapter-section: Claude failed, falling back to Gemini:", e);
        }
        content = "";
        modelUsed = PLAN_MODEL;
      }
    }

    // ── Gemini fallback / free-tier branch ──
    if (!content) {
      const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: PLAN_MODEL,
          messages: [
            { role: "system", content: systemMsg },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (resp.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await resp.text();
        console.error("Plan pass gateway error:", resp.status, t);
        return new Response(JSON.stringify({ plan: null }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await resp.json();
      content = data?.choices?.[0]?.message?.content || "";
    }

    let plan: any = null;
    try {
      plan = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) {
        try { plan = JSON.parse(m[0]); } catch { plan = null; }
      }
    }

    logAiUsage({
      userId: project.user_id,
      tier: tier.tier || project.degree || "unknown",
      action: "plan_chapter_section",
      model: modelUsed,
      inputText: prompt,
      outputText: content,
    });

    return new Response(JSON.stringify({ plan }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("plan-chapter-section error:", e);
    return new Response(JSON.stringify({ plan: null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
