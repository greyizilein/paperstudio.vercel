// czar-humanise v8 — Word-swap humaniser
//
// AI detectors measure TOKEN-LEVEL PERPLEXITY: how statistically predictable
// each word choice is. GPT/Claude/Gemini always pick the highest-probability
// word. Replacing those with lower-probability synonyms defeats detection.
//
// Architecture — no QWEN, no LLM calls:
//   1. Regex pre-clean    (< 1ms) — remove banned transition phrases
//   2. Tier 1 swap        (< 1ms) — 150+ curated AI word → human alternatives
//   3. Datamuse API       (< 2s)  — dynamic synonyms for secondary AI words
//   4. Number humanise    (< 1ms) — "approximately 64" → "about sixty-four"
//
// Total: < 3s. Expected AI detection score: 0–20%.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── TIER 1 SWAP TABLE ────────────────────────────────────────────────────────
// Keys are lowercase exact word forms. Value = alternatives (pick randomly).
// Multi-word phrases go in CLEANUPS, not here.
const TIER1: Record<string, string[]> = {
  // ── Verbs: highest-frequency AI picks ──
  "demonstrate":    ["show", "prove", "reveal"],
  "demonstrates":   ["shows", "proves", "reveals"],
  "demonstrated":   ["showed", "proved", "revealed"],
  "demonstrating":  ["showing", "proving", "revealing"],
  "highlight":      ["flag", "note", "point to"],
  "highlights":     ["flags", "notes", "points to"],
  "highlighted":    ["flagged", "noted", "pointed to"],
  "highlighting":   ["flagging", "noting", "pointing to"],
  "underscore":     ["stress", "press", "foreground"],
  "underscores":    ["stresses", "presses", "foregrounds"],
  "underscored":    ["stressed", "pressed", "foregrounded"],
  "utilise":        ["use"],
  "utilises":       ["uses"],
  "utilised":       ["used"],
  "utilising":      ["using"],
  "utilize":        ["use"],
  "utilizes":       ["uses"],
  "utilized":       ["used"],
  "utilizing":      ["using"],
  "facilitate":     ["help", "support", "enable"],
  "facilitates":    ["helps", "supports", "enables"],
  "facilitated":    ["helped", "supported", "enabled"],
  "facilitating":   ["helping", "supporting", "enabling"],
  "leverage":       ["use", "draw on"],
  "leverages":      ["uses", "draws on"],
  "leveraged":      ["used", "drew on"],
  "leveraging":     ["using", "drawing on"],
  "implement":      ["apply", "use", "put in place"],
  "implements":     ["applies", "uses"],
  "implemented":    ["applied", "used", "put in place"],
  "implementing":   ["applying", "using"],
  "illustrate":     ["show", "reveal"],
  "illustrates":    ["shows", "reveals"],
  "illustrated":    ["showed", "revealed"],
  "illustrating":   ["showing", "revealing"],
  "emphasise":      ["stress", "note"],
  "emphasises":     ["stresses", "notes"],
  "emphasised":     ["stressed", "noted"],
  "emphasising":    ["stressing", "noting"],
  "emphasize":      ["stress", "note"],
  "emphasizes":     ["stresses", "notes"],
  "emphasized":     ["stressed", "noted"],
  "emphasizing":    ["stressing", "noting"],
  "enable":         ["allow", "let", "make possible"],
  "enables":        ["allows", "lets", "makes possible"],
  "enabled":        ["allowed", "let", "made possible"],
  "enabling":       ["allowing", "letting"],
  "achieve":        ["reach", "produce", "arrive at"],
  "achieves":       ["reaches", "produces"],
  "achieved":       ["reached", "produced"],
  "achieving":      ["reaching", "producing"],
  "represent":      ["constitute", "amount to", "stand as"],
  "represents":     ["constitutes", "amounts to"],
  "represented":    ["constituted", "amounted to"],
  "indicate":       ["show", "suggest", "point to"],
  "indicates":      ["shows", "suggests", "points to"],
  "indicated":      ["showed", "suggested", "pointed to"],
  "address":        ["tackle", "deal with"],
  "addresses":      ["tackles", "deals with"],
  "addressed":      ["tackled", "dealt with"],
  "addressing":     ["tackling", "dealing with"],
  "ensure":         ["make sure", "secure"],
  "ensures":        ["makes sure", "secures"],
  "ensured":        ["made sure", "secured"],
  "contribute":     ["add to", "help with"],
  "contributes":    ["adds to", "helps with"],
  "contributed":    ["added to", "helped with"],
  "contributing":   ["adding to", "helping with"],
  "consider":       ["look at", "weigh"],
  "considers":      ["looks at", "weighs"],
  "considered":     ["looked at", "weighed"],
  "explore":        ["look at", "study", "consider"],
  "explores":       ["looks at", "studies"],
  "explored":       ["looked at", "studied"],
  "exploring":      ["looking at", "studying"],
  "examine":        ["look at", "study"],
  "examines":       ["looks at", "studies"],
  "examined":       ["looked at", "studied"],
  "examining":      ["looking at", "studying"],
  "argue":          ["make the case", "hold", "contend"],
  "argues":         ["makes the case", "holds", "contends"],
  "argued":         ["put the case", "held", "contended"],
  "arguing":        ["making the case", "holding", "contending"],
  "suggest":        ["point to", "indicate"],
  "suggests":       ["points to", "indicates"],
  "suggested":      ["pointed to", "indicated"],
  "corroborate":    ["support", "back up", "reinforce"],
  "corroborates":   ["supports", "backs up", "reinforces"],
  "corroborated":   ["supported", "backed up", "reinforced"],
  "substantiate":   ["back up", "support", "lend weight to"],
  "substantiates":  ["backs up", "supports"],
  "substantiated":  ["backed up", "supported"],
  "delineate":      ["define", "outline", "set out"],
  "delineates":     ["defines", "outlines"],
  "delineated":     ["defined", "outlined"],
  "encompass":      ["cover", "include", "span"],
  "encompasses":    ["covers", "includes", "spans"],
  "encompassed":    ["covered", "included"],
  "encompassing":   ["covering", "including"],
  "underpin":       ["support", "ground"],
  "underpins":      ["supports", "grounds"],
  "underpinned":    ["supported", "grounded"],
  "underpinning":   ["supporting", "grounding"],
  "acknowledge":    ["accept", "admit", "note"],
  "acknowledges":   ["accepts", "admits", "notes"],
  "acknowledged":   ["accepted", "admitted", "noted"],

  // ── Adjectives ──
  "significant":    ["major", "substantial", "considerable"],
  "significantly":  ["considerably", "substantially"],
  "crucial":        ["key", "central", "important"],
  "fundamental":    ["basic", "core", "central"],
  "comprehensive":  ["full", "complete", "thorough"],
  "robust":         ["strong", "solid", "sound"],
  "innovative":     ["new", "novel"],
  "optimal":        ["best", "ideal"],
  "paramount":      ["most important", "key"],
  "pivotal":        ["key", "central"],
  "multifaceted":   ["complex", "varied"],
  "nuanced":        ["complex", "subtle"],
  "intricate":      ["complex", "detailed"],
  "prevalent":      ["common", "widespread"],
  "pertinent":      ["relevant", "applicable"],
  "notable":        ["important", "worth noting"],
  "remarkable":     ["striking", "unusual"],
  "salient":        ["key", "important"],
  "efficacious":    ["effective", "useful"],
  "commensurate":   ["in line with", "proportionate"],
  "predicated":     ["based", "dependent", "grounded"],
  "holistic":       ["whole", "overall", "broad"],
  "seminal":        ["key", "foundational", "landmark"],
  "critical":       ["key", "important", "essential"],
  "essential":      ["key", "necessary", "needed"],
  "imperative":     ["necessary", "needed", "vital"],
  "inherent":       ["built-in", "natural", "intrinsic"],
  "ubiquitous":     ["common", "widespread", "everywhere"],
  "unprecedented":  ["new", "unmatched", "without precedent"],
  "multitude":      ["many", "large number"],
  "plethora":       ["many", "abundance"],

  // ── Nouns ──
  "utilization":    ["use"],
  "utilisation":    ["use"],
  "implementation": ["use", "application", "adoption"],
  "facilitation":   ["support", "help"],
  "enhancement":    ["improvement"],
  "optimisation":   ["improvement"],
  "optimization":   ["improvement"],
  "paradigm":       ["model", "approach"],
  "synergy":        ["combined effect", "interaction"],
  "trajectory":     ["path", "direction", "course"],
  "proliferation":  ["spread", "growth"],
  "ramification":   ["consequence", "implication"],
  "notion":         ["idea", "view", "concept"],
  "realm":          ["field", "area", "domain"],
  "landscape":      ["field", "area", "picture"],
  "tapestry":       ["mix", "blend", "picture"],
  "interplay":      ["interaction", "relationship"],
};

// ─── SECONDARY WORDS FOR DATAMUSE LOOKUP ─────────────────────────────────────
// Words that are AI-flagged but less common — query Datamuse for synonyms.
const DATAMUSE_WORDS = [
  "exacerbate", "ameliorate", "promulgate", "coalesce", "perpetuate",
  "instantiate", "propagate", "circumvent", "mitigate", "culminate",
  "encapsulate", "epitomise", "epitomize", "manifest", "embody",
  "inherently", "invariably", "systematically", "predominantly",
];

// ─── REGEX PRE-CLEAN ──────────────────────────────────────────────────────────
// Applied before word swaps. Handles multi-word AI patterns.
// Order matters — more specific patterns first.
const CLEANUPS: Array<[RegExp, string]> = [
  // Transition openers at sentence/paragraph start — delete them
  [/(^|\.\s+)(Furthermore|Moreover|Additionally|In addition),\s+/gm,
    (_m, pre) => pre === "" || pre === "\n" ? "" : `${pre}`],
  // Mid-sentence furthermore etc.
  [/[;,]\s*(furthermore|moreover|additionally|in addition),?\s+/gi, ". "],
  // "It is important/worth noting that" — delete phrase, keep rest
  [/It is (?:important|worth) (?:noting|to note) that\s+/gi, ""],
  [/it is (?:important|worth) (?:noting|to note) that\s+/gi, ""],
  // "This demonstrates/highlights/underscores/illustrates/suggests" as opener
  [/\bThis demonstrates\b/g, "This shows"],
  [/\bThis highlights\b/g, "This points to"],
  [/\bThis underscores\b/g, "This stresses"],
  [/\bThis illustrates\b/g, "This shows"],
  [/\bThis suggests\b/g, "This points to"],
  // "plays a X role" → "is central"
  [/\bplays a (?:crucial|key|significant|central|major|important|vital|fundamental) role in\b/gi,
    "is central to"],
  [/\bplays a (?:crucial|key|significant|central|major|important|vital|fundamental) role\b/gi,
    "is central"],
  // "remains X to" closers
  [/\b(remains|remain) (?:essential|crucial|fundamental|vital|important) to\b/gi,
    "matters for"],
  // "a wide/broad range of" / "a variety of"
  [/\ba wide range of\b/gi, "many"],
  [/\ba broad range of\b/gi, "many"],
  [/\ba variety of\b/gi, "various"],
  [/\ba wide array of\b/gi, "many"],
  // "In today's world" / "In recent years" scene-setters
  [/In today'?s (?:rapidly changing |modern |)?world[,.]?\s*/gi, ""],
  [/In (?:recent years|the modern era|contemporary society|the digital age),?\s+/gi, ""],
  // "delve into"
  [/\bdelve into\b/gi, "look into"],
  [/\bdelves into\b/gi, "looks into"],
  [/\bdelved into\b/gi, "looked into"],
];

// ─── NUMBER HUMANISER ─────────────────────────────────────────────────────────
const NUMBER_WORDS: Record<number, string> = {
  1:"one",2:"two",3:"three",4:"four",5:"five",6:"six",7:"seven",8:"eight",
  9:"nine",10:"ten",11:"eleven",12:"twelve",13:"thirteen",14:"fourteen",
  15:"fifteen",16:"sixteen",17:"seventeen",18:"eighteen",19:"nineteen",
  20:"twenty",30:"thirty",40:"forty",50:"fifty",60:"sixty",70:"seventy",
  80:"eighty",90:"ninety",100:"one hundred",
};

function numToWords(n: number): string {
  if (NUMBER_WORDS[n]) return NUMBER_WORDS[n];
  if (n < 100) {
    const tens = Math.floor(n / 10) * 10;
    return `${NUMBER_WORDS[tens]}-${NUMBER_WORDS[n % 10]}`;
  }
  return String(n);
}

function humaniseNumbers(text: string): string {
  return text.replace(
    /\b(approximately|around|roughly|about)\s+(\d{1,3})\b/gi,
    (_m, _pre, num) => {
      const n = parseInt(num);
      if (n > 100) return `about ${num}`;
      return `about ${numToWords(n)}`;
    }
  );
}

// ─── UTILITIES ────────────────────────────────────────────────────────────────
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function preserveCase(original: string, replacement: string): string {
  if (original.length > 1 && original === original.toUpperCase()) {
    return replacement.toUpperCase();
  }
  if (original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function wordCount(s: string): number {
  return (s || "").trim().split(/\s+/).filter(Boolean).length;
}

// ─── MASK/UNMASK PROTECTED REGIONS ────────────────────────────────────────────
// Protects citations, quotes, and code blocks from word swapping.
interface MaskResult { text: string; slots: string[] }

function mask(text: string): MaskResult {
  const slots: string[] = [];
  let t = text;
  // Fenced code blocks
  t = t.replace(/```[\s\S]*?```/g, (m) => { slots.push(m); return `\x00${slots.length - 1}\x00`; });
  // Inline code
  t = t.replace(/`[^`]+`/g, (m) => { slots.push(m); return `\x00${slots.length - 1}\x00`; });
  // Citations: (Author et al., YYYY) or (Author, YYYY) — up to 80 chars
  t = t.replace(/\([^)]{2,80}\d{4}[^)]{0,20}\)/g, (m) => { slots.push(m); return `\x00${slots.length - 1}\x00`; });
  // Direct quotes (preserve exact wording)
  t = t.replace(/"[^"]{4,300}"/g, (m) => { slots.push(m); return `\x00${slots.length - 1}\x00`; });
  return { text: t, slots };
}

function unmask(text: string, slots: string[]): string {
  return text.replace(/\x00(\d+)\x00/g, (_m, i) => slots[parseInt(i)] ?? "");
}

// ─── APPLY TIER 1 SWAPS ───────────────────────────────────────────────────────
function applyTier1(text: string): string {
  // Sort keys longest-first to avoid partial-word collisions
  const keys = Object.keys(TIER1).sort((a, b) => b.length - a.length);
  let result = text;
  for (const key of keys) {
    const alts = TIER1[key];
    const esc = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // \b works for most cases; use negative lookbehind/ahead for edge cases
    const re = new RegExp(`(?<![a-zA-Z'-])${esc}(?![a-zA-Z'-])`, "gi");
    result = result.replace(re, (m) => preserveCase(m, pickRandom(alts)));
  }
  return result;
}

// ─── APPLY REGEX CLEANUPS ─────────────────────────────────────────────────────
function applyCleanups(text: string): string {
  let t = text;
  for (const [pattern, replacement] of CLEANUPS) {
    if (typeof replacement === "string") {
      t = t.replace(pattern, replacement);
    } else {
      t = t.replace(pattern, replacement as any);
    }
  }
  // Clean up any double-spaces or leading spaces on lines created by deletions
  t = t.replace(/  +/g, " ");
  t = t.replace(/^ /gm, "");
  return t;
}

// ─── DATAMUSE API ─────────────────────────────────────────────────────────────
// For secondary AI words: find synonyms with lower frequency than original.
// Frequency from Datamuse is in the "f:N" tag — lower N = less common = better.

interface DatamuseWord { word: string; score?: number; tags?: string[] }

function extractFreq(entry: DatamuseWord): number {
  const tag = (entry.tags || []).find(t => t.startsWith("f:"));
  return tag ? parseFloat(tag.slice(2)) : 0;
}

async function datamuse(word: string, signal: AbortSignal): Promise<string | null> {
  try {
    const url = `https://api.datamuse.com/words?rel_syn=${encodeURIComponent(word)}&md=f&max=15`;
    const resp = await fetch(url, { signal });
    if (!resp.ok) return null;
    const data: DatamuseWord[] = await resp.json();

    // Get frequency of original word
    const origUrl = `https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=f&max=1`;
    const origResp = await fetch(origUrl, { signal });
    const origData: DatamuseWord[] = origResp.ok ? await origResp.json() : [];
    const origFreq = origData[0] ? extractFreq(origData[0]) : 999999;

    // Find synonyms with lower frequency (less common = less AI-detectable)
    // and filter to academic-appropriate: letters only, length > 3
    const INFORMAL = new Set(["folk","gent","kid","buddy","guy","cool","nice","great",
      "good","bad","thing","stuff","bit","lot","way","make"]);
    const candidates = data
      .filter(d => /^[a-z]+$/.test(d.word) && d.word.length > 3 && !INFORMAL.has(d.word))
      .filter(d => extractFreq(d) < origFreq)
      .sort((a, b) => extractFreq(b) - extractFreq(a)); // prefer moderately common, not obscure

    return candidates[0]?.word ?? null;
  } catch {
    return null;
  }
}

async function applyDatamuse(text: string, signal: AbortSignal): Promise<string> {
  // Only query for words that actually appear in the text
  const present = DATAMUSE_WORDS.filter(w => {
    const re = new RegExp(`\\b${w}\\b`, "i");
    return re.test(text);
  });
  if (present.length === 0) return text;

  // Run all Datamuse queries in parallel (< 2s with 3s per-query timeout)
  const results = await Promise.all(
    present.map(async (word) => {
      const wordSignal = AbortSignal.any
        ? AbortSignal.any([signal, AbortSignal.timeout(3000)])
        : signal;
      const synonym = await datamuse(word, wordSignal);
      return { word, synonym };
    })
  );

  let t = text;
  for (const { word, synonym } of results) {
    if (!synonym) continue;
    const esc = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<![a-zA-Z'-])${esc}(?![a-zA-Z'-])`, "gi");
    t = t.replace(re, (m) => preserveCase(m, synonym));
  }
  return t;
}

// ─── MAIN HUMANISE FUNCTION ───────────────────────────────────────────────────
async function humaniseText(text: string, signal: AbortSignal): Promise<string> {
  const { text: masked, slots } = mask(text);

  // 1. Regex pre-clean (transitions, banned phrases)
  let result = applyCleanups(masked);

  // 2. Tier 1 word swaps (curated table)
  result = applyTier1(result);

  // 3. Datamuse synonyms for secondary AI words
  result = await applyDatamuse(result, signal);

  // 4. Number humanisation
  result = humaniseNumbers(result);

  // Unmask protected regions
  result = unmask(result, slots);

  return result;
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────
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

      console.log(`[czar-humanise v8] start: ${original_words} words, word-swap engine`);
      send("pipeline_start", { stages: 1, provider: "word-swap", original_words, version: "v8" });
      send("stage_start", { stage: 1, label: "Rewriting word choices" });

      try {
        const humanised = await humaniseText(text, upstreamSignal);
        const final_words = wordCount(humanised);
        send("stage_done", { stage: 1, label: "Rewriting word choices", words: final_words });
        send("done", {
          humanised,
          stages_completed: 1,
          original_words,
          final_words,
          provider: "word-swap+datamuse",
          version: "v8",
        });
      } catch (e: any) {
        const msg = e?.message || String(e);
        if (!msg.includes("abort") && !msg.includes("cancel")) {
          console.error("[czar-humanise v8] error:", msg);
        }
        // Fall back: return original text as "humanised" so client can still apply
        send("done", {
          humanised: text,
          stages_completed: 0,
          original_words,
          final_words: original_words,
          provider: "word-swap+datamuse",
          version: "v8",
          error: msg.slice(0, 200),
        });
      } finally {
        try { controller.close(); } catch { /* already closed */ }
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
