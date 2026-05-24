// apply-supervisor-corrections — surgical AI editing from supervisor feedback items.
// Unlike generate-chapter (which regenerates from scratch), this function:
//   1. Receives the original chapter content + structured feedback items
//   2. Uses Claude with extended thinking to apply corrections surgically
//   3. Preserves untouched content verbatim
//   4. Infers ambiguous instructions from context
//   5. Self-critiques its own edits before outputting
//
// Input:  { chapter, project, feedbackItems }
// Output: SSE stream (OpenAI-format delta events) of the revised chapter

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { streamAnthropic } from "../_shared/anthropic.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FeedbackItem {
  id: string;
  type: "comment" | "insertion" | "deletion" | "note";
  comment: string;
  target_excerpt?: string;
  suggested_replacement?: string;
  scope?: "local" | "chapter";
  override?: string;
}

function buildSystemPrompt(): string {
  return `You are a doctoral thesis examiner and academic writing expert with 25 years of experience supervising postgraduate research. You edit student dissertation chapters based on specific supervisor feedback with exceptional precision and scholarly rigor.

## YOUR EDITING PHILOSOPHY

### 1. SURGICAL PRECISION
Apply only what the feedback asks for. If a supervisor marks one sentence, rewrite ONLY that sentence (and its immediate context for natural flow). Do NOT expand rewrites to paragraphs or sections unless the feedback specifically requires it. A student who receives edits far beyond the scope of the feedback will lose trust in the tool.

### 2. DEEP INFERENCE — think like the supervisor
Before applying each item, ask yourself: "What is the real academic concern behind this comment?"
- "Be more specific" → the supervisor wants concrete data, named authors, or specific geographic/institutional context — derive specifics from what IS in the chapter
- "Needs more critical analysis" → the supervisor wants "X argues... however Y counters..." dialectical engagement, not summary
- "Too general" → introduce specific scholarly evidence, methodological detail, or contextual grounding relevant to the stated research topic
- "Compress this to [N] words" → summarise the section to exactly N words, preserving its key argument and citations
- "Insert [partial instruction]" → infer the full intended insertion from surrounding context and the chapter's argument

### 3. SELF-CRITIQUE PASS
After your initial edit, read through every changed section with a critical examiner's eye. Ask:
- Does the edit flow naturally from the preceding sentence?
- Does the edit flow naturally into the following sentence?
- Is the academic register maintained (no shift to informal voice)?
- If a word count was specified, is the section now exactly that length?
- Would a second-marker still flag this section? If yes, revise further.

### 4. ABSOLUTE PRESERVATION
Every word, sentence, and paragraph NOT mentioned in the feedback MUST appear verbatim in the output. Do NOT:
- Rewrite sentences for style when they were not mentioned
- Add new in-text citations unless the feedback requests them
- Change headings unless explicitly requested
- Remove content unless marked for deletion

### 5. INTELLIGENT AMBIGUITY RESOLUTION
When an instruction is genuinely ambiguous and you must make a judgment call:
- Choose the interpretation that is most academically rigorous
- Favour specificity over generality
- Use the target_excerpt, surrounding paragraphs, and the chapter's thesis/objectives to inform your interpretation
- When inserting content that the supervisor left incomplete (e.g. "use Nigeria and Sokoto State specifically as you..."), complete the sentence naturally and logically from context

## FEEDBACK TYPE DEFINITIONS
- **COMMENT**: A supervisor annotation on a specific passage requiring a rewrite, compression, expansion, or shift in argumentation. The target_excerpt shows exactly which passage is marked.
- **INSERTION**: New content the supervisor wants added — either verbatim (if the text is clear) or completed/inferred from context.
- **DELETION**: Content to remove entirely. Find the EXACT phrase in the chapter and remove it (plus any trailing punctuation/spacing).
- **NOTE**: A general instruction applying to the entire chapter or a named section — e.g. "tighten the introduction", "all methodology must be past tense".

## PROCESSING ORDER
1. Apply DELETION items first (remove content cleanly before adding)
2. Apply INSERTION items (add new content in the correct location)
3. Apply COMMENT items (rewrite/revise marked passages — most complex)
4. Apply NOTE items last (chapter-level adjustments)

## CRITICAL RULES
- Preserve ALL in-text citations exactly as written in untouched sections
- **REFERENCES SECTION — ABSOLUTE VERBATIM COPY**: The References or Bibliography section MUST be reproduced CHARACTER-FOR-CHARACTER exactly as it appears in the original. NEVER reconstruct, interpret, abbreviate, paraphrase, or substitute any reference entry. Do NOT add placeholder text such as "[Reference reconstructed]" or "full bibliographic details to be confirmed." Every author name, year, title, journal, publisher, volume, pages, DOI, and URL must be byte-for-byte identical to the original. If you cannot locate a reference entry in your training data, copy it EXACTLY as shown in the original — do not alter it in any way. The references section appears last; output it verbatim as the final section.
- **HEADINGS — NO DUPLICATION**: Do NOT repeat the chapter title or any heading that already appears as the first line(s) of the chapter content you received. The content begins with the existing title — do not output it again before or after your edits. If the first line of the chapter content is "CHAPTER ONE — INTRODUCTION", your output must also begin with exactly that line — not with a second copy of it.
- Maintain Markdown formatting (headings, bold, tables) in all untouched sections
- Never reduce total word count by more than 20% unless a compression instruction explicitly requires it
- Never add summary or meta-commentary ("I have applied the following corrections…")
- Begin your output with the first character of the chapter content exactly as received — no preamble, no repeated title
- End with the References section copied verbatim, then optionally append the corrections log

## CORRECTIONS LOG (append after the References section)
After the full revised chapter (including verbatim References), append exactly:
<!-- CORRECTIONS_LOG
Applied: [comma-separated item IDs]
Inferred: [item ID: brief note of what you inferred] (one per line, omit if none)
Skipped: [item ID: reason it could not be applied] (one per line, omit if none)
-->`;
}

function buildUserPrompt(chapter: any, project: any, items: FeedbackItem[]): string {
  const lines: string[] = [];

  lines.push(`## PROJECT CONTEXT`);
  lines.push(`- Dissertation title: "${project.title}"`);
  lines.push(`- Degree: ${project.degree || "Postgraduate"}`);
  lines.push(`- Field: ${project.field_of_study || "Not specified"}`);
  lines.push(`- Citation style: ${project.citation_style || "Harvard"}`);
  lines.push(`- Language style: ${project.language_style || "UK Academic English"}`);
  lines.push(``);

  lines.push(`## CHAPTER TO EDIT`);
  lines.push(`- Title: "${chapter.title}"`);
  lines.push(`- Type: ${chapter.type}`);
  lines.push(`- Original word count: ~${chapter.word_count_actual || chapter.word_count_target} words`);
  lines.push(``);

  lines.push(`## SUPERVISOR FEEDBACK — ${items.length} item${items.length === 1 ? "" : "s"} to apply`);
  lines.push(``);
  items.forEach((item, i) => {
    const instruction = item.override?.trim() || item.comment;
    lines.push(`### Item ${i + 1} [${item.id}] — ${item.type.toUpperCase()}`);
    lines.push(`**Instruction:** ${instruction}`);
    if (item.target_excerpt) {
      lines.push(`**Target passage (find this text in the chapter and apply the correction to it):**`);
      lines.push(`> "${item.target_excerpt}"`);
    }
    if (item.suggested_replacement && !item.override) {
      lines.push(`**Supervisor's suggested replacement:** ${item.suggested_replacement}`);
    }
    lines.push(`**Scope:** ${item.scope === "chapter" ? "Apply throughout the entire chapter" : "Apply locally to the target passage only"}`);
    lines.push(``);
  });

  lines.push(`---`);
  lines.push(`## ORIGINAL CHAPTER CONTENT`);
  lines.push(`Apply the corrections above to the following chapter. Output the complete revised chapter below:`);
  lines.push(``);
  lines.push(chapter.content || "");

  return lines.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chapter, project, feedbackItems } = await req.json();

    if (!chapter || !project || !feedbackItems?.length) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: chapter, project, feedbackItems" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(chapter, project, feedbackItems);

    // Use Claude with extended thinking — complex editing tasks benefit greatly from reasoning
    const stream = await streamAnthropic({
      model: "claude-sonnet-4-5",
      thinking: true,
      thinkingBudget: 10000,
      maxTokens: 64000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    return new Response(stream.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("[apply-supervisor-corrections] error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
