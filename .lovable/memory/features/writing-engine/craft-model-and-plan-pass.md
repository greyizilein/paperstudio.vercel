---
name: Craft Model & Plan-Pass Engine
description: Phase 2 writing engine — craft model paragraph structure, contrast engine, sentence rhythm, bridge sentences, quality exemplars, and Natural-mode two-pass (plan → write)
type: feature
---

The writing engine produces dissertation prose that argues rather than reports. Every paragraph follows a four-move structure (Claim → Evidence chain → Counterpoint/hinge → Interpretive landing). The engine uses:

- **Craft model + worked example** — `getCraftModel()` in `writerIdentity.ts` shows a publication-grade Okrika paragraph with each move labelled, plus a "report-voice" anti-example.
- **Contrast engine** — every paragraph must contain a rhetorical hinge (however / yet / what was once… / this complicates / the divergence is instructive). This is what turns evidence into argument.
- **Sentence rhythm rule** — no three consecutive sentences within 5 words of each other in length; long analytical sentence followed by short declaration is the target cadence.
- **Bridge sentences** — every section except the first opens with a bridge from the previous section; every section except the last closes by signalling the next.
- **Statistics serve argument** — old "minimum N statistics" hard rule REMOVED. Numbers now appear only where they sharpen a claim or reveal a tension. Findings chapter retains dense numerical reporting because that IS its content.
- **Quality exemplars** — `qualityExemplars.ts` injects two short Okrika-style paragraphs (Background / Lit Review / Methodology) into the prompt as register anchors. Three short exemplars do more than fifty lines of rules.

**Natural mode is two-pass:**
1. **Plan pass** — `plan-chapter-section` edge function calls Gemini 2.5 Pro with `response_format: json_object` to produce a per-section argument scaffold `{id, heading, claim, evidence[], counterpoint, landing}`. Soft-fails to null on error so write-pass still runs.
2. **Write pass** — `generate-chapter` receives the scaffold via `chapterPlan` field and injects it into the system prompt under "## ARGUMENT ARC FOR THIS CHAPTER — EXECUTE IT". The model writes prose that delivers the scaffold but never prints it.

`streamChat.ts` orchestrates both passes (only on first-pass generation, not on continuations). Default mode skips planning. Temperature: 0.85 for natural, 0.6 for default.

Banned-phrase wall is softened in Natural mode (`getNaturalModeBannedPhraseOverride`) — only the most egregious AI-isms are forbidden. Default mode keeps the full list.
