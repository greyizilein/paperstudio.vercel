# CZAR Architectural Audit Report
## Against 5 Core Architectural Principles

**Audit Date:** 2026-05-26  
**Auditor:** Lead Systems Architect  
**Scope:** Full codebase review of state management, prompt assembly, rulebook structure, and data flow

---

## PRINCIPLE 1: Stateless Reasoning, Persistent State

> **Requirement:** The LLM must never serve as memory. All mode state, document metadata, checkpoints, and user preferences must live in a structured `ProjectState` object persisted in storage. The LLM only receives the exact slice of context needed for the current turn.

### Findings

| Component | Rating | Evidence |
|-----------|--------|----------|
| **Checkpoint Type Definition** | ✅ Compliant | `src/types/czar.ts` defines complete `Checkpoint` interface with domain-specific position tracking (narrativePosition, argumentPosition, etc.) |
| **State Persistence Layer** | ✅ Compliant | `supabase/migrations/20260525000001_czar_state.sql` creates `czar_project_state` table with RLS policies |
| **State Engine (Frontend)** | ✅ Compliant | `src/lib/czar/state-engine.ts` provides checkpoint creation, serialisation, and context restoration |
| **State Management (Backend)** | ✅ Compliant | `supabase/functions/czar-brain/index.ts` lines 351-400: `loadProjectState()` / `saveProjectState()` functions |
| **Checkpoint Injection** | ✅ Compliant | `buildCheckpointInjection()` in state-engine.ts (lines 351-444) builds structured context blocks |
| **Chat History Usage** | ⚠️ Partial | Backend still loads last 40 messages from `czar_messages` (line 939-948). While checkpoint is injected, full history dependency remains for conversation continuity |
| **Deep Checkpoint Extraction** | ⚠️ Partial | Async deep extraction via Gemini Flash Lite (lines 1004-1021) is best-effort and non-blocking — may result in stale checkpoint data if request fails |

### Gap Analysis

**Strengths:**
- Complete type definitions for all domain-specific state
- Dedicated database table with proper indexing
- Heuristic + async deep extraction dual-layer approach
- Checkpoint injection into system prompt is well-implemented

**Gaps:**
1. **Chat history dependency:** The system still relies on loading the last 40 messages from conversation history (`czar_messages`) rather than relying solely on checkpoint state. This violates pure "stateless reasoning" — the LLM receives both checkpoint AND conversation history.
2. **No explicit context slicing:** There's no mechanism to limit context to "exact slice needed" — the entire recent conversation is sent regardless of relevance.
3. **Checkpoint enrichment race condition:** Deep extraction happens asynchronously after response is already sent to user. If the async call fails, enriched state is lost.

---

## PRINCIPLE 2: Sovereign Domain Cores

> **Requirement:** Academic, Fiction, Technical, Journalistic, and Personal writing are parallel epistemic systems—not derivatives of academia. Each has its own cognitive core in the rulebook. Mode switching is a deterministic router selecting the correct core + style overlay.

### Findings

| Component | Rating | Evidence |
|-----------|--------|----------|
| **Cognitive Cores** | ✅ Compliant | `src/lib/czar/cores.ts` (1221 lines) contains 7 complete domain-sovereign cores: Academic, Fiction, Professional, Journalistic, Personal, Poetry, Chat |
| **Core Philosophy** | ✅ Compliant | Each core defines unique thinking apparatus, not just formatting rules (e.g., Academic: "evidence-as-interrogation"; Fiction: "character interiority") |
| **Style Overlays** | ✅ Compliant | `cores.ts` lines 800-1200: Complete style overlay definitions for all domains |
| **Domain Router** | ✅ Compliant | `src/lib/czar/router.ts` (300 lines): Regex-based signal detection with confidence scoring |
| **Router Duplication** | ✅ Compliant | Router exists in both frontend (`router.ts`) and backend (`czar-brain/index.ts` lines 107-199) for optimistic UI + authoritative routing |
| **Mode Switching** | ⚠️ Partial | Router correctly selects domain+style, but no explicit "mode switch" event that triggers checkpoint serialization before switching |
| **Technical Writing Domain** | ❌ Missing/Substandard | No dedicated "Technical" domain core. Technical writing is treated as a style overlay under Professional domain (`technical` style) rather than sovereign domain |

### Gap Analysis

**Strengths:**
- Comprehensive cognitive cores with genuine philosophical distinctions
- Style overlays properly separated from domain cores
- Router uses regex patterns for precision (not substring matching)
- Confidence scoring with explicit reasoning output

**Gaps:**
1. **Technical writing demoted:** Per requirements, "Technical" should be a parallel domain core, not a style overlay under Professional. Currently: `PROFESSIONAL_CORE` includes `technical` as one of four style options.
2. **No explicit mode-switch checkpoint:** When router detects domain change mid-session, there's no explicit checkpoint serialization capturing "intent + position + decisions" before the switch occurs.
3. **Domain signals incomplete:** Router signal catalogue doesn't include all technical documentation patterns (API docs, SOPs, procedures are detected but weighted under Professional).

---

## PRINCIPLE 3: Semantic Markup Output

> **Requirement:** The AI must never generate raw formatted documents. All output must be Pandoc-flavored Markdown with YAML metadata and semantic annotation tags. Rendering is handled by deterministic backend/frontend code.

### Findings

| Component | Rating | Evidence |
|-----------|--------|----------|
| **Output Format Enforcement** | ❌ Missing/Substandard | No explicit instruction in system prompts requiring Pandoc-flavored Markdown |
| **YAML Frontmatter** | ⚠️ Partial | `auditor.ts` lines 158-181: `generateYAMLHeader()` function exists but is only used for DOCX export path, NOT prepended to streaming output |
| **Semantic Annotation Tags** | ❌ Missing/Substandard | No semantic annotation tag system implemented (e.g., `<claim>`, `<evidence>`, `<citation>`) |
| **Heading Hierarchy** | ✅ Compliant | Academic core enforces semantic heading hierarchy (H1→H2→H3) as "logical structure, not decorative" |
| **Rendering Separation** | ⚠️ Partial | Export functions exist (`export-docx/index.ts`) but rendering logic is coupled with generation rather than purely deterministic post-processing |
| **Markdown Output** | ⚠️ Partial | Output appears to be markdown-based (headings detected in audits) but no explicit enforcement in prompt assembler |

### Gap Analysis

**Strengths:**
- YAML header generation utility exists
- Heading hierarchy rules are enforced in academic core
- Export pipeline separates some rendering concerns

**Gaps:**
1. **No Pandoc enforcement:** System prompts do not instruct the LLM to output Pandoc-flavored Markdown specifically.
2. **No semantic tags:** Zero implementation of semantic annotation tags for structural elements (claims, evidence, citations, narrative beats).
3. **YAML not in streaming output:** `generateYAMLHeader()` is only called during export, not as part of the generation pipeline. Documents lack metadata at source.
4. **Raw text allowed:** Nothing prevents the LLM from outputting plain text without markdown formatting.

---

## PRINCIPLE 4: Mandatory Verification Protocol

> **Requirement:** Every generation must include a hidden `<audit>` block validating structure, citations (if academic), narrative consistency (if fiction), word count, and prose mechanics *before* producing user-visible output. Failure triggers regeneration, not warnings.

### Findings

| Component | Rating | Evidence |
|-----------|--------|----------|
| **Pre-Output Audit Block** | ✅ Compliant | `prompt-assembler.ts` lines 18-105: Complete audit protocol with universal + domain-specific checks |
| **Audit Injection** | ✅ Compliant | Audit block injected into system prompt before checkpoint (line 172) |
| **Deterministic Audit (Backend)** | ✅ Compliant | `czar-brain/auditor.ts`: Code-level banned phrase detection, em-dash overuse, citation integrity checks |
| **Two-Pass Self-Correction** | ✅ Compliant | `czar-brain/index.ts` lines 547-659: Draft → Critique → Final polish for high-stakes domains |
| **Regeneration on Failure** | ⚠️ Partial | Two-pass self-correction does regenerate, BUT single-pass path (non-high-stakes domains) only emits warnings (lines 988-998) |
| **Post-Generation Audit** | ⚠️ Partial | Deterministic audit runs AFTER generation for monitoring (lines 988-998) — failures don't trigger regeneration in single-pass mode |
| **Fiction Narrative Consistency** | ⚠️ Partial | Checkpoint tracks narrative position but no explicit "continuity validator" comparing new output against established characters/plot |

### Gap Analysis

**Strengths:**
- Comprehensive audit protocol in system prompt
- Two-pass self-correction for academic/professional domains
- Deterministic code-level audit complements LLM self-audit
- Banned phrase detection is robust

**Gaps:**
1. **Single-pass domains skip regeneration:** Fiction, journalism, personal, poetry domains use single-pass generation — audit failures emit warnings but don't trigger regeneration.
2. **Post-generation audit is monitoring-only:** The deterministic audit at line 988 runs after content is already streamed to user — too late for regeneration.
3. **No explicit citation validation:** Academic audit checks "every claim has citation" but doesn't validate citation format correctness or reference section completeness programmatically.
4. **Word count not audited pre-output:** No word count verification against targets before output.

---

## PRINCIPLE 5: Lossless Context Switching

> **Requirement:** When users switch modes mid-session, the app must serialize a structured checkpoint (intent + position + decisions) into `ProjectState`. Returning to a mode injects this checkpoint—no reliance on chat history for continuity.

### Findings

| Component | Rating | Evidence |
|-----------|--------|----------|
| **Checkpoint Serialization** | ✅ Compliant | `createCheckpoint()` in state-engine.ts captures full state including domain-specific position objects |
| **Checkpoint Persistence** | ✅ Compliant | `saveProjectState()` upserts to `czar_project_state` after every turn (lines 380-400 in czar-brain) |
| **Checkpoint Restoration** | ✅ Compliant | `buildCheckpointInjection()` builds structured restoration block injected into system prompt |
| **Domain-Specific State** | ✅ Compliant | Checkpoint includes: `argumentPosition`, `narrativePosition`, `professionalPosition`, `journalisticPosition`, `personalPosition`, `poetryPosition` |
| **Mode Switch Detection** | ✅ Compliant | Router detects domain changes; `override_domain` parameter allows explicit switching |
| **Explicit Mode Switch Event** | ❌ Missing/Substandard | No explicit "onModeSwitch" handler that serializes final checkpoint before switching domains |
| **Cross-Mode Continuity** | ⚠️ Partial | Checkpoint stores `lastUserIntent` and `lastOutputSummary` but no explicit "decisions made" tracking across modes |

### Gap Analysis

**Strengths:**
- Comprehensive checkpoint structure with all domain positions
- Persistence layer properly configured
- Checkpoint injection restores continuity accurately

**Gaps:**
1. **No explicit mode switch serialization:** When router auto-detects domain change, there's no explicit checkpoint save capturing "this is where we left off in the previous mode."
2. **No decision tracking:** Checkpoint captures `lastOutputSummary` but not explicit "decisions made" (e.g., "user chose to omit counterarguments", "user approved character X's arc").
3. **No return-to-mode hook:** No explicit logic that says "user switched back to academic mode — inject the last academic checkpoint specifically" (checkpoint is always the most recent, regardless of domain).

---

## SUMMARY RATINGS

| Principle | Overall Rating | Critical Gaps |
|-----------|---------------|---------------|
| **1. Stateless Reasoning, Persistent State** | ⚠️ Partial | Chat history dependency; no explicit context slicing |
| **2. Sovereign Domain Cores** | ⚠️ Partial | Technical domain missing; no explicit mode-switch checkpoint |
| **3. Semantic Markup Output** | ❌ Missing/Substandard | No Pandoc enforcement; no semantic tags; YAML not in output |
| **4. Mandatory Verification Protocol** | ⚠️ Partial | Single-pass domains skip regeneration; post-gen audit is monitoring-only |
| **5. Lossless Context Switching** | ⚠️ Partial | No explicit mode switch serialization; no decision tracking |

---

## PRIORITIZED REMEDIATION PLAN

### Group A: State Architecture Fixes (Highest Priority)
1. Remove chat history dependency — rely solely on checkpoint + content snapshot
2. Add explicit context slicing mechanism (only relevant state slices sent to LLM)
3. Make checkpoint enrichment synchronous for critical fields

### Group B: Rulebook Modularization
1. Extract Technical Writing as sovereign domain core (not style overlay)
2. Convert inline prompt text in `czar-brain/index.ts` to loadable assets from `cores.ts`
3. Create JSON/YAML rulebook files for external editing

### Group C: Mode Router Implementation
1. Add explicit `onModeSwitch` handler with checkpoint serialization
2. Implement per-domain checkpoint retrieval (returning to a mode loads that mode's last checkpoint)
3. Add decision tracking to checkpoint schema

### Group D: Checkpoint Serializer Enhancement
1. Add `decisionsMade` array to Checkpoint type
2. Add `modeSwitchHistory` tracking
3. Implement cross-referencing between checkpoints for long-form projects

### Group E: Audit Protocol Integration
1. Enforce Pandoc Markdown output in all system prompts
2. Implement semantic annotation tag system
3. Move YAML frontmatter generation into streaming output
4. Make regeneration mandatory for ALL domains on audit failure (not just high-stakes)
5. Add pre-output citation format validation

---

## NEXT STEPS

Proceed with **Group A: State Architecture Fixes** first, as these are foundational to all other improvements.
