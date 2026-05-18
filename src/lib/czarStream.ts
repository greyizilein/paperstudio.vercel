// Single SSE reader for czar-chat and the doc-correction-pipeline.
import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export interface CzarToolEvent {
  id: string;
  name: string;
  phase: "start" | "result" | "error";
  input?: any;
  result?: any;
  error?: string;
}

export interface CzarStreamHandlers {
  onMeta?: (meta: { conversation_id: string; assistant_id: string; model: string; tier: string; delivery?: string | null; is_build?: boolean }) => void;
  onDelta?: (text: string) => void;
  onThinking?: (text: string) => void;
  onTool?: (ev: CzarToolEvent) => void;
  onFollowups?: (suggestions: string[]) => void;
  onClarify?: (spec: any) => void;
  onHumanise?: (ev: { state: string; stage?: number; label?: string; words?: number; reason?: string }) => void;
  onCheckout?: (ev: { product: string; tier: string; authorization_url: string; reference?: string }) => void;
  onError?: (msg: string, code?: number) => void;
  onDone?: (data: { conversation_id: string; assistant_id?: string; words?: number; billing?: string; content?: string }) => void;
}

async function authHeaders() {
  await supabase.auth.refreshSession().catch(() => {});
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}

export type CzarMode = "chat" | "plan" | "build" | "agent";

// ─── Doc Correction Pipeline ──────────────────────────────────────────────

export interface DocCorrectionHandlers {
  onMeta?: (meta: { document_id: string; filename: string; conversation_id?: string; assistant_id?: string }) => void;
  onDelta?: (text: string) => void;
  onTool?: (ev: CzarToolEvent) => void;
  onStatus?: (s: { state: "processing" | "retrying" | "done" | "failed"; message?: string }) => void;
  onCorrectionDone?: (data: { document_id: string; filename: string; correction_count: number }) => void;
  onError?: (msg: string) => void;
  onDone?: (data: { document_id?: string }) => void;
}

export async function streamDocCorrection(
  body: {
    storage_path: string;
    filename: string;
    mime: string;
    user_message: string;
    conversation_id?: string | null;
    model_id?: string | null;
  },
  handlers: DocCorrectionHandlers,
  signal?: AbortSignal,
): Promise<void> {
  let headers: Record<string, string>;
  try {
    headers = await authHeaders();
  } catch (e: any) {
    handlers.onError?.(e?.message || "Authentication failed — please refresh and try again.");
    return;
  }
  let res: Response;
  try {
    res = await fetch(`${FUNCTIONS_BASE}/doc-correction-pipeline`, {
      method: "POST", headers, body: JSON.stringify(body), signal,
    });
  } catch (e: any) {
    if (e?.name === "AbortError" || signal?.aborted) return;
    handlers.onError?.(e?.message || "Network error — could not reach correction service.");
    return;
  }
  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => "");
    handlers.onError?.(`Correction pipeline failed (${res.status}): ${txt || res.statusText}`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "message";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line) { currentEvent = "message"; continue; }
        if (line.startsWith("event:")) { currentEvent = line.slice(6).trim(); continue; }
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const parsed = JSON.parse(payload);
          if (currentEvent === "meta") {
            handlers.onMeta?.(parsed);
          } else if (currentEvent === "message" && typeof parsed.delta === "string") {
            handlers.onDelta?.(parsed.delta);
          } else if (currentEvent === "tool") {
            handlers.onTool?.(parsed as CzarToolEvent);
          } else if (currentEvent === "status") {
            handlers.onStatus?.(parsed);
          } else if (currentEvent === "correction_done") {
            handlers.onCorrectionDone?.(parsed);
          } else if (currentEvent === "error") {
            handlers.onError?.(parsed.message || "Unknown error");
          } else if (currentEvent === "done") {
            handlers.onDone?.(parsed);
          }
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }
  } catch (err: any) {
    if (err?.name === "AbortError" || signal?.aborted) return;
    handlers.onError?.(err?.message || "Stream failed");
  }
}

// ─── Export corrected document ─────────────────────────────────────────────

export async function exportCorrectedDoc(
  document_id: string,
  format: "docx" | "pdf",
): Promise<{ content: string; filename: string; encoding: string; mimeType: string; renderAsPdf?: boolean }> {
  const headers = await authHeaders();
  const res = await fetch(`${FUNCTIONS_BASE}/export-corrected-doc`, {
    method: "POST",
    headers,
    body: JSON.stringify({ document_id, format }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Export failed (${res.status}): ${txt}`);
  }
  return res.json();
}

// ─── Original czar-chat stream ─────────────────────────────────────────────

export async function streamCzarChat(
  body: {
    conversation_id: string | null;
    user_message: string;
    attachments?: { storage_path: string; filename: string; size: number; mime: string }[];
    think?: boolean;
    mode?: CzarMode;
    settings?: Record<string, any>;
  },
  handlers: CzarStreamHandlers,
  signal?: AbortSignal,
): Promise<string> {
  const headers = await authHeaders();
  const res = await fetch(`${FUNCTIONS_BASE}/czar-chat`, {
    method: "POST", headers, body: JSON.stringify(body), signal,
  });
  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => "");
    handlers.onError?.(`CZAR failed (${res.status}): ${txt || res.statusText}`, res.status);
    throw new Error(txt || res.statusText);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "message";
  let full = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line) { currentEvent = "message"; continue; }
        if (line.startsWith("event:")) { currentEvent = line.slice(6).trim(); continue; }
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const parsed = JSON.parse(payload);
          if (currentEvent === "message" && typeof parsed.delta === "string") {
            full += parsed.delta;
            handlers.onDelta?.(parsed.delta);
          } else if (currentEvent === "thinking" && typeof parsed.delta === "string") {
            handlers.onThinking?.(parsed.delta);
          } else if (currentEvent === "tool") {
            handlers.onTool?.(parsed as CzarToolEvent);
          } else if (currentEvent === "followups" && Array.isArray(parsed.suggestions)) {
            handlers.onFollowups?.(parsed.suggestions);
          } else if (currentEvent === "meta") {
            handlers.onMeta?.(parsed);
          } else if (currentEvent === "clarify") {
            handlers.onClarify?.(parsed);
          } else if (currentEvent === "humanise") {
            handlers.onHumanise?.(parsed);
          } else if (currentEvent === "checkout") {
            handlers.onCheckout?.(parsed);
          } else if (currentEvent === "error") {
            handlers.onError?.(parsed.message || "Unknown error", parsed.code);
          } else if (currentEvent === "done") {
            handlers.onDone?.(parsed);
          }
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }
    return full;
  } catch (err: any) {
    if (err?.name === "AbortError" || signal?.aborted) return full;
    handlers.onError?.(err?.message || "Stream failed");
    throw err;
  }
}
