// CZAR Prompt Assembler — combines Core + Style + State + Audit into the final system prompt.
// The assembled prompt is the complete instruction set sent to the LLM on every turn.

import type {
  DomainType,
  StyleOverlay,
  Checkpoint,
  UserPreferences,
} from "@/types/czar";
import { getCore, getStyleOverlay } from "./cores";
import { buildCheckpointInjection, buildPreferencesBlock } from "./state-engine";

// ---------------------------------------------------------------------------
// Pre-Output Audit Protocol
// The LLM runs this silently before generating any visible output.
// ---------------------------------------------------------------------------

function buildAuditProtocol(domain: DomainType, style: StyleOverlay): string {
  const domainChecks: Record<DomainType, string[]> = {
    academic: [
      "Every evidence-based claim has an in-text citation.",
      "No bullet points in the body of academic prose.",
      "The thesis or central argument is clear and has been advanced.",
      "All technical terms are defined on first use.",
      "The register is formal, third-person, no contractions.",
      "The References section is complete and matches in-text citations.",
    ],
    fiction: [
      "Every scene is grounded in at least two sensory registers.",
      "No emotion has been named directly — it is shown through action, dialogue, or sensation.",
      "No adverbs of manner attached to dialogue tags.",
      "POV is consistent within this scene — no unintentional head-hopping.",
      "Every sentence of dialogue does at least one thing beyond convey information.",
      "No AI-fingerprint phrases ('He felt a surge of', 'She couldn't help but', 'He found himself').",
    ],
    professional: [
      "The main conclusion or recommendation appears in the first paragraph.",
      "All recommendations are specific, actionable, and time-bound.",
      "Every statistic or market figure is attributed to a source.",
      "Active voice throughout — no passive constructions that obscure agency.",
      "No jargon used for its own sake ('leverage', 'synergies', 'bandwidth').",
    ],
    journalistic: [
      "The lede states the most important fact in 25 words or fewer.",
      "Every factual claim is attributed to a named source or document.",
      "Multiple perspectives are represented where genuine disagreement exists.",
      "No passive constructions that hide who did what.",
      "Quotes are used only where the phrasing itself matters.",
    ],
    personal: [
      "The writing is grounded in specific, concrete detail — not generality.",
      "The voice is consistent with the writer's established register.",
      "No self-pity — suffering observed, not wallowed in.",
      "The emotional truth is present without being stated directly.",
      "Time transitions are clearly marked — the reader knows when they are.",
    ],
    poetry: [
      "Every line break is deliberate — emphasis, suspension, or juxtaposition.",
      "No emotion has been named directly — images carry the feeling.",
      "Sound pattern (assonance, consonance, rhythm) is intentional, not accidental.",
      "No padding line that earns its place on only one criterion.",
      "If formal verse: meter and rhyme scheme are exactly followed.",
    ],
    chat: [
      "The response is exactly as long as the answer requires — no padding.",
      "The question that was actually asked has been answered.",
      "No hollow affirmations ('Great question!', 'Certainly!', 'Of course!').",
      "Opinion is stated as opinion ('I think...'), not disguised as fact.",
      "If uncertain: uncertainty is stated clearly and precisely.",
    ],
  };

  const checks = domainChecks[domain] ?? domainChecks.chat;

  return `
===== CZAR PRE-OUTPUT AUDIT — EXECUTE SILENTLY — DO NOT RENDER =====
Before generating any visible output, verify each of the following:

UNIVERSAL CHECKS:
□ Have I identified the correct output type for this request?
□ Does my opening sentence contain the real content (no preamble, no meta-commentary)?
□ Does my output end cleanly (no "I hope this helps", no offer to revise)?
□ Have I scanned and eliminated all banned phrases?
  BANNED: "It is important to note", "It is worth noting", "In today's fast-paced world",
  "Delving into", "In the realm of", "Navigate the landscape", "Tapestry", "Groundbreaking",
  "Leverage" (as verb), "Showcase", "Seamlessly", "Furthermore" (as opener), "Moreover" (as opener),
  "In conclusion" (as opener), "As we can see", "This essay will explore/examine/discuss",
  "Feel free to", "Let me know if", "I hope this"
□ Do three or more consecutive sentences share the same approximate length or structure?
  If yes: restructure — vary lengths aggressively.

DOMAIN-SPECIFIC CHECKS FOR ${domain.toUpperCase()} / ${style.toUpperCase()}:
${checks.map((c) => `□ ${c}`).join("\n")}

CONTINUITY CHECK:
□ Does this response flow from the checkpoint state (if one exists)?
□ Have I introduced no contradiction with established facts, characters, or argument?
□ Have I NOT re-introduced or re-defined things already established?

SELF-CORRECTION RULE:
If any check fails, fix it before producing visible output. The audit is an internal gate,
not a displayed output. The reader sees only the corrected, high-quality response.
===== END AUDIT — BEGIN VISIBLE OUTPUT =====
`;
}

// ---------------------------------------------------------------------------
// Content snapshot injection
// ---------------------------------------------------------------------------

function buildContentSnapshot(snapshot: string | null | undefined): string {
  if (!snapshot || snapshot.trim().length < 20) return "";
  return [
    "",
    "===== CURRENT PROJECT CONTENT (last section — for continuity) =====",
    snapshot.slice(-800),
    "===== END PROJECT CONTENT =====",
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Main assembler
// ---------------------------------------------------------------------------

export interface AssembleOptions {
  domain: DomainType;
  style: StyleOverlay;
  checkpoint: Checkpoint | null;
  userPreferences: UserPreferences;
  userMemory?: string;
  settingsManifest?: string;
  contentSnapshot?: string;
  modeDirective?: string;
  playbookContent?: string;
}

export function assembleSystemPrompt(
  brainCore: string,
  options: AssembleOptions,
): string {
  const {
    domain,
    style,
    checkpoint,
    userPreferences,
    userMemory,
    settingsManifest,
    contentSnapshot,
    modeDirective,
    playbookContent,
  } = options;

  const parts: string[] = [];

  // 1. CZAR Brain core (universal intelligence rules)
  parts.push(brainCore);

  // 2. Domain Cognitive Core (domain-sovereign thinking apparatus)
  const core = getCore(domain);
  if (core) {
    parts.push("\n\n" + core);
  }

  // 3. Style Overlay (formatting and register constraints)
  const styleOverlay = getStyleOverlay(style);
  if (styleOverlay) {
    parts.push("\n\n" + styleOverlay);
  }

  // 4. Pre-Output Audit Protocol
  parts.push(buildAuditProtocol(domain, style));

  // 5. User Memory (persistent facts — highest priority over session)
  if (userMemory) {
    parts.push(userMemory);
  }

  // 6. User Preferences
  const prefsBlock = buildPreferencesBlock(userPreferences);
  if (prefsBlock) {
    parts.push(prefsBlock);
  }

  // 7. Settings Manifest (active toggles from user UI)
  if (settingsManifest) {
    parts.push(settingsManifest);
  }

  // 8. Checkpoint Restoration (stateful continuity)
  const checkpointBlock = buildCheckpointInjection(checkpoint, domain);
  if (checkpointBlock) {
    parts.push(checkpointBlock);
  }

  // 9. Current project content snapshot (writing context)
  const snapshotBlock = buildContentSnapshot(contentSnapshot);
  if (snapshotBlock) {
    parts.push(snapshotBlock);
  }

  // 10. Mode directive (write/research/plan/etc.)
  if (modeDirective) {
    parts.push("\n\n" + modeDirective);
  }

  // 11. Task playbook (orchestrated multi-step instructions)
  if (playbookContent) {
    parts.push("\n\n" + playbookContent);
  }

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Checkpoint extraction prompt — sent to a small model after the main response
// to extract structured state from the generated content.
// ---------------------------------------------------------------------------

export function buildCheckpointExtractionPrompt(
  domain: DomainType,
  content: string,
  userMessage: string,
): string {
  const domainInstructions: Record<DomainType, string> = {
    academic: `Extract: thesis statement (if present), current section name, list of sections completed so far, the last argument thread (1–2 sentences summarising the last substantive point made), any citations used (up to 5 most recent), concepts defined in this response.`,
    fiction: `Extract: chapter number (if mentioned), a 2–3 sentence scene summary, active character names, POV character name, POV mode (first_person/close_third/omniscient/second_person), tense (past/present), current conflict (1 sentence), scene location, emotional register.`,
    professional: `Extract: document type, primary audience, whether executive summary was written (yes/no), whether recommendations were stated (yes/no), list of key decisions mentioned, list of action items identified.`,
    journalistic: `Extract: the story angle (1 sentence), whether a lead was established (yes/no), sources consulted (names or types), key facts stated (up to 5), perspectives represented.`,
    personal: `Extract: the temporal position (what time period the piece is in), the emotional arc (1 sentence), voice markers (3–5 distinctive words/phrases that define the writer's voice), scenes completed, theme threads active.`,
    poetry: `Extract: form established (e.g. "free verse", "sonnet"), meter pattern if formal, image cluster (3–5 key images), current line count, whether the volta has been reached (yes/no), sound scheme (e.g. "ABAB", "slant rhyme throughout").`,
    chat: `Extract: the user's primary intent (1 sentence), key points made, any decisions reached, open questions remaining.`,
  };

  return `You are extracting structured state from a CZAR AI response for the ${domain} domain.

Content to analyse (last ${Math.min(content.length, 3000)} chars):
${content.slice(-3000)}

User's message was: "${userMessage.slice(0, 200)}"

${domainInstructions[domain]}

Return ONLY valid JSON with the relevant fields. Use null for fields you cannot determine.
Include a "lastOutputSummary" field: a 1–2 sentence summary of what was produced.
Example for academic: { "thesisStatement": "...", "currentSection": "...", "sectionOrder": [], "lastArgumentThread": "...", "citationQueue": [], "conceptsDefined": [], "lastOutputSummary": "..." }
Return only the JSON object — no markdown, no explanation.`;
}
