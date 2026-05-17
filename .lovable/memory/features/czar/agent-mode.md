---
name: CZAR Agent mode (autonomous, full authoring rights)
description: Agent runs with or without a brief, auto-picks Claude Sonnet 4.6 / Opus 4.6 by complexity (sticky user selection still wins), uses tables + images + tools freely. No tier or word-quota changes.
type: feature
---

CZAR Agent mode is the "best-version-of-CZAR" autonomous path. Defined in
`supabase/functions/czar-chat/index.ts` (edge function `czar-chat`).

**Triggers regardless of brief shape.** A one-line prompt, a multi-page brief,
or a bare file drop with no message all run end-to-end. Agent never asks
clarifying questions; it states assumptions in one short opening line and
proceeds.

**Per-turn auto-router (Agent only, sticky user selection wins).**
When `mode === "agent"` AND no `settings.model_id` override is set, a pure
heuristic classifies complexity:

- `high` → `claude-opus-4-7` + thinking ON + tools ON
  (long brief > 1.2k chars OR ≥ 5k requested words OR `dissertation/thesis/...`
  OR ≥ 3 files OR > 1.5 MB attachments OR data/math/synthesis hints with > 400
  char prompt).
- `low` → `claude-sonnet-4-6` + thinking OFF + tools ON
  (short, no files, no complex hints).
- `medium` (default) → `claude-sonnet-4-6` + thinking ON + tools ON.

Opus 4.6 and Gemini 3 Pro stay **system-only** — never added to the user
picker. The user's sticky model selection (Sonnet / GPT-5.2 / Qwen) always
overrides the auto-router.

**System prompt grants full authoring rights:**
- Render tabular data as Markdown tables, never describe a table in prose.
- Use `generate_image` freely for charts, diagrams, figures, mock-ups, photos.
- Use `web_search` + `cite_check` for any factual / time-sensitive claim.
- Skip preamble, closings, meta-commentary; begin with the first real sentence.
- Match the implicit ambition of the topic when the brief is short.

**Tool round budget bumped to 8** (was 5) so multi-figure deliverables aren't
truncated.

**Word counts, tier gates, billing — UNCHANGED.** Agent runs still respect
the existing word-quota gate (build/agent gating at the top of the SSE flow)
and still deduct words post-stream for non-admin users. Admin bypass intact.

**Critical bug fixed (2026-05-04):** Anthropic emits thinking-block
signatures via separate `signature_delta` SSE events. The old
`streamAnthropicAgentic` ignored them, so when round-tripping the assistant
turn (thinking + tool_use blocks) for tool results, Anthropic returned
`400 — Invalid signature in thinking block` and the agent run died on the
first tool call. Fix: capture `signature_delta`, store on the block, and
drop unsigned thinking blocks from the replayed assistant turn (Anthropic
accepts assistant turns without thinking, but rejects ones with invalid
signatures).
