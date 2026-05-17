import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logAiUsage } from "../_shared/log-ai-usage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content } = await req.json();
    if (!content || content.trim().length < 100) {
      return new Response(
        JSON.stringify({ error: "Content too short for analysis (min 100 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Take first ~1500 words for analysis
    const words = content.split(/\s+/);
    const sample = words.slice(0, 1500).join(" ");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are an AI detection analysis tool. Analyse academic text and estimate the probability that it was written by AI. You must call the provided function with your analysis.

Scoring guide:
- 0-25%: Very human-like. Natural sentence variation, personal voice, imperfections.
- 26-50%: Mildly AI-like. Some repetitive patterns but generally natural.
- 51-75%: Likely AI-generated. Uniform sentence structure, generic transitions, predictable patterns.
- 76-100%: Strongly AI-generated. Highly uniform, formulaic transitions, no personal voice.

Key AI indicators to check:
1. Sentence length uniformity (AI tends toward 15-25 word sentences consistently)
2. Overuse of transitions: "Furthermore", "Moreover", "Additionally", "It is important to note"
3. Predictable paragraph structure: [topic sentence → evidence → analysis → transition]
4. Lack of hedging, self-correction, or rhetorical questions
5. Overuse of words: "delve", "tapestry", "multifaceted", "landscape", "nuanced", "robust", "utilize"
6. Perfect parallel structures across paragraphs
7. No contractions or informal markers anywhere
8. Uniform paragraph lengths`,
          },
          {
            role: "user",
            content: `Analyse this academic text for AI detection probability:\n\n${sample}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_ai_score",
              description: "Report the estimated AI detection score and identified patterns",
              parameters: {
                type: "object",
                properties: {
                  score: {
                    type: "number",
                    description: "AI detection probability from 0 to 100",
                  },
                  risk: {
                    type: "string",
                    enum: ["low", "medium", "high"],
                    description: "Risk level: low (0-35), medium (36-65), high (66-100)",
                  },
                  patterns: {
                    type: "array",
                    items: { type: "string" },
                    description: "Top 3 most detectable AI patterns found in the text",
                  },
                  suggestion: {
                    type: "string",
                    description: "Brief suggestion on what to fix first",
                  },
                },
                required: ["score", "risk", "patterns", "suggestion"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_ai_score" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      console.error("AI score estimation failed:", resp.status);
      return new Response(
        JSON.stringify({ error: "Score estimation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await resp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      // Log usage
      logAiUsage({
        action: "estimate_ai_score",
        model: "google/gemini-2.5-flash-lite",
        inputText: sample,
        outputText: toolCall.function.arguments,
      });
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ score: 50, risk: "medium", patterns: ["Unable to parse detailed analysis"], suggestion: "Try humanising the text" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("estimate-ai-score error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
