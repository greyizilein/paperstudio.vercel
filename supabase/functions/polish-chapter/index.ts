// polish-chapter — deterministic post-generation cleanup pass.
// Runs after streaming completes, before the chapter is saved.
// Performs heading dedupe, citation repair, year repair, HTML scrub,
// and inserts placeholder interpretive paragraphs after orphan tables/figures.
//
// This is intentionally NON-AI for speed and determinism. Rhetorical audits
// (hinge presence, sentence rhythm) live in the prompt itself; the polish
// pass only fixes things that can be fixed by regex with high confidence.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. STRIP CHAPTER-TITLE HEADING — removes a leading "# Chapter N" / "# Ch N"
// ─────────────────────────────────────────────────────────────────────────────
function stripLeadingChapterTitle(content: string): string {
  // Walk past blank lines, then if the first non-blank line is a chapter-title
  // heading (any of #, ##, ### + "Chapter N" / "Ch N" / "Chapter N: Title"),
  // remove it. Repeat once in case the model emitted two.
  let out = content;
  for (let pass = 0; pass < 2; pass++) {
    out = out.replace(
      /^\s*\n*#{1,3}\s+(?:Chapter|Ch\.?|CHAPTER)\s*\d+(?:\s*[:·\-—].*)?\s*$/im,
      ""
    ).replace(/^\s+/, "");
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. HEADING DEDUPE — collapse "## 2.4 X" followed within 3 lines by "### 2.4 X"
// ─────────────────────────────────────────────────────────────────────────────
function dedupeAdjacentHeadings(content: string): string {
  const lines = content.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^(#{2,4})\s+(.+?)\s*$/);
    if (m) {
      const titleNorm = m[2].trim().toLowerCase().replace(/\s+/g, " ");
      // Look ahead up to 3 lines for a heading with the same title text
      let dupAt = -1;
      for (let j = i + 1; j <= Math.min(i + 3, lines.length - 1); j++) {
        const next = lines[j];
        const m2 = next.match(/^(#{2,4})\s+(.+?)\s*$/);
        if (m2 && m2[2].trim().toLowerCase().replace(/\s+/g, " ") === titleNorm) {
          dupAt = j;
          break;
        }
        if (next.trim() !== "") break; // hit content — no dup
      }
      if (dupAt > -1) {
        // Skip the duplicate (and any blank lines between)
        out.push(line);
        i = dupAt;
        continue;
      }
    }
    out.push(line);
  }
  return out.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CITATION REPAIR — collapse "Brooks (Brooks & Kim, 2020)" → "(Brooks & Kim, 2020)"
//    and "Sweeney Sweeney & Soutar" → "Sweeney & Soutar"
// ─────────────────────────────────────────────────────────────────────────────
function repairCitations(content: string): string {
  let out = content;

  // Pattern A: "Word (Word & " or "Word (Word and " where Word repeats
  // e.g. "Brooks (Brooks & Kim, 2020)" → "(Brooks & Kim, 2020)"
  out = out.replace(
    /\b([A-Z][a-zA-Z\u00C0-\u017F]+)\s+\(\1\s+(&|and)\s+/g,
    "($1 $2 "
  );

  // Pattern B: "Word Word &" / "Word Word and" — collapse double surname
  // e.g. "Sweeney Sweeney & Soutar" → "Sweeney & Soutar"
  // Skip common doubled-real-words (very unlikely in citation context).
  out = out.replace(
    /\b([A-Z][a-zA-Z\u00C0-\u017F]+)\s+\1\s+(&|and)\s+/g,
    "$1 $2 "
  );

  // Pattern C: "Hansen (Hansen, 2021)" → "(Hansen, 2021)"
  out = out.replace(
    /\b([A-Z][a-zA-Z\u00C0-\u017F]+)\s+\(\1,\s*(\d{4})\)/g,
    "($1, $2)"
  );

  // Pattern D: "Birtwistle istle & Moore" — collapse fragment-doubled name
  // (a short fragment of the name follows with a space). Conservative:
  // only catch "X yz" where yz is the last 3+ chars of X, and X >= 6 chars.
  out = out.replace(
    /\b([A-Z][a-zA-Z\u00C0-\u017F]{5,})\s+([a-zA-Z\u00C0-\u017F]{3,})\s+(&|and)\s+/g,
    (full, w1: string, w2: string, sep: string) => {
      if (w1.toLowerCase().endsWith(w2.toLowerCase())) {
        return `${w1} ${sep} `;
      }
      return full;
    }
  );

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. YEAR REPAIR — fix obvious truncations like "(Sweeney, 220)" → "(Sweeney, 2020)"
//    Only repair if there is exactly one digit missing (3-digit year starting
//    with "1" or "2" → assume "19XX" or "20XX").
// ─────────────────────────────────────────────────────────────────────────────
function repairTruncatedYears(content: string): string {
  return content.replace(
    /(\(\s*[A-Z][a-zA-Z\u00C0-\u017F\s.&,'-]+,\s*)(\d{3})(\s*[,)])/g,
    (full, prefix: string, year: string, suffix: string) => {
      if (year.startsWith("19") || year.startsWith("20")) {
        // Likely "199" or "201" / "202" — append "0" as best guess
        return `${prefix}${year}0${suffix}`;
      }
      if (year.startsWith("2") || year.startsWith("1")) {
        // "220" → "2020", "221" → "2021"
        return `${prefix}${year[0]}0${year.slice(1)}${suffix}`;
      }
      return full;
    }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. HTML TABLE SCRUB — model occasionally emits raw HTML tables.
//    Convert simple <table>…</table> blocks into Markdown pipe tables.
// ─────────────────────────────────────────────────────────────────────────────
function htmlTablesToMarkdown(content: string): string {
  return content.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, inner: string) => {
    const rows: string[][] = [];
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rm: RegExpExecArray | null;
    while ((rm = rowRe.exec(inner)) !== null) {
      const cells: string[] = [];
      const cellRe = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
      let cm: RegExpExecArray | null;
      while ((cm = cellRe.exec(rm[1])) !== null) {
        cells.push(cm[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
      }
      if (cells.length > 0) rows.push(cells);
    }
    if (rows.length < 1) return "";
    const cols = Math.max(...rows.map(r => r.length));
    const padded = rows.map(r => {
      const c = [...r];
      while (c.length < cols) c.push("");
      return c;
    });
    const header = `| ${padded[0].join(" | ")} |`;
    const sep = `| ${Array(cols).fill("---").join(" | ")} |`;
    const body = padded.slice(1).map(r => `| ${r.join(" | ")} |`).join("\n");
    return `\n\n${header}\n${sep}\n${body}\n\n`;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. ORPHAN TABLE/FIGURE INTERPRETATION FLAG
//    If a table or figure is immediately followed by a heading, prepend a
//    one-line italic note so the user notices and can request a redraft.
//    We do NOT silently fabricate the interpretation — that would be worse.
// ─────────────────────────────────────────────────────────────────────────────
function flagOrphanVisuals(content: string): string {
  const lines = content.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    out.push(line);

    const isTableEnd = /^\|.*\|\s*$/.test(line) &&
      (i === lines.length - 1 || !/^\|/.test(lines[i + 1] || ""));
    const isFigureMarker = /^<!--\s*FIGURE:/i.test(line.trim());

    if (isTableEnd || isFigureMarker) {
      // Look ahead — skip blank lines, find next non-blank
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === "") j++;
      if (j < lines.length && /^#{2,4}\s+/.test(lines[j])) {
        // Orphan: visual immediately followed by heading
        // (We don't insert fake content. We leave it and let the polish/AI pass catch it later.)
        // For now, just flag once via comment so it's visible in DB but not rendered.
        out.push("");
        out.push("<!-- POLISH:ORPHAN_VISUAL — this table/figure lacks an interpretive paragraph -->");
      }
    }
  }
  return out.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN POLISH PIPELINE
// ─────────────────────────────────────────────────────────────────────────────
function polishContent(raw: string): { content: string; changes: Record<string, number> } {
  const before = raw;
  let content = raw;
  const changes: Record<string, number> = {};

  const step1 = stripLeadingChapterTitle(content);
  if (step1 !== content) changes.stripped_chapter_title = 1;
  content = step1;

  const step2 = dedupeAdjacentHeadings(content);
  if (step2 !== content) {
    const dropped = (content.match(/^#{2,4}\s+/gm)?.length || 0) - (step2.match(/^#{2,4}\s+/gm)?.length || 0);
    if (dropped > 0) changes.deduped_headings = dropped;
  }
  content = step2;

  const step3 = htmlTablesToMarkdown(content);
  if (step3 !== content) {
    changes.html_tables_converted = (content.match(/<table/gi)?.length || 0);
  }
  content = step3;

  const step4 = repairCitations(content);
  if (step4 !== content) changes.citations_repaired = 1;
  content = step4;

  const step5 = repairTruncatedYears(content);
  if (step5 !== content) changes.years_repaired = 1;
  content = step5;

  const step6 = flagOrphanVisuals(content);
  if (step6 !== content) {
    changes.orphan_visuals_flagged =
      (step6.match(/POLISH:ORPHAN_VISUAL/g)?.length || 0);
  }
  content = step6;

  // Ensure trailing newline is single
  content = content.replace(/\n{3,}$/g, "\n\n");

  return { content, changes };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { content } = await req.json();
    if (typeof content !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing 'content' string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const result = polishContent(content);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("polish-chapter error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
