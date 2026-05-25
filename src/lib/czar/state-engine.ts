// CZAR State Engine — Checkpoint creation, serialisation, and context restoration.
// Runs on the frontend for optimistic state and in the edge function for persistence.

import type {
  DomainType,
  StyleOverlay,
  Checkpoint,
  CzarState,
  DocumentMetrics,
  NarrativePosition,
  ArgumentPosition,
  ProfessionalPosition,
  JournalisticPosition,
  PersonalPosition,
  PoetryPosition,
  UserPreferences,
} from "@/types/czar";

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function countSentences(text: string): number {
  const matches = text.match(/[.!?]+\s/g);
  return matches ? matches.length : 1;
}

export function countParagraphs(text: string): number {
  return text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;
}

export function countCitations(text: string): number {
  // Harvard/APA pattern: (Author, Year) or (Author et al., Year)
  const harvard = (text.match(/\([A-Z][a-zA-Z-]+(?:\s+(?:et al\.|and\s+[A-Z][a-zA-Z-]+))?,\s*\d{4}\)/g) ?? []).length;
  // Numbered: [1], [2,3], etc.
  const numbered = (text.match(/\[\d+(?:,\s*\d+)*\]/g) ?? []).length;
  return harvard + numbered;
}

export function averageSentenceLength(text: string): number {
  const words = countWords(text);
  const sentences = countSentences(text);
  return sentences > 0 ? Math.round(words / sentences) : 0;
}

export function computeComplexityScore(text: string): number {
  // Simplified Flesch Reading Ease inverse (0=simple, 100=complex)
  const words = countWords(text);
  const sentences = countSentences(text);
  const syllables = estimateSyllables(text);
  if (words === 0 || sentences === 0) return 0;
  const ease = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  // Invert and clamp to 0–100 (higher = more complex)
  return Math.min(100, Math.max(0, Math.round(100 - ease)));
}

function estimateSyllables(text: string): number {
  return text.toLowerCase().replace(/[^a-z]/g, " ").split(/\s+/).reduce((sum, word) => {
    if (!word) return sum;
    // Simple syllable estimation: count vowel groups
    const vowelGroups = word.match(/[aeiouy]+/g);
    let count = vowelGroups ? vowelGroups.length : 1;
    if (word.endsWith("e") && count > 1) count--;
    return sum + Math.max(1, count);
  }, 0);
}

export function buildMetrics(
  content: string,
  priorMetrics: DocumentMetrics | null,
  sessionWords: number,
): DocumentMetrics {
  const totalWords = countWords(content);
  return {
    totalWords,
    sessionWords: sessionWords + countWords(content),
    paragraphCount: countParagraphs(content),
    averageSentenceLength: averageSentenceLength(content),
    citationCount: countCitations(content),
    complexityScore: computeComplexityScore(content.slice(-2000)), // sample last 2k chars
  };
}

// ---------------------------------------------------------------------------
// Context hash (lightweight dedup, no crypto API required)
// ---------------------------------------------------------------------------

export function simpleHash(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function contextHash(content: string): string {
  return simpleHash(content.slice(-500));
}

// ---------------------------------------------------------------------------
// Position extraction (lightweight heuristic — deep extraction happens server-side)
// ---------------------------------------------------------------------------

export function extractArgumentPosition(
  content: string,
  userMessage: string,
  prior?: ArgumentPosition,
): ArgumentPosition {
  const thesisMatch = content.match(/(?:^|\n)#\s+[^\n]+/);
  const headings = Array.from(content.matchAll(/^#{1,3}\s+(.+)/gm)).map((m) => m[1]);
  const citations = Array.from(
    content.matchAll(/\([A-Z][a-zA-Z-]+(?:\s+et al\.)?,\s*\d{4}\)/g),
  ).map((m) => m[0]);

  const lastThread = content.split(/\n\n/).filter(Boolean).slice(-2).join(" ").slice(0, 300);

  const depth = headings.length > 0 ? Math.min(3, headings.length) : (prior?.claimDepth ?? 0);

  return {
    thesisStatement: thesisMatch ? thesisMatch[0].replace(/^#+\s*/, "") : prior?.thesisStatement,
    claimDepth: depth,
    currentSection: headings[headings.length - 1] ?? prior?.currentSection,
    sectionOrder: headings.length > 0 ? headings : (prior?.sectionOrder ?? []),
    lastArgumentThread: lastThread,
    pendingCounterarguments: prior?.pendingCounterarguments ?? [],
    citationQueue: citations.slice(-5),
    conceptsDefined: prior?.conceptsDefined ?? [],
    wordCountAtCheckpoint: countWords(content),
  };
}

export function extractNarrativePosition(
  content: string,
  prior?: NarrativePosition,
): NarrativePosition {
  const paragraphs = content.split(/\n\n/).filter(Boolean);
  const lastPara = paragraphs.slice(-2).join(" ").slice(0, 400);

  // Detect POV from first person singular presence
  const hasFP = /\b(I |I'm|I've|I'd|I'll|my |me )\b/i.test(content.slice(0, 500));
  const hasThirdM = /\b(he |him |his )\b/.test(content.slice(0, 200));
  const hasThirdF = /\b(she |her |hers )\b/.test(content.slice(0, 200));

  let povMode = prior?.povMode ?? "close_third";
  if (hasFP) povMode = "first_person";
  else if (hasThirdM || hasThirdF) povMode = "close_third";

  // Detect tense
  const pastTenseVerbs = (content.match(/\b(was|were|had|said|went|came|felt|saw|heard|knew)\b/g) ?? []).length;
  const presentTenseVerbs = (content.match(/\b(is|are|has|says|goes|comes|feels|sees|hears|knows)\b/g) ?? []).length;
  const tense = pastTenseVerbs >= presentTenseVerbs ? "past" : "present";

  return {
    chapter: prior?.chapter,
    sceneSummary: lastPara,
    activeCharacters: prior?.activeCharacters ?? [],
    povCharacter: prior?.povCharacter,
    povMode,
    tense,
    currentConflict: prior?.currentConflict,
    emotionalRegister: prior?.emotionalRegister,
    sceneLocation: prior?.sceneLocation,
    wordCountAtCheckpoint: countWords(content),
  };
}

export function extractProfessionalPosition(
  content: string,
  prior?: ProfessionalPosition,
): ProfessionalPosition {
  const hasExecSummary = /executive summary/i.test(content);
  const headings = Array.from(content.matchAll(/^#{1,3}\s+(.+)/gm)).map((m) => m[1]);
  const recommendations = content.match(/^#{1,3}\s+recommendations?/im) !== null;

  return {
    documentType: prior?.documentType,
    primaryAudience: prior?.primaryAudience,
    keyDecisions: prior?.keyDecisions ?? [],
    actionItems: prior?.actionItems ?? [],
    recommendationsStated: recommendations,
    execSummaryDone: hasExecSummary,
  };
}

export function extractJournalisticPosition(
  content: string,
  prior?: JournalisticPosition,
): JournalisticPosition {
  const firstPara = content.split(/\n\n/)[0] ?? "";
  return {
    angle: prior?.angle ?? firstPara.slice(0, 100),
    leadEstablished: firstPara.length > 30,
    sourcesConsulted: prior?.sourcesConsulted ?? [],
    keyFactsStated: prior?.keyFactsStated ?? [],
    perspectivesRepresented: prior?.perspectivesRepresented ?? [],
  };
}

export function extractPersonalPosition(
  content: string,
  prior?: PersonalPosition,
): PersonalPosition {
  return {
    temporalPosition: prior?.temporalPosition,
    emotionalArc: prior?.emotionalArc,
    voiceMarkers: prior?.voiceMarkers ?? [],
    scenesCompleted: prior?.scenesCompleted ?? [],
    themeThreads: prior?.themeThreads ?? [],
  };
}

export function extractPoetryPosition(
  content: string,
  prior?: PoetryPosition,
): PoetryPosition {
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  return {
    formEstablished: prior?.formEstablished,
    meterPattern: prior?.meterPattern,
    imageCluster: prior?.imageCluster ?? [],
    lineCount: lines.length,
    voltaReached: prior?.voltaReached ?? false,
    soundScheme: prior?.soundScheme,
  };
}

// ---------------------------------------------------------------------------
// Checkpoint creation
// ---------------------------------------------------------------------------

export function createCheckpoint(params: {
  domain: DomainType;
  style: StyleOverlay;
  content: string;
  userMessage: string;
  sessionTurnCount: number;
  priorCheckpoint: Checkpoint | null;
}): Checkpoint {
  const { domain, style, content, userMessage, sessionTurnCount, priorCheckpoint } = params;

  const metrics = buildMetrics(
    content,
    priorCheckpoint?.metrics ?? null,
    priorCheckpoint?.metrics?.sessionWords ?? 0,
  );

  // Summarise the output (take the last meaningful paragraph)
  const paragraphs = content.split(/\n\n/).filter((p) => p.trim().length > 20);
  const lastOutputSummary = paragraphs.slice(-1)[0]?.slice(0, 300) ?? content.slice(-300);

  const checkpoint: Checkpoint = {
    id: `ckpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    sessionTurnCount,
    domain,
    style,
    lastUserIntent: userMessage.slice(0, 200),
    lastOutputSummary,
    contextHash: contextHash(content),
    metrics,
  };

  // Attach domain-specific position
  switch (domain) {
    case "academic":
      checkpoint.argumentPosition = extractArgumentPosition(
        content,
        userMessage,
        priorCheckpoint?.argumentPosition,
      );
      break;
    case "fiction":
      checkpoint.narrativePosition = extractNarrativePosition(
        content,
        priorCheckpoint?.narrativePosition,
      );
      break;
    case "professional":
      checkpoint.professionalPosition = extractProfessionalPosition(
        content,
        priorCheckpoint?.professionalPosition,
      );
      break;
    case "journalistic":
      checkpoint.journalisticPosition = extractJournalisticPosition(
        content,
        priorCheckpoint?.journalisticPosition,
      );
      break;
    case "personal":
      checkpoint.personalPosition = extractPersonalPosition(
        content,
        priorCheckpoint?.personalPosition,
      );
      break;
    case "poetry":
      checkpoint.poetryPosition = extractPoetryPosition(
        content,
        priorCheckpoint?.poetryPosition,
      );
      break;
  }

  return checkpoint;
}

// ---------------------------------------------------------------------------
// State serialisation / deserialisation
// ---------------------------------------------------------------------------

export function serialiseState(state: CzarState): string {
  return JSON.stringify(state);
}

export function deserialiseState(raw: string | null | undefined): CzarState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.projectId === "string") return parsed as CzarState;
    return null;
  } catch {
    return null;
  }
}

export function serialiseCheckpoint(checkpoint: Checkpoint | null): string | null {
  if (!checkpoint) return null;
  return JSON.stringify(checkpoint);
}

export function deserialiseCheckpoint(raw: string | Record<string, unknown> | null | undefined): Checkpoint | null {
  if (!raw) return null;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed.id === "string") return parsed as Checkpoint;
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Context restoration — builds a "Checkpoint Injection" block for the system prompt
// ---------------------------------------------------------------------------

export function buildCheckpointInjection(checkpoint: Checkpoint | null, domain: DomainType): string {
  if (!checkpoint) return "";

  const lines: string[] = [
    "",
    "===== CZAR CHECKPOINT — RESTORE CONTINUITY EXACTLY =====",
    `Domain: ${checkpoint.domain} | Style: ${checkpoint.style}`,
    `Session turn: ${checkpoint.sessionTurnCount} | Words so far: ${checkpoint.metrics.totalWords}`,
    `Last user intent: "${checkpoint.lastUserIntent}"`,
    `Last output summary: "${checkpoint.lastOutputSummary}"`,
  ];

  if (domain === "academic" && checkpoint.argumentPosition) {
    const p = checkpoint.argumentPosition;
    lines.push(`\nARGUMENT STATE:`);
    if (p.thesisStatement) lines.push(`  Thesis: "${p.thesisStatement}"`);
    if (p.currentSection) lines.push(`  Current section: ${p.currentSection}`);
    if (p.sectionOrder.length > 0) lines.push(`  Section order: ${p.sectionOrder.join(" → ")}`);
    lines.push(`  Argument depth: ${p.claimDepth} (0=intro, 3=evidence)`);
    lines.push(`  Last thread: "${p.lastArgumentThread}"`);
    if (p.pendingCounterarguments.length > 0) {
      lines.push(`  Pending counterarguments: ${p.pendingCounterarguments.join(", ")}`);
    }
    if (p.citationQueue.length > 0) {
      lines.push(`  Recent citations: ${p.citationQueue.join(", ")}`);
    }
    if (p.conceptsDefined.length > 0) {
      lines.push(`  Concepts already defined: ${p.conceptsDefined.join(", ")} — do NOT re-define`);
    }
  }

  if (domain === "fiction" && checkpoint.narrativePosition) {
    const p = checkpoint.narrativePosition;
    lines.push(`\nNARRATIVE STATE:`);
    if (p.chapter) lines.push(`  Chapter: ${p.chapter}`);
    lines.push(`  Scene summary: "${p.sceneSummary}"`);
    if (p.activeCharacters.length > 0) lines.push(`  Active characters: ${p.activeCharacters.join(", ")}`);
    if (p.povCharacter) lines.push(`  POV: ${p.povCharacter} (${p.povMode ?? "close_third"})`);
    if (p.tense) lines.push(`  Tense: ${p.tense}`);
    if (p.currentConflict) lines.push(`  Current conflict: ${p.currentConflict}`);
    if (p.sceneLocation) lines.push(`  Scene location: ${p.sceneLocation}`);
    if (p.emotionalRegister) lines.push(`  Emotional register: ${p.emotionalRegister}`);
  }

  if (domain === "professional" && checkpoint.professionalPosition) {
    const p = checkpoint.professionalPosition;
    lines.push(`\nDOCUMENT STATE:`);
    if (p.documentType) lines.push(`  Document type: ${p.documentType}`);
    if (p.primaryAudience) lines.push(`  Primary audience: ${p.primaryAudience}`);
    lines.push(`  Executive summary: ${p.execSummaryDone ? "done" : "not yet written"}`);
    lines.push(`  Recommendations: ${p.recommendationsStated ? "stated" : "pending"}`);
    if (p.keyDecisions.length > 0) lines.push(`  Key decisions: ${p.keyDecisions.join("; ")}`);
  }

  if (domain === "journalistic" && checkpoint.journalisticPosition) {
    const p = checkpoint.journalisticPosition;
    lines.push(`\nSTORY STATE:`);
    if (p.angle) lines.push(`  Angle: "${p.angle}"`);
    lines.push(`  Lead: ${p.leadEstablished ? "established" : "not yet written"}`);
    if (p.sourcesConsulted.length > 0) lines.push(`  Sources consulted: ${p.sourcesConsulted.join(", ")}`);
  }

  if (domain === "personal" && checkpoint.personalPosition) {
    const p = checkpoint.personalPosition;
    lines.push(`\nNARRATIVE STATE:`);
    if (p.temporalPosition) lines.push(`  Temporal position: ${p.temporalPosition}`);
    if (p.emotionalArc) lines.push(`  Emotional arc: ${p.emotionalArc}`);
    if (p.themeThreads.length > 0) lines.push(`  Active themes: ${p.themeThreads.join(", ")}`);
  }

  if (domain === "poetry" && checkpoint.poetryPosition) {
    const p = checkpoint.poetryPosition;
    lines.push(`\nPOEM STATE:`);
    if (p.formEstablished) lines.push(`  Form: ${p.formEstablished}`);
    if (p.meterPattern) lines.push(`  Meter: ${p.meterPattern}`);
    lines.push(`  Lines so far: ${p.lineCount}`);
    lines.push(`  Volta reached: ${p.voltaReached ? "yes" : "no"}`);
    if (p.imageCluster.length > 0) lines.push(`  Image cluster: ${p.imageCluster.join(", ")}`);
  }

  lines.push(
    "",
    "INSTRUCTION: Resume EXACTLY from this state. Do not re-introduce characters, re-state",
    "the thesis, or re-establish context that is already established. Continue as if the",
    "reader has the previous content in front of them.",
    "===== END CHECKPOINT =====",
    "",
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// User preference injection
// ---------------------------------------------------------------------------

export function buildPreferencesBlock(prefs: UserPreferences): string {
  if (!prefs || Object.keys(prefs).length === 0) return "";

  const lines: string[] = [];
  if (prefs.language) lines.push(`Language variant: ${prefs.language} English.`);
  if (prefs.preferredCitationStyle) lines.push(`Preferred citation style: ${prefs.preferredCitationStyle.toUpperCase()}.`);
  if (prefs.writingLevel) lines.push(`Writing level: ${prefs.writingLevel}.`);
  if (prefs.verbosity) lines.push(`Output verbosity: ${prefs.verbosity}.`);
  if (prefs.targetWordCount) lines.push(`Target word count: ${prefs.targetWordCount} words.`);
  if (prefs.customInstructions) lines.push(`Custom instructions: ${prefs.customInstructions}`);

  if (lines.length === 0) return "";
  return [
    "",
    "===== USER PREFERENCES =====",
    ...lines.map((l) => `• ${l}`),
    "===== END USER PREFERENCES =====",
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Empty / initial state factories
// ---------------------------------------------------------------------------

export function createInitialState(
  projectId: string,
  userId: string,
  domain: DomainType = "academic",
  style: StyleOverlay = "harvard",
  prefs: UserPreferences = {},
): CzarState {
  return {
    projectId,
    userId,
    activeDomain: domain,
    activeStyle: style,
    checkpoint: null,
    userPreferences: prefs,
    sessionTurnCount: 0,
    metadata: {
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      totalSessionCount: 1,
      totalWordsGenerated: 0,
    },
  };
}

export function advanceState(
  state: CzarState,
  newDomain: DomainType,
  newStyle: StyleOverlay,
  newCheckpoint: Checkpoint,
): CzarState {
  return {
    ...state,
    activeDomain: newDomain,
    activeStyle: newStyle,
    checkpoint: newCheckpoint,
    sessionTurnCount: state.sessionTurnCount + 1,
    metadata: {
      ...state.metadata,
      lastActiveAt: new Date().toISOString(),
      totalWordsGenerated:
        state.metadata.totalWordsGenerated + newCheckpoint.metrics.sessionWords,
    },
  };
}
