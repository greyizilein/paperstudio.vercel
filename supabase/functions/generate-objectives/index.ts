import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAnthropic, AnthropicRateLimitError, CLAUDE_MODEL } from "../_shared/anthropic.ts";
import { resolveTier, shouldUseClaude, shouldUseThinking } from "../_shared/resolve-tier.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Use a capable model for high-quality academic objective generation
const OBJECTIVES_MODEL = "gemini-2.5-pro";

/** Best-effort JSON extraction from a Claude reply (may be wrapped in prose or fences). */
function extractJson(text: string): any | null {
  if (!text) return null;
  // Strip code fences
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  try { return JSON.parse(candidate.trim()); } catch { /* keep going */ }
  const m = candidate.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* ignore */ } }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      title, field, methodology, framework, framework_justification,
      degree, objectiveCount, includeHypotheses, requestType
    } = await req.json();

    const tier = await resolveTier(req);
    const useClaude = shouldUseClaude(tier);
    const useThinking = shouldUseThinking(tier);

    const LOVABLE_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_AI_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── THEORIST REQUEST ──────────────────────────────────────────────
    if (requestType === "theorists") {
      const theoristPrompt = `You are a senior academic research advisor with expertise across all disciplines. Given the dissertation details below, suggest 10–12 key theorists, scholars, and frameworks that are DIRECTLY and SPECIFICALLY relevant to this research topic.

- Title: "${title}"
- Field: ${field}
- Methodology: ${methodology}
- Framework: ${framework || "None specified"}
${framework_justification ? `- Custom Theory/Framework: ${framework_justification}` : ""}
- Degree: ${degree}

REQUIREMENTS:
- Every theorist/scholar MUST be a real, verifiable academic whose work is findable on Google Scholar
- Each entry must be directly applicable to the title and field — no generic or tangentially related figures
- Format: "Author Name (Theory/Framework Name, Year)" — e.g., "Vygotsky (Zone of Proximal Development, 1978)"
- Prioritise foundational/seminal works AND recent scholars (post-2015) where relevant
- Include a mix of: foundational theorists, methodological contributors, and field-specific scholars
- DO NOT suggest generic placeholders or fabricate theorists

You MUST respond using the suggest_theorists tool.`;

      const theoristTools = [{
        type: "function",
        function: {
          name: "suggest_theorists",
          description: "Return relevant theorists and frameworks",
          parameters: {
            type: "object",
            properties: {
              theorists: { type: "array", items: { type: "string" }, description: "List of theorist entries" }
            },
            required: ["theorists"],
            additionalProperties: false
          }
        }
      }];

      // Try Claude first for paid/admin
      if (useClaude) {
        try {
          const claudeText = await callAnthropic({
            model: CLAUDE_MODEL,
            system: "You are a senior academic research advisor. Reply with ONLY a valid JSON object: {\"theorists\":[\"Author (Theory, Year)\", ...]}. No prose, no markdown fences.",
            messages: [{ role: "user", content: theoristPrompt }],
            thinking: useThinking,
            maxTokens: 1500,
          });
          const parsed = extractJson(claudeText);
          if (parsed?.theorists && Array.isArray(parsed.theorists) && parsed.theorists.length) {
            return new Response(JSON.stringify({ theorists: parsed.theorists }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          console.warn("generate-objectives(theorists): Claude returned no usable JSON, falling back to Gemini");
        } catch (e) {
          if (e instanceof AnthropicRateLimitError) {
            console.warn("generate-objectives(theorists): Claude rate-limited, falling back to Gemini");
          } else {
            console.warn("generate-objectives(theorists): Claude failed, falling back:", e);
          }
        }
      }

      const tResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OBJECTIVES_MODEL,
          messages: [{ role: "user", content: theoristPrompt }],
          tools: theoristTools,
          tool_choice: { type: "function", function: { name: "suggest_theorists" } },
        }),
      });

      if (!tResp.ok) {
        const errText = await tResp.text();
        console.error("Theorist generation failed:", tResp.status, errText);
        return new Response(JSON.stringify({ error: "Theorist generation failed" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const tData = await tResp.json();
      const tToolCall = tData.choices?.[0]?.message?.tool_calls?.[0];
      if (!tToolCall) {
        return new Response(JSON.stringify({ theorists: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const tResult = JSON.parse(tToolCall.function.arguments);
      return new Response(JSON.stringify(tResult), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── OBJECTIVES / QUESTIONS / HYPOTHESES REQUEST ───────────────────
    const count = objectiveCount || 4;

    const systemPrompt = `You are a specialist academic research consultant who generates research objectives, questions, and hypotheses for university dissertations at ${degree} level.

QUALITY STANDARDS — these are non-negotiable:
1. Every objective MUST be a COMPLETE, grammatically correct academic sentence (minimum 12 words).
2. Every research question MUST be a COMPLETE question ending with "?" (minimum 10 words).
3. Objectives and questions must be SPECIFIC to the exact title and field — NEVER use generic templates.
4. Use precise, discipline-appropriate academic vocabulary relevant to ${field}.
5. Each objective maps EXACTLY to its corresponding question — same topic, same scope, same variables.
6. For single-objective requests: generate EXACTLY ONE question per objective. Never generate multiple questions for one objective.
7. NEVER generate sentence fragments or incomplete sentences.
8. DO NOT start every question with "What is the..." — vary the interrogative structure (How does...? To what extent...? What factors...? In what ways...? How effectively...?).
9. Objectives must use strong academic verbs: examine, investigate, assess, evaluate, determine, explore, analyse, compare, identify, measure, establish.
10. Questions must be researchable, specific, and directly answerable through the chosen methodology (${methodology}).
${framework_justification ? `11. The researcher uses the following theoretical framework — objectives and questions must be grounded in it: "${framework_justification}"` : ""}

You MUST respond using the suggest_items tool with EXACTLY ${count} objectives and ${count} questions.`;

    const userPrompt = `Generate ${count} research objective${count > 1 ? "s" : ""}, ${count} corresponding research question${count > 1 ? "s" : ""}${includeHypotheses ? `, and ${count} hypothesis${count > 1 ? "es" : ""}` : ""} for the following dissertation:

- Title: "${title}"
- Field of Study: ${field}
- Research Methodology: ${methodology}
- Theoretical Framework: ${framework || "Not specified"}
${framework_justification ? `- Custom Theory/Framework: ${framework_justification}` : ""}
- Degree Level: ${degree}
- Number to generate: ${count} of each

Each objective and question must be directly derived from the dissertation title above. Be specific, academic, and complete.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "suggest_items",
          description: "Return research objectives, questions, and optionally hypotheses",
          parameters: {
            type: "object",
            properties: {
              objectives: {
                type: "array",
                items: { type: "string" },
                description: "Complete research objectives starting with 'To', each minimum 12 words"
              },
              questions: {
                type: "array",
                items: { type: "string" },
                description: "Complete research questions ending with '?', each minimum 10 words, directly corresponding to objectives"
              },
              hypotheses: {
                type: "array",
                items: { type: "string" },
                description: "Testable hypotheses (H1, H2, etc.) — only if requested"
              }
            },
            required: ["objectives", "questions"],
            additionalProperties: false
          }
        }
      }
    ];

    // ── Claude branch (paid/admin) — best reasoning for objective design ──
    if (useClaude) {
      try {
        const claudeText = await callAnthropic({
          model: CLAUDE_MODEL,
          system: systemPrompt + "\n\nReply with ONLY a valid JSON object in this exact shape: {\"objectives\":[\"...\"], \"questions\":[\"...?\"]" + (includeHypotheses ? ", \"hypotheses\":[\"H1: ...\"]" : "") + "}. No prose, no markdown fences.",
          messages: [{ role: "user", content: userPrompt }],
          thinking: useThinking,
          maxTokens: 2500,
        });
        const parsed = extractJson(claudeText);
        if (parsed?.objectives?.length && parsed?.questions?.length) {
          return new Response(JSON.stringify(parsed), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.warn("generate-objectives: Claude returned no usable JSON, falling back to Gemini");
      } catch (e) {
        if (e instanceof AnthropicRateLimitError) {
          console.warn("generate-objectives: Claude rate-limited, falling back to Gemini");
        } else {
          console.warn("generate-objectives: Claude failed, falling back:", e);
        }
      }
    }

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OBJECTIVES_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "suggest_items" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "Generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No structured response from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-objectives error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
