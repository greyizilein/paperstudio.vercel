import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ACTION_PROMPTS: Record<string, string> = {
  rewrite:
    "Rephrase the following academic text using different wording. Keep exactly the same meaning, academic register, and approximate length. Return only the rephrased text — no commentary, no explanation.",
  simplify:
    "Rewrite the following academic text to be clearer and more concise. Reduce jargon where possible while keeping it appropriately academic. Aim for roughly the same length. Return only the revised text — no commentary.",
  expand:
    "Extend the following academic text by adding more depth: supporting evidence, analysis, or nuance. Increase the length by approximately 30%. Match the surrounding academic tone precisely. Return only the expanded text — no commentary.",
  explain:
    "Insert a brief parenthetical explanation of the key concept in the following academic text (e.g., 'theoretical saturation (the point at which no new themes emerge from the data)'). Keep all other text identical. Return only the revised text — no commentary.",
  fix:
    "Fix any grammar errors, spelling mistakes, and citation formatting issues in the following academic text. Use the citation style that appears in the text. Return only the corrected text — no commentary.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { selection, action, citationStyle } = await req.json();

    if (!selection || !action) {
      return new Response(
        JSON.stringify({ error: "Missing selection or action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!API_KEY) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let systemPrompt = ACTION_PROMPTS[action] || ACTION_PROMPTS.rewrite;
    if (action === "fix" && citationStyle) {
      systemPrompt += ` The citation style in use is ${citationStyle}.`;
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-2.0-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: selection },
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("inline-edit error:", response.status, t);
      return new Response(JSON.stringify({ error: "Edit failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("inline-edit error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
