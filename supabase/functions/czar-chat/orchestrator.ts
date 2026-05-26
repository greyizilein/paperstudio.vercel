// orchestrator.ts — Multi-agent pipeline for CZAR write and research modes
// Planner → Researcher → Writer → Critic → Revision loop with strict verification.

import {
  discoverSources,
  formatSourceForReferences,
  formatSourceForWriter,
  VerifiedSource,
} from "./researcher.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

class AuditFailureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuditFailureError";
  }
}

type CzarMode = "chat" | "write" | "correct" | "research" | "plan" | "literature_review" | "screenplay" | "legal";
type WriteFunction = (event: string, data: Record<string, unknown>) => void;

interface ModelChoice {
  provider: "anthropic" | "google" | "qwen";
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

type StreamQwenFn = (
  model: string,
  system: string,
  messages: { role: string; content: string }[],
  write: WriteFunction,
  signal: AbortSignal,
) => Promise<string>;

interface AgentWorkspace {
  userMessage: string;
  mode: CzarMode;
  fileContext: string;
  plan: PlannerOutput | null;
  needsClarification: boolean;
  clarificationQuestions: string[];
  sources: VerifiedSource[];
  sectionSources: Record<string, VerifiedSource[]>;
  draft: string;
  criticQuality: "high" | "medium" | "low";
  criticIssues: Array<{ issue: string; severity: "low" | "high"; target?: string }>;
  revised: boolean;
  finalDraft: string;
}

interface PlannerOutput {
  title: string;
  totalWords: number;
  discipline: string;
  citationStyle: string;
  mainThesis: string;
  briefQuality: "clear" | "needs_clarification";
  clarificationQuestions: string[];
  sections: Array<{
    heading: string;
    words: number;
    keyPoints: string[];
    searchQueries: string[];
  }>;
}

// Use valid Gemini model names
const MODEL_PLANNER = "gemini-2.5-flash";
const MODEL_CRITIC_QWEN = "qwq-32b";
const MAX_GENERATION_RETRIES = 3;

function stripThinkTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

async function callGeminiSync(
  prompt: string,
  userMessage: string,
  signal: AbortSignal,
  model = MODEL_PLANNER,
): Promise<string> {
  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not configured");

  const body = {
    system_instruction: { parts: [{ text: prompt }] },
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    generationConfig: { maxOutputTokens: 4096, temperature: 0.2 },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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

async function callQwenSync(
  system: string,
  userMessage: string,
  signal: AbortSignal,
  model = MODEL_CRITIC_QWEN,
): Promise<string> {
  const apiKey = Deno.env.get("QWEN_API_KEY");
  if (!apiKey) return "";
  try {
    const resp = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, { role: "user", content: userMessage }],
        stream: false,
        max_tokens: 2048,
      }),
      signal,
    });
    if (!resp.ok) return "";
    const data = await resp.json();
    return stripThinkTags(data?.choices?.[0]?.message?.content ?? "");
  } catch {
    return "";
  }
}

const PLANNER_SYSTEM = `You are CZAR Architect. Analyse the writing brief and produce a precise JSON execution plan.
Return ONLY valid JSON — no markdown fences, no explanation, no preamble. Just the JSON object.
Schema:
{
  "title": "Document title",
  "totalWords": 2500,
  "discipline": "sociology",
  "citationStyle": "Harvard",
  "mainThesis": "One precise thesis sentence",
  "briefQuality": "clear",
  "clarificationQuestions": [],
  "sections": [
    {
      "heading": "Introduction",
      "words": 300,
      "keyPoints": ["what this section must establish"],
      "searchQueries": ["specific academic query with key terms"]
    }
  ]
}
Brief quality rules:
- If brief is ambiguous, set "briefQuality": "needs_clarification" and ask 2-3 questions.
- Otherwise set "briefQuality": "clear" and "clarificationQuestions": [].`;

async function runPlannerAgent(
  userMessage: string,
  fileContext: string,
  write: WriteFunction,
  signal: AbortSignal,
  workspace: AgentWorkspace,
): Promise<PlannerOutput | null> {
  write("agent", { id: "planner", name: "Architect", status: "starting", action: "Analysing brief" });
  const brief = userMessage + (fileContext ? `\n\nUploaded content:\n${fileContext.slice(0, 3000)}` : "");
  try {
    const raw = await callGeminiSync(PLANNER_SYSTEM, brief, signal, MODEL_PLANNER);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const plan = JSON.parse(jsonMatch[0]) as PlannerOutput;
    workspace.plan = plan;
    if (plan.briefQuality === "needs_clarification") {
      workspace.needsClarification = true;
      workspace.clarificationQuestions = plan.clarificationQuestions || [];
      write("clarification", { questions: workspace.clarificationQuestions, title: plan.title });
    }
    write("agent", { id: "planner", name: "Architect", status: "done", action: `Planned ${plan.sections?.length || 0} sections` });
    return plan;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Source-to-section assignment (token intersection scoring)
// ---------------------------------------------------------------------------

function tokenise(text: string): Set<string> {
  return new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3),
  );
}

function intersectionCount(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const tok of a) if (b.has(tok)) count++;
  return count;
}

function assignSourcesToSections(
  sources: VerifiedSource[],
  plan: PlannerOutput,
): Record<string, VerifiedSource[]> {
  const result: Record<string, VerifiedSource[]> = {};
  const sectionTokens = plan.sections.map((sec) => ({
    heading: sec.heading,
    tokens: tokenise([sec.heading, ...(sec.keyPoints ?? []), ...(sec.searchQueries ?? [])].join(" ")),
  }));

  for (const source of sources) {
    const sourceToks = tokenise([source.title, source.snippet ?? ""].join(" "));
    let bestScore = 0;
    for (const { tokens } of sectionTokens) {
      const score = intersectionCount(sourceToks, tokens);
      if (score > bestScore) bestScore = score;
    }
    const threshold = Math.max(1, bestScore * 0.5);
    const matchedSections: string[] = [];
    for (const { heading, tokens } of sectionTokens) {
      if (intersectionCount(sourceToks, tokens) >= threshold) matchedSections.push(heading);
    }
    for (const heading of matchedSections) {
      if (!result[heading]) result[heading] = [];
      result[heading].push(source);
    }
  }
  return result;
}

async function runResearcherAgent(
  plan: PlannerOutput,
  write: WriteFunction,
  signal: AbortSignal,
  workspace: AgentWorkspace,
): Promise<VerifiedSource[]> {
  const tavilyKey = Deno.env.get("TAVILY_API_KEY") ?? null;
  const serperKey = Deno.env.get("SERPER_API_KEY") ?? null;
  write("agent", { id: "researcher", name: "Researcher", status: "starting", action: "Searching sources" });
  const queries = [plan.title || plan.mainThesis, ...plan.sections.flatMap((s) => s.searchQueries ?? [])].filter(Boolean);
  try {
    const sources = await discoverSources(queries, tavilyKey, serperKey, signal);
    workspace.sources = sources;
    workspace.sectionSources = assignSourcesToSections(sources, plan);
    write("agent", { id: "researcher", name: "Researcher", status: "done", action: `Found ${sources.length} sources` });
    return sources;
  } catch {
    return [];
  }
}

async function runCriticAgent(
  draft: string,
  plan: PlannerOutput | null,
  write: WriteFunction,
  signal: AbortSignal,
  workspace: AgentWorkspace,
): Promise<void> {
  write("agent", { id: "critic", name: "Critic", status: "starting", action: "Auditing draft" });
  const system = `You are the CZAR Critic. Review the text against the plan. Output strictly JSON.
Schema: { "quality": "high"|"medium"|"low", "issues": [{ "issue": "...", "severity": "high"|"low" }] }`;

  const raw = await callQwenSync(system, `Plan: ${JSON.stringify(plan)}\n\nDraft:\n${draft}`, signal);
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      workspace.criticQuality = parsed.quality || "medium";
      workspace.criticIssues = parsed.issues || [];
    }
  } catch {
    workspace.criticQuality = "medium";
  }
  write("agent", { id: "critic", name: "Critic", status: "done", action: `Quality: ${workspace.criticQuality}` });
}

function buildAugmentedUserMessage(
  originalMessage: string,
  fileContext: string,
  plan: PlannerOutput | null,
  sources: VerifiedSource[],
  workspace: AgentWorkspace,
): string {
  let msg = originalMessage;
  if (fileContext) msg += `\n\n${fileContext}`;
  if (plan) {
    msg += `\n\n---\n## EXECUTION PLAN\n**Title:** ${plan.title}\n**Total words:** ${plan.totalWords}\n**Citation style:** ${plan.citationStyle}\n**Thesis:** ${plan.mainThesis}\n\n**Section breakdown:**\n`;
    for (const s of plan.sections) msg += `• **${s.heading}** (${s.words} words): ${s.keyPoints.join("; ")}\n`;
    msg += `---\n`;
  }
  if (sources.length > 0) {
    msg += `\n\n---\n## VERIFIED SOURCES\nCite using ${plan?.citationStyle ?? "Harvard"} format. Use EXACT author surnames and year.\n`;
    const sectionSources = workspace.sectionSources;
    const placed = new Set<string>();
    for (const section of (plan?.sections ?? [])) {
      if (sectionSources[section.heading]?.length) {
        msg += `### ${section.heading}\n`;
        for (const s of sectionSources[section.heading]) {
          msg += formatSourceForWriter(s) + "\n";
          placed.add(s.url ?? s.title);
        }
      }
    }
    const ungrouped = sources.filter((s) => !placed.has(s.url ?? s.title));
    if (ungrouped.length > 0) {
      msg += `### (Ungrouped)\n`;
      for (const s of ungrouped) msg += formatSourceForWriter(s) + "\n";
    }
    msg += `\n**Every evidence-based claim must cite one or more of the above.**\n---\n`;
  }
  return msg;
}

function buildReferencesSection(sources: VerifiedSource[], fullText: string): string {
  if (sources.length === 0) return "";
  const cited = sources.filter((s) => {
    if (!s.authors.length) return false;
    const surname = s.authors[0].split(",")[0].trim();
    return surname.length > 1 && fullText.includes(surname);
  });
  const toInclude = cited.length < Math.max(2, sources.length * 0.25) ? sources : cited;
  if (!toInclude.length) return "";
  const sorted = [...toInclude].sort((a, b) =>
    (a.authors[0]?.split(",")[0] ?? "").localeCompare(b.authors[0]?.split(",")[0] ?? ""),
  );
  return `\n\n## References\n\n${sorted.map(formatSourceForReferences).join("\n\n")}`;
}

const BANNED_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bdelve(?:s|d|ing)?\b/gi, "examine"],
  [/\btapestry\b/gi, "range"],
  [/\bseamlessly\b/gi, "effectively"],
];

function stripBannedPhrases(text: string): string {
  let result = text;
  for (const [pattern, replacement] of BANNED_REPLACEMENTS) result = result.replace(pattern, replacement);
  return result.replace(/  +/g, " ").replace(/\n{3,}/g, "\n\n");
}

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
  streamQwenFn: StreamQwenFn;
  svc: SupabaseClient;
  userId: string;
}

export async function runOrchestrator(opts: OrchestratorOptions): Promise<string> {
  const {
    userMessage, mode, fileContext, systemPrompt, modelChoice,
    write, signal, streamAnthropicFn, streamGoogleFn, streamQwenFn,
  } = opts;

  const workspace: AgentWorkspace = {
    userMessage, mode, fileContext, plan: null, needsClarification: false,
    clarificationQuestions: [], sources: [], sectionSources: {}, draft: "",
    criticQuality: "medium", criticIssues: [], revised: false, finalDraft: "",
  };

  const plan = await runPlannerAgent(userMessage, fileContext, write, signal, workspace);
  if (signal.aborted || workspace.needsClarification) return "";

  const effectivePlan = plan ?? {
    title: userMessage.slice(0, 80), totalWords: 2500, discipline: "general",
    citationStyle: "Harvard", mainThesis: "", briefQuality: "clear" as const,
    clarificationQuestions: [],
    sections: [{ heading: "Main", words: 2500, keyPoints: [userMessage], searchQueries: [] }],
  };

  const sources = await runResearcherAgent(effectivePlan, write, signal, workspace);
  if (signal.aborted) return "";

  // PRINCIPLE 1: Stateless reasoning — writer only sees the augmented current message
  const augmentedMessage = buildAugmentedUserMessage(userMessage, fileContext, plan, sources, workspace);
  const messages = [{ role: "user", content: augmentedMessage }];

  let attempt = 1;
  let finalApprovedOutput = "";

  // PRINCIPLE 4: Strict verification loop with hard regeneration on audit failure
  while (attempt <= MAX_GENERATION_RETRIES) {
    try {
      write("agent", {
        id: "writer", name: "Writer", status: "starting",
        action: `Drafting document (attempt ${attempt}/${MAX_GENERATION_RETRIES})`,
      });

      let currentDraft = "";
      if (modelChoice.provider === "anthropic") {
        currentDraft = await streamAnthropicFn(modelChoice.model, systemPrompt, messages, modelChoice.thinking, write, signal);
      } else if (modelChoice.provider === "qwen") {
        currentDraft = await streamQwenFn(modelChoice.model, systemPrompt, messages, write, signal);
      } else {
        currentDraft = await streamGoogleFn(modelChoice.model, systemPrompt, messages, write, signal);
      }

      workspace.draft = currentDraft;

      if (signal.aborted) break;

      // Append references if not present
      if (sources.length > 0 && !currentDraft.includes("## References")) {
        const refsSection = buildReferencesSection(sources, currentDraft);
        if (refsSection) {
          write("delta", { text: refsSection });
          currentDraft += refsSection;
          workspace.draft = currentDraft;
        }
      }

      // Critic pass
      await runCriticAgent(workspace.draft, plan, write, signal, workspace);

      const hasHighSeverityIssues = workspace.criticIssues.some((i) => i.severity === "high");

      if (workspace.criticQuality === "low" || hasHighSeverityIssues) {
        write("agent", { id: "revision", name: "Revision", status: "starting", action: "Applying critical fixes" });

        const revisionSystem = `Fix the following critical issues in the provided draft. Issues: ${JSON.stringify(workspace.criticIssues.filter((i) => i.severity === "high"))}. Output ONLY the fixed draft.`;
        const revisedDraft = await callGeminiSync(revisionSystem, workspace.draft, signal);

        if (!revisedDraft || revisedDraft.length < workspace.draft.length * 0.5) {
          throw new AuditFailureError("Revision failed to resolve structural issues.");
        }

        workspace.finalDraft = revisedDraft;
        write("agent", { id: "revision", name: "Revision", status: "done", action: "Fixes applied" });
      } else {
        workspace.finalDraft = workspace.draft;
      }

      finalApprovedOutput = workspace.finalDraft;
      break;

    } catch (err: any) {
      if (err instanceof AuditFailureError && attempt < MAX_GENERATION_RETRIES) {
        attempt++;
        write("agent", {
          id: "system", name: "Orchestrator", status: "starting",
          action: `Audit failure — regenerating (attempt ${attempt})`,
        });
        continue;
      }
      if (err?.name !== "AbortError") throw err;
      break;
    }
  }

  return stripBannedPhrases(finalApprovedOutput || workspace.draft);
}
