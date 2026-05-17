import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAnthropic, AnthropicRateLimitError, CLAUDE_MODEL } from "../_shared/anthropic.ts";
import { resolveTier, shouldUseClaude, shouldUseThinking } from "../_shared/resolve-tier.ts";

// ── Canonical schema (mirror of src/lib/chapterSchema.ts and templateContent.ts) ──
// Edge functions cannot import from src/. Keep these in sync with src/lib/chapterSchema.ts.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "google/gemini-2.5-flash";

function extractJson(text: string): any | null {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  try { return JSON.parse(candidate.trim()); } catch { /* keep going */ }
  const m = candidate.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* ignore */ } }
  return null;
}

type Scope = "all" | "ms_phd" | "phd" | "quant" | "ms_phd_quant";
interface CanonicalSection { num: string; title: string; scope: Scope; defaultPct: number; }

const CANONICAL_SCHEMAS: Record<string, CanonicalSection[]> = {
  introduction: [
    { num: "1.1", title: "Background to the Study", scope: "all", defaultPct: 30 },
    { num: "1.2", title: "Statement of the Problem", scope: "all", defaultPct: 12 },
    { num: "1.3", title: "Aim and Objectives of the Study", scope: "all", defaultPct: 10 },
    { num: "1.4", title: "Research Questions", scope: "all", defaultPct: 8 },
    { num: "1.5", title: "Research Hypotheses", scope: "quant", defaultPct: 8 },
    { num: "1.6", title: "Significance of the Study", scope: "all", defaultPct: 10 },
    { num: "1.7", title: "Scope and Delimitations of the Study", scope: "all", defaultPct: 8 },
    { num: "1.8", title: "Operational Definition of Terms", scope: "all", defaultPct: 8 },
    { num: "1.9", title: "Organization of the Study", scope: "ms_phd", defaultPct: 6 },
  ],
  literature_review: [
    { num: "2.1", title: "Introduction", scope: "all", defaultPct: 5 },
    { num: "2.2", title: "Conceptual Framework", scope: "ms_phd", defaultPct: 18 },
    { num: "2.3", title: "Theoretical Framework", scope: "ms_phd", defaultPct: 18 },
    { num: "2.4", title: "Empirical Review", scope: "all", defaultPct: 40 },
    { num: "2.5", title: "Summary of Literature and Gap Identification", scope: "all", defaultPct: 19 },
  ],
  methodology: [
    { num: "3.1", title: "Research Design", scope: "all", defaultPct: 14 },
    { num: "3.2", title: "Population of the Study", scope: "all", defaultPct: 11 },
    { num: "3.3", title: "Sample and Sampling Technique", scope: "all", defaultPct: 13 },
    { num: "3.4", title: "Instrument for Data Collection", scope: "all", defaultPct: 14 },
    { num: "3.5", title: "Validity and Reliability of Instrument", scope: "ms_phd", defaultPct: 12 },
    { num: "3.6", title: "Method of Data Collection", scope: "all", defaultPct: 12 },
    { num: "3.7", title: "Method of Data Analysis", scope: "all", defaultPct: 14 },
    { num: "3.8", title: "Ethical Considerations", scope: "ms_phd", defaultPct: 10 },
  ],
  findings: [
    { num: "4.1", title: "Introduction", scope: "all", defaultPct: 5 },
    { num: "4.2", title: "Demographic Data Presentation", scope: "all", defaultPct: 15 },
    { num: "4.3", title: "Analysis of Research Questions", scope: "all", defaultPct: 45 },
    { num: "4.4", title: "Test of Hypotheses", scope: "quant", defaultPct: 20 },
    { num: "4.5", title: "Discussion of Findings", scope: "ms_phd", defaultPct: 15 },
  ],
  conclusion: [
    { num: "5.1", title: "Summary of Findings", scope: "all", defaultPct: 25 },
    { num: "5.2", title: "Conclusion", scope: "all", defaultPct: 22 },
    { num: "5.3", title: "Recommendations", scope: "all", defaultPct: 25 },
    { num: "5.4", title: "Contribution to Knowledge", scope: "phd", defaultPct: 13 },
    { num: "5.5", title: "Suggestions for Further Studies", scope: "all", defaultPct: 15 },
  ],
};

function normaliseDegree(degree: string): "ug" | "masters" | "phd" {
  const d = (degree || "").toLowerCase();
  if (d.includes("phd") || d.includes("doctor") || d.includes("dphil")) return "phd";
  if (d.includes("master") || d.includes("msc") || d.startsWith("ma") || d.includes("mba") || d.includes("mphil")) return "masters";
  return "ug";
}

function isApplicable(scope: Scope, level: "ug" | "masters" | "phd", isQuant: boolean): boolean {
  switch (scope) {
    case "all": return true;
    case "ms_phd": return level !== "ug";
    case "phd": return level === "phd";
    case "quant": return isQuant;
    case "ms_phd_quant": return level !== "ug" && isQuant;
  }
}

function getCanonicalHeadings(chapterType: string, methodology: string, degree: string, includeHypotheses: boolean) {
  const sections = CANONICAL_SCHEMAS[chapterType] || [];
  const level = normaliseDegree(degree);
  const isQuant = methodology === "Quantitative" || methodology === "Mixed Methods";
  const filtered = sections.filter(s => {
    if (!isApplicable(s.scope, level, isQuant)) return false;
    if (!includeHypotheses) {
      if (s.title === "Research Hypotheses") return false;
      if (s.title === "Test of Hypotheses") return false;
    }
    return true;
  });
  const total = filtered.reduce((s, h) => s + h.defaultPct, 0) || 100;
  return filtered.map(s => ({
    number: s.num,
    text: s.title,
    pct: Math.round((s.defaultPct / total) * 100),
  }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      title, field, methodology, objectives, questions, framework, framework_justification,
      degree, chapterType, chapterTitle, headings, variationSeed,
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── 1. Canonical headings (deterministic, never AI-invented) ──
    const canonicalHeadings = getCanonicalHeadings(chapterType, methodology || "Quantitative", degree || "MSc", true);

    // ── 2. AI-generated visuals — ALWAYS study-specific, ALWAYS varies ──
    const objectivesList = (objectives || []).filter(Boolean).map((o: string, i: number) => `${i + 1}. ${o}`).join("\n");
    const questionsList = (questions || []).filter(Boolean).map((q: string, i: number) => `${i + 1}. ${q}`).join("\n");
    const headingsList = (headings || []).map((h: string) => `- ${h}`).join("\n");

    const chapterLabel = ({
      introduction: "Chapter 1 — Introduction",
      literature_review: "Chapter 2 — Literature Review",
      methodology: "Chapter 3 — Research Methodology",
      findings: "Chapter 4 — Findings & Data Analysis",
      conclusion: "Chapter 5 — Conclusion & Recommendations",
      abstract: "Abstract",
    } as Record<string, string>)[chapterType] || chapterTitle || chapterType;

    const seed = variationSeed || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const visualPrompt = `You are a senior dissertation methodology advisor. Recommend AT LEAST 4 figures (image-type) AND any tables that belong specifically in **${chapterLabel}** of THIS dissertation. The total list should be 6–9 visuals, with a MINIMUM of 4 figures (type="image"). Every suggestion MUST reference the actual subject matter, variables, methodology, and sampled population of THIS study — generic academic templates are FORBIDDEN.

## STUDY UNDER ANALYSIS
- Title: "${title}"
- Field: ${field || "General"}
- Degree: ${degree || "MSc"}
- Methodology: ${methodology || "Quantitative"}
- Theoretical framework: ${framework || "None specified"}
${framework_justification ? `- Custom theory justification: ${framework_justification}` : ""}
${objectivesList ? `- Research Objectives:\n${objectivesList}` : ""}
${questionsList ? `- Research Questions:\n${questionsList}` : ""}

## CHAPTER STRUCTURE (canonical headings already chosen — your visuals must SLOT INTO these sections)
${headingsList || "(No selected headings — assume the canonical set for this chapter type.)"}

## ABSOLUTE RULES — VIOLATION = REJECTED OUTPUT
1. **Minimum 4 figures (type="image")** — bar charts, path diagrams, conceptual figures, etc. Tables are additional, not a substitute.
2. **Specificity**: every visual must name the actual variables, themes, populations, or constructs of THIS study.
3. **No stock library items**: NEVER suggest "Saunders' Research Onion", "PRISMA flowchart", "Conceptual model diagram", "Demographics table", "Research design flowchart", "Coding tree" or any other off-the-shelf academic boilerplate.
4. **Match the chapter logic**: Chapter 4 visuals show data; Chapter 2 visuals show literature synthesis; Chapter 3 visuals show methodological structure tied to THIS study's instruments/sample.
5. **Tables vs figures**: Tables for tabular comparisons and statistical results; figures for graphs, charts, conceptual diagrams.
6. **VARIATION SEED**: ${seed} — this seed forces fresh selection. Two studies must produce two different visual lists.

GOOD examples (for "Mobile Banking Adoption Among Rural Kenyan Women"):
- Figure: "Stacked bar chart of perceived barriers to mobile banking by county (Kakamega, Bungoma, Busia), n=312"
- Figure: "Path diagram of Trust → Perceived Usefulness → Adoption Intention with PLS-SEM coefficients (n=312)"
- Table: "Logistic regression of adoption on age, education, distance to branch, prior M-Pesa exposure (β, SE, Wald χ², p, OR 95% CI)"

BAD examples (NEVER produce):
- "Demographics table" / "Research onion diagram" / "Conceptual framework diagram"

Respond using the suggest_visuals tool ONLY.`;

    const tool = {
      type: "function",
      function: {
        name: "suggest_visuals",
        description: "Return 6–9 study-specific visuals (≥4 figures) for this chapter",
        parameters: {
          type: "object",
          properties: {
            visuals: {
              type: "array",
              minItems: 6,
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["image", "table"] },
                  description: { type: "string", description: "Specific, study-bound description naming actual variables/populations/themes" },
                },
                required: ["type", "description"],
                additionalProperties: false,
              },
            },
          },
          required: ["visuals"],
          additionalProperties: false,
        },
      },
    };

    let visuals: Array<{ type: string; description: string }> = [];
    const tier = await resolveTier(req);
    const useClaude = shouldUseClaude(tier);
    const useThinking = shouldUseThinking(tier);

    // ── Claude branch (paid/admin) — better study-specific reasoning ──
    if (useClaude) {
      try {
        const claudeText = await callAnthropic({
          model: CLAUDE_MODEL,
          system: "You are a senior dissertation methodology advisor. Reply with ONLY a valid JSON object: {\"visuals\":[{\"type\":\"image|table\",\"description\":\"...\"}, ...]}. No prose, no markdown fences.",
          messages: [{ role: "user", content: visualPrompt }],
          thinking: useThinking,
          maxTokens: 1500,
          temperature: useThinking ? 1 : 0.95,
        });
        const parsed = extractJson(claudeText);
        if (parsed?.visuals && Array.isArray(parsed.visuals)) {
          visuals = parsed.visuals;
        }
      } catch (e) {
        if (e instanceof AnthropicRateLimitError) {
          console.warn("generate-outline-suggestions: Claude rate-limited, falling back to Gemini");
        } else {
          console.warn("generate-outline-suggestions: Claude failed, falling back:", e);
        }
      }
    }

    // ── Gemini fallback (free tier or Claude failure) ──
    if (visuals.length === 0) {
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [{ role: "user", content: visualPrompt }],
            tools: [tool],
            tool_choice: { type: "function", function: { name: "suggest_visuals" } },
            temperature: 0.95,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const tc = data.choices?.[0]?.message?.tool_calls?.[0];
          if (tc?.function?.arguments) {
            const parsed = JSON.parse(tc.function.arguments);
            visuals = parsed.visuals || [];
          }
        } else {
          console.error("Visual suggestion call failed:", response.status, await response.text());
        }
      } catch (e) {
        console.error("Visual suggestion exception:", e);
      }
    }

    // Tag AI-generated visuals as optional
    const optional = visuals.map((v) => ({ ...v, mandatory: false }));

    // For Chapter 4 (findings), prepend mandatory canonical visuals so the writer
    // ALWAYS gets demographics + research-question result tables/figures.
    const mandatoryCh4 = chapterType === "findings" ? [
      { type: "table" as const, description: "Demographic profile of respondents (frequency and percentage by gender, age cohort, education level, and any other key sample descriptors of THIS study)", mandatory: true },
      { type: "table" as const, description: "Descriptive statistics for each construct/variable measured in this study (mean, SD, min, max, n)", mandatory: true },
      { type: "image" as const, description: "Bar chart visualising the distribution of responses for the primary research question/dependent variable of THIS study", mandatory: true },
    ] : [];

    const finalVisuals = [...mandatoryCh4, ...optional];

    return new Response(
      JSON.stringify({
        headings: canonicalHeadings,  // canonical, never AI-invented
        visuals: finalVisuals,         // mandatory Ch4 first, then AI-generated optional
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-outline-suggestions error:", e);
    return new Response(
      JSON.stringify({ headings: [], visuals: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
