---
name: Outline Suggestions
description: Standard headings are SUGGESTED defaults (not locked); users have full freedom to rename, reorder, deselect, remove, or add any headings — the AI follows the user's confirmed outline verbatim
type: feature
---
The chapter outline modal pre-fills standard canonical headings as **suggested defaults** (`src/lib/chapterSchema.ts`), but the user has **complete control**: they may rename, reorder, deselect, remove, or add any heading. Nothing in the outline modal is locked.

**Defaults provided (editable):**
- Standard main headings for Ch 1–5 (e.g. "Background to the Study", "Empirical Review", "Research Design")
- Standard numbering (1.1, 1.2, 2.4, 3.7, etc.)
- Standard order
- Filtered by degree level (UG / Masters / PhD) and methodology (Quantitative / Qualitative / Mixed)

**User has full authority to:**
- Rename any heading inline
- Drag to reorder
- Uncheck to exclude
- Click trash to remove
- Add custom headings
- Add optional standard sections from the bank

**AI behaviour (Default + Natural modes):** the writing engine uses the user's confirmed outline as the structural contract — heading names, numbering, and order are taken verbatim from what the user submits. The AI may add sub-subheadings (e.g. 2.4.1, 2.4.2) inside any section but never renames, reorders, merges, splits, or omits user-confirmed headings.

**Optional sections bank** (`OPTIONAL_SECTIONS_BANK` in `src/lib/chapterSchema.ts`) provides a curated academic vocabulary users can add with one click — e.g. "Policy and Regulatory Context", "Triangulation Strategy", "Sensitivity and Robustness Checks", "Policy Implications".

**Suggested visuals** (figures + tables) are AI-generated per study using a `variationSeed` so two requests for the same chapter never return the same set.
