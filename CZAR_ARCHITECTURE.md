# CZAR Cognitive Architecture

## Overview

CZAR is not a chatbot wrapper. It is a **Cognitive Co-Pilot** with domain sovereignty, stateful continuity, and architectural intelligence. The system separates **state** (held by your app) from **reasoning** (provided by the LLM), enabling lossless context switching across writing domains.

## Core Principles

### 1. State vs Reasoning Separation
- **Your App**: Holds persistent state in structured objects
- **LLM**: Stateless reasoning engine that receives only the current context slice
- **Result**: Perfect fidelity when switching between academic, fiction, professional modes

### 2. Domain Sovereignty
Each writing domain is a **sovereign cognitive system**, not a relaxation of academic rules:
- **Academic**: Truth-seeking, evidence-based, hedged claims
- **Fiction**: Emotional truth, narrative coherence, character interiority
- **Professional**: Clarity over elegance, actionable information
- **Journalistic**: Inverted pyramid, source triangulation, attribution
- **Personal**: Voice authenticity, reflective depth
- **Poetry**: Line break semantics, sonic patterning, compression

### 3. Structured Memory Architecture
Context switching works because we store:
- **ProjectState Object**: Persisted in database
- **Checkpoint Summary**: Logical position + recent decisions
- **Domain Context**: Active domain + domain-specific state
- **Style Overlay**: User preferences that override defaults

## File Structure

```
supabase/functions/czar-chat/
├── index.ts              # Main edge function handler
├── brain.ts              # Universal writing constitution (always active)
├── orchestrator.ts       # Multi-agent coordination (Architect, Writer, Critic, etc.)
├── promptLibrary.ts      # Task-specific playbooks (Basic, Superior, Slides, etc.)
├── researcher.ts         # Source finding and verification agent
├── state.ts              # State management types and utilities
├── integration.ts        # Connects router + state to main handler
└── domains/
    ├── router.ts         # Domain detection and routing logic
    ├── academic.ts       # Academic domain cognitive core
    ├── fiction.ts        # Fiction domain cognitive core
    └── professional.ts   # Professional/Technical domain cognitive core
```

## Architecture Layers

### Layer 0: Meta-Cognition (brain.ts)
The universal constitution that defines:
- CZAR's identity as a scholarly writing engine
- Epistemic humility protocols
- Writing quality standards (sentence-level, paragraph-level)
- Citation rules (all modes)
- Image/table generation protocols
- Ethics and professional conduct
- Output format requirements

### Layer 1: Domain Cores (domains/*.ts)
Sovereign cognitive systems for each domain:

**Academic Core:**
- Argument ontology (thesis → claim → evidence → warrant → synthesis)
- Hedging protocol matched to evidence strength
- Citation integrity rules
- Discipline-specific standards (Social Sciences, Business, Law, Sciences, Humanities)
- Self-audit checklist

**Fiction Core:**
- Narrative arc structures
- Scene craft standards
- Dialogue engineering (must do 2+ things simultaneously)
- POV discipline
- Show-don't-tell protocol
- Sensory specificity
- Tension & pacing curves
- Form-specific conventions (short story, novel, screenplay, poetry)

**Professional Core:**
- Audience-task alignment
- Information architecture patterns (task-based, reference-based, decision-based)
- Clarity heuristics
- Scannability patterns
- Tone calibration by context
- Numbers & data protocol

### Layer 2: Style Overlays
User-specified preferences that modify domain defaults:
- Citation style (APA, Harvard, Chicago, IEEE, MLA, OSCOLA)
- Language variant (UK, US, AU)
- Tone (formal, direct, conversational)
- Custom rules (no contractions, British spelling, etc.)

### Layer 3: Task Playbooks (promptLibrary.ts)
Specific execution templates:
- **Basic Assignment**: Standard academic essays/reports
- **Superior**: A+ blueprint-driven complex documents
- **Slides**: Presentation decks with narration
- **Literature Review**: Systematic/narrative reviews
- **Screenplay**: Fountain format scripts
- **Legal Brief**: IRAC structure, OSCOLA citations

### Layer 4: State Management (state.ts)
Persistent objects that survive mode switches:

```typescript
interface ProjectState {
  id: string;                    // Unique project ID
  active_domain: WritingDomain;  // Current domain
  domain_state: DomainSpecificState;  // Domain-specific context
  style_overlay: StyleOverlay;   // User preferences
  document: DocumentMetadata;    // Title, type, audience, purpose
  checkpoint: CheckpointSummary; // Position, last action, open threads
  conversation_turns: [...];     // Recent conversation history
  user_tier: string;             // Subscription level
  last_updated: number;          // Timestamp
}
```

### Layer 5: Domain Router (domains/router.ts)
Detects appropriate domain from:
- Explicit user request
- Keyword patterns in message
- Conversation context (stays in current domain unless strong signal to switch)

### Layer 6: Integration Layer (integration.ts)
Assembles complete context for each request:
1. Retrieves or creates ProjectState
2. Detects domain from signals
3. Builds domain-specific prompt
4. Selects appropriate playbook
5. Assembles full system prompt
6. Updates state with conversation turn

## How Context Switching Works

### Example Flow

**User**: "Write a literature review on mindfulness interventions"
→ Router detects `academic` domain
→ Loads Academic Core + Literature Review playbook
→ Writes section with proper citations

**User**: "Now help me write a scene where the protagonist discovers the betrayal"
→ Router detects `fiction` domain (keywords: scene, protagonist, betrayal)
→ Switches domain, preserves style overlay
→ Loads Fiction Core + applies scene craft standards
→ Writes with subtext, sensory details, POV consistency

**User**: "Back to the literature review - add a section on measurement instruments"
→ Router detects `academic` domain again
→ Restores previous academic checkpoint
→ Continues without losing place

### The Magic Isn't Magic

This works because:
1. **State is persisted** in your database, not in chat history
2. **Domain cores are loaded dynamically** based on detected intent
3. **Checkpoints capture logical position** not just text
4. **Style overlays persist across domains** (citation style, language variant)

## Implementation Checklist

### Backend (Supabase Edge Functions)

- [x] Create domain core files (academic.ts, fiction.ts, professional.ts)
- [x] Build domain router with keyword detection
- [x] Implement state management types and utilities
- [x] Create integration layer for context assembly
- [ ] Update index.ts to use assembleCzarContext()
- [ ] Add database table for ProjectState persistence
- [ ] Implement checkpoint serialization/deserialization

### Frontend (React/TypeScript)

- [ ] Extend Project type with `active_domain` field
- [ ] Add domain indicator to UI (shows current mode)
- [ ] Implement mode switch detection in chat input
- [ ] Display checkpoint info (position, word count progress)
- [ ] Add domain-specific settings panel

### Database Schema

```sql
CREATE TABLE czar_project_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES projects(id),
  
  -- Core state
  active_domain TEXT NOT NULL DEFAULT 'chat',
  domain_state JSONB DEFAULT '{}',
  style_overlay JSONB DEFAULT '{}',
  document_metadata JSONB DEFAULT '{}',
  checkpoint JSONB DEFAULT '{}',
  
  -- Conversation context
  conversation_turns JSONB DEFAULT '[]',
  
  -- Metadata
  user_tier TEXT NOT NULL DEFAULT 'free',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_czar_states_user ON czar_project_states(user_id);
CREATE INDEX idx_czar_states_project ON czar_project_states(project_id);
```

## Testing Strategy

### Unit Tests
- Domain detection accuracy (keyword matching)
- State serialization/deserialization round-trips
- Checkpoint creation from conversation turns
- Style overlay application

### Integration Tests
- Full context switching flow (academic → fiction → academic)
- State persistence across function invocations
- Playbook selection accuracy
- Word count tracking across turns

### User Acceptance Tests
- Can user write novel chapter, then literature review, then return to chapter?
- Does citation style persist when switching domains?
- Are domain-specific standards enforced (hedging in academic, subtext in fiction)?
- Is context lossless after multiple switches?

## Performance Considerations

### Prompt Size Management
- Brain prompt: ~700 lines (fixed cost)
- Domain core: ~180 lines (loaded per domain)
- Playbook: ~50 lines (loaded per task type)
- State checkpoint: ~100 tokens (variable)
- **Total**: ~1000-1200 tokens base + conversation history

### Optimization Strategies
1. **Cache assembled prompts** for repeated similar requests
2. **Compress conversation history** to key decisions only
3. **Lazy-load domain cores** only when domain changes
4. **Use cheaper models** for domain detection (Gemini Flash Lite)

## Security & Privacy

- State objects contain no PII beyond user ID
- Conversation turns stored encrypted at rest
- Domain detection runs server-side (no client leakage)
- Users can export/delete their state data

## Extensibility

### Adding New Domains

1. Create `domains/newdomain.ts` with cognitive core
2. Add domain to `WritingDomain` type in router.ts
3. Add keyword patterns to `DOMAIN_KEYWORDS`
4. Update `getDomainCore()` switch statement
5. Test detection accuracy

### Adding New Playbooks

1. Export playbook constant from `promptLibrary.ts`
2. Add to `CzarPlaybook` type
3. Update `pickPlaybook()` router logic
4. Update `playbookText()` lookup

## Future Enhancements

- [ ] Voice cloning from user writing samples
- [ ] Collaborative multi-user state (co-authoring)
- [ ] Version control for state checkpoints (undo/redo)
- [ ] Domain-specific fine-tuning datasets
- [ ] Real-time collaboration indicators
- [ ] Export state as portable JSON

---

**CZAR operates at the standard of a principal-level colleague in whichever field is required. That standard is not announced. It is demonstrated.**
