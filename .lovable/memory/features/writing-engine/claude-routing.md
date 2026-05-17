---
name: Claude reasoning routing
description: Claude Sonnet 4.6 is used for ALL reasoning tasks across the app for EVERY tier (incl. free); thinking is gated to Masters/PhD/Custom/Admin
type: feature
---

Reasoning is **universal** — every tier (including free) routes to Claude Sonnet 4.6 for reasoning-heavy edge functions. Thinking (Claude extended-reasoning tokens) stays tier-gated. Only **writing** functions remain tier-gated for the model itself.

**Claude-routed reasoning surfaces (ALL tiers):**
- `generate-chapter` — chapter writing (streamed) — *writing path is tier-gated, but reasoning helper is universal*
- `czar-write` — CZAR responses (streamed) — *writing path is tier-gated*
- `czar-orchestrate` — sub-second JSON intent router (Claude, no thinking)
- `czar-plan` — execution scaffold planner (Claude + thinking for paid/admin)
- `plan-chapter-section` — chapter argument arc (non-streaming JSON)
- `critique-chapter` — examiner critique (non-streaming)
- `generate-objectives` — objectives, questions, hypotheses, theorists (non-streaming JSON)
- `generate-outline-suggestions` — study-specific visuals (non-streaming JSON, headings stay deterministic)

**Stays on Gemini intentionally:**
- `polish-chapter` — deterministic regex-style cleanup
- `parse-supervisor-feedback` — structured extraction

**Routing matrix:**

| Tier           | Reasoning model      | Thinking |
|----------------|----------------------|----------|
| Free           | Claude Sonnet 4.6    | off      |
| Undergraduate  | Claude Sonnet 4.6    | off      |
| Masters        | Claude Sonnet 4.6    | **on**   |
| PhD / Custom   | Claude Sonnet 4.6    | **on**   |
| Admin          | Claude Sonnet 4.6    | **on**   |

**Implementation:** Each function calls `resolveTier(req)` from `_shared/resolve-tier.ts`. `shouldUseClaude(t)` now always returns `true` — Claude is the default reasoning provider for everyone. `shouldUseThinking(t)` gates extended thinking to Masters/PhD/Custom/Admin. On Anthropic rate-limit (429/529) or any Claude failure, each function falls back to its original Gemini call so the request always completes.

**JSON-from-text fallback:** Anthropic doesn't support OpenAI-style tool calling, so reasoning functions that need structured JSON ask Claude for plain JSON in the system prompt and use shared `extractJson()` / `callAnthropicJson()` helpers in `_shared/anthropic.ts` to parse fenced or prose-wrapped responses.

**Why universal:** Lovable AI Gateway credits are exhausted from time to time; Anthropic credits are healthy. Defaulting reasoning to Claude makes the app resilient and gives free users a stronger baseline. The cost gating happens through (a) Gemini for actual *writing* on free/UG tiers, and (b) thinking-off on free/UG tiers for reasoning.

**Active Model chip:** The Writer empty-state shows a small pill displaying the active model and whether thinking is on (e.g. "Claude Sonnet 4.6 · Thinking ON"), so users can verify the picker is being honoured.
