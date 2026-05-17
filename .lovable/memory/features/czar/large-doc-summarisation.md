---
name: Large-document map-reduce summarisation
description: How CZAR ingest and chapter generation handle 12k+ word uploads via head + summarised middle + tail stitching, so 300-page PDFs stay fully in semantic context.
type: feature
---
Shared helper: `supabase/functions/_shared/summarize-large-text.ts` (`summariseLargeText`).

Trigger: any extracted text > 12,000 words (~75k chars).

Pipeline:
1. Keep first 4,000 words verbatim (HEAD).
2. Keep last 1,000 words verbatim (TAIL).
3. Split the middle into 8,000-word chunks with 400-word overlap (max 25 chunks ≈ 200k words / ~600 pages).
4. Summarise each chunk in parallel batches of 4 via Gemini 2.5 Flash. Per-chunk timeout 20s, total budget 90s (180s for admin).
5. Each summary preserves every figure, date, proper noun, citation, formula, table heading, quote. 300-500 words, flowing paragraphs.
6. Stitch `[FULL DOCUMENT SUMMARY banner] + HEAD + MIDDLE summaries + TAIL`.

Resilience:
- Per-chunk failure → keep first 800 words of that chunk verbatim as fallback.
- Budget exhausted mid-run → mark remaining chunks as `[not summarised — budget exhausted]`.
- Total summariser failure (0 chunks succeeded) → fall back to head+tail-only doc.

Wired into:
- `czar-ingest-files`: each oversized file gets map-reduced. `IngestResult` returns `was_summarized`, `summary_chunks`, `original_words`.
- `generate-chapter`: `draftConfig.uploaded_data` is map-reduced before `buildSystemPrompt` runs. Inline cap raised 80k → 400k chars.

Downstream knock-ons:
- `czar-orchestrate` excerpt cap raised 200k → 400k chars so summaries fit.
- `Czar.tsx` persists 200k chars per file (was 80k) and renders attachment block with `full-doc summary of N words across M chunks` tag.
- `CzarAttachmentCard` shows green "Full doc summarised" chip with hover tooltip when `was_summarized`.

Admin (`grey.izilein@gmail.com`) gets extended budgets: 220s ingest total, 200s per file, 180s map-reduce per doc.
