import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { TERMS_OF_QUALITY } from "../_shared/quality-terms.ts";
import { callAnthropic, AnthropicRateLimitError, CLAUDE_MODEL } from "../_shared/anthropic.ts";
import { resolveTier, shouldUseClaude, shouldUseThinking } from "../_shared/resolve-tier.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export interface CritiqueIssue {
  severity: "critical" | "moderate" | "minor";
  text: string;
  issue: string;
  fix: string;
}

const CHAPTER_TYPE_LABELS: Record<string, string> = {
  abstract: "Abstract",
  introduction: "Introduction (Chapter 1)",
  literature_review: "Literature Review (Chapter 2)",
  methodology: "Methodology (Chapter 3)",
  findings: "Data Analysis & Findings (Chapter 4)",
  conclusion: "Conclusion (Chapter 5)",
};

function buildCritiquePrompt(chapterType: string, content: string, methodology: string): string {
  const chapterLabel = CHAPTER_TYPE_LABELS[chapterType] || chapterType;
  // Read the WHOLE chapter — examiners must see every section, not a preview.
  // Hard ceiling at 120k chars (~30k tokens) only to stay inside the model window.
  const contentPreview = content.length > 120000 ? content.substring(0, 120000) + "\n\n[...content truncated at 120k chars to fit context window...]" : content;

  return `You are a strict academic dissertation examiner reviewing a ${chapterLabel} chapter against the Terms of Quality below.

${TERMS_OF_QUALITY}

Your task: identify up to 15 issues where the draft FAILS the Terms of Quality above or the chapter-specific rules below. Return a JSON array only — no prose, no markdown, no trailing notes.

CHAPTER TYPE: ${chapterLabel}
METHODOLOGY: ${methodology}

---
${contentPreview}
---

WHAT TO CHECK:

CRITICAL (red) — these invalidate academic quality:
- Wrong chapter content (e.g. research objectives/questions/hypotheses in Lit Review; methodology description in Findings; data results in Methodology)
- Duplicate reference lists (more than one "## References" section)
- Missing mandatory sections for this chapter type
- Abstract containing citations, tables, or figures
- Methodology discussing uncollected data or presenting results

MODERATE (yellow) — these reduce chapter quality:
- Sections that are clearly too short or underdeveloped (under 100 words for a major section)
- Vague or unsupported empirical statistics
- Empirical claims with no in-text citation
- Hypotheses (H1, H2...) present when they weren't part of the chapter instructions
- Research objectives/questions appearing in wrong chapters
- Section headings renamed or missing compared to standard template

MINOR (blue) — these reduce polish:
- Overuse of passive voice
- Banned academic phrases (e.g. "in conclusion", "in a nutshell", "it is important to note")
- Missing transition sentences between sections
- Citation formatting inconsistencies

Return format — a JSON array, each element:
{
  "severity": "critical" | "moderate" | "minor",
  "text": "<first ~80 characters of the problematic passage, quoted>",
  "issue": "<concise description of what is wrong>",
  "fix": "<specific actionable correction>"
}

Return ONLY the JSON array. Example:
[{"severity":"critical","text":"H1: There is a significant relationship...","issue":"Hypothesis present in Literature Review — hypotheses belong in Chapter 1 only","fix":"Remove H1/H2/H3 statements from this chapter entirely"}]

If there are no issues, return an empty array: []`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "GOOGLE_AI_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { chapterType, content, methodology = "Quantitative" } = body as {
      chapterType: string;
      content: string;
      methodology?: string;
    };

    if (!chapterType || !content) {
      return new Response(JSON.stringify({ error: "chapterType and content are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = buildCritiquePrompt(chapterType, content, methodology);

    const tier = await resolveTier(req);
    const useClaude = shouldUseClaude(tier);
    const useThinking = shouldUseThinking(tier);

    console.log(
      `[critique-chapter] user=${tier.email || "anon"} tier=${tier.tier} admin=${tier.isAdmin} ` +
      `useClaude=${useClaude} thinking=${useThinking}`
    );

    let rawText = "";
    let providerUsed = "none";

    // ── Claude branch (paid/admin) ──
    if (useClaude) {
      try {
        rawText = await callAnthropic({
          model: CLAUDE_MODEL,
          messages: [{ role: "user", content: prompt }],
          thinking: useThinking,
          maxTokens: 3000,
        });
        providerUsed = "anthropic/claude-sonnet-4-5";
      } catch (e) {
        if (e instanceof AnthropicRateLimitError) {
          console.warn("[critique-chapter] Claude rate-limited — falling back to gateway");
        } else {
          console.warn("[critique-chapter] Claude failed — falling back to gateway:", e);
        }
        rawText = "";
      }
    }

    // ── Google AI fallback (free tier / Claude rate-limited) ──
    if (!rawText) {
      const fallbackChain: string[] = ["gemini-2.5-flash"];

      for (const candidate of fallbackChain) {
        try {
          console.log(`[critique-chapter] → Google AI model=${candidate}`);
          const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: candidate,
              messages: [{ role: "user", content: prompt }],
              max_tokens: 3000,
              temperature: 0.3,
            }),
          });
          if (response.ok) {
            const data = await response.json();
            rawText = data.choices?.[0]?.message?.content || "[]";
            providerUsed = candidate;
            break;
          }
          if (response.status !== 402 && response.status !== 429) {
            console.error(`[critique-chapter] gateway error (${candidate}): ${response.status}`);
            break;
          }
          console.warn(`[critique-chapter] ${candidate} returned ${response.status} — trying next`);
        } catch (e) {
          console.warn(`[critique-chapter] ${candidate} threw — trying next:`, e);
        }
      }
    }

    if (!rawText) {
      return new Response(JSON.stringify({ error: "All providers unavailable", issues: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[critique-chapter] used=${providerUsed}`);

    let issues: CritiqueIssue[] = [];
    try {
      // Extract JSON array from response (handle any surrounding text)
      const match = rawText.match(/\[[\s\S]*\]/);
      if (match) {
        issues = JSON.parse(match[0]);
      }
    } catch (e) {
      console.error("Failed to parse critique JSON:", e, rawText);
      issues = [];
    }

    // Cap at 15 issues
    issues = issues.slice(0, 15);

    return new Response(JSON.stringify({ issues }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("critique-chapter error:", err);
    return new Response(JSON.stringify({ error: String(err), issues: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
