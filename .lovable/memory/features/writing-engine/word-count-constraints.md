---
name: PaperStudio strict word-count contract
description: Chapter and per-section word budgets are BINDING (±3% chapter, ±10% per heading) with a running ledger, explicit ceilings, AND a mandatory section-by-section trim — each section is reconciled to its budget BEFORE the next section starts.
type: feature
---

PaperStudio's `generate-chapter` AND CZAR's `czar-write` (via the Updates v6 system prompt) enforce a STRICT word-count contract across the whole chapter, at the per-heading level, AND at the per-section trim boundary.

**Section-by-section trim (mandatory, applies to BOTH engines):**
After completing each section, the model counts the words it just wrote. If the section is over its ±10% window OR if the cumulative ledger has drifted above the threshold, the model MUST tighten THAT section in place — remove repetition, compress sentences, drop weak qualifiers, merge adjacent points — until both the section AND the ledger are back in range, BEFORE writing the next section. No carrying overflow forward. No "trim later" promises. Trim now, then continue. Encoded in:
- `supabase/functions/_shared/paperstudio-prompt.ts` Phase 4 (CZAR + PaperStudio shared)
- `supabase/functions/generate-chapter/index.ts` per-chapter contract block

**Chapter level (body content, References excluded):**
- Floor: `target_words * 0.97`
- Ceiling: `target_words * 1.03`
- Going below floor OR above ceiling = CRITICAL FAILURE.

**Per-heading level:**
- Each entry in `draftConfig.headings` carries a `target_words`. The prompt renders these as `STRICT {target*0.9}–{target*1.1} words (target N)`.
- When a section reaches its upper bound the model MUST move on, even with more to say.

**Running ledger:**
- After section 1 of N: spent ≤ `target/N * 1.05` words
- After section k of N: spent ≤ `k * target/N * 1.10` words
- Final section: lands within ±3% of `target_words`

**Token budget (Claude Sonnet 4.5):**
- `_shared/anthropic.ts` accepts a `thinkingBudget` option (default 8000, can be shrunk to 4000 for short chapters).
- `generate-chapter` computes `maxTokens = Math.min(64000, thinkBudget + ceil(target_words * 1.5 * 1.3) + 2000)`.
- Anthropic's hard ceiling is 64k max_tokens; never exceeded.

**Continuation passes** receive a tightened user-message contract (adds EXACTLY `remainingWords` more body words ±5%, every required heading not yet present MUST appear). Auto-continue chains up to 3 passes.

**Figure backfill:** When a chapter finalises, `Writer.tsx` sweeps the final content for `<!-- FIGURE:N:title:desc -->` markers and fires `generate-images` for any not yet rendered.
