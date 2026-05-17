---
name: Polish Pass + Export Plumbing Fixes
description: Phase 3 Tracks A & C — duplicate-heading kill, citation/year repair, HTML-table scrub, figure persistence (chapter_figures table), polish-chapter edge function, abstract+keywords arc, definition-list rule, table/figure interpretation rule
type: feature
---

Phase 3 fixes the visible defects in exported chapters and persists figures so they survive into the final document.

**Plumbing (Track A):**
- `generate-chapter` prompt now forbids opening with a `# Chapter N` heading and forbids HTML tables (`<table>`, `<tr>`, `<td>`) — Markdown pipe syntax only.
- New `polish-chapter` edge function runs after the stream completes (first-pass only, not continuations). Deterministic regex-only cleanup:
  - Strips leading `# Chapter N` / `# Ch N` headings
  - Dedupes adjacent headings with the same title text within 3 lines
  - Repairs citation name bleed (`Brooks (Brooks & Kim, 2020)` → `(Brooks & Kim, 2020)`, `Sweeney Sweeney & Soutar` → `Sweeney & Soutar`, `Birtwistle istle & Moore` → `Birtwistle & Moore`)
  - Repairs 3-digit truncated years (`220` → `2020`)
  - Converts any leaked HTML tables into Markdown
  - Flags orphan tables/figures (visual immediately followed by heading) with `<!-- POLISH:ORPHAN_VISUAL -->` comment
- `streamChat.ts` calls `polish-chapter` and passes the polished content via `onDone(polishedContent)`. Writer.tsx and ProjectView.tsx onDone callbacks accept it and overwrite `fullContent` before saving.

**Figure persistence (A2):**
- New `chapter_figures` DB table `(chapter_id, user_id, figure_id, figure_number, title, description, source_line, image_data_uri)` with RLS by `auth.uid() = user_id`.
- When an inline figure resolves in Writer.tsx, the data URI is upserted to `chapter_figures` so the export pipeline can read and embed the actual image. Without this, generated PNGs lived only in React state and never reached the .docx.

**Craft rules added (Track B partial):**
- **Table/Figure interpretation** — every Markdown table and every `<!-- FIGURE: -->` marker must be followed by an interpretive paragraph ≥ 60 words that reads the visual.
- **Definition-list format** — Operational Definition of Terms / Glossary sections produce 5–8 entries each as `**Term:** definition (Author, Year).` instead of empty heading + orphan definitions.
- **Abstract** — rewritten as a strict five-move arc (Background → Aim → Method → Findings → Contribution) with a mandatory `**Keywords:** k1; k2; k3; k4; k5` line when `includeKeywords` is on.

**Still pending (next iteration):**
- B1/B2/B3 in `export-docx`: preliminary pages (Declaration, Acknowledgements, Dedication, Abbreviations), real Word `TableOfContents` field, Roman/Arabic split page numbering, List of Figures/Tables, and embedding `chapter_figures` images via `ImageRun`. Reference list dedupe by `surname+year+title` fingerprint.
