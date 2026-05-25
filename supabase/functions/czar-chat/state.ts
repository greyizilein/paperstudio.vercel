// CZAR State Management Types
// Defines the persistent state object that survives mode switches

import type { WritingDomain } from "./domains/router.ts";
import type { Methodology, Chapter, WritingMode } from "../types/project.ts";

export interface CheckpointSummary {
  /** Last logical position in the document (section heading, scene number, etc.) */
  position: string;
  
  /** Brief summary of what was just accomplished */
  last_action: string;
  
  /** Key decisions made (tone, approach, structural choices) */
  decisions: string[];
  
  /** Open threads or unresolved elements */
  open_threads: string[];
  
  /** Word count progress if applicable */
  word_count?: {
    current: number;
    target?: number;
  };
}

export interface StyleOverlay {
  /** Citation style for academic (APA, Harvard, Chicago, etc.) */
  citation_style?: string;
  
  /** Language variant (UK, US, AU, etc.) */
  language_variant?: string;
  
  /** Tone preference (formal, direct, conversational, etc.) */
  tone?: string;
  
  /** Any user-specified constraints or preferences */
  custom_rules?: Record<string, boolean | string>;
}

export interface DocumentMetadata {
  /** Working title */
  title: string;
  
  /** Document type (essay, novel chapter, report, etc.) */
  type: string;
  
  /** Target audience description */
  audience?: string;
  
  /** Purpose or goal of the document */
  purpose?: string;
  
  /** Any brief or requirements document content */
  brief?: string;
}

export interface DomainSpecificState {
  /** Academic: research questions, hypotheses, methodology */
  academic?: {
    research_questions: string[];
    hypotheses?: string[];
    methodology: Methodology;
    theoretical_framework?: string;
  };
  
  /** Fiction: POV character, setting, timeline position */
  fiction?: {
    pov_character: string;
    setting: string;
    timeline_position: string;
    character_arcs: Record<string, string>;
  };
  
  /** Professional: decision context, stakeholders */
  professional?: {
    decision_context: string;
    stakeholders: string[];
    constraints: string[];
  };
}

export interface ProjectState {
  /** Unique project identifier */
  id: string;
  
  /** Currently active writing domain */
  active_domain: WritingDomain;
  
  /** Domain-specific state */
  domain_state: DomainSpecificState;
  
  /** Style preferences that override domain defaults */
  style_overlay: StyleOverlay;
  
  /** Metadata about the current document */
  document: DocumentMetadata;
  
  /** Checkpoint of where we are in the writing process */
  checkpoint: CheckpointSummary;
  
  /** Conversation history within this domain session */
  conversation_turns: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: number;
  }>;
  
  /** Writing mode (natural, default, etc.) */
  writing_mode?: WritingMode;
  
  /** User's tier/subscription level (affects model selection) */
  user_tier: "free" | "premium" | "phd" | "enterprise";
  
  /** When this state was last updated */
  last_updated: number;
}

export interface SessionSerialization {
  /** Serialize current state to a compact string for storage */
  serialize: (state: ProjectState) => string;
  
  /** Deserialize from storage back to state object */
  deserialize: (serialized: string) => ProjectState;
  
  /** Create a checkpoint summary from recent conversation */
  createCheckpoint: (
    previousCheckpoint: CheckpointSummary,
    recentTurns: Array<{ role: string; content: string }>,
  ) => CheckpointSummary;
}

/** Default empty state for new projects */
export function createEmptyProjectState(projectId: string): ProjectState {
  return {
    id: projectId,
    active_domain: "chat",
    domain_state: {},
    style_overlay: {
      citation_style: "Harvard",
      language_variant: "UK",
      tone: "formal",
      custom_rules: {},
    },
    document: {
      title: "Untitled",
      type: "document",
    },
    checkpoint: {
      position: "Beginning",
      last_action: "Session started",
      decisions: [],
      open_threads: [],
    },
    conversation_turns: [],
    writing_mode: "default",
    user_tier: "free",
    last_updated: Date.now(),
  };
}

/** Update state with new checkpoint after each turn */
export function updateCheckpoint(
  state: ProjectState,
  assistantResponse: string,
  userNextMessage?: string,
): ProjectState {
  const words = assistantResponse.trim().split(/\s+/).length;
  const currentWordCount = state.checkpoint.word_count?.current || 0;
  
  return {
    ...state,
    checkpoint: {
      ...state.checkpoint,
      last_action: `Generated ${words} words`,
      word_count: {
        current: currentWordCount + words,
        target: state.checkpoint.word_count?.target,
      },
    },
    last_updated: Date.now(),
  };
}

/** Switch domain while preserving relevant state */
export function switchDomain(
  state: ProjectState,
  newDomain: WritingDomain,
): ProjectState {
  // Preserve style overlay and document metadata
  // Reset domain-specific state and checkpoint
  return {
    ...state,
    active_domain: newDomain,
    domain_state: {},
    checkpoint: {
      position: "Beginning",
      last_action: `Switched to ${newDomain} mode`,
      decisions: [],
      open_threads: [],
    },
    conversation_turns: [],
    last_updated: Date.now(),
  };
}
