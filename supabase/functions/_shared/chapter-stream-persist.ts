// Tee an upstream OpenAI-shaped SSE stream to the client AND persist
// the accumulated text to chapters.draft_config._stream every ~2s.
// On every flush, polls chapters.draft_config._stream.stop_requested.
// If true (set by the client when the user clicks Stop), aborts upstream.
//
// On disconnect (client tab close), the upstream is NOT aborted because
// `upstreamAbort` is created here and is independent of `req.signal`.
// The function keeps consuming and persisting until upstream completes.
//
// Schema: chapters.draft_config._stream = {
//   in_progress: boolean
//   started_at: ISO string
//   last_seen_at: ISO string
//   full_text: string
//   stop_requested?: boolean
//   completion_status?: "done" | "stopped" | "error"
//   error?: string
//   model?: string
// }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface TeeOptions {
  upstream: Response;
  upstreamAbort: AbortController;
  chapterId: string;
  userId: string;
  existingDraftConfig: any;
  model: string;
  continuationPrefix?: string; // when continuing, body already in chapter
  flushIntervalMs?: number;
  heartbeatStaleMs?: number;
}

const ENC = new TextEncoder();
const DEC = new TextDecoder();

export function teeAndPersistChapterStream(opts: TeeOptions): Response {
  const {
    upstream,
    upstreamAbort,
    chapterId,
    userId,
    existingDraftConfig,
    model,
    continuationPrefix = "",
    flushIntervalMs = 2000,
  } = opts;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const adminSb = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  let fullText = continuationPrefix;
  let lastFlushAt = 0;
  let stopAlreadySignalled = false;
  let parseBuffer = "";

  const baseConfig = { ...(existingDraftConfig || {}) };

  async function writeStreamMeta(patch: Record<string, any>) {
    try {
      // Read latest draft_config so we don't clobber other writers.
      const { data: row } = await adminSb
        .from("chapters")
        .select("draft_config")
        .eq("id", chapterId)
        .maybeSingle();
      const cfg = (row?.draft_config as any) || baseConfig;
      const existingStream = (cfg._stream as any) || {};
      const nextStream = { ...existingStream, ...patch };
      // Detect stop signal mid-flight
      if (nextStream.stop_requested && !stopAlreadySignalled) {
        stopAlreadySignalled = true;
        try { upstreamAbort.abort(); } catch { /* ignore */ }
      }
      const nextConfig = { ...cfg, _stream: nextStream };
      await adminSb
        .from("chapters")
        .update({ draft_config: nextConfig })
        .eq("id", chapterId);
    } catch (e) {
      console.warn("[chapter-stream-persist] writeStreamMeta failed:", e);
    }
  }

  async function persistPartial(force = false) {
    const now = Date.now();
    if (!force && now - lastFlushAt < flushIntervalMs) return;
    lastFlushAt = now;
    await writeStreamMeta({
      in_progress: true,
      last_seen_at: new Date().toISOString(),
      full_text: fullText,
      model,
    });
  }

  async function markComplete(status: "done" | "stopped" | "error", err?: string) {
    try {
      const { data: row } = await adminSb
        .from("chapters")
        .select("draft_config, content")
        .eq("id", chapterId)
        .maybeSingle();
      const cfg = (row?.draft_config as any) || baseConfig;
      const existingStream = (cfg._stream as any) || {};
      const nextStream = {
        ...existingStream,
        in_progress: false,
        last_seen_at: new Date().toISOString(),
        full_text: fullText,
        completion_status: status,
        error: err || existingStream.error || null,
        model,
      };
      const nextConfig = { ...cfg, _stream: nextStream };

      // Only update content if our captured text is longer than what's already there.
      // Defends against late writes overwriting a client-side replace/polish.
      const existingContent = (row?.content as string) || "";
      const update: Record<string, any> = { draft_config: nextConfig };
      if (fullText.length > existingContent.length) {
        update.content = fullText;
      }
      await adminSb.from("chapters").update(update).eq("id", chapterId);
    } catch (e) {
      console.warn("[chapter-stream-persist] markComplete failed:", e);
    }
  }

  // Initialise heartbeat row immediately so the client can detect resume.
  writeStreamMeta({
    in_progress: true,
    started_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    full_text: fullText,
    stop_requested: false,
    completion_status: null,
    error: null,
    model,
  }).catch(() => {});

  const teedStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          // Forward raw bytes to client
          try { controller.enqueue(value); } catch { /* client closed */ }

          // Parse for accumulation
          parseBuffer += DEC.decode(value, { stream: true });
          let idx: number;
          while ((idx = parseBuffer.indexOf("\n")) !== -1) {
            let line = parseBuffer.slice(0, idx);
            parseBuffer = parseBuffer.slice(idx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") continue;
            try {
              const parsed = JSON.parse(json);
              const delta = parsed?.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta.length) {
                fullText += delta;
              }
            } catch { /* incomplete frame, will appear in next chunk */ }
          }
          await persistPartial(false);
        }
        await persistPartial(true);
        await markComplete(stopAlreadySignalled ? "stopped" : "done");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn("[chapter-stream-persist] stream error:", msg);
        await markComplete(stopAlreadySignalled ? "stopped" : "error", msg);
      } finally {
        try { controller.close(); } catch { /* already closed */ }
      }
    },
    cancel() {
      // Client disconnected (tab close). Do NOT abort upstream — we want
      // generation to complete server-side so the user can resume on return.
      // We continue consuming the upstream in the background to keep persisting.
      (async () => {
        try {
          const reader = upstream.body!.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            parseBuffer += DEC.decode(value, { stream: true });
            let idx: number;
            while ((idx = parseBuffer.indexOf("\n")) !== -1) {
              let line = parseBuffer.slice(0, idx);
              parseBuffer = parseBuffer.slice(idx + 1);
              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (!line.startsWith("data: ")) continue;
              const json = line.slice(6).trim();
              if (json === "[DONE]") continue;
              try {
                const parsed = JSON.parse(json);
                const delta = parsed?.choices?.[0]?.delta?.content;
                if (typeof delta === "string" && delta.length) fullText += delta;
              } catch { /* ignore */ }
            }
            await persistPartial(false);
          }
          await persistPartial(true);
          await markComplete(stopAlreadySignalled ? "stopped" : "done");
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          await markComplete(stopAlreadySignalled ? "stopped" : "error", msg);
        }
      })();
    },
  });

  return new Response(teedStream, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Resume-Enabled": "1",
    },
  });
}
