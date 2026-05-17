// Map-reduce summarisation for oversized documents.
// Used by czar-ingest-files and generate-chapter so a 300-page PDF still gives the
// model semantic access to the WHOLE document, not just the first 60k chars.
//
// Strategy:
//  1. Keep HEAD (first ~4k words) verbatim — opening + framing matters most.
//  2. Keep TAIL (last ~1k words) verbatim — conclusions, refs, sign-off.
//  3. Chunk the MIDDLE into ~8k-word slices with 400-word overlap.
//  4. Summarise each chunk in parallel (batches of 4) via Gemini Flash.
//  5. Stitch [HEAD] + [summarised middle] + [TAIL] with a clear banner so the
//     downstream model knows it's reading a faithful summary, not raw text.

const SUMMARY_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const SUMMARY_MODEL = "google/gemini-2.5-flash";

export interface MapReduceOptions {
  /** Words above which the map-reduce path triggers. */
  largeDocThreshold?: number;
  /** Words per middle chunk. */
  chunkWords?: number;
  /** Word overlap between chunks (preserves cross-chunk context). */
  chunkOverlap?: number;
  /** Hard cap on chunks — protects against runaway docs. */
  maxChunks?: number;
  /** Words kept verbatim from the start of the doc. */
  headVerbatim?: number;
  /** Words kept verbatim from the end of the doc. */
  tailVerbatim?: number;
  /** Concurrent summary calls. */
  batchSize?: number;
  /** Per-chunk summary call timeout (ms). */
  perChunkTimeoutMs?: number;
  /** Total budget for the entire summarisation pass (ms). */
  totalBudgetMs?: number;
  /** API key for the Lovable AI gateway. */
  apiKey: string;
  /** Optional label for log lines. */
  label?: string;
}

export interface MapReduceResult {
  text: string;
  wasSummarized: boolean;
  originalWords: number;
  finalWords: number;
  chunkCount: number;
  chunksSummarized: number;
  chunksFallback: number;
}

const DEFAULTS = {
  largeDocThreshold: 12_000,
  chunkWords: 8_000,
  chunkOverlap: 400,
  maxChunks: 25,
  headVerbatim: 4_000,
  tailVerbatim: 1_000,
  batchSize: 4,
  perChunkTimeoutMs: 20_000,
  totalBudgetMs: 90_000,
};

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label}: timed out after ${Math.round(ms / 1000)}s`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

function splitWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function joinWords(words: string[], from: number, to: number): string {
  return words.slice(from, to).join(" ");
}

function headTailFallback(words: string[], headWords: number, tailWords: number): string {
  const head = joinWords(words, 0, headWords);
  const tail = joinWords(words, Math.max(headWords, words.length - tailWords), words.length);
  return `${head}\n\n[…middle ${words.length - headWords - tailWords} words omitted — summariser unavailable…]\n\n${tail}`;
}

async function summariseChunk(
  chunk: string,
  index: number,
  total: number,
  apiKey: string,
  timeoutMs: number,
): Promise<string> {
  const sys = `You are summarising chunk ${index} of ${total} from a long academic or business document.

PRESERVE EVERY: numerical figure, percentage, monetary amount, date, proper noun, citation (Author, Year), formula, equation, table heading, column header, direct quote, section heading, and named concept.

DROP ONLY: pure repetition, filler ("it is important to note"), and rhetorical padding.

Output 300-500 words of flowing paragraphs (NOT bullet lists). Begin with the literal marker [Chunk ${index}/${total}] followed by a 4-8 word section descriptor in square brackets if you can infer one (e.g. "[Chunk 5/18 — Methodology]"), then the summary.

Do not add disclaimers, meta-commentary, or "Here is the summary". Output the summary directly.`;

  const res = await withTimeout(
    fetch(SUMMARY_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: SUMMARY_MODEL,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: chunk },
        ],
      }),
    }),
    timeoutMs,
    `summariseChunk[${index}/${total}]`,
  );

  if (!res.ok) {
    throw new Error(`gateway ${res.status}`);
  }
  const data = await res.json();
  const out = data?.choices?.[0]?.message?.content;
  if (!out || typeof out !== "string") throw new Error("empty summary response");
  return out.trim();
}

export async function summariseLargeText(
  rawText: string,
  opts: MapReduceOptions,
): Promise<MapReduceResult> {
  const o = { ...DEFAULTS, ...opts };
  const label = opts.label ?? "doc";
  const words = splitWords(rawText);
  const wc = words.length;

  // Small doc — pass through unchanged.
  if (wc <= o.largeDocThreshold) {
    return {
      text: rawText,
      wasSummarized: false,
      originalWords: wc,
      finalWords: wc,
      chunkCount: 0,
      chunksSummarized: 0,
      chunksFallback: 0,
    };
  }

  console.log(`[summariseLargeText:${label}] ${wc} words → map-reduce`);

  const head = joinWords(words, 0, o.headVerbatim);
  const tailStart = Math.max(o.headVerbatim, wc - o.tailVerbatim);
  const tail = joinWords(words, tailStart, wc);

  // Build middle chunks with overlap.
  const middleStart = o.headVerbatim;
  const middleEnd = tailStart;
  const chunks: string[] = [];
  if (middleEnd > middleStart) {
    const stride = Math.max(1, o.chunkWords - o.chunkOverlap);
    for (let pos = middleStart; pos < middleEnd; pos += stride) {
      const sliceEnd = Math.min(middleEnd, pos + o.chunkWords);
      chunks.push(joinWords(words, pos, sliceEnd));
      if (chunks.length >= o.maxChunks) break;
      if (sliceEnd >= middleEnd) break;
    }
  }

  // Summarise in parallel batches with shared deadline.
  const startedAt = Date.now();
  const summaries: (string | { fallback: true; words: string })[] = new Array(chunks.length);
  let summarisedCount = 0;
  let fallbackCount = 0;

  for (let i = 0; i < chunks.length; i += o.batchSize) {
    const elapsed = Date.now() - startedAt;
    if (elapsed > o.totalBudgetMs) {
      // Budget exhausted — mark every remaining chunk as fallback.
      for (let j = i; j < chunks.length; j++) {
        const wcChunk = splitWords(chunks[j]).length;
        summaries[j] = { fallback: true, words: `[Chunk ${j + 1}/${chunks.length} — not summarised, budget exhausted; ${wcChunk} words skipped]` };
        fallbackCount++;
      }
      break;
    }

    const batch = chunks.slice(i, i + o.batchSize);
    const settled = await Promise.allSettled(
      batch.map((c, k) => summariseChunk(c, i + k + 1, chunks.length, o.apiKey, o.perChunkTimeoutMs)),
    );
    settled.forEach((res, k) => {
      const idx = i + k;
      if (res.status === "fulfilled") {
        summaries[idx] = res.value;
        summarisedCount++;
      } else {
        console.warn(`[summariseLargeText:${label}] chunk ${idx + 1} failed:`, (res.reason as Error)?.message ?? res.reason);
        // Per-chunk fallback: keep first 800 words verbatim from this chunk so the model still sees raw signal.
        const fallbackText = splitWords(batch[k]).slice(0, 800).join(" ");
        summaries[idx] = { fallback: true, words: `[Chunk ${idx + 1}/${chunks.length} — summary failed, raw excerpt follows]\n${fallbackText}` };
        fallbackCount++;
      }
    });
  }

  const middleStitched = summaries
    .map((s) => (typeof s === "string" ? s : s.words))
    .join("\n\n");

  const banner = `[FULL DOCUMENT SUMMARY — original ~${wc.toLocaleString()} words across ${chunks.length} chunk(s). HEAD and TAIL are verbatim; MIDDLE is faithful summary preserving all facts, figures, names, citations, and quotes. ${summarisedCount}/${chunks.length} chunks AI-summarised, ${fallbackCount} fallback.]`;

  const stitched = `${banner}\n\n=== HEAD (verbatim, first ${o.headVerbatim.toLocaleString()} words) ===\n${head}\n\n=== MIDDLE (${chunks.length} chunk(s), summarised) ===\n${middleStitched}\n\n=== TAIL (verbatim, last ${o.tailVerbatim.toLocaleString()} words) ===\n${tail}`;

  // Last-resort safety: if the summariser totally failed (every chunk fallback AND
  // they're all "budget exhausted" placeholders), fall back to a head+tail-only doc
  // so we still hand the writer something useful instead of placeholder noise.
  if (summarisedCount === 0 && chunks.length > 0) {
    console.warn(`[summariseLargeText:${label}] no chunks summarised — falling back to head+tail`);
    const fallback = headTailFallback(words, o.headVerbatim, o.tailVerbatim);
    return {
      text: fallback,
      wasSummarized: false,
      originalWords: wc,
      finalWords: splitWords(fallback).length,
      chunkCount: chunks.length,
      chunksSummarized: 0,
      chunksFallback: chunks.length,
    };
  }

  return {
    text: stitched,
    wasSummarized: true,
    originalWords: wc,
    finalWords: splitWords(stitched).length,
    chunkCount: chunks.length,
    chunksSummarized: summarisedCount,
    chunksFallback: fallbackCount,
  };
}
