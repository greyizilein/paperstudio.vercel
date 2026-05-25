# CZAR Cognitive Architecture

A stateful, domain-sovereign AI writing co-pilot engine built on top of PaperStudio's existing multi-provider AI infrastructure.

---

## Architecture Overview

```
User Message
     │
     ▼
┌─────────────┐
│   Router    │ ← detects domain + style from signals (src/lib/czar/router.ts)
└─────┬───────┘
      │ RouterDecision { domain, style, confidence }
      ▼
┌──────────────────┐
│  State Engine    │ ← loads checkpoint from czar_project_state (src/lib/czar/state-engine.ts)
└─────┬────────────┘
      │ Checkpoint | null
      ▼
┌──────────────────────┐
│  Prompt Assembler    │ ← Brain + Cognitive Core + Style Overlay + Audit + Checkpoint
└─────┬────────────────┘    (src/lib/czar/prompt-assembler.ts)
      │ Final system prompt
      ▼
┌──────────────┐
│  LLM Call    │ ← Anthropic (Sonnet/Opus) or Google (Gemini) via czar-brain edge function
└─────┬────────┘
      │ Streamed response
      ▼
┌──────────────────┐
│ Checkpoint Write │ ← heuristic extraction + async deep extraction via Gemini Flash Lite
└─────┬────────────┘
      │
      ▼
  czar_project_state (Supabase)
```

---

## The 7 Cognitive Cores

Each core defines a domain-sovereign thinking apparatus — not just formatting rules, but how the AI reasons, structures, and evaluates within that domain.

| Domain | Core Philosophy | Default Style |
|--------|----------------|---------------|
| **Academic** | Semantic hierarchy, evidence-as-interrogation, synthesis over summary | Harvard |
| **Fiction** | Character interiority, subtext, sensory grounding, scene economy | Literary Minimalist |
| **Professional** | Pyramid principle (conclusion first), specific actionable recommendations | Executive |
| **Journalistic** | Newsworthiness-first, attribution-sacred, lede in 25 words | Inverted Pyramid |
| **Personal** | Specificity creates intimacy, vulnerability without self-pity, voice as cognitive signature | Memoir |
| **Poetry** | Compression, sound as meaning, image over naming, deliberate line break | Free Verse |
| **Chat** | Calibrated directness, opinion stated as opinion, no hollow affirmations | Direct/Expert |

---

## Style Overlays

Layered on top of the core. Modify register, citation format, structural conventions.

**Academic:** Harvard · APA · Chicago · MLA · IEEE · Vancouver · OSCOLA  
**Fiction:** Literary Minimalist · Baroque · Stream of Consciousness · Genre Thriller · Genre Literary · Voice-First  
**Professional:** Executive · Consulting · Technical · Legal-Adjacent  
**Journalistic:** Inverted Pyramid · Feature · Investigative · Editorial · Data Journalism  
**Personal:** Memoir · Blog · Personal Letter · Journal · Personal Statement  
**Poetry:** Free Verse · Formal · Prose Poetry · Lyric Essay · Found Poetry  
**Chat:** Direct/Expert · Socratic · Collaborative · Supportive  

---

## Checkpoint System

After every response, CZAR serialises its current position into a `Checkpoint` object stored in `czar_project_state`. On the next turn, the checkpoint is injected into the system prompt to restore perfect continuity.

### Domain-specific state captured:

**Academic:**
- Thesis statement, current section, section order, last argument thread
- Citation queue (last 5 citations), concepts already defined (not re-defined)
- Claim depth (0=intro → 3=evidence), pending counterarguments

**Fiction:**
- Scene summary, active characters, POV character and mode, tense
- Current conflict, scene location, emotional register, chapter number

**Professional / Journalistic / Personal / Poetry:** structural position, key decisions, sources, image clusters, form established — see `Checkpoint` interface in `src/types/czar.ts`.

---

## File Structure

```
src/
  types/czar.ts                   TypeScript types for all CZAR entities
  lib/czar/
    cores.ts                      7 Cognitive Cores + Style Overlays (full text)
    state-engine.ts               Checkpoint creation, serialisation, context restoration
    router.ts                     Domain + style detection logic
    prompt-assembler.ts           System prompt construction from all components

supabase/
  functions/czar-brain/
    index.ts                      Stateful edge function — full cognitive architecture endpoint
  migrations/
    20260525000001_czar_state.sql czar_project_state table + conversation columns
```

---

## Environment Variables

All existing `czar-chat` variables apply. No new variables needed.

| Variable | Used for |
|----------|----------|
| `ANTHROPIC_API_KEY` | Claude Sonnet/Opus (premium users, correction mode) |
| `GOOGLE_AI_API_KEY` | Gemini Flash (routing, standard users, checkpoint extraction) |
| `SUPABASE_URL` | Database connection |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side DB access (bypasses RLS) |
| `SUPABASE_ANON_KEY` | Client auth validation |

---

## Database Migration

Apply the migration before deploying the edge function:

```bash
supabase db push
# or in production:
supabase migration up
```

Creates `czar_project_state` table with RLS policies and adds `active_domain`, `style_overlay`, `checkpoint_data` columns to `czar_conversations`.

---

## Deploying the Edge Function

```bash
supabase functions deploy czar-brain
```

The function is independent of `czar-chat` — both can run simultaneously. Route new stateful sessions to `czar-brain`; existing sessions continue using `czar-chat`.

---

## Frontend Integration

### Calling czar-brain from React

```typescript
const response = await supabase.functions.invoke("czar-brain", {
  body: {
    project_id: "proj_abc123",          // optional — enables checkpoint persistence
    conversation_id: null,              // null = new conversation
    user_message: "Write the methodology section for my dissertation on...",
    override_domain: undefined,         // let router detect
    override_style: undefined,          // use domain default
    settings: { citation_style: "harvard" },
  },
});
```

### SSE events emitted

| Event | Payload | Description |
|-------|---------|-------------|
| `meta` | `{ conversation_id, assistant_id, domain, style, confidence, checkpoint_id }` | Emitted before generation starts |
| `delta` | `{ text }` | Streaming text chunks |
| `thinking` | `{ text }` | Extended thinking (Opus only, not displayed) |
| `agent` | `{ id, name, status, action }` | Processing stage updates |
| `billing` | `{ reason }` | Word limit reached |
| `done` | `{ conversation_id, assistant_id, words, domain, style, checkpoint_id, session_turn }` | Generation complete |
| `error` | `{ message, recoverable }` | Error occurred |
| `ping` | `{}` | Keepalive (every 8s) |

### Reading the checkpoint from DB (for UI display)

```typescript
const { data } = await supabase
  .from("czar_project_state")
  .select("active_domain, style_overlay, checkpoint_data")
  .eq("project_id", projectId)
  .eq("user_id", userId)
  .maybeSingle();

// checkpoint_data is a Checkpoint object
const checkpoint = data?.checkpoint_data as Checkpoint | null;
```

---

## Using the Frontend Library

### Router (optimistic domain detection for UI)

```typescript
import { detectDomainAndStyle } from "@/lib/czar/router";

const decision = detectDomainAndStyle(
  userMessage,
  priorDomain,       // from last session
  userPreferences,
);
// decision.domain, decision.style, decision.confidence, decision.reasoning
```

### State engine (building display checkpoints)

```typescript
import { createCheckpoint, buildCheckpointInjection } from "@/lib/czar/state-engine";

// Create a checkpoint from the AI's response content
const cp = createCheckpoint({ domain, style, content, userMessage, sessionTurnCount, priorCheckpoint });

// Inject a checkpoint into a prompt (used in prompt-assembler)
const injection = buildCheckpointInjection(cp, domain);
```

### Cognitive Cores (for UI display, domain info panels)

```typescript
import { getCore, getStyleOverlay, getDomainStyles } from "@/lib/czar/cores";
import { DOMAIN_LABELS, STYLE_LABELS } from "@/types/czar";

const core = getCore("academic");                  // full core prompt text
const overlay = getStyleOverlay("harvard");        // style overlay text
const styles = getDomainStyles("academic");        // ["harvard", "apa", "chicago", ...]
```

---

## Pre-Output Audit Protocol

Every response passes through a silent 8-point universal audit + domain-specific checks before any visible text is generated. The LLM runs this internally and corrects any failures before outputting.

Universal checks include:
- No preamble (no "Of course! Here is your...")
- No postscript (no "I hope this helps! Let me know...")
- No banned phrases (full list in `prompt-assembler.ts`)
- No 3+ consecutive sentences of same length/structure

Domain-specific examples:
- **Academic**: every empirical claim has a citation; no bullet lists in body prose
- **Fiction**: no directly-named emotions; sensory grounding present; no AI fingerprint phrases
- **Professional**: conclusion in first paragraph; all recommendations are specific and time-bound

---

## Architecture Decisions

**Why separate `czar-brain` from `czar-chat`?**  
`czar-chat` handles the existing production traffic including orchestration, correction mode, and screenplay. `czar-brain` adds the stateful cognitive layer without risking regressions in the existing system. Both can run in parallel; `czar-brain` is the preferred endpoint for project-aware sessions.

**Why heuristic checkpoint extraction instead of parsing the full response?**  
Full response parsing with a secondary model adds ~1s to every response and doubles token cost. The heuristic extraction (regex-based, runs synchronously) produces a useful checkpoint immediately. The async deep extraction (Gemini Flash Lite, ~200ms, non-blocking) then enriches it with richer position data. The user never waits for either.

**Why is the domain router on both frontend and backend?**  
The frontend router provides optimistic UI feedback (shows the detected domain before the response arrives). The backend router is authoritative and cannot be spoofed. Both use the same signal catalogue.
