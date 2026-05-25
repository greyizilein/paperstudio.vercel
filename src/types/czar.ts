// CZAR Cognitive Architecture — TypeScript type definitions.
// Used by both the frontend and (duplicated where needed) the Deno edge function.

// ---------------------------------------------------------------------------
// Domain & Style
// ---------------------------------------------------------------------------

export type DomainType =
  | "academic"
  | "fiction"
  | "professional"
  | "journalistic"
  | "personal"
  | "poetry"
  | "chat";

// Academic citation styles
export type AcademicStyle =
  | "harvard"
  | "apa"
  | "chicago"
  | "mla"
  | "ieee"
  | "vancouver"
  | "oscola";

// Fiction compositional styles
export type FictionStyle =
  | "literary_minimalist"
  | "baroque"
  | "stream_of_consciousness"
  | "genre_thriller"
  | "genre_literary"
  | "voice_first";

// Professional document styles
export type ProfessionalStyle =
  | "executive"
  | "consulting"
  | "technical"
  | "legal_adjacent";

// Journalistic styles
export type JournalisticStyle =
  | "inverted_pyramid"
  | "feature"
  | "investigative"
  | "editorial"
  | "data_journalism";

// Personal writing styles
export type PersonalStyle =
  | "memoir"
  | "blog"
  | "personal_letter"
  | "journal"
  | "personal_statement";

// Poetry styles
export type PoetryStyle =
  | "free_verse"
  | "formal"
  | "prose_poetry"
  | "lyric_essay"
  | "found_poetry";

// Chat interaction styles
export type ChatStyle =
  | "direct_expert"
  | "socratic"
  | "collaborative"
  | "supportive";

export type StyleOverlay =
  | AcademicStyle
  | FictionStyle
  | ProfessionalStyle
  | JournalisticStyle
  | PersonalStyle
  | PoetryStyle
  | ChatStyle;

// ---------------------------------------------------------------------------
// Position tracking
// ---------------------------------------------------------------------------

export interface NarrativePosition {
  chapter?: number;
  sceneSummary: string;
  activeCharacters: string[];
  povCharacter?: string;
  povMode?: "first_person" | "close_third" | "omniscient" | "second_person";
  tense?: "past" | "present";
  currentConflict?: string;
  emotionalRegister?: string;
  sceneLocation?: string;
  wordCountAtCheckpoint: number;
}

export interface ArgumentPosition {
  thesisStatement?: string;
  claimDepth: number;           // 0=intro, 1=main, 2=sub-argument, 3=evidence
  currentSection?: string;
  sectionOrder: string[];
  lastArgumentThread: string;
  pendingCounterarguments: string[];
  citationQueue: string[];
  conceptsDefined: string[];
  wordCountAtCheckpoint: number;
}

export interface ProfessionalPosition {
  documentType?: string;
  primaryAudience?: string;
  keyDecisions: string[];
  actionItems: string[];
  recommendationsStated: boolean;
  execSummaryDone: boolean;
}

export interface JournalisticPosition {
  angle?: string;
  leadEstablished: boolean;
  sourcesConsulted: string[];
  keyFactsStated: string[];
  perspectivesRepresented: string[];
}

export interface PersonalPosition {
  temporalPosition?: string;
  emotionalArc?: string;
  voiceMarkers: string[];
  scenesCompleted: string[];
  themeThreads: string[];
}

export interface PoetryPosition {
  formEstablished?: string;
  meterPattern?: string;
  imageCluster: string[];
  lineCount: number;
  voltaReached: boolean;
  soundScheme?: string;
}

// ---------------------------------------------------------------------------
// Checkpoint
// ---------------------------------------------------------------------------

export interface DocumentMetrics {
  totalWords: number;
  sessionWords: number;
  paragraphCount: number;
  averageSentenceLength: number;
  citationCount: number;
  complexityScore: number;  // 0–100, derived from sentence/vocab complexity
}

export interface Checkpoint {
  id: string;
  timestamp: string;
  sessionTurnCount: number;
  domain: DomainType;
  style: StyleOverlay;
  lastUserIntent: string;
  lastOutputSummary: string;        // 1–3 sentence summary of the last response
  contextHash: string;              // SHA-256 of last 500 chars for dedup
  metrics: DocumentMetrics;
  // Only one of the position objects will be populated per checkpoint
  narrativePosition?: NarrativePosition;
  argumentPosition?: ArgumentPosition;
  professionalPosition?: ProfessionalPosition;
  journalisticPosition?: JournalisticPosition;
  personalPosition?: PersonalPosition;
  poetryPosition?: PoetryPosition;
}

// ---------------------------------------------------------------------------
// User preferences
// ---------------------------------------------------------------------------

export interface UserPreferences {
  preferredCitationStyle?: AcademicStyle;
  targetWordCount?: number;
  writingLevel?: "undergraduate" | "graduate" | "professional" | "expert";
  domainDefaults?: Partial<Record<DomainType, StyleOverlay>>;
  verbosity?: "concise" | "standard" | "comprehensive";
  autoDetectDomain?: boolean;
  language?: "UK" | "US";
  timezone?: string;
  customInstructions?: string;
}

// ---------------------------------------------------------------------------
// Project & State
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  userId: string;
  title: string;
  description?: string;
  contentSnapshot?: string;  // last ~500 words of project for context injection
  activeDomain: DomainType;
  styleOverlay: StyleOverlay;
  checkpointData: Checkpoint | null;
  userPreferences: UserPreferences;
  wordGoal?: number;
  deadline?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CzarState {
  projectId: string;
  userId: string;
  activeDomain: DomainType;
  activeStyle: StyleOverlay;
  checkpoint: Checkpoint | null;
  userPreferences: UserPreferences;
  sessionTurnCount: number;
  metadata: {
    createdAt: string;
    lastActiveAt: string;
    totalSessionCount: number;
    totalWordsGenerated: number;
  };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export interface RouterSignal {
  keyword: string;
  weight: number;
  domain: DomainType;
  styleHint?: StyleOverlay;
}

export interface RouterDecision {
  domain: DomainType;
  style: StyleOverlay;
  confidence: number;         // 0.0–1.0
  reasoning: string;
  detectedSignals: string[];
  overridden: boolean;        // true if user explicitly forced a domain
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export interface AuditResult {
  passed: boolean;
  domainCompliant: boolean;
  styleCompliant: boolean;
  citationsVerified: boolean;
  continuityMaintained: boolean;
  bannedPhrasesFound: string[];
  issues: string[];
  autoCorrections: string[];
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export interface CzarBrainRequest {
  projectId: string;
  conversationId?: string | null;
  userMessage: string;
  attachments?: Array<{
    storage_path: string;
    filename: string;
    size: number;
    mime: string;
  }>;
  overrideDomain?: DomainType;
  overrideStyle?: StyleOverlay;
  settings?: Record<string, unknown>;
}

export interface CzarBrainResponseMeta {
  conversationId: string;
  assistantId: string;
  domain: DomainType;
  style: StyleOverlay;
  modelLabel: string;
  checkpointId: string;
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export const DOMAIN_LABELS: Record<DomainType, string> = {
  academic:      "Academic",
  fiction:       "Fiction",
  professional:  "Professional",
  journalistic:  "Journalism",
  personal:      "Personal",
  poetry:        "Poetry",
  chat:          "Chat",
};

export const STYLE_LABELS: Record<string, string> = {
  harvard:                "Harvard",
  apa:                    "APA 7th",
  chicago:                "Chicago",
  mla:                    "MLA",
  ieee:                   "IEEE",
  vancouver:              "Vancouver",
  oscola:                 "OSCOLA",
  literary_minimalist:    "Literary Minimalist",
  baroque:                "Baroque",
  stream_of_consciousness:"Stream of Consciousness",
  genre_thriller:         "Genre: Thriller",
  genre_literary:         "Genre: Literary",
  voice_first:            "Voice-First",
  executive:              "Executive",
  consulting:             "Consulting",
  technical:              "Technical",
  legal_adjacent:         "Legal-Adjacent",
  inverted_pyramid:       "Inverted Pyramid",
  feature:                "Feature",
  investigative:          "Investigative",
  editorial:              "Editorial",
  data_journalism:        "Data Journalism",
  memoir:                 "Memoir",
  blog:                   "Blog / Essay",
  personal_letter:        "Personal Letter",
  journal:                "Journal",
  personal_statement:     "Personal Statement",
  free_verse:             "Free Verse",
  formal:                 "Formal (Sonnet/Villanelle)",
  prose_poetry:           "Prose Poetry",
  lyric_essay:            "Lyric Essay",
  found_poetry:           "Found Poetry",
  direct_expert:          "Direct / Expert",
  socratic:               "Socratic",
  collaborative:          "Collaborative",
  supportive:             "Supportive",
};

export const DEFAULT_DOMAIN_STYLES: Record<DomainType, StyleOverlay> = {
  academic:      "harvard",
  fiction:       "literary_minimalist",
  professional:  "executive",
  journalistic:  "inverted_pyramid",
  personal:      "memoir",
  poetry:        "free_verse",
  chat:          "direct_expert",
};
