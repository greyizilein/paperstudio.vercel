---
name: Preliminary Pages & Final Export Structure
description: Final-export .docx pipeline composes title page, declaration, acknowledgements, abstract, dedication, abbreviations, real Word TOC, list of figures, list of tables, body, references, appendices — with Roman numerals on prelims and Arabic on body
type: feature
---

The Final Export pipeline (`export-docx` edge function, `isFinalExport: true`) composes the document in three docx sections so page numbering follows academic convention:

1. **Section 1 — Title page**: no visible page number, lowercase Roman numeral format (counts as i).
2. **Section 2 — Preliminary pages**: lowercase Roman numerals (i, ii, iii…). Order: Declaration (auto-generated from full name + project title + date) → Acknowledgements (optional) → Dedication (optional, centered) → Abstract chapters → List of Abbreviations (optional) → Table of Contents (real `TableOfContents` field, hyperlink + heading style range 1-3, auto-paginates on Word open) → List of Figures (auto-built from `<!-- FIGURE: -->` markers) → List of Tables (auto-built from `**Table X.Y: caption**` patterns).
3. **Section 3 — Main body**: Arabic numerals restarted at 1. Order: chapters → consolidated alphabetised references (deduped via surname+year+title fingerprint, hanging indent) → appendices.

Inline figures: chapters embed `<!-- FIGURE: id | Figure 2.1 | Title | description -->` markers. The export fetches `chapter_figures` rows by chapter_id (service-role client), decodes the base64 data URI, and embeds via `ImageRun` with caption beneath. Missing figures fall back to a bordered `[Figure 2.1: Title]` placeholder.

Optional fields collected in `FinalExport.tsx`: `acknowledgements`, `dedication`, `abbreviations` (textareas — empty values cause the section to be skipped entirely).

Any leading `# Chapter N` heading the model emits is stripped before rendering, so chapter titles are not duplicated. Polish-pass marker comments (`<!-- POLISH:... -->`) are also filtered out at render time.
