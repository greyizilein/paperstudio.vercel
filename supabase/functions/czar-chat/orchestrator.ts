// orchestrator.ts — Multi-agent pipeline for CZAR write and research modes
// Planner → Researcher → Writer, with verified citations and live-linked references.

import {
  discoverSources,
  formatSourceForReferences,
  formatSourceForWriter,
  VerifiedSource,
} from "./researcher.ts";

// ---------------------------------------------------------------------------
// Types (mirrored from index.ts — no circular imports)
// ---------------------------------------------------------------------------

type CzarMode = "chat" | "write" | "correct" | "research" | "plan";
type WriteFunction = (event: string, data: Record<string, unknown>) => void;

interface ModelChoice {
  provider: "anthropic" | "google";
  model: string;
  thinking: boolean;
  label: string;
}

type StreamAnthropicFn = (
  model: string,
  system: string,
  messages: { role: string; content: string }[],
  useThinking: boolean,
  write: WriteFunction,
  signal: AbortSignal,
) => Promise<string>;

type StreamGoogleFn = (
  model: string,
  system: string,
  messages: { role: string; content: string }[],
  write: WriteFunction,
  signal: AbortSignal,
) => Promise<string>;

// ---------------------------------------------------------------------------
// Planner agent — produces a structured execution plan via Gemini Flash
// ---------------------------------------------------------------------------

interface PlannerOutput {
  title: string;
  totalWords: number;
  discipline: string;
  citationStyle: string;
  mainThesis: string;
  sections: Array<{
    heading: string;
    words: number;
    keyPoints: string[];
    searchQueries: string[];
  }>;
}

async function callGeminiSync(
  prompt: string,
  userMessage: string,
  signal: AbortSignal,
): Promise<string> {
  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not configured");

  const body = {
    system_instruction: { parts: [{ text: prompt }] },
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    generationConfig: { maxOutputTokens: 4096, temperature: 0.2 },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`Gemini sync ${resp.status}: ${txt.slice(0, 200)}`);
  }

  const data = await resp.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

const PLANNER_SYSTEM = `You are CZAR Architect. Analyse the writing brief and produce a precise JSON execution plan.

Return ONLY valid JSON — no markdown fences, no explanation, no preamble. Just the JSON object.

Schema:
{
  "title": "Document title (specific to the topic)",
  "totalWords": 2500,
  "discipline": "sociology",
  "citationStyle": "Harvard",
  "mainThesis": "One precise thesis sentence",
  "sections": [
    {
      "heading": "Introduction",
      "words": 300,
      "keyPoints": ["what this section must establish"],
      "searchQueries": ["specific academic query with key terms"]
    }
  ]
}

Rules:
- citationStyle: one of Harvard, APA, Chicago, MLA, OSCOLA, Vancouver, IEEE
- Each section needs 1–3 highly specific academic search queries (not generic)
- totalWords: use stated word count from brief or default to 2500
- Sections must cover the full document from intro to conclusion
- searchQueries must be specific enough to find real papers (include field-specific terminology)`;

async function runPlannerAgent(
  userMessage: string,
  fileContext: string,
  write: WriteFunction,
  signal: AbortSignal,
): Promise<PlannerOutput | null> {
  write("agent", {
    id: "planner",
    name: "Architect",
    status: "starting",
    action: "Analysing brief",
  });

  const brief = userMessage +
    (fileContext ? `\n\nUploaded content (first 3000 chars):\n${fileContext.slice(0, 3000)}` : "");

  try {
    const raw = await callGeminiSync(PLANNER_SYSTEM, brief, signal);

    // Extract JSON — model may wrap in markdown despite instructions
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      write("agent", { id: "planner", name: "Architect", status: "error", action: "Invalid plan output" });
      return null;
    }

    const plan = JSON.parse(jsonMatch[0]) as PlannerOutput;
    if (!plan.sections || plan.sections.length === 0) {
      write("agent", { id: "planner", name: "Architect", status: "error", action: "Empty plan" });
      return null;
    }

    write("agent", {
      id: "planner",
      name: "Architect",
      status: "done",
      action: `${plan.sections.length} sections · ${plan.totalWords} words · ${plan.citationStyle}`,
    });

    return plan;
  } catch (err: any) {
    write("agent", {
      id: "planner",
      name: "Architect",
      status: "error",
      action: err?.name === "AbortError" ? "Cancelled" : "Plan failed",
    });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Researcher agent — real search via Tavily + Serper + CrossRef
// ---------------------------------------------------------------------------

async function runResearcherAgent(
  plan: PlannerOutput,
  write: WriteFunction,
  signal: AbortSignal,
): Promise<VerifiedSource[]> {
  const tavilyKey = Deno.env.get("TAVILY_API_KEY") ?? null;
  const serperKey = Deno.env.get("SERPER_API_KEY") ?? null;

  if (!tavilyKey && !serperKey) {
    write("agent", {
      id: "researcher",
      name: "Researcher",
      status: "error",
      action: "No search API keys — add TAVILY_API_KEY or SERPER_API_KEY",
    });
    return [];
  }

  write("agent", {
    id: "researcher",
    name: "Researcher",
    status: "starting",
    action: "Searching academic databases",
  });

  // Collect all search queries: topic + section-level queries
  const queries: string[] = [plan.title || plan.mainThesis];
  for (const section of plan.sections) {
    queries.push(...(section.searchQueries ?? []));
  }

  try {
    const sources = await discoverSources(
      queries.filter(Boolean),
      tavilyKey,
      serperKey,
      signal,
    );

    const verifiedCount = sources.filter((s) => s.confidence === "verified").length;
    const probableCount = sources.filter((s) => s.confidence === "probable").length;

    write("agent", {
      id: "researcher",
      name: "Researcher",
      status: "done",
      action: `${sources.length} sources · ${verifiedCount} DOI-verified · ${probableCount} probable`,
    });

    return sources;
  } catch (err: any) {
    write("agent", {
      id: "researcher",
      name: "Researcher",
      status: "error",
      action: err?.name === "AbortError" ? "Cancelled" : "Research failed",
    });
    return [];
  }
}

// ---------------------------------------------------------------------------
// Writer prompt builder
// ---------------------------------------------------------------------------

function buildAugmentedUserMessage(
  originalMessage: string,
  fileContext: string,
  plan: PlannerOutput | null,
  sources: VerifiedSource[],
): string {
  let msg = originalMessage;

  if (fileContext) {
    msg += `\n\n${fileContext}`;
  }

  if (plan) {
    msg += `\n\n---\n## EXECUTION PLAN\n`;
    msg += `**Title:** ${plan.title}\n`;
    msg += `**Total words:** ${plan.totalWords}\n`;
    msg += `**Discipline:** ${plan.discipline}\n`;
    msg += `**Citation style:** ${plan.citationStyle}\n`;
    msg += `**Thesis:** ${plan.mainThesis}\n\n`;
    msg += `**Section breakdown:**\n`;
    for (const s of plan.sections) {
      msg += `• **${s.heading}** (${s.words} words): ${s.keyPoints.join("; ")}\n`;
    }
    msg += `---\n`;
  }

  if (sources.length > 0) {
    msg += `\n\n---\n## VERIFIED SOURCES\n`;
    msg += `These sources have been verified as real. Use them. Cite using ${plan?.citationStyle ?? "Harvard"} format.\n`;
    msg += `For each citation, use the EXACT author surnames and year shown below.\n`;
    msg += `Do NOT fabricate sources. Only cite from this list.\n\n`;
    for (const s of sources) {
      msg += formatSourceForWriter(s) + "\n";
    }
    msg += `\n**Every evidence-based claim must cite one or more of the above sources.**\n`;
    msg += `---\n`;
  } else {
    msg += `\n\n[NOTE: No pre-verified sources available. Only cite sources you are certain exist — real authors, real papers, verifiable via Google Scholar.]\n`;
  }

  return msg;
}

// ---------------------------------------------------------------------------
// References section builder
// ---------------------------------------------------------------------------

function buildReferencesSection(
  sources: VerifiedSource[],
  fullText: string,
): string {
  if (sources.length === 0) return "";

  // Find which sources were cited: check if author surname appears in text
  const cited = sources.filter((s) => {
    if (s.authors.length === 0) return false;
    const surname = s.authors[0].split(",")[0].trim();
    if (surname.length < 2) return false;
    const year = s.year ? String(s.year) : "";
    return fullText.includes(surname) && (!year || fullText.includes(year));
  });

  // If fewer than 30% matched, include all (author detection may have missed some)
  const toInclude = cited.length < Math.max(2, sources.length * 0.25) ? sources : cited;

  if (toInclude.length === 0) return "";

  const sorted = [...toInclude].sort((a, b) => {
    const aName = a.authors[0]?.split(",")[0] ?? "";
    const bName = b.authors[0]?.split(",")[0] ?? "";
    return aName.localeCompare(bName);
  });

  const entries = sorted.map((s) => formatSourceForReferences(s));
  return `\n\n## References\n\n${entries.join("\n\n")}`;
}

// ---------------------------------------------------------------------------
// Main orchestrator entry point
// ---------------------------------------------------------------------------

export interface OrchestratorOptions {
  userMessage: string;
  mode: CzarMode;
  fileContext: string;
  systemPrompt: string;
  history: { role: string; content: string }[];
  modelChoice: ModelChoice;
  write: WriteFunction;
  signal: AbortSignal;
  streamAnthropicFn: StreamAnthropicFn;
  streamGoogleFn: StreamGoogleFn;
}

export async function runOrchestrator(opts: OrchestratorOptions): Promise<string> {
  const {
    userMessage,
    mode,
    fileContext,
    systemPrompt,
    history,
    modelChoice,
    write,
    signal,
    streamAnthropicFn,
    streamGoogleFn,
  } = opts;

  // ── Phase 1: Planner ─────────────────────────────────────────────────────
  const plan = await runPlannerAgent(userMessage, fileContext, write, signal);
  if (signal.aborted) return "";

  // ── Phase 2: Researcher ──────────────────────────────────────────────────
  let sources: VerifiedSource[] = [];

  const fallbackPlan: PlannerOutput = {
    title: userMessage.slice(0, 80),
    totalWords: 2500,
    discipline: "general",
    citationStyle: "Harvard",
    mainThesis: userMessage.slice(0, 100),
    sections: [{
      heading: "Main",
      words: 2500,
      keyPoints: [userMessage],
      searchQueries: [userMessage.slice(0, 100)],
    }],
  };

  sources = await runResearcherAgent(plan ?? fallbackPlan, write, signal);
  if (signal.aborted) return "";

  // ── Phase 3: Writer ──────────────────────────────────────────────────────
  write("agent", {
    id: "writer",
    name: "Writer",
    status: "starting",
    action: mode === "research" ? "Synthesising literature" : "Drafting document",
  });

  const augmentedMessage = buildAugmentedUserMessage(
    userMessage,
    fileContext,
    plan,
    sources,
  );

  const messages = [
    ...history.slice(-20),
    { role: "user", content: augmentedMessage },
  ];

  let fullResponse = "";
  try {
    if (modelChoice.provider === "anthropic") {
      fullResponse = await streamAnthropicFn(
        modelChoice.model,
        systemPrompt,
        messages,
        modelChoice.thinking,
        write,
        signal,
      );
    } else {
      fullResponse = await streamGoogleFn(
        modelChoice.model,
        systemPrompt,
        messages,
        write,
        signal,
      );
    }
  } catch (err: any) {
    if (err?.name !== "AbortError") {
      write("agent", { id: "writer", name: "Writer", status: "error", action: "Generation failed" });
      throw err;
    }
  }

  const wordCount = fullResponse.trim().split(/\s+/).filter(Boolean).length;
  write("agent", {
    id: "writer",
    name: "Writer",
    status: "done",
    action: `${wordCount} words generated`,
  });

  // ── Phase 4: References ──────────────────────────────────────────────────
  // Append verified references with live DOI links if the writer didn't already include them
  if (sources.length > 0 && !fullResponse.includes("## References") && !signal.aborted) {
    write("agent", {
      id: "editor",
      name: "Editor",
      status: "starting",
      action: "Compiling references",
    });

    const refsSection = buildReferencesSection(sources, fullResponse);
    if (refsSection) {
      write("delta", { text: refsSection });
      fullResponse += refsSection;
    }

    write("agent", {
      id: "editor",
      name: "Editor",
      status: "done",
      action: "References compiled with live links",
    });
  }

  return fullResponse;
}
