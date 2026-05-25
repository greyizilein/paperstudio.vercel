// CZAR Integration Layer
// Connects domain router and state management to the main chat handler

import { detectDomain, buildDomainPrompt, type WritingDomain } from "./domains/router.ts";
import { 
  createEmptyProjectState, 
  updateCheckpoint, 
  switchDomain,
  type ProjectState,
  type DomainRouterSignals,
} from "./state.ts";
import { CZAR_BRAIN_SYSTEM_PROMPT } from "./brain.ts";
import { playbookText, pickPlaybook, type RouterSignals } from "./promptLibrary.ts";

export interface CzarIntegrationConfig {
  /** User's subscription tier */
  userTier: "free" | "premium" | "phd" | "enterprise";
  
  /** User's email for admin checks */
  userEmail?: string | null;
  
  /** Active project ID if any */
  projectId?: string | null;
  
  /** Stored project state from database */
  storedState?: ProjectState | null;
}

export interface CzarContextAssembly {
  /** Final system prompt assembled from all layers */
  systemPrompt: string;
  
  /** Updated state after processing this turn */
  newState: ProjectState;
  
  /** Detected domain for this request */
  detectedDomain: WritingDomain;
  
  /** Selected playbook (if any) */
  selectedPlaybook: string;
}

/**
 * Assembles the complete context for a Czar request
 * This is the main integration point called from index.ts
 */
export function assembleCzarContext(
  userMessage: string,
  attachmentCount: number,
  filenames: string[] = [],
  config: CzarIntegrationConfig,
  previousMessages: Array<{ role: string; content: string }> = [],
): CzarContextAssembly {
  // 1. Get or create project state
  let state = config.storedState ?? createEmptyProjectState(config.projectId || "session");
  state.user_tier = config.userTier;
  
  // 2. Detect domain from signals
  const routerSignals: DomainRouterSignals = {
    user_message: userMessage,
    attachment_count: attachmentCount,
    filenames,
    conversation_context: state.active_domain !== "chat" 
      ? { last_domain: state.active_domain, domain_switch_count: 0 }
      : undefined,
  };
  
  const detectedDomain = detectDomain(routerSignals);
  
  // 3. Check if domain switched
  if (detectedDomain !== state.active_domain && detectedDomain !== "chat") {
    state = switchDomain(state, detectedDomain);
  }
  
  // 4. Build domain-specific prompt
  const styleOverlay: Record<string, string> = {};
  if (state.style_overlay.citation_style) {
    styleOverlay["citation_style"] = state.style_overlay.citation_style;
  }
  if (state.style_overlay.language_variant) {
    styleOverlay["language_variant"] = state.style_overlay.language_variant === "US" ? "US English" : "UK English";
  }
  if (state.style_overlay.tone) {
    styleOverlay["tone"] = state.style_overlay.tone;
  }
  
  const domainPrompt = buildDomainPrompt(detectedDomain, styleOverlay);
  
  // 5. Select playbook based on content
  const playbookSignals: RouterSignals = {
    user_message: userMessage,
    attachment_count: attachmentCount,
    total_attachment_words: 0, // Would need file content analysis
    filenames,
  };
  
  const playbookKey = pickPlaybook(playbookSignals);
  const selectedPlaybook = playbookText(playbookKey);
  
  // 6. Assemble full system prompt
  let systemPrompt = CZAR_BRAIN_SYSTEM_PROMPT;
  
  // Add domain core after brain prompt
  if (domainPrompt) {
    systemPrompt += "\n\n" + domainPrompt;
  }
  
  // Add playbook if selected
  if (selectedPlaybook) {
    systemPrompt += "\n\n" + selectedPlaybook;
  }
  
  // Add conversation context checkpoint
  systemPrompt += `\n\n===== CURRENT SESSION STATE =====
Active Domain: ${detectedDomain}
Position: ${state.checkpoint.position}
Last Action: ${state.checkpoint.last_action}
Word Count: ${state.checkpoint.word_count?.current || 0}${state.checkpoint.word_count?.target ? ` / ${state.checkpoint.word_count.target}` : ''}
${state.checkpoint.open_threads.length > 0 ? `Open Threads: ${state.checkpoint.open_threads.join(", ")}` : ""}
===== END SESSION STATE =====
`;
  
  // 7. Update state with this turn
  const newState: ProjectState = {
    ...state,
    active_domain: detectedDomain,
    conversation_turns: [
      ...state.conversation_turns.slice(-9), // Keep last 9 turns
      { role: "user", content: userMessage, timestamp: Date.now() },
    ],
    last_updated: Date.now(),
  };
  
  return {
    systemPrompt,
    newState,
    detectedDomain,
    selectedPlaybook: playbookKey,
  };
}

/**
 * Creates a checkpoint summary from recent conversation
 * Called after AI response to update state
 */
export function createTurnCheckpoint(
  currentState: ProjectState,
  assistantResponse: string,
): ProjectState {
  const words = assistantResponse.trim().split(/\s+/).length;
  const currentWordCount = currentState.checkpoint.word_count?.current || 0;
  
  return {
    ...currentState,
    checkpoint: {
      ...currentState.checkpoint,
      last_action: `Generated ${words} words`,
      word_count: {
        current: currentWordCount + words,
        target: currentState.checkpoint.word_count?.target,
      },
    },
    conversation_turns: [
      ...currentState.conversation_turns,
      { role: "assistant", content: assistantResponse, timestamp: Date.now() },
    ].slice(-10), // Keep last 10 turns (5 exchanges)
    last_updated: Date.now(),
  };
}

/**
 * Serializes state for database storage
 */
export function serializeState(state: ProjectState): string {
  return JSON.stringify(state);
}

/**
 * Deserializes state from database
 */
export function deserializeState(serialized: string): ProjectState {
  return JSON.parse(serialized) as ProjectState;
}
