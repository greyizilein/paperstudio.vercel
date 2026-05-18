import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const GENERATE_URL = `${FUNCTIONS_BASE}/generate-chapter`;
const PLAN_URL = `${FUNCTIONS_BASE}/plan-chapter-section`;
const POLISH_URL = `${FUNCTIONS_BASE}/polish-chapter`;
const HUMANISE_URL = `${FUNCTIONS_BASE}/czar-humanise`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

interface StreamGenerateOptions {
  project: any;
  chapter: any;
  draftConfig: any;
  modelId?: string;
  continuation?: { existingContent: string; remainingWords: number };
  onDelta: (text: string) => void;
  onDone: (polishedContent?: string) => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
  /** When true, the upstream stream is resumable: tab close / disconnect won't kill it. */
  enableResume?: boolean;
}

// CRITICAL: Always use the user's session JWT, NOT the publishable anon key.
// Backend resolves tier/admin from this header — sending the anon key
// makes the request look unauthenticated and silently downgrades to free tier.
async function authedHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not signed in. Please sign in again to continue.");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
    apikey: ANON_KEY,
  };
}

// Count words in text (strips markdown symbols)
export function countWords(text: string): number {
  return (
    text
      .replace(/```[\s\S]*?```/g, "") // remove code blocks
      .replace(/`[^`]*`/g, "") // remove inline code
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // remove images
      .replace(/\[[^\]]*\]\([^)]*\)/g, "$1") // keep link text
      .replace(/[#*_~>|]/g, " ") // strip markdown chars
      .match(/\b\w+\b/g) || []
  ).length;
}

// Extract body content (everything before ## References / ## Reference List)
export function extractBodyContent(text: string): string {
  const refMatch = text.search(/^#{1,3}\s+(references|reference list|bibliography)/im);
  return refMatch === -1 ? text : text.slice(0, refMatch).trim();
}

// Two-pass Natural mode: ask the planner for an argument arc before streaming.
async function fetchChapterPlan(
  project: any,
  chapter: any,
  draftConfig: any,
  signal?: AbortSignal
): Promise<any | null> {
  try {
    const headers = await authedHeaders();
    const resp = await fetch(PLAN_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ project, chapter, draftConfig }),
      signal,
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data?.plan || null;
  } catch {
    return null;
  }
}

// Post-stream polish — deterministic cleanup (heading dedupe, citation repair, etc.)
async function polishChapter(content: string, signal?: AbortSignal): Promise<string> {
  try {
    const headers = await authedHeaders();
    const resp = await fetch(POLISH_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ content }),
      signal,
    });
    if (!resp.ok) return content;
    const data = await resp.json();
    return data?.content || content;
  } catch {
    return content;
  }
}

// Humaniser pipeline — 7-stage Academic Humaniser v2.
// Runs against the SAME model the user wrote the chapter with so the
// finished work stays consistent in voice. Falls back to Claude inside
// the edge function if the requested model errors on a stage.
async function humaniseChapter(
  content: string,
  modelId: string | undefined,
  signal?: AbortSignal,
): Promise<string> {
  try {
    const headers = await authedHeaders();
    const resp = await fetch(HUMANISE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ text: content, model: modelId }),
      signal,
    });
    if (!resp.ok || !resp.body) return content;
    // Stream the SSE; we only care about the final "done" event payload.
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let currentEvent = "message";
    let humanised = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        let line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line) { currentEvent = "message"; continue; }
        if (line.startsWith("event:")) { currentEvent = line.slice(6).trim(); continue; }
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        try {
          const parsed = JSON.parse(payload);
          if (currentEvent === "done") {
            humanised = parsed?.humanised || "";
          }
        } catch { /* skip partial line */ }
      }
    }
    return humanised && humanised.trim().length > 50 ? humanised : content;
  } catch {
    return content;
  }
}

async function doStream(
  options: StreamGenerateOptions,
  onContentChunk: (chunk: string) => void,
  chapterPlan?: any | null
): Promise<void> {
  const { project, chapter, draftConfig, modelId, continuation, signal } = options;
  const headers = await authedHeaders();

  const resp = await fetch(GENERATE_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ project, chapter, draftConfig, modelId, continuation, chapterPlan }),
    signal,
  });

  if (!resp.ok) {
    let errorMsg = "Generation failed. Please try again.";
    try {
      const errData = await resp.json();
      errorMsg = errData.error || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  if (!resp.body) {
    throw new Error("No response stream received.");
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let streamDone = false;

  while (!streamDone) {
    if (signal?.aborted) break;
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") {
        streamDone = true;
        break;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onContentChunk(content);
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  // Final flush
  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (raw.startsWith(":") || raw.trim() === "") continue;
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onContentChunk(content);
      } catch {
        /* ignore */
      }
    }
  }
}

export async function streamGenerateChapter(options: StreamGenerateOptions) {
  const { onDelta, onDone, onError, signal } = options;

  let fullContent = "";
  const handleChunk = (chunk: string) => {
    fullContent += chunk;
    onDelta(chunk);
  };

  const runStream = async () => {
    try {
      let chapterPlan: any | null = null;
      const isNatural = options.project?.writing_mode === "natural";
      if (isNatural && !options.continuation) {
        chapterPlan = await fetchChapterPlan(
          options.project,
          options.chapter,
          options.draftConfig,
          signal
        );
      }
      await doStream(options, handleChunk, chapterPlan);

      // Post-stream polish — runs only on first-pass generation,
      // not on continuations (continuation appends; polish operates on whole).
      let polished = fullContent;
      if (!options.continuation && fullContent.length > 200) {
        polished = await polishChapter(fullContent, signal);
      }

      onDone(polished !== fullContent ? polished : undefined);
    } catch (err: any) {
      if (signal?.aborted || err?.name === "AbortError") {
        onError("Generation stopped.");
        return;
      }
      onError(err?.message || "Generation failed. Please try again.");
    }
  };

  if (typeof navigator !== "undefined" && "locks" in navigator) {
    try {
      await (navigator as any).locks.request(
        "paperstudio-generation",
        { mode: "shared" },
        async (_lock: unknown) => {
          await runStream();
        }
      );
    } catch {
      await runStream();
    }
  } else {
    await runStream();
  }
}
