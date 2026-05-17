---
name: AI Writing Models (tier-gated)
description: Final per-tier model lineup; Qwen removed; Claude Opus is Ch4-only on Masters/PhD; Sonnet 4.6 is Ch4-only on Undergraduate
type: feature
---

Per-tier writing model access:

- **Free**: Gemini 2.5 Flash only.
- **Undergraduate**: Gemini 2.5 Flash, Gemini 3 Flash, GPT-5.2, + Claude Sonnet 4.6 (UNLOCKED ONLY ON CHAPTER 4 / data analysis).
- **Masters**: Gemini 3 Pro, GPT-5.2, GPT-5 Flagship, Claude Sonnet 4.6 (adaptive thinking), + Claude Opus 4 with adaptive thinking (UNLOCKED ONLY ON CHAPTER 4).
- **PhD / Custom**: All Masters models + Claude Opus 4.6 with adaptive thinking (UNLOCKED ONLY ON CHAPTER 4).

Qwen 3.6 Plus has been removed from the lineup.

Model IDs (frontend → gateway):
- `gemini-2.5-flash` → `google/gemini-2.5-flash`
- `gemini-3-flash` → `google/gemini-3-flash-preview`
- `gemini-3-pro` → `google/gemini-3.1-pro-preview`
- `gpt-5.2` → `openai/gpt-5.2`
- `gpt-5-flagship` → `openai/gpt-5`
- `claude-sonnet-4-6` → `claude-sonnet-4-5`
- `claude-opus-4` → `claude-opus-4-1`
- `claude-opus-4-6` → `claude-opus-4-5`

Ch4-only locks are enforced both in `getModelsForTier(tier, chapterType)` (frontend picker) and via tier checks in `generate-chapter`. Reasoning helper functions still default to Claude Sonnet 4.6 for ALL tiers.
