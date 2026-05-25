// czar-brain — Stateful Cognitive Architecture endpoint.
// Wraps the domain-sovereign cognitive core system over the existing multi-provider AI stack.
// Persists Checkpoint state to czar_project_state after every turn.
//
// POST /functions/v1/czar-brain
// Body: CzarBrainRequest (see types below)
// Returns: SSE stream

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// ---------------------------------------------------------------------------
// Inline types (Deno edge cannot import from src/)
// ---------------------------------------------------------------------------

type DomainType = "academic" | "fiction" | "professional" | "journalistic" | "personal" | "poetry" | "chat";
type StyleOverlay = string;

interface Checkpoint {
  id: string;
  timestamp: string;
  sessionTurnCount: number;
  domain: DomainType;
  style: StyleOverlay;
  lastUserIntent: string;
  lastOutputSummary: string;
  contextHash: string;
  metrics: {
    totalWords: number;
    sessionWords: number;
    paragraphCount: number;
    averageSentenceLength: number;
    citationCount: number;
    complexityScore: number;
  };
  argumentPosition?: {
    thesisStatement?: string;
    claimDepth: number;
    currentSection?: string;
    sectionOrder: string[];
    lastArgumentThread: string;
    pendingCounterarguments: string[];
    citationQueue: string[];
    conceptsDefined: string[];
    wordCountAtCheckpoint: number;
  };
  narrativePosition?: {
    chapter?: number;
    sceneSummary: string;
    activeCharacters: string[];
    povCharacter?: string;
    povMode?: string;
    tense?: string;
    currentConflict?: string;
    emotionalRegister?: string;
    sceneLocation?: string;
    wordCountAtCheckpoint: number;
  };
  professionalPosition?: Record<string, unknown>;
  journalisticPosition?: Record<string, unknown>;
  personalPosition?: Record<string, unknown>;
  poetryPosition?: Record<string, unknown>;
}

interface ProjectState {
  projectId: string;
  userId: string;
  activeDomain: DomainType;
  activeStyle: StyleOverlay;
  checkpoint: Checkpoint | null;
  userPreferences: Record<string, unknown>;
}

interface CzarBrainRequest {
  project_id?: string;
  conversation_id?: string | null;
  user_message: string;
  attachments?: Array<{ storage_path: string; filename: string; size: number; mime: string }>;
  override_domain?: DomainType;
  override_style?: StyleOverlay;
  settings?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// Model roster (mirrors czar-chat for consistency)
// ---------------------------------------------------------------------------

const G_FAST = "gemini-3.5-flash";
const G_LITE = "gemini-3.1-flash-lite";
const C_SONNET = "claude-sonnet-4-6";
const C_OPUS = "claude-opus-4-7";
const ADMIN_EMAIL = "grey.izilein@gmail.com";

// ---------------------------------------------------------------------------
// Cognitive Cores (inlined — Deno cannot import from src/)
// ---------------------------------------------------------------------------

const DOMAIN_SIGNALS: Array<{ keyword: string; weight: number; domain: DomainType; styleHint?: string }> = [
  { keyword: "essay", weight: 0.7, domain: "academic" },
  { keyword: "dissertation", weight: 0.9, domain: "academic" },
  { keyword: "thesis", weight: 0.85, domain: "academic" },
  { keyword: "literature review", weight: 0.95, domain: "academic" },
  { keyword: "research paper", weight: 0.9, domain: "academic" },
  { keyword: "coursework", weight: 0.85, domain: "academic" },
  { keyword: "apa", weight: 0.8, domain: "academic", styleHint: "apa" },
  { keyword: "harvard referencing", weight: 0.8, domain: "academic", styleHint: "harvard" },
  { keyword: "chicago", weight: 0.7, domain: "academic", styleHint: "chicago" },
  { keyword: "ieee", weight: 0.8, domain: "academic", styleHint: "ieee" },
  { keyword: "vancouver", weight: 0.75, domain: "academic", styleHint: "vancouver" },
  { keyword: "case study", weight: 0.7, domain: "academic" },
  { keyword: "critically analyse", weight: 0.9, domain: "academic" },
  { keyword: "compare and contrast", weight: 0.85, domain: "academic" },
  { keyword: "short story", weight: 0.9, domain: "fiction" },
  { keyword: "opening chapter", weight: 0.85, domain: "fiction" },
  { keyword: "flash fiction", weight: 0.9, domain: "fiction" },
  { keyword: "creative writing", weight: 0.8, domain: "fiction" },
  { keyword: "stream of consciousness", weight: 0.85, domain: "fiction", styleHint: "stream_of_consciousness" },
  { keyword: "business report", weight: 0.9, domain: "professional" },
  { keyword: "executive summary", weight: 0.85, domain: "professional", styleHint: "executive" },
  { keyword: "white paper", weight: 0.85, domain: "professional" },
  { keyword: "business proposal", weight: 0.9, domain: "professional" },
  { keyword: "news article", weight: 0.9, domain: "journalistic", styleHint: "inverted_pyramid" },
  { keyword: "investigative", weight: 0.85, domain: "journalistic", styleHint: "investigative" },
  { keyword: "feature article", weight: 0.85, domain: "journalistic", styleHint: "feature" },
  { keyword: "op-ed", weight: 0.85, domain: "journalistic", styleHint: "editorial" },
  { keyword: "personal statement", weight: 0.9, domain: "personal", styleHint: "personal_statement" },
  { keyword: "memoir", weight: 0.9, domain: "personal", styleHint: "memoir" },
  { keyword: "journal entry", weight: 0.9, domain: "personal", styleHint: "journal" },
  { keyword: "ucas", weight: 0.9, domain: "personal", styleHint: "personal_statement" },
  { keyword: "poem", weight: 0.95, domain: "poetry" },
  { keyword: "sonnet", weight: 0.95, domain: "poetry", styleHint: "formal" },
  { keyword: "free verse", weight: 0.9, domain: "poetry", styleHint: "free_verse" },
  { keyword: "haiku", weight: 0.95, domain: "poetry", styleHint: "formal" },
  { keyword: "lyric essay", weight: 0.9, domain: "poetry", styleHint: "lyric_essay" },
];

const DEFAULT_DOMAIN_STYLES: Record<DomainType, string> = {
  academic:     "harvard",
  fiction:      "literary_minimalist",
  professional: "executive",
  journalistic: "inverted_pyramid",
  personal:     "memoir",
  poetry:       "free_verse",
  chat:         "direct_expert",
};

function routeRequest(
  message: string,
  priorDomain: DomainType | null,
  prefs: Record<string, unknown>,
  overrideDomain?: DomainType,
  overrideStyle?: StyleOverlay,
): { domain: DomainType; style: StyleOverlay; confidence: number } {
  if (overrideDomain) {
    return { domain: overrideDomain, style: overrideStyle ?? DEFAULT_DOMAIN_STYLES[overrideDomain], confidence: 1.0 };
  }

  const lower = message.toLowerCase();
  const scores: Record<DomainType, number> = { academic: 0, fiction: 0, professional: 0, journalistic: 0, personal: 0, poetry: 0, chat: 0 };
  let winnerStyleHint: string | undefined;

  for (const s of DOMAIN_SIGNALS) {
    if (lower.includes(s.keyword)) {
      scores[s.domain] = Math.min(1.0, scores[s.domain] + s.weight);
      if (s.styleHint && scores[s.domain] >= 0.7 && !winnerStyleHint) winnerStyleHint = s.styleHint;
    }
  }

  if (priorDomain && priorDomain !== "chat" && scores[priorDomain] > 0) {
    scores[priorDomain] = Math.min(1.0, scores[priorDomain] + 0.25);
  }

  const maxScore = Math.max(...Object.values(scores));
  if (maxScore < 0.3) {
    if (priorDomain && priorDomain !== "chat") {
      return { domain: priorDomain, style: DEFAULT_DOMAIN_STYLES[priorDomain], confidence: 0.5 };
    }
    return { domain: "chat", style: "direct_expert", confidence: 0.6 };
  }

  const winner = (Object.entries(scores) as [DomainType, number][]).sort((a, b) => b[1] - a[1])[0][0];
  const prefCite = prefs.preferredCitationStyle as string | undefined;
  const style: StyleOverlay =
    overrideStyle ??
    (winner === "academic" && prefCite ? prefCite : undefined) ??
    winnerStyleHint ??
    DEFAULT_DOMAIN_STYLES[winner];

  return { domain: winner, style, confidence: Math.min(0.98, 0.5 + maxScore / 2) };
}

// ---------------------------------------------------------------------------
// Cognitive core text (abbreviated domain cores — full cores in src/lib/czar/cores.ts)
// ---------------------------------------------------------------------------

const DOMAIN_CORE_ADDITIONS: Record<DomainType, string> = {
  academic: `
ACTIVE COGNITIVE CORE: ACADEMIC
You are now operating as a domain-sovereign academic intelligence.
- Semantic hierarchy: thesis → first-order claims → evidence → qualifications. This is not visual structure; it is logical structure.
- Every empirical claim carries a citation. No floating assertions.
- Hedge with precision: "suggests", "indicates", "appears to" — never "proves" unless the evidence warrants it.
- Synthesis over summary: position each source within the web of related evidence.
- Paragraph discipline: 150–300 words per paragraph, one organising claim per paragraph.
- No bullet lists in academic body prose.
- Reference section at the end: complete, alphabetised, matching every in-text citation.`,

  fiction: `
ACTIVE COGNITIVE CORE: FICTION
You are now operating as a domain-sovereign fiction intelligence.
- Character interiority: inhabit, do not describe. Never write "she felt sad." Show the physical weight of it.
- Subtext: characters never say what they most deeply mean. Dialogue circles the real subject.
- Sensory grounding: anchor every scene in at least 3 sensory registers within the first 100 words.
- Scene economy: every scene does at least two of: advance story, reveal character, change a relationship.
- No AI-fingerprint language: no "she found herself", "he couldn't help but", "a surge of emotion".
- Vary sentence length aggressively. Uniform sentence length is the surest sign of machine prose.`,

  professional: `
ACTIVE COGNITIVE CORE: PROFESSIONAL
You are now operating as a domain-sovereign professional intelligence.
- Pyramid principle: conclusion first. Every document. The main point in the first paragraph.
- Recommendations: specific, actionable, time-bound. Not "improve X" but "reduce X by Y% by [date] by doing Z".
- Numbers: specific. "43% increase" not "significant growth". Always cite the source.
- Active voice throughout. No passive constructions that hide agency.
- Executive Summary first if over 1,500 words (150–200 words, covering purpose + key findings + recommendations).`,

  journalistic: `
ACTIVE COGNITIVE CORE: JOURNALISTIC
You are now operating as a domain-sovereign journalistic intelligence.
- Lede: the most important fact in 25 words or fewer. No scene-setting before the news.
- Attribution: every contested fact attributed to a named source or document.
- Balance: represent the strongest version of each legitimate perspective — not strawmen.
- Active voice: never obscure agency with passive constructions.
- Quotes: only when the phrasing itself matters, not to restate the paraphrase.`,

  personal: `
ACTIVE COGNITIVE CORE: PERSONAL
You are now operating as a domain-sovereign personal writing intelligence.
- Specificity: one true, concrete detail is worth three general statements.
- The essay thinks on the page: allow uncertainty, allow the process of reasoning to be visible.
- Vulnerability without self-pity: look at difficulty with sufficient distance to understand it.
- Voice: the cognitive signature of the writer — rhythm, diction, what is noticed, ratio of irony to sincerity.
- Time transitions: marked clearly. The reader must always know when they are.`,

  poetry: `
ACTIVE COGNITIVE CORE: POETRY
You are now operating as a domain-sovereign poetry intelligence.
- Every line break is deliberate: emphasis, suspension, or juxtaposition.
- Images carry the emotion: never name the feeling. Let the concrete particular carry it.
- Sound is meaning: phoneme choice, assonance, consonance, rhythm are not decorative.
- Compression: every word earns its place by multiple criteria simultaneously.
- The volta must be earned: the poem turns where it has been prepared to turn, without announcing it.`,

  chat: `
ACTIVE COGNITIVE CORE: CHAT
You are now operating as a direct, knowledgeable conversational intelligence.
- State the answer first. Context follows.
- Calibrate length to genuine complexity: a simple question gets a simple answer.
- Form and hold opinions: "I think X because Y" not "some might argue...".
- No hollow affirmations. No meta-commentary. No offers to help further.`,
};

// ---------------------------------------------------------------------------
// Pre-Output Audit (inlined for Deno)
// ---------------------------------------------------------------------------

function buildAudit(domain: DomainType, style: StyleOverlay): string {
  const domainChecks: Record<DomainType, string[]> = {
    academic:     ["Every evidence-based claim has an in-text citation.", "No bullet points in academic body prose.", "Register is formal, third-person, no contractions.", "References section is complete."],
    fiction:      ["Scene is grounded in 2+ sensory registers.", "No emotion named directly — shown through action/sensation.", "No AI-fingerprint phrases.", "POV is consistent within this scene."],
    professional: ["Main conclusion in first paragraph.", "Recommendations are specific and time-bound.", "Statistics attributed to sources.", "Active voice throughout."],
    journalistic: ["Lede states most important fact in ≤25 words.", "Every contested claim attributed.", "Active voice — no passive that hides agency."],
    personal:     ["Grounded in specific concrete detail.", "Voice is consistent.", "No self-pity — observation without wallowing."],
    poetry:       ["Every line break is deliberate.", "No emotion named directly.", "Sound pattern is intentional."],
    chat:         ["Response is exactly as long as needed.", "No hollow affirmations.", "Opinion stated as opinion, not fact."],
  };

  return `
[CZAR PRE-OUTPUT AUDIT — SILENT — DO NOT RENDER]
Universal:
□ Output begins with real content — no preamble, no meta-commentary.
□ Output ends cleanly — no "I hope this helps", no "let me know".
□ Banned phrases eliminated: "It is important to note", "Delving into", "In the realm of",
  "Tapestry", "Seamlessly", "Furthermore" (opener), "In conclusion" (opener),
  "This essay will explore", "Feel free to", "Let me know if".
□ No 3+ consecutive sentences of same length/structure.

Domain-specific (${domain} / ${style}):
${(domainChecks[domain] ?? []).map((c) => `□ ${c}`).join("\n")}

Continuity: No contradiction with checkpoint state. No re-introduction of already-established elements.
Fix any failure before producing visible output.
[END AUDIT — BEGIN OUTPUT]
`;
}

// ---------------------------------------------------------------------------
// Checkpoint injection for system prompt
// ---------------------------------------------------------------------------

function buildCheckpointBlock(cp: Checkpoint | null, domain: DomainType): string {
  if (!cp) return "";

  const lines = [
    "\n===== CZAR CHECKPOINT — RESTORE CONTINUITY =====",
    `Domain: ${cp.domain} | Style: ${cp.style} | Turn: ${cp.sessionTurnCount} | Words: ${cp.metrics.totalWords}`,
    `Last intent: "${cp.lastUserIntent}"`,
    `Last output: "${cp.lastOutputSummary}"`,
  ];

  if (domain === "academic" && cp.argumentPosition) {
    const p = cp.argumentPosition;
    if (p.thesisStatement) lines.push(`Thesis: "${p.thesisStatement}"`);
    if (p.currentSection) lines.push(`Current section: ${p.currentSection}`);
    if (p.sectionOrder.length) lines.push(`Sections: ${p.sectionOrder.join(" → ")}`);
    lines.push(`Last thread: "${p.lastArgumentThread}"`);
    if (p.citationQueue.length) lines.push(`Recent citations: ${p.citationQueue.join(", ")}`);
    if (p.conceptsDefined.length) lines.push(`Already defined: ${p.conceptsDefined.join(", ")} — do NOT re-define`);
  }

  if (domain === "fiction" && cp.narrativePosition) {
    const p = cp.narrativePosition;
    lines.push(`Scene: "${p.sceneSummary}"`);
    if (p.activeCharacters.length) lines.push(`Characters: ${p.activeCharacters.join(", ")}`);
    if (p.povCharacter) lines.push(`POV: ${p.povCharacter} (${p.povMode ?? "close_third"}), tense: ${p.tense}`);
    if (p.currentConflict) lines.push(`Conflict: ${p.currentConflict}`);
    if (p.sceneLocation) lines.push(`Location: ${p.sceneLocation}`);
  }

  lines.push(
    "INSTRUCTION: Continue seamlessly. Do not re-introduce, re-state, or re-establish anything already established.",
    "===== END CHECKPOINT =====\n",
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// State management — load / save
// ---------------------------------------------------------------------------

async function loadProjectState(
  projectId: string | undefined,
  userId: string,
  svc: SupabaseClient,
): Promise<ProjectState | null> {
  if (!projectId) return null;
  try {
    const { data } = await svc
      .from("czar_project_state")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!data) return null;

    return {
      projectId: data.project_id,
      userId: data.user_id,
      activeDomain: (data.active_domain ?? "academic") as DomainType,
      activeStyle: data.style_overlay ?? "harvard",
      checkpoint: data.checkpoint_data ?? null,
      userPreferences: data.user_preferences ?? {},
    };
  } catch {
    return null;
  }
}

async function saveProjectState(
  state: ProjectState,
  checkpoint: Checkpoint,
  domain: DomainType,
  style: StyleOverlay,
  svc: SupabaseClient,
): Promise<void> {
  try {
    await svc.from("czar_project_state").upsert({
      project_id: state.projectId,
      user_id: state.userId,
      active_domain: domain,
      style_overlay: style,
      checkpoint_data: checkpoint,
      user_preferences: state.userPreferences,
      updated_at: new Date().toISOString(),
    }, { onConflict: "project_id,user_id" });
  } catch {
    // non-fatal — state will be rebuilt on next turn
  }
}

// ---------------------------------------------------------------------------
// Checkpoint creation (lightweight heuristic extraction)
// ---------------------------------------------------------------------------

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function simpleHash(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function createCheckpointFromContent(
  domain: DomainType,
  style: StyleOverlay,
  content: string,
  userMessage: string,
  prior: Checkpoint | null,
  turnCount: number,
): Checkpoint {
  const words = wordCount(content);
  const paragraphs = content.split(/\n\n/).filter((p) => p.trim().length > 20);
  const lastSummary = paragraphs.slice(-1)[0]?.slice(0, 300) ?? content.slice(-300);
  const sentences = content.match(/[.!?]+\s/g)?.length ?? 1;
  const avgSent = sentences > 0 ? Math.round(words / sentences) : 0;
  const citations =
    (content.match(/\([A-Z][a-zA-Z-]+(?:\s+et al\.)?,\s*\d{4}\)/g)?.length ?? 0) +
    (content.match(/\[\d+(?:,\s*\d+)*\]/g)?.length ?? 0);

  const cp: Checkpoint = {
    id: `ckpt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    sessionTurnCount: turnCount,
    domain,
    style,
    lastUserIntent: userMessage.slice(0, 200),
    lastOutputSummary: lastSummary,
    contextHash: simpleHash(content.slice(-500)),
    metrics: {
      totalWords: (prior?.metrics?.totalWords ?? 0) + words,
      sessionWords: (prior?.metrics?.sessionWords ?? 0) + words,
      paragraphCount: paragraphs.length,
      averageSentenceLength: avgSent,
      citationCount: (prior?.metrics?.citationCount ?? 0) + citations,
      complexityScore: Math.min(100, Math.round(avgSent * 2.5)),
    },
  };

  if (domain === "academic") {
    const headings = Array.from(content.matchAll(/^#{1,3}\s+(.+)/gm)).map((m) => m[1]);
    const citeQueue = Array.from(content.matchAll(/\([A-Z][a-zA-Z-]+(?:\s+et al\.)?,\s*\d{4}\)/g)).map((m) => m[0]).slice(-5);
    cp.argumentPosition = {
      thesisStatement: prior?.argumentPosition?.thesisStatement,
      claimDepth: Math.min(3, headings.length),
      currentSection: headings[headings.length - 1] ?? prior?.argumentPosition?.currentSection,
      sectionOrder: headings.length > 0 ? headings : (prior?.argumentPosition?.sectionOrder ?? []),
      lastArgumentThread: paragraphs.slice(-2).join(" ").slice(0, 300),
      pendingCounterarguments: prior?.argumentPosition?.pendingCounterarguments ?? [],
      citationQueue: citeQueue,
      conceptsDefined: prior?.argumentPosition?.conceptsDefined ?? [],
      wordCountAtCheckpoint: words,
    };
  }

  if (domain === "fiction") {
    const hasFP = /\b(I |I'm|I've|my |me )\b/.test(content.slice(0, 500));
    const pastCount = (content.match(/\b(was|were|had|said|went|felt|saw|heard)\b/g) ?? []).length;
    const presCount = (content.match(/\b(is|are|has|says|goes|feels|sees|hears)\b/g) ?? []).length;
    cp.narrativePosition = {
      chapter: prior?.narrativePosition?.chapter,
      sceneSummary: paragraphs.slice(-2).join(" ").slice(0, 400),
      activeCharacters: prior?.narrativePosition?.activeCharacters ?? [],
      povCharacter: prior?.narrativePosition?.povCharacter,
      povMode: hasFP ? "first_person" : (prior?.narrativePosition?.povMode ?? "close_third"),
      tense: pastCount >= presCount ? "past" : "present",
      currentConflict: prior?.narrativePosition?.currentConflict,
      emotionalRegister: prior?.narrativePosition?.emotionalRegister,
      sceneLocation: prior?.narrativePosition?.sceneLocation,
      wordCountAtCheckpoint: words,
    };
  }

  return cp;
}

// ---------------------------------------------------------------------------
// SSE helper
// ---------------------------------------------------------------------------

type WriteFunction = (event: string, data: Record<string, unknown>) => void;

function createSSE(): { stream: ReadableStream; write: WriteFunction; close: () => void } {
  let controller: ReadableStreamDefaultController<Uint8Array>;
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(c) { controller = c; },
    cancel() { closed = true; },
  });

  function write(event: string, data: Record<string, unknown>): void {
    if (closed) return;
    try { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event, ...data })}\n\n`)); } catch {}
  }

  function close(): void {
    if (closed) return;
    closed = true;
    try { controller.close(); } catch {}
  }

  return { stream, write, close };
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

async function getAuth(authHeader: string, svc: SupabaseClient): Promise<{ userId: string; email: string | null; tier: string } | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const r = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { Authorization: authHeader, apikey: serviceKey } });
  if (!r.ok) return null;

  const u = await r.json();
  if (!u?.id) return null;

  const { data: sub } = await svc.from("czar_subscriptions").select("tier,status,word_limit,words_used,bonus_words,bonus_used").eq("user_id", u.id).maybeSingle();
  return { userId: u.id, email: u.email ?? null, tier: sub?.tier ?? "none" };
}

// ---------------------------------------------------------------------------
// Two-Pass Self-Correction (for high-stakes domains: academic, professional, legal)
// Pass 1: Draft generation (non-streaming, fast)
// Pass 2: Critique — identify AI-tells, citation issues, structural failures
// Pass 3: Final polish incorporating critique
// ---------------------------------------------------------------------------

async function generateWithSelfCorrection(
  system: string,
  messages: { role: string; content: string }[],
  domain: DomainType,
  write: WriteFunction,
  signal: AbortSignal,
): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing for self-correction");

  const callSync = async (sys: string, msgs: { role: string; content: string }[]): Promise<string> => {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ model: C_SONNET, max_tokens: 12000, system: sys, messages: msgs }),
      signal,
    });
    if (!resp.ok) throw new Error(`Anthropic ${resp.status}`);
    const d = await resp.json();
    return d?.content?.[0]?.text ?? "";
  };

  // Pass 1: Draft
  write("agent", { id: "corrector", name: "Self-Correction", status: "working", action: "Pass 1: Drafting…" });
  const draft = await callSync(system + "\n\n[MODE: DRAFT — focus on completeness and accuracy]", messages);

  if (signal.aborted || draft.length < 100) return draft;

  // Pass 2: Critique
  write("agent", { id: "corrector", name: "Self-Correction", status: "working", action: "Pass 2: Critiquing draft…" });

  const domainCriteria: Record<string, string> = {
    academic:     "Check: uncited empirical claims, fabricated citations, banned phrases (Furthermore/Moreover/In conclusion as openers), em-dash overuse, triple-item lists, heading hierarchy violations (H3 without H2), missing References section, passive voice obscuring agency.",
    professional: "Check: conclusion buried after paragraph 1, vague recommendations ('consider improving' vs specific + time-bound), passive voice hiding agency, banned jargon (synergy/leverage/bandwidth/paradigm shift), numbers without context, no executive summary when >1500 words.",
    journalistic: "Check: lede >35 words, unattributed claims, false balance, passive voice hiding who did what, editorialising in news copy, statistics without source, clichés (shocking revelation / sparked outrage).",
  };

  const critiquePrompt = `You are a strict editor. Review this draft against these specific criteria:

${domainCriteria[domain] ?? "Check: AI fingerprint phrases, passive voice, structural issues, banned filler words."}

Universal checks:
- Banned phrases present: "It is important to note", "Delving into", "In the realm of", "Furthermore" (as opener), "In conclusion" (as opener), "This essay will explore", "Feel free to", "I hope this"
- Three or more consecutive sentences with same structure/length
- Preamble before real content / postscript after real content

DRAFT TO REVIEW:
${draft.slice(0, 6000)}

Output ONLY a numbered list of specific, actionable fixes. Maximum 10 items. No prose. If no fixes needed, output: "PASS".`;

  const critique = await callSync("You are a strict editor who identifies specific issues in drafts.", [{ role: "user", content: critiquePrompt }]);

  if (signal.aborted || critique.trim() === "PASS" || critique.trim().length < 10) {
    write("agent", { id: "corrector", name: "Self-Correction", status: "done", action: "Draft passed critique — no changes needed" });
    return draft;
  }

  // Pass 3: Final polish (streaming to user)
  write("agent", { id: "corrector", name: "Self-Correction", status: "working", action: "Pass 3: Applying corrections…" });

  const finalSystem = system + `\n\n[MODE: FINAL POLISH — apply these specific fixes before outputting:]\n${critique}\n\nOutput ONLY the corrected final version. No preamble. No explanation of changes.`;

  // Stream the final version directly to the user
  const apiKeyFinal = Deno.env.get("ANTHROPIC_API_KEY")!;
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKeyFinal, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({ model: C_SONNET, max_tokens: 16000, stream: true, system: finalSystem, messages }),
    signal,
  });

  if (!resp.ok) {
    // Fallback to draft if final pass fails
    write("agent", { id: "corrector", name: "Self-Correction", status: "done", action: "Final pass failed — using reviewed draft" });
    return draft;
  }

  const reader = resp.body!.getReader();
  const dec = new TextDecoder();
  let acc = "", buf = "";
  try {
    while (true) {
      if (signal.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta" && ev.delta?.text) {
            acc += ev.delta.text;
            write("delta", { text: ev.delta.text });
          }
        } catch {}
      }
    }
  } finally { reader.releaseLock(); }

  write("agent", { id: "corrector", name: "Self-Correction", status: "done", action: `Self-correction complete — ${wordCount(acc)} words` });
  return acc;
}

// ---------------------------------------------------------------------------
// Streaming: Anthropic
// ---------------------------------------------------------------------------

async function streamAnthropic(
  model: string, system: string, messages: { role: string; content: string }[],
  useThinking: boolean, write: WriteFunction, signal: AbortSignal,
): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing");

  const body: Record<string, unknown> = { model, max_tokens: 16000, stream: true, messages, system };
  if (useThinking) { body.thinking = { type: "adaptive" }; body.temperature = 1; }

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify(body), signal,
  });
  if (!resp.ok) throw new Error(`Anthropic ${resp.status}: ${await resp.text().then(t => t.slice(0, 200))}`);

  const reader = resp.body!.getReader();
  const dec = new TextDecoder();
  let acc = "", buf = "";

  try {
    while (true) {
      if (signal.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "content_block_delta") {
            if (ev.delta?.type === "text_delta" && ev.delta?.text) { acc += ev.delta.text; write("delta", { text: ev.delta.text }); }
            else if (ev.delta?.type === "thinking_delta" && ev.delta?.thinking) { write("thinking", { text: ev.delta.thinking }); }
          }
        } catch {}
      }
    }
  } finally { reader.releaseLock(); }
  return acc;
}

// ---------------------------------------------------------------------------
// Streaming: Google Gemini
// ---------------------------------------------------------------------------

async function streamGoogle(
  model: string, system: string, messages: { role: string; content: string }[],
  write: WriteFunction, signal: AbortSignal,
): Promise<string> {
  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY missing");

  const contents: { role: string; parts: { text: string }[] }[] = [];
  for (const m of messages) {
    const gemRole = m.role === "assistant" ? "model" : "user";
    const last = contents[contents.length - 1];
    if (last?.role === gemRole) last.parts[0].text += "\n\n" + m.content;
    else contents.push({ role: gemRole, parts: [{ text: m.content }] });
  }

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system_instruction: system ? { parts: [{ text: system }] } : undefined, contents, generationConfig: { maxOutputTokens: 32768, temperature: 0.7 } }),
      signal,
    },
  );
  if (!resp.ok) throw new Error(`Google ${resp.status}: ${await resp.text().then(t => t.slice(0, 200))}`);

  const reader = resp.body!.getReader();
  const dec = new TextDecoder();
  let acc = "", buf = "";

  try {
    while (true) {
      if (signal.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const text = JSON.parse(payload)?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) { acc += text; write("delta", { text }); }
        } catch {}
      }
    }
  } finally { reader.releaseLock(); }
  return acc;
}

// ---------------------------------------------------------------------------
// Checkpoint deep-extraction via small model (non-streaming, post-response)
// ---------------------------------------------------------------------------

async function deepExtractCheckpoint(
  domain: DomainType,
  content: string,
  userMessage: string,
  priorCheckpoint: Checkpoint | null,
): Promise<Partial<Checkpoint>> {
  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
  if (!apiKey || content.length < 200) return {};

  const domainInstructions: Partial<Record<DomainType, string>> = {
    academic: `Extract from the content:
- thesisStatement: the central thesis if identifiable (string or null)
- currentSection: name of the last section heading (string or null)
- sectionOrder: all section headings in order (string[])
- lastArgumentThread: 1–2 sentence summary of the last substantive argument made (string)
- citationQueue: last 5 in-text citations found (string[])
- conceptsDefined: technical terms that were formally defined in this response (string[])
Return JSON: { "argumentPosition": { "thesisStatement", "currentSection", "sectionOrder", "lastArgumentThread", "citationQueue", "conceptsDefined", "wordCountAtCheckpoint": number } }`,
    fiction: `Extract from the content:
- sceneSummary: 2–3 sentence summary of the scene (string)
- activeCharacters: character names present in this scene (string[])
- povCharacter: whose POV the scene is told from (string or null)
- povMode: "first_person" | "close_third" | "omniscient" | "second_person"
- tense: "past" | "present"
- currentConflict: 1 sentence description of the active conflict (string or null)
- sceneLocation: where the scene is set (string or null)
- emotionalRegister: the emotional tone/register (string or null)
Return JSON: { "narrativePosition": { "sceneSummary", "activeCharacters", "povCharacter", "povMode", "tense", "currentConflict", "sceneLocation", "emotionalRegister", "wordCountAtCheckpoint": number } }`,
  };

  const instruction = domainInstructions[domain];
  if (!instruction) return {};

  const prompt = `${instruction}\n\nContent (last 2000 chars):\n${content.slice(-2000)}\n\nReturn only valid JSON. No markdown fences. No explanation.`;

  try {
    const body = {
      system_instruction: { parts: [{ text: "You extract structured data from text. Return only valid JSON." }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 1024, temperature: 0 },
    };
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${G_LITE}:generateContent?key=${apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    );
    if (!resp.ok) return {};
    const raw = await resp.json();
    const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return {};
    return JSON.parse(match[0]);
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Main request handler
// ---------------------------------------------------------------------------

async function runMain(
  req: CzarBrainRequest,
  authHeader: string,
  write: WriteFunction,
  close: () => void,
): Promise<void> {
  const controller = new AbortController();
  const signal = controller.signal;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const svc = createClient(supabaseUrl, serviceKey);

  let streamClosed = false;
  const heartbeat = setInterval(() => { if (!streamClosed) write("ping", {}); }, 8000);
  const safeClose = () => {
    if (streamClosed) return;
    streamClosed = true;
    clearInterval(heartbeat);
    close();
  };

  try {
    // 1. Auth + word limit
    const auth = await getAuth(authHeader, svc);
    if (!auth) { write("error", { message: "Unauthorized", recoverable: false }); return; }
    const { userId, email, tier } = auth;

    if (email !== ADMIN_EMAIL) {
      const { data: sub } = await svc.from("czar_subscriptions").select("word_limit,words_used,bonus_words,bonus_used,status").eq("user_id", userId).maybeSingle();
      if (sub) {
        const used = (sub.words_used ?? 0) + (sub.bonus_used ?? 0);
        const allowed = (sub.word_limit ?? 0) + (sub.bonus_words ?? 0);
        if (allowed > 0 && used >= allowed) { write("billing", { reason: "Word limit reached. Upgrade to continue." }); return; }
        if (sub.status === "expired") { write("billing", { reason: "Subscription expired. Renew to continue." }); return; }
      }
    }

    // 2. Load project state
    const projectState = await loadProjectState(req.project_id, userId, svc);
    const priorDomain = projectState?.activeDomain ?? null;
    const priorCheckpoint = projectState?.checkpoint ?? null;
    const userPrefs = projectState?.userPreferences ?? {};

    // 3. Route to domain + style
    const route = routeRequest(
      req.user_message,
      priorDomain,
      userPrefs,
      req.override_domain,
      req.override_style,
    );
    const { domain, style } = route;

    // 4. Ensure conversation
    const convTitle = req.user_message.slice(0, 60) || "New chat";
    let conversationId: string;
    if (req.conversation_id) {
      const { data: existing } = await svc.from("czar_conversations").select("id").eq("id", req.conversation_id).eq("user_id", userId).maybeSingle();
      conversationId = existing?.id ?? req.conversation_id;
    } else {
      const { data: conv, error } = await svc.from("czar_conversations").insert({ user_id: userId, title: convTitle }).select("id").single();
      if (error || !conv?.id) { write("error", { message: "Could not create conversation", recoverable: false }); return; }
      conversationId = conv.id;
    }

    // 5. Save user message
    await svc.from("czar_messages").insert({ conversation_id: conversationId, user_id: userId, role: "user", content: req.user_message, mode: domain }).catch(() => {});

    // 6. Create assistant placeholder
    let assistantId: string | null = null;
    const { data: aRow } = await svc.from("czar_messages").insert({ conversation_id: conversationId, user_id: userId, role: "assistant", content: "", mode: domain, model_used: C_SONNET }).select("id").single().catch(() => ({ data: null }));
    assistantId = aRow?.id ?? null;

    // 7. Emit meta
    write("meta", {
      conversation_id: conversationId,
      assistant_id: assistantId ?? "",
      domain,
      style,
      confidence: route.confidence,
      model_label: tier === "phd" || email === ADMIN_EMAIL ? "enhanced" : "standard",
      checkpoint_id: priorCheckpoint?.id ?? null,
    });

    // 8. Build system prompt
    const checkpointBlock = buildCheckpointBlock(priorCheckpoint, domain);
    const domainCore = DOMAIN_CORE_ADDITIONS[domain] ?? "";
    const auditBlock = buildAudit(domain, style);
    const turnCount = (priorCheckpoint?.sessionTurnCount ?? 0) + 1;

    // Import brain prompt from shared location — falls back to inline if unavailable
    let brainBase: string;
    try {
      const { CZAR_BRAIN_SYSTEM_PROMPT } = await import("../czar-chat/brain.ts");
      brainBase = CZAR_BRAIN_SYSTEM_PROMPT;
    } catch {
      brainBase = "You are CZAR: a world-class writing intelligence. You do not produce generic output. You hold your work to the highest standards of your domain.";
    }

    const system = [
      brainBase,
      "\n\n" + domainCore,
      auditBlock,
      checkpointBlock,
    ].join("\n");

    // 9. Load history
    const { data: histRows } = await svc.from("czar_messages").select("role,content").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(40).catch(() => ({ data: [] }));
    let history: { role: string; content: string }[] = (histRows ?? [])
      .filter((m: { role: string; content: string }) => m.content?.trim())
      .map((m: { role: string; content: string }) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));

    // Strip empty placeholders and last user message (re-added below)
    while (history.length > 0 && history[history.length - 1].role === "assistant" && !history[history.length - 1].content.trim()) history.pop();
    if (history.length > 0 && history[history.length - 1].role === "user") history.pop();

    const messages = [...history.slice(-20), { role: "user", content: req.user_message }];

    // 10. Generate response
    write("agent", { id: "brain", name: "CZAR Brain", status: "starting", action: `${domain} mode — ${style}` });

    const isAdmin = email === ADMIN_EMAIL;
    const isPremium = isAdmin || ["phd", "enterprise"].includes(tier);
    const msgLen = req.user_message.length;
    const useOpus = isPremium && msgLen > 400;

    // High-stakes domains get two-pass self-correction when Anthropic is available
    const isHighStakes = ["academic", "professional"].includes(domain);
    const useSelfCorrection = isHighStakes && !!(Deno.env.get("ANTHROPIC_API_KEY")) && msgLen > 200;

    let fullResponse = "";
    try {
      if (useSelfCorrection) {
        // Two-pass: Draft → Critique → Final (all via Anthropic)
        fullResponse = await generateWithSelfCorrection(system, messages, domain, write, signal);
      } else if (useOpus) {
        fullResponse = await streamAnthropic(C_OPUS, system, messages, true, write, signal);
      } else {
        fullResponse = await streamGoogle(G_FAST, system, messages, write, signal);
      }
    } catch (err: unknown) {
      const e = err as Error;
      if (e?.name !== "AbortError") {
        // Try fallback provider
        try {
          fullResponse = await streamGoogle(G_FAST, system, messages, write, signal);
        } catch {
          write("error", { message: `AI generation failed: ${e?.message ?? "unknown"}`, recoverable: false });
          return;
        }
      }
    }

    write("agent", { id: "brain", name: "CZAR Brain", status: "done", action: `${wordCount(fullResponse)} words` });

    // 11. Build checkpoint (fast heuristic + async deep extraction)
    let checkpoint = createCheckpointFromContent(domain, style, fullResponse, req.user_message, priorCheckpoint, turnCount);

    // Deep extraction (async, best-effort — merges richer position data)
    if (req.project_id && fullResponse.length > 300) {
      deepExtractCheckpoint(domain, fullResponse, req.user_message, priorCheckpoint).then((deep) => {
        if (deep.argumentPosition) checkpoint.argumentPosition = { ...checkpoint.argumentPosition, ...deep.argumentPosition } as typeof checkpoint.argumentPosition;
        if (deep.narrativePosition) checkpoint.narrativePosition = { ...checkpoint.narrativePosition, ...deep.narrativePosition } as typeof checkpoint.narrativePosition;
        // Save enriched checkpoint
        if (projectState && req.project_id) {
          const updatedState: ProjectState = {
            projectId: req.project_id,
            userId,
            activeDomain: domain,
            activeStyle: style,
            checkpoint,
            userPreferences: userPrefs,
          };
          saveProjectState(updatedState, checkpoint, domain, style, svc).catch(() => {});
        }
      }).catch(() => {});
    }

    // 12. Persist response + initial checkpoint
    if (assistantId) {
      await svc.from("czar_messages").update({ content: fullResponse, metadata: { domain, style, word_count: wordCount(fullResponse), checkpoint_id: checkpoint.id } }).eq("id", assistantId).catch(() => {});
    }
    await svc.from("czar_conversations").update({ mode: domain, last_message: req.user_message.slice(0, 200), updated_at: new Date().toISOString() }).eq("id", conversationId).catch(() => {});

    if (req.project_id) {
      const state: ProjectState = { projectId: req.project_id, userId, activeDomain: domain, activeStyle: style, checkpoint, userPreferences: userPrefs };
      await saveProjectState(state, checkpoint, domain, style, svc);
    }

    // 13. Deduct words
    const wc = wordCount(fullResponse);
    if (wc > 0 && email !== ADMIN_EMAIL) {
      await svc.rpc("increment_czar_words_used", { _user_id: userId, _amount: wc }).catch(() => {});
    }

    // 14. Done
    write("done", {
      conversation_id: conversationId,
      assistant_id: assistantId ?? "",
      words: wc,
      domain,
      style,
      checkpoint_id: checkpoint.id,
      session_turn: checkpoint.sessionTurnCount,
    });
  } catch (err: unknown) {
    const e = err as Error;
    if (e?.name !== "AbortError") {
      try { write("error", { message: `Unexpected error: ${e?.message ?? String(err)}`, recoverable: false }); } catch {}
    }
  } finally {
    safeClose();
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Missing Authorization" }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });

  let body: CzarBrainRequest;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  if (!body.user_message || typeof body.user_message !== "string") {
    return new Response(JSON.stringify({ error: "user_message required" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  const { stream, write, close } = createSSE();
  Promise.resolve().then(() => runMain(body, authHeader, write, close)).catch((err) => {
    try { write("error", { message: String(err), recoverable: false }); } catch {}
    close();
  });

  return new Response(stream, {
    headers: { ...CORS, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no" },
  });
});
