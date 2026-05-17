import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logAiUsage } from "../_shared/log-ai-usage.ts";
import { fetchZoteroItems, formatCitationsForPrompt } from "../_shared/zotero.ts";
import { TERMS_OF_QUALITY } from "../_shared/quality-terms.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildCitationRules(style: string): string {
  switch (style) {
    case "Harvard":
      return `CITATION RULES (Harvard):
- PARENTHETICAL citations: Use ampersand (&) INSIDE brackets only — (Smith & Jones, 2021)
- NARRATIVE citations: Use "and" OUTSIDE brackets only — Smith and Jones (2021) argue that…
- CRITICAL: NEVER use & in narrative citations. NEVER use "and" inside parenthetical citations.
- WRONG: "Smith & Jones (2021) argue…" — NEVER DO THIS
- WRONG: "(Smith and Jones, 2021)" — NEVER DO THIS
- CORRECT: "Smith and Jones (2021) argue…" — narrative
- CORRECT: "(Smith & Jones, 2021)" — parenthetical
- Single author: (Smith, 2021) or Smith (2021)
- Two authors: (Smith & Jones, 2021) or Smith and Jones (2021)
- Three or more authors: ALWAYS use et al. — (Smith et al., 2022) or Smith et al. (2022)
- Multiple citations in one bracket: semicolons, chronological order — (Jones, 2019; Smith, 2021; Brown, 2023)
- Direct quotes: include page number — (Smith, 2021, p. 45) or Smith (2021, p. 45) states "…"
- Reference list format: Author, A.B. (Year) Title of work. Publisher/Journal, Volume(Issue), pages.`;

    case "APA 7th":
      return `CITATION RULES (APA 7th):
- Format: (Author, Year) — e.g., (Smith, 2021) or Smith (2021)
- Two authors: use & in parenthetical (Smith & Jones, 2021), "and" in narrative: Smith and Jones (2021)
- 3+ authors: use et al. from first citation — (Smith et al., 2022)
- Direct quotes require page numbers: (Smith, 2021, p. 42)
- Include DOI in reference list entries where available
- Reference list: Author, A. B. (Year). Title of work. Publisher. https://doi.org/xxx`;

    case "Vancouver":
      return `CITATION RULES (Vancouver):
- Use numbered superscript citations in order of appearance — e.g., Smith¹ found that...
- Multiple citations: use commas for non-sequential (¹,³,⁵) and hyphens for sequential (¹⁻³)
- Reference list numbered in order of first citation
- Do NOT use author-date format anywhere`;

    case "IEEE":
      return `CITATION RULES (IEEE):
- Use numbered square bracket citations — e.g., [1], [2], [3]
- Multiple citations: [1], [3], [5] or [1]-[3] for sequential
- Reference list numbered in order of first citation
- Do NOT use author-date format anywhere`;

    case "Chicago":
      return `CITATION RULES (Chicago):
- Use footnote-style citations with superscript numbers
- Full citation on first reference, shortened form thereafter
- Include a bibliography at the end`;

    case "OSCOLA":
      return `CITATION RULES (OSCOLA):
- Use footnotes for citations (not in-text author-date)
- Pinpoint references where possible
- No bibliography unless specifically required — footnotes are the primary citation method`;

    default:
      return `CITATION RULES (${style}):
- Follow ${style} citation formatting strictly for all in-text citations and references.
- Ensure consistency between in-text citations and the reference list.`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, action, citationStyle, languageStyle, fieldOfStudy } = await req.json();

    if (!content || !action) {
      return new Response(
        JSON.stringify({ error: "Missing content or action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_AI_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lang = languageStyle || "English (UK)";
    const cite = citationStyle || "Harvard";
    const citationRules = buildCitationRules(cite);

    const actionPrompts: Record<string, string> = {
      "fix_grammar": `Fix all grammar, spelling, and punctuation errors in the following academic text. Maintain the original academic tone and structure. Fix ${lang} spelling conventions. 

${citationRules}

Ensure all citations are correctly formatted per the rules above. Return ONLY the corrected text with no commentary.`,

      "strengthen": `Strengthen the academic writing in the following text. Make arguments more compelling, improve word choices, strengthen topic sentences, tighten logic, and enhance academic vocabulary. Do NOT change the meaning or structure. Do NOT add or remove citations. 

${citationRules}

Preserve all existing citations exactly per the rules above. Return ONLY the improved text.`,

      "simplify": `Simplify the following academic text for clarity. Reduce sentence complexity, replace jargon with accessible alternatives, and shorten overly long sentences. Maintain academic tone but improve readability. Do NOT change the meaning or remove citations. 

${citationRules}

Preserve all citations per the rules above. Return ONLY the simplified text.`,

      "paraphrase": `Paraphrase the following academic text to express the same ideas in different words. Preserve all citations exactly as they appear (do not change author names, years, or formatting). Maintain the same academic tone and paragraph structure. The rewritten text should not match the original phrasing closely.

${citationRules}

Ensure all citations follow the rules above exactly. Return ONLY the paraphrased text.`,

      "expand": `Expand and elaborate on the following academic text. Add depth by providing more detailed explanations, supporting arguments, examples, and nuance. Maintain the same academic tone. Do NOT fabricate new citations — only elaborate on ideas already present.

${citationRules}

Maintain citation style per the rules above. Return ONLY the expanded text.`,

      "shorten": `Condense the following academic text by approximately 20–30%. Remove redundant phrases, tighten sentence structure, and eliminate filler words while preserving all key arguments, evidence, and citations. Maintain ${lang} spelling.

${citationRules}

Preserve all citations per the rules above. Return ONLY the shortened text.`,

      "fix_citations": `Review the following academic text and fix ONLY the citation and reference formatting errors. Do NOT change any other text.

${citationRules}

Apply these rules strictly. Fix in-text citations and any reference list entries. Return ONLY the text with corrected citations.`,

      "academic_tone": `Rewrite the following text to enforce a formal academic register throughout. Remove all colloquialisms, contractions, informal language, first-person statements (unless appropriate for reflexivity sections), and conversational phrases. Replace them with formal academic equivalents. Maintain ${lang} spelling conventions.

${citationRules}

Preserve all citations per the rules above. Return ONLY the revised text.`,

      "humanise_light": `You are an academic author revising your own draft before submission. You wrote this text yourself. Your task is to make LIGHT revisions that remove the most obvious AI-generated patterns.

ABSOLUTE RULES — NEVER VIOLATE:
- NEVER change the grammatical person. If the text uses third person, your output MUST use third person. If it uses first person, keep first person. NO SWITCHING.
- NEVER change the register or formality level. Formal stays formal. Scientific stays scientific. Professional stays professional.
- NEVER casualise the language. "Humanising" does NOT mean making text informal. Academic language must remain academic. Professional vocabulary stays professional. Do NOT replace formal words with casual equivalents unless they are pure AI filler.
- NEVER change the meaning, reduce quality, or alter factual content.
- NEVER add personal opinions or subjective language that wasn't in the original.
- Output word count must not exceed input word count by more than 1%.

CRITICAL DISTINCTION — Filler vs. Formal Language:
- "utilise" → "use" ✓ (pure AI filler — replace)
- "furthermore" → "also" ✓ (AI transition filler — replace)
- "demonstrated" → keep ✓ (legitimate formal verb — do NOT replace)
- "systematic" → keep ✓ (formal academic word — do NOT replace)
- "significant" → keep ✓ (academic vocabulary — do NOT replace)
- "consequently" → keep ✓ (formal transition — do NOT replace)
- "paradigm" → keep if domain-specific ✓ (field term — do NOT replace)

WHAT TO DO (light touch only):
1. Strip ONLY these pure AI filler phrases — replace with natural equivalents:
   "utilise/utilize" → "use", "facilitate" → "help/enable", "leverage" → "use/draw on", "multifaceted" → "complex", "furthermore" → "also/and", "moreover" → "also", "it is important to note" → remove or rephrase, "it is worth noting" → remove, "in the realm of" → "in", "plays a crucial role" → "is central to/matters for", "delve" → "examine/explore", "tapestry" → remove/rephrase, "landscape" → "field/area", "underpins" → "supports"
2. Vary 2-3 sentence openings that follow a repetitive pattern.
3. Add 1-2 minor hedging phrases ("arguably", "it appears that", "this seems to suggest").
4. Break 1-2 overly uniform paragraph structures.
5. Use semicolons in 1-2 places where AI typically avoids them.

${citationRules}

Preserve ALL citations exactly as they appear per the rules above. Preserve academic meaning, tone, and ${lang} spelling. Return ONLY the revised text.`,

      "humanise": `You are an academic author revising your own draft before submission. You wrote this text yourself. Your task is to revise it so it reads naturally and passes AI detection tools (Turnitin, ZeroGPT) while maintaining your original voice and register.

ABSOLUTE RULES — NEVER VIOLATE:
- NEVER change the grammatical person. If the text uses third person ("the study found", "it was observed"), your output MUST remain in third person. If first person, keep first person. NO SWITCHING EVER.
- NEVER change the register or formality level. Formal academic prose stays formal. Scientific writing stays scientific. The tone, voice, and language style must be IDENTICAL to the input.
- NEVER casualise the language. "Humanising" means removing AI STATISTICAL PATTERNS, NOT making text informal. Words like "demonstrated", "systematic", "consequently", "significant", "established" are legitimate academic vocabulary — do NOT replace them. Only replace words that are PURE AI FILLER (see list below).
- NEVER change the meaning, reduce quality, or simplify the intellectual depth.
- Output word count must not exceed input word count by more than 1%.

FILLER vs FORMAL — Only strip PURE AI filler:
Strip: "utilise/utilize" → "use", "facilitate" → "help/enable", "leverage" → "use/draw on", "multifaceted" → "complex", "furthermore" → "also", "moreover" → "and/also", "it is important to note" → remove, "it is worth noting" → remove, "in the realm of" → "in", "plays a crucial role" → "is central to", "delve" → "examine", "tapestry" → rephrase, "underpins" → "supports", "shed light on" → "clarify/reveal", "in today's world" → remove, "in the modern era" → remove
Keep: "demonstrated", "systematic", "consequently", "significant", "established", "comprehensive", "substantial", "predominantly", "methodology", "framework" — these are FORMAL ACADEMIC vocabulary, not AI filler.

DISCIPLINE DETECTION: Identify the academic discipline from the text. Preserve ALL field-specific vocabulary. "Robust" stays in statistics papers. "Paradigm" stays in philosophy papers. Only replace words that are generic AI filler, NOT domain terminology.

HUMANISATION PASSES:
1. SENTENCE VARIATION: Mix sentence lengths unpredictably — short declarative (8-12 words) next to complex subordinate-clause sentences (25-35 words). Never 3+ sentences of similar length consecutively.
2. NATURAL TRANSITIONS: Replace generic transitions ("Furthermore", "Moreover", "Additionally") with discipline-specific connectors or simply start new ideas without a transition word. But keep formal connectors like "consequently", "accordingly", "nevertheless".
3. REASONING TRACES: Add "which would suggest X — though this depends on how one reads Y" style constructions. AI states conclusions; humans show thinking.
4. ARGUMENTATIVE TEXTURE: Introduce small detours mid-argument. Add acknowledgments of what ISN'T being addressed.
5. SELF-CORRECTIONS: Include "or more precisely…", "a better framing might be…" — these are human revision fingerprints.
6. PARAGRAPH STRUCTURE: Vary lengths (3-7 sentences). Don't always lead with topic sentences.
7. MICRO-PATTERNS: Use semicolons; use dash-style parentheticals (— like this —); vary reporting verbs.
8. WORD CHOICE: Replace the second-most-predictable word only when natural. Do NOT downgrade formal vocabulary.

${citationRules}

Preserve ALL citations exactly per the rules above. Preserve academic meaning and ${lang} spelling. Return ONLY the revised text.`,

      "humanise_deep": `You are an academic author doing a FINAL deep revision of your own draft. You wrote this text. Your goal is to make it completely undetectable by AI detection tools (Turnitin AI, ZeroGPT, GPTZero, Originality.ai, Copyleaks) while preserving EXACTLY the same voice, tone, register, person, and intellectual quality.

ABSOLUTE RULES — NEVER VIOLATE:
- NEVER change the grammatical person. Third person stays third person. First person stays first person. PERIOD.
- NEVER change the register. Formal stays formal. Scientific stays scientific. Professional stays professional.
- NEVER casualise the language. "Humanising" does NOT mean simplifying or making informal. The words "demonstrated", "systematic", "consequently", "significant", "established", "comprehensive", "methodology", "framework", "predominantly" are LEGITIMATE ACADEMIC VOCABULARY — they MUST stay. Only replace words from the FILLER LIST below.
- NEVER reduce quality, depth, or sophistication. The output must be AT LEAST as intellectually rigorous as the input.
- Output word count must not exceed input word count by more than 1%.

FILLER LIST — ONLY strip these (everything else stays):
"utilise/utilize" → "use", "facilitate" → "help/enable", "leverage" → "draw on", "multifaceted" → "complex", "furthermore/moreover" → "also/and"/remove, "it is important to note/worth noting/it should be noted" → remove, "in the realm of" → "in", "plays a crucial role" → "is central to", "delve" → "examine", "tapestry" → rephrase, "shed light on" → "clarify", "in today's world/modern era" → remove

KEEP LIST — NEVER replace these (they are formal, not AI):
"demonstrated", "indicated", "revealed", "systematic", "consequently", "accordingly", "nevertheless", "significant", "substantial", "comprehensive", "predominantly", "methodology", "framework", "established", "conventional", "empirical", "theoretical", "analytical", "conceptual"

DISCIPLINE DETECTION: Detect the field. Keep ALL field-specific terms. "Robust" stays in statistics. "Paradigm" stays in philosophy.

DEEP HUMANISATION — TARGET TURNITIN'S 6 SIGNALS:

1. ARGUMENTATIVE SMOOTHNESS: Introduce small complications and qualifications mid-argument. Not every point should flow seamlessly.

2. REASONING TRACES: Add "which would suggest X — though this depends on how one reads Y", "if one follows this logic, then…" constructions.

3. DISCIPLINARY VOICE: Use field-specific hedging habits and conventions. Keep formal vocabulary intact.

4. OVER-COMPLETENESS: Add acknowledgments of gaps: "this analysis does not address…", "a full treatment would require…"

5. PERFECT SCAFFOLDING: Break predictable templates. Merge claim+evidence. Front-load analysis. Use single-sentence paragraphs for emphasis (1 per 1000 words).

6. ABSENCE OF GENUINE UNCERTAINTY: Replace confident hedging with real uncertainty about what evidence warrants.

ADDITIONAL HUMANISATION:
- Aggressive paraphrase of SENTENCE STRUCTURE — up to 100% of sentence structures may change, but vocabulary register MUST remain identical. Reconstruct sentences, don't simplify them.
- Voice fingerprinting: Pick 2-3 stylistic habits and apply consistently (e.g., em-dashes for asides, favouring "yet" over "however").
- Vary reporting verbs within the SAME register: "demonstrated" → "established", "indicated" → "pointed to", "revealed" → "uncovered" — NOT "showed" or "found" (too simple).
- Use semicolons liberally. Use dash-style parentheticals. Use varied sentence openers.
- Sentence DNA: Mix compound-complex, simple, and periodic sentences. Include 2+ very short sentences (<8 words) per 500 words.

${citationRules}

Preserve ALL citations exactly per the rules above. Preserve core academic meaning. Use ${lang} spelling. The result must read as if written by a thoughtful postgraduate student — not a language model. Return ONLY the revised text.`,
    };

    let systemPrompt = actionPrompts[action] || actionPrompts["fix_grammar"];
    // Hold every editing pass to the same scholarly standard the writer uses.
    systemPrompt = `${TERMS_OF_QUALITY}\n\n${systemPrompt}\n\nNo meta-commentary. End on the last substantive sentence — no checklists, no "Edited…", "Polished…", "Applied…" trailers, no audit notes.`;

    // For fix_citations, enrich with Zotero library
    if (action === "fix_citations") {
      try {
        const zoteroItems = await fetchZoteroItems(fieldOfStudy || undefined, 40);
        if (zoteroItems.length > 0) {
          const zoteroContext = formatCitationsForPrompt(zoteroItems, cite);
          systemPrompt += `\n\n${zoteroContext}\n\nWhen correcting citations, match any existing in-text citations to these real sources where possible. Fix formatting to match ${cite} style exactly.`;
        }
      } catch (e) {
        console.error("Zotero fetch for fix_citations (non-fatal):", e);
      }
    }

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.0-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: content },
        ],
        stream: true,
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
      console.error("Grammar check error:", response.status, t);
      return new Response(JSON.stringify({ error: "Grammar check failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Log usage
    logAiUsage({
      action: action.startsWith("humanise") ? "humanise" : "grammar_check",
      model: "gemini-2.0-flash",
      inputText: content,
      outputText: content, // estimate similar size output
    });

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("grammar-check error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
