// Auto-fill PaperStudio preliminary pages (Acknowledgements, Dedication,
// List of Abbreviations, Glossary) using Lovable AI Gateway. Returns text
// blobs that can be slotted directly into the FinalExport textareas.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ChapterStub {
  title: string;
  content?: string;
}

interface Body {
  projectTitle: string;
  field?: string;
  university?: string;
  fullName?: string;
  supervisor?: string;
  chapters?: ChapterStub[];
}

const SYS = `You write concise, professional preliminary pages for a postgraduate dissertation. You write in plain prose only — never markdown headings, never lists, never code fences. Output STRICT JSON only with these keys: acknowledgements, dedication, abbreviations, glossary. Each value is a plain string. No commentary, no preamble.`;

function buildPrompt(b: Body): string {
  const ctx: string[] = [];
  ctx.push(`Title: ${b.projectTitle}`);
  if (b.field) ctx.push(`Field: ${b.field}`);
  if (b.university) ctx.push(`Institution: ${b.university}`);
  if (b.fullName) ctx.push(`Author: ${b.fullName}`);
  if (b.supervisor) ctx.push(`Supervisor: ${b.supervisor}`);
  const chapterTitles = (b.chapters || []).map((c) => `- ${c.title}`).join("\n");
  if (chapterTitles) ctx.push(`Chapters:\n${chapterTitles}`);

  // Pull a small sample of chapter prose so abbreviations/glossary are grounded
  // in this study's actual terminology, not generic defaults.
  const sample = (b.chapters || [])
    .filter((c) => c.content)
    .map((c) => (c.content || "").slice(0, 1500))
    .join("\n\n")
    .slice(0, 6000);
  if (sample) ctx.push(`Excerpts (for terminology grounding):\n${sample}`);

  return `${ctx.join("\n\n")}

Produce STRICT JSON with these four fields:

{
  "acknowledgements": "150-220 words. Warm but professional. Thank the supervisor by name if provided, then institution/department, then peers/family in that order. Plain paragraphs, no lists, no headings.",
  "dedication": "1-2 short sentences, max 30 words, single paragraph. No headings.",
  "abbreviations": "8-15 abbreviations actually relevant to this study, ONE per line, formatted exactly as 'ABBR — Full term'. No bullets, no numbering, no heading line. Use an em dash.",
  "glossary": "6-10 key technical terms specific to this study, ONE per line, formatted exactly as 'Term — concise definition (max 25 words).' No bullets, no headings."
}

Return ONLY the JSON object. No prose before or after.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body?.projectTitle) {
      return new Response(JSON.stringify({ error: "projectTitle required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing GOOGLE_AI_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: SYS },
          { role: "user", content: buildPrompt(body) },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(JSON.stringify({ error: `AI gateway: ${resp.status} ${txt}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content || "{}";
    let parsed: Record<string, string> = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Try to salvage a JSON block from text
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch {
          parsed = {};
        }
      }
    }

    return new Response(
      JSON.stringify({
        acknowledgements: (parsed.acknowledgements || "").trim(),
        dedication: (parsed.dedication || "").trim(),
        abbreviations: (parsed.abbreviations || "").trim(),
        glossary: (parsed.glossary || "").trim(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
