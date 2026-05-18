// czar-humanise v9 — LLM-driven word-swap humaniser
//
// Problem: a curated word list only covers ~150 known AI words. Academic writing
// has thousands of high-frequency word choices that trigger AI detectors. No
// static table can cover them all.
//
// Solution: use Gemini Flash to READ THIS SPECIFIC TEXT and identify which 30
// words/phrases are the highest-probability (most AI-detectable) choices, then
// return a JSON map of {original: replacement}. Apply those swaps + regex pre-clean.
//
// This is how SuperHumanizer works in <5s: not full rewriting, just targeted
// word identification + substitution. The LLM outputs JSON only (fast),
// substitution is instant string replacement.
//
// Architecture:
//   1. Regex pre-clean       (<1ms)  — remove banned openers, multi-word AI phrases
//   2. Gemini Flash JSON     (3-8s)  — identify 30 context-specific word swaps
//   3. Apply swaps           (<1ms)  — whole-word replace, preserve citations
//   4. Number humanise       (<1ms)  — "approximately 64" → "about sixty-four"
//
// Total: 4-10s. Expected AI score: 0-25%.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_AI_KEY = Deno.env.get("GOOGLE_AI_API_KEY") || "";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GEMINI_MODEL = "gemini-2.5-flash";

// ─── REGEX PRE-CLEAN ──────────────────────────────────────────────────────────
// Handles multi-word AI patterns that a simple word swap can't catch.
// Applied BEFORE Gemini so the model sees cleaner text.
type Replacement = string | ((match: string, ...args: any[]) => string);
const CLEANUPS: Array<[RegExp, Replacement]> = [
  // Transition openers — delete them outright
  [/^(Furthermore|Moreover|Additionally|In addition),\s+/gim, ""],
  [/\.\s+(Furthermore|Moreover|Additionally|In addition),\s+/g, ". "],
  [/;\s*(furthermore|moreover|additionally|in addition),?\s+/gi, ". "],
  // "It is important/worth noting that" — strip phrase
  [/It is (?:important|worth) (?:noting|to note) that\s+/gi, ""],
  // "This demonstrates/highlights/underscores..." openers
  [/\bThis demonstrates\b/g, "This shows"],
  [/\bThis highlights\b/g, "This points to"],
  [/\bThis underscores\b/g, "This stresses"],
  [/\bThis illustrates\b/g, "This shows"],
  [/\bThis suggests\b/g, "This indicates"],
  // "plays a X role"
  [/\bplays a (?:crucial|key|significant|central|major|important|vital|fundamental) role in\b/gi, "is central to"],
  [/\bplays a (?:crucial|key|significant|central|major|important|vital|fundamental) role\b/gi, "is central"],
  // "remains X to" closers
  [/\b(?:remains|remain) (?:essential|crucial|fundamental|vital|important) to\b/gi, "matters for"],
  // Filler quantifiers
  [/\ba wide range of\b/gi, "many"],
  [/\ba broad range of\b/gi, "many"],
  [/\ba variety of\b/gi, "various"],
  [/\ba wide array of\b/gi, "many"],
  // Scene-setters
  [/In today'?s (?:rapidly changing |modern |)?world[,.]?\s*/gi, ""],
  [/In (?:recent years|the modern era|contemporary society|the digital age),?\s+/gi, ""],
  // Delve
  [/\bdelve into\b/gi, "look into"],
  [/\bdelves into\b/gi, "looks into"],
  [/\bdelved into\b/gi, "looked into"],
];

function applyCleanups(text: string): string {
  let t = text;
  for (const [pattern, replacement] of CLEANUPS) {
    t = t.replace(pattern as RegExp, replacement as any);
  }
  return t.replace(/  +/g, " ").replace(/^ /gm, "");
}

// ─── NUMBER HUMANISER ─────────────────────────────────────────────────────────
const NUM_WORDS: Record<number, string> = {
  2:"two",3:"three",4:"four",5:"five",6:"six",7:"seven",8:"eight",9:"nine",
  10:"ten",11:"eleven",12:"twelve",13:"thirteen",14:"fourteen",15:"fifteen",
  16:"sixteen",17:"seventeen",18:"eighteen",19:"nineteen",20:"twenty",
  30:"thirty",40:"forty",50:"fifty",60:"sixty",70:"seventy",80:"eighty",90:"ninety",
};
function numToWords(n: number): string {
  if (NUM_WORDS[n]) return NUM_WORDS[n];
  if (n > 0 && n < 100) {
    const t = Math.floor(n / 10) * 10;
    return NUM_WORDS[t] ? `${NUM_WORDS[t]}-${NUM_WORDS[n % 10]}` : String(n);
  }
  return String(n);
}
function humaniseNumbers(text: string): string {
  return text.replace(
    /\b(approximately|around|roughly)\s+(\d{1,3})\b/gi,
    (_m, _pre, num) => `about ${numToWords(parseInt(num))}`,
  );
}

// ─── MASK / UNMASK PROTECTED REGIONS ──────────────────────────────────────────
interface MaskResult { text: string; slots: string[] }

function maskProtected(text: string): MaskResult {
  const slots: string[] = [];
  let t = text;
  // Code blocks
  t = t.replace(/```[\s\S]*?```/g, m => { slots.push(m); return `\x00${slots.length - 1}\x00`; });
  t = t.replace(/`[^`]+`/g, m => { slots.push(m); return `\x00${slots.length - 1}\x00`; });
  // Citations: (Author..., YYYY) patterns — protect exact text
  t = t.replace(/\([^)]{2,120}\d{4}[^)]{0,30}\)/g, m => { slots.push(m); return `\x00${slots.length - 1}\x00`; });
  // Direct quotes
  t = t.replace(/"[^"]{4,400}"/g, m => { slots.push(m); return `\x00${slots.length - 1}\x00`; });
  return { text: t, slots };
}

function unmaskProtected(text: string, slots: string[]): string {
  return text.replace(/\x00(\d+)\x00/g, (_m, i) => slots[parseInt(i)] ?? "");
}

// ─── APPLY SWAP MAP ────────────────────────────────────────────────────────────
function preserveCase(original: string, replacement: string): string {
  if (original.length > 1 && original === original.toUpperCase()) return replacement.toUpperCase();
  if (original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function applySwapMap(text: string, swaps: Record<string, string>): string {
  // Sort longest-first to avoid partial-word collisions
  const entries = Object.entries(swaps).sort((a, b) => b[0].length - a[0].length);
  let result = text;
  for (const [from, to] of entries) {
    if (!from || !to || from === to) continue;
    const esc = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Whole-word match, case-insensitive
    const re = new RegExp(`(?<![a-zA-Z'-])${esc}(?![a-zA-Z'-])`, "gi");
    result = result.replace(re, m => preserveCase(m, to));
  }
  return result;
}

// ─── GEMINI FLASH JSON SWAP IDENTIFIER ────────────────────────────────────────
const SWAP_SYSTEM = `You are a word-level AI-detection evasion engine for academic text.

Your ONLY job: identify which word choices in the text are the most statistically predictable (high-perplexity) choices that AI detectors will flag, and provide better alternatives.

Return a single valid JSON object (no markdown fences, no explanation, no preamble):
{"original_word": "replacement_word", ...}

Rules:
1. Include 25-40 word or short-phrase replacements that maximally reduce AI score
2. Focus on VERBS, ADJECTIVES, and TRANSITIONAL WORDS — these are what detectors measure
3. Choose replacements with LOWER word frequency than the original (less common = less predictable)
4. Every replacement must be contextually appropriate for formal academic writing
5. Do NOT replace: proper nouns, numbers, statistics, citation fragments, abbreviations, discipline-specific technical terms (e.g. "Cronbach's alpha", "p-value", "SPSS")
6. Do NOT produce contractions, slang, or informal language
7. Where a phrase replacement is needed, map the exact phrase: {"plays a significant role": "is central"}

Target the highest-frequency AI word choices such as:
employ/employed/employing, yield/yielding/yielded, comprise/comprises/comprised,
proceed/proceeded/proceeding, rigour/rigorous, operationalise/operationalisation,
examine/examined, explore/explored, systematic/systematically, confirm/confirmed,
assess/assessed, secure/secured, integrate/integrated, conduct/conducted,
robust, comprehensive, significant, crucial, fundamental, optimal, paramount,
Furthermore, Moreover, Additionally, Subsequently, thus/thereby, utilise, facilitate

Return ONLY the JSON. Nothing else.`;

async function getGeminiSwaps(text: string, signal: AbortSignal): Promise<Record<string, string>> {
  if (!GOOGLE_AI_KEY) throw new Error("GOOGLE_AI_API_KEY not set");

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${GOOGLE_AI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      messages: [
        { role: "system", content: SWAP_SYSTEM },
        { role: "user", content: text },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${txt.slice(0, 200)}`);
  }

  const data = await res.json();
  const raw: string = data?.choices?.[0]?.message?.content || "{}";

  // Parse JSON — strip markdown fences if present
  const cleaned = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed === "object" && parsed !== null) return parsed as Record<string, string>;
  } catch {
    // Try extracting JSON object with regex
    const match = cleaned.match(/\{[\s\S]+\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* ignore */ }
    }
  }
  return {};
}

// ─── WORD COUNT ───────────────────────────────────────────────────────────────
function wordCount(s: string): number {
  return (s || "").trim().split(/\s+/).filter(Boolean).length;
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────
interface Body { text: string; model?: string | null }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Body;
  try { body = await req.json(); }
  catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const text = (body?.text || "").trim();
  if (!text) {
    return new Response(JSON.stringify({ error: "text required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const original_words = wordCount(text);
  const upstreamSignal = req.signal;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: any) => {
        try { controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)); }
        catch { /* closed */ }
      };

      console.log(`[czar-humanise v9] start: ${original_words} words, gemini-swap engine`);
      send("pipeline_start", { stages: 1, provider: "gemini-swap", original_words, version: "v9" });
      send("stage_start", { stage: 1, label: "Identifying word swaps" });

      try {
        const { text: masked, slots } = maskProtected(text);

        // 1. Regex pre-clean
        let result = applyCleanups(masked);

        // 2. Gemini identifies context-specific swaps for THIS text
        const swaps = await getGeminiSwaps(result, upstreamSignal);
        console.log(`[czar-humanise v9] swaps identified: ${Object.keys(swaps).length}`);

        // 3. Apply the swap map
        result = applySwapMap(result, swaps);

        // 4. Number humanisation
        result = humaniseNumbers(result);

        // Restore protected regions
        result = unmaskProtected(result, slots);

        const final_words = wordCount(result);
        send("stage_done", { stage: 1, label: "Word swaps applied", words: final_words });
        send("done", {
          humanised: result,
          stages_completed: 1,
          original_words,
          final_words,
          swaps_applied: Object.keys(swaps).length,
          provider: "gemini-swap",
          version: "v9",
        });
      } catch (e: any) {
        const msg = e?.message || String(e);
        if (!msg.includes("abort") && !msg.includes("cancel")) {
          console.error("[czar-humanise v9] error:", msg);
        }
        send("done", {
          humanised: text,
          stages_completed: 0,
          original_words,
          final_words: original_words,
          provider: "gemini-swap",
          version: "v9",
          error: msg.slice(0, 200),
        });
      } finally {
        try { controller.close(); } catch { /* closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});
