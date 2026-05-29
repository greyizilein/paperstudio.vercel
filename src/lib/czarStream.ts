import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
    apikey: ANON_KEY,
  };
}

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

export type CzarEventType =
  | "meta"
  | "agent"
  | "delta"
  | "thinking"
  | "tool"
  | "status"
  | "error"
  | "billing"
  | "done"
  | "ping"
  | "correction_summary"
  | "correction_change"
  | "clarification"
  | "replace";

export interface CzarMetaEvent {
  conversation_id: string;
  assistant_id: string;
  model_label: string;
  mode: string;
}

export interface CzarAgentEvent {
  id: string;
  name: string;
  status: "starting" | "working" | "done" | "error" | "clarification";
  action?: string;
  detail?: string;
}

export interface CzarClarificationEvent {
  questions: string[];
  title?: string;
}

export interface CzarReplaceEvent {
  content: string;
}

export interface CzarDeltaEvent {
  text: string;
}

export interface CzarToolEvent {
  id: string;
  name: string;
  phase: "start" | "result" | "error";
  query?: string;
  result?: any;
  error?: string;
}

export interface CzarStatusEvent {
  phase: string;
  message?: string;
}

export interface CzarErrorEvent {
  message: string;
  recoverable?: boolean;
}

export interface CzarBillingEvent {
  reason: string;
}

export interface CzarDoneEvent {
  conversation_id: string;
  assistant_id?: string;
  words?: number;
  is_document?: boolean;
}

export type CorrectionType = "grammar" | "style" | "structure" | "argument" | "register";

export interface CorrectionChangeEvent {
  id: string;
  type: CorrectionType;
  original: string;
  corrected: string;
  explanation: string;
}

export interface CorrectionSummaryEvent {
  total: number;
  by_type: Partial<Record<CorrectionType, number>>;
  word_count_before: number;
  word_count_after: number;
  register_notes: string[];
  original_text: string;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export interface CzarHandlers {
  onMeta?: (e: CzarMetaEvent) => void;
  onAgent?: (e: CzarAgentEvent) => void;
  onDelta?: (text: string) => void;
  onThinking?: (text: string) => void;
  onTool?: (e: CzarToolEvent) => void;
  onStatus?: (e: CzarStatusEvent) => void;
  onError?: (message: string, recoverable?: boolean) => void;
  onBilling?: (reason: string) => void;
  onDone?: (e: CzarDoneEvent) => void;
  onCorrectionSummary?: (e: CorrectionSummaryEvent) => void;
  onCorrectionChange?: (e: CorrectionChangeEvent) => void;
  onClarification?: (e: CzarClarificationEvent) => void;
  onReplace?: (e: CzarReplaceEvent) => void;
}

// ---------------------------------------------------------------------------
// Request types
// ---------------------------------------------------------------------------

export type CzarMode = "chat" | "write" | "correct" | "research" | "plan" | "literature_review" | "screenplay" | "legal";

export interface CzarRequest {
  conversation_id: string | null;
  user_message: string;
  attachments?: { storage_path: string; filename: string; size: number; mime: string }[];
  mode?: CzarMode;
  previousMode?: CzarMode;
  settings?: Record<string, any>;
}

// ---------------------------------------------------------------------------
// Dispatch helper
// ---------------------------------------------------------------------------

function dispatch(eventType: string, payload: any, handlers: CzarHandlers): void {
  switch (eventType as CzarEventType) {
    case "meta":
      handlers.onMeta?.(payload as CzarMetaEvent);
      break;
    case "agent":
      handlers.onAgent?.(payload as CzarAgentEvent);
      break;
    case "delta":
      handlers.onDelta?.((payload as CzarDeltaEvent).text);
      break;
    case "thinking":
      handlers.onThinking?.((payload as CzarDeltaEvent).text);
      break;
    case "tool":
      handlers.onTool?.(payload as CzarToolEvent);
      break;
    case "status":
      handlers.onStatus?.(payload as CzarStatusEvent);
      break;
    case "error": {
      const e = payload as CzarErrorEvent;
      handlers.onError?.(e.message, e.recoverable);
      break;
    }
    case "billing":
      handlers.onBilling?.((payload as CzarBillingEvent).reason);
      break;
    case "done":
      handlers.onDone?.(payload as CzarDoneEvent);
      break;
    case "ping":
      break;
    case "correction_summary":
      handlers.onCorrectionSummary?.(payload as CorrectionSummaryEvent);
      break;
    case "correction_change":
      handlers.onCorrectionChange?.(payload as CorrectionChangeEvent);
      break;
    case "clarification":
      handlers.onClarification?.(payload as CzarClarificationEvent);
      break;
    case "replace":
      handlers.onReplace?.(payload as CzarReplaceEvent);
      break;
  }
}

// ---------------------------------------------------------------------------
// Main streaming function
// ---------------------------------------------------------------------------

export async function streamCzar(
  req: CzarRequest,
  handlers: CzarHandlers,
  signal?: AbortSignal,
): Promise<void> {
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders();
  } catch (err: any) {
    handlers.onError?.(err?.message ?? "Not authenticated");
    return;
  }

  let resp: Response;
  try {
    resp = await fetch(`${FUNCTIONS_BASE}/czar-brain`, {
      method: "POST",
      headers,
      body: JSON.stringify(req),
      signal,
    });
  } catch (err: any) {
    if (err?.name === "AbortError") return;
    handlers.onError?.(err?.message ?? "Network error");
    return;
  }

  if (!resp.ok) {
    const text = await resp.text();
    handlers.onError?.(text || `Request failed: ${resp.status}`);
    return;
  }

  if (!resp.body) {
    handlers.onError?.("No response stream");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();

  // SSE state: the spec allows `event:` on a preceding line before `data:`
  let currentEventType: string | null = null;
  let lineBuffer = "";

  try {
    while (true) {
      if (signal?.aborted) break;

      const { done, value } = await reader.read();
      if (done) break;

      lineBuffer += decoder.decode(value, { stream: true });

      let newlineIdx: number;
      while ((newlineIdx = lineBuffer.indexOf("\n")) !== -1) {
        let line = lineBuffer.slice(0, newlineIdx);
        lineBuffer = lineBuffer.slice(newlineIdx + 1);

        // Normalize CRLF
        if (line.endsWith("\r")) line = line.slice(0, -1);

        if (line === "") {
          // Empty line resets the SSE message boundary
          currentEventType = null;
          continue;
        }

        if (line.startsWith(":")) {
          // SSE comment — ignore
          continue;
        }

        if (line.startsWith("event: ")) {
          currentEventType = line.slice(7).trim();
          continue;
        }

        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === "[DONE]") continue;

        let parsed: any;
        try {
          parsed = JSON.parse(jsonStr);
        } catch {
          // Malformed JSON — skip
          continue;
        }

        // Resolve event type: prefer the multi-line `event:` header,
        // fall back to an inline `event` field inside the JSON payload.
        const resolvedType: string = currentEventType ?? parsed.event ?? "";
        if (!resolvedType) continue;

        // When the event type is embedded in the payload, strip it so
        // downstream handlers receive a clean object.
        if (!currentEventType && "event" in parsed) {
          const { event: _stripped, ...rest } = parsed;
          dispatch(resolvedType, rest, handlers);
        } else {
          dispatch(resolvedType, parsed, handlers);
        }

        // Reset per-message event type after a data line (single-line format)
        if (!currentEventType) currentEventType = null;
      }
    }
  } catch (err: any) {
    if (err?.name === "AbortError") return;
    handlers.onError?.(err?.message ?? "Stream error");
  }
}

// ---------------------------------------------------------------------------
// Conversation + message loaders
// ---------------------------------------------------------------------------

export interface CzarConversation {
  id: string;
  title: string | null;
  mode: string | null;
  created_at: string;
  updated_at?: string;
  last_message: string | null;
}

export async function loadConversations(): Promise<CzarConversation[]> {
  const { data, error } = await supabase
    .from("czar_conversations")
    .select("id, title, mode, created_at, last_message")
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []) as CzarConversation[];
}

export interface CzarMessage {
  id: string;
  role: "user" | "assistant";
  content: string | null;
  mode: string | null;
  created_at: string;
}

export async function loadMessages(conversationId: string): Promise<CzarMessage[]> {
  const { data, error } = await supabase
    .from("czar_messages")
    .select("id, role, content, mode, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CzarMessage[];
}
