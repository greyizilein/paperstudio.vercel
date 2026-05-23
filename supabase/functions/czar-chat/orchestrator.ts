// orchestrator.ts — Multi-agent pipeline for CZAR write and research modes
// Planner → Researcher → Writer → Critic → Illustrator, with verified citations.

import {
  discoverSources,
  formatSourceForReferences,
  formatSourceForWriter,
  VerifiedSource,
} from "./researcher.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// ---------------------------------------------------------------------------
// Types (mirrored from index.ts — no circular imports)
// ---------------------------------------------------------------------------

type CzarMode = "chat" | "write" | "correct" | "research" | "plan" | "literature_review" | "screenplay" | "legal";
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

type StreamQwenFn = (
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

// ── Model constants ──────────────────────────────────────────────────────────
// Architect / main orchestration planner — best agentic fast reasoning
const MODEL_PLANNER = "gemini-3.5-flash";
// Simple classification / tagging (memory, figure spotting, cheap JSON)
const MODEL_CLASSIFIER = "gemini-3.1-flash-lite";
// Image generation
const MODEL_IMAGE = "gemini-3.1-flash-image-preview";
// Critic reasoning — Qwen QwQ is a dedicated reasoning model
const MODEL_CRITIC_QWEN = "qwq-32b";

// ── Helpers ──────────────────────────────────────────────────────────────────

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
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMessage },
        ],
        stream: false,
        max_tokens: 2048,
      }),
      signal,
    });
    if (!resp.ok) return "";
    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content ?? "";
    return stripThinkTags(raw);
  } catch {
    return "";
  }
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
    const raw = await callGeminiSync(PLANNER_SYSTEM, brief, signal, MODEL_PLANNER);

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
// Banned-phrase stripping (deterministic, no API call needed)
// ---------------------------------------------------------------------------

const BANNED_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bdelve(?:s|d|ing)?\b/gi, "examine"],
  [/\btapestry\b/gi, "range"],
  [/\bseamlessly\b/gi, "effectively"],
  [/\bgroundbreaking\b/gi, "significant"],
  [/\bcutting-edge\b/gi, "advanced"],
  [/\bleverag(?:e|es|ed|ing)\b/gi, "use"],
  [/\bspearhead(?:s|ed|ing)?\b/gi, "lead"],
  [/\bit is (?:important|worth noting|crucial) to note that\s*/gi, ""],
  [/\bfurthermore,\s+/gi, ""],
  [/\bmoreover,\s+/gi, ""],
  [/\bin today'?s fast-paced world,?\s*/gi, ""],
  [/\bin conclusion(?:,?\s*it can be said that)?\s*/gi, "To conclude, "],
  [/\blet us (?:explore|delve into|examine)\b/gi, "examining"],
  [/\bdive into\b/gi, "examine"],
  [/\bin the realm of\b/gi, "in"],
  [/\bunderscores?\b/gi, "emphasise"],
  [/\bshowcas(?:e|es|ed|ing)\b/gi, "demonstrat"],
  [/\bempow(?:er|ers|ered|ering|erment)\b/gi, "enable"],
  [/\bvibrant\b/gi, "active"],
  [/\bparadigm shift\b/gi, "fundamental change"],
  [/\bsynergi(?:es|stic|se|zing)\b/gi, "collaboration"],
  [/\bholistic(?:ally)?\b/gi, "comprehensive"],
  [/\bit goes without saying\b/gi, ""],
  [/\bat the end of the day\b/gi, "ultimately"],
  [/\bmoving forward\b/gi, "going forward"],
  [/\bgame-chang(?:er|ing)\b/gi, "transformative"],
  [/\bworth noting that\s*/gi, ""],
  [/\bit is worth noting\s*/gi, ""],
];

function stripBannedPhrases(text: string): string {
  let result = text;
  for (const [pattern, replacement] of BANNED_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  // Clean up double spaces or empty lines created by deletions
  return result.replace(/  +/g, " ").replace(/\n{3,}/g, "\n\n");
}

// ---------------------------------------------------------------------------
// Critic agent — quality review
// ---------------------------------------------------------------------------

async function runCriticAgent(
  draft: string,
  userMessage: string,
  write: WriteFunction,
  signal: AbortSignal,
): Promise<{ quality: string; issueCount: number }> {
  write("agent", {
    id: "critic",
    name: "Critic",
    status: "starting",
    action: "Reviewing argument quality",
  });

  const system = `You are CZAR Critic. Assess argument quality only — banned phrase stripping is handled separately.
Review for: (1) evidence-based claims without citations, (2) logical gaps or circular reasoning, (3) structural problems, (4) register inconsistency.
Return ONLY valid JSON: { "quality": "high|medium|low", "issues": [{ "issue": "concise description", "severity": "low|high" }] }
Maximum 4 issues. If argument is solid, return { "quality": "high", "issues": [] }.`;

  const userMsg = `Brief: ${userMessage.slice(0, 250)}\n\nDraft (first 3500 chars):\n${draft.slice(0, 3500)}`;

  try {
    // Prefer Qwen QwQ (dedicated reasoning model) — falls back to Gemini Flash-Lite
    const hasQwen = !!Deno.env.get("QWEN_API_KEY");
    const raw = hasQwen
      ? await callQwenSync(system, userMsg, signal)
      : await callGeminiSync(system, userMsg, signal, MODEL_CLASSIFIER);

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      write("agent", { id: "critic", name: "Critic", status: "done", action: "Review complete" });
      return { quality: "medium", issueCount: 0 };
    }

    const result = JSON.parse(match[0]);
    const highCount = (result.issues ?? []).filter((i: any) => i.severity === "high").length;
    const action =
      result.quality === "high"
        ? "Argument quality: strong"
        : highCount > 0
        ? `${highCount} quality issue${highCount > 1 ? "s" : ""} flagged`
        : "Minor issues only";

    write("agent", { id: "critic", name: "Critic", status: "done", action });
    return { quality: result.quality ?? "medium", issueCount: highCount };
  } catch {
    write("agent", { id: "critic", name: "Critic", status: "done", action: "Review skipped" });
    return { quality: "medium", issueCount: 0 };
  }
}

// ---------------------------------------------------------------------------
// Illustrator agent — image generation via Google Imagen 3
// ---------------------------------------------------------------------------

async function generateImageGemini(
  prompt: string,
  apiKey: string,
  signal: AbortSignal,
): Promise<{ b64: string; mime: string } | null> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_IMAGE}:generateContent?key=${apiKey}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{
            text: `Generate a professional academic diagram: ${prompt}. Clean white background. Scientific illustration style. No decorative elements. High contrast. Suitable for an academic paper.`,
          }],
        }],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
        },
      }),
      signal,
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith("image/")) {
        return { b64: part.inlineData.data, mime: part.inlineData.mimeType };
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function identifyFigureOpportunities(
  draft: string,
  discipline: string,
  signal: AbortSignal,
): Promise<string[]> {
  const system = `Identify up to 2 places in this academic document where a diagram or structural figure would materially strengthen understanding.
For each, write ONE concise sentence describing exactly what the diagram should show.
Return ONLY a JSON array of strings: ["description 1", "description 2"]
If no figure would add value, return [].
Only suggest: conceptual frameworks, process flows, hierarchical models, comparative structures.
Do NOT suggest bar charts, pie charts, or data visualisations.`;

  try {
    // Use Flash-Lite for this simple classification task — fast and cheap
    const raw = await callGeminiSync(system, `Discipline: ${discipline}\n\n${draft.slice(0, 3000)}`, signal, MODEL_CLASSIFIER);
    const match = raw.match(/\[[\s\S]*?\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed.slice(0, 2).filter((s: any) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

async function runIllustratorAgent(
  draft: string,
  discipline: string,
  write: WriteFunction,
  svc: SupabaseClient,
  userId: string,
  signal: AbortSignal,
): Promise<string> {
  const googleKey = Deno.env.get("GOOGLE_AI_API_KEY");
  if (!googleKey || signal.aborted) return draft;

  write("agent", {
    id: "illustrator",
    name: "Illustrator",
    status: "starting",
    action: "Identifying figure opportunities",
  });

  const opportunities = await identifyFigureOpportunities(draft, discipline, signal);
  if (opportunities.length === 0 || signal.aborted) {
    write("agent", { id: "illustrator", name: "Illustrator", status: "done", action: "No figures needed" });
    return draft;
  }

  write("agent", {
    id: "illustrator",
    name: "Illustrator",
    status: "working",
    action: `Generating ${opportunities.length} figure${opportunities.length > 1 ? "s" : ""}`,
  });

  const figureMarkdown: string[] = [];
  let figNum = 1;

  for (const description of opportunities) {
    if (signal.aborted) break;

    const result = await generateImageGemini(description, googleKey, signal);
    if (!result) { figNum++; continue; }

    try {
      const { b64, mime } = result;
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const ext = mime === "image/jpeg" ? "jpg" : "png";
      const path = `figures/${userId}/${Date.now()}_fig${figNum}.${ext}`;
      const { data: uploadData, error } = await svc.storage
        .from("czar-uploads")
        .upload(path, bytes.buffer as ArrayBuffer, { contentType: mime, upsert: false });

      if (!error && uploadData) {
        const { data: urlData } = svc.storage.from("czar-uploads").getPublicUrl(path);
        figureMarkdown.push(
          `\n![Figure ${figNum}: ${description}](${urlData.publicUrl})\n\n*Figure ${figNum}: ${description}. Author's own figure.*`,
        );
      }
    } catch {
      // storage upload failed — skip this figure
    }
    figNum++;
  }

  if (figureMarkdown.length > 0) {
    const figuresSection = `\n\n---\n\n## Figures\n\n${figureMarkdown.join("\n\n")}`;
    write("delta", { text: figuresSection });
    draft += figuresSection;
    write("agent", {
      id: "illustrator",
      name: "Illustrator",
      status: "done",
      action: `${figureMarkdown.length} figure${figureMarkdown.length > 1 ? "s" : ""} generated`,
    });
  } else {
    write("agent", { id: "illustrator", name: "Illustrator", status: "done", action: "Image generation unavailable" });
  }

  return draft;
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
  streamQwenFn: StreamQwenFn;
  svc: SupabaseClient;
  userId: string;
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
    streamQwenFn,
    svc,
    userId,
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
    } else if (modelChoice.provider === "qwen") {
      fullResponse = await streamQwenFn(
        modelChoice.model,
        systemPrompt,
        messages,
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
  if (sources.length > 0 && !fullResponse.includes("## References") && !signal.aborted) {
    write("agent", { id: "editor", name: "Editor", status: "starting", action: "Compiling references" });

    const refsSection = buildReferencesSection(sources, fullResponse);
    if (refsSection) {
      write("delta", { text: refsSection });
      fullResponse += refsSection;
    }

    write("agent", { id: "editor", name: "Editor", status: "done", action: "References compiled with live links" });
  }

  // ── Phase 5: Critic — quality review ────────────────────────────────────
  if (!signal.aborted && fullResponse.length > 200) {
    await runCriticAgent(fullResponse, userMessage, write, signal);
  }

  // ── Phase 6: Illustrator — figure generation ─────────────────────────────
  if (!signal.aborted && (mode === "write" || mode === "literature_review") && fullResponse.length > 500) {
    const discipline = plan?.discipline ?? "general";
    fullResponse = await runIllustratorAgent(fullResponse, discipline, write, svc, userId, signal);
  }

  // ── Phase 7: Banned-phrase strip — silent post-processing ───────────────
  // Cleans the saved version even if the streamed version had phrases.
  const cleanedResponse = stripBannedPhrases(fullResponse);

  return cleanedResponse;
}
