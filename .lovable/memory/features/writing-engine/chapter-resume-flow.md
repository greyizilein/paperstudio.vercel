---
name: PaperStudio chapter resume + explicit-stop flow
description: How chapter writes survive tab close and only end on explicit Stop, mirroring the CZAR persistence model.
type: feature
---
PaperStudio's `generate-chapter` edge function persists chapter writes incrementally so generation continues even when the client disconnects, and only stops on an explicit Stop click.

**Server side (`supabase/functions/generate-chapter/index.ts` + `_shared/chapter-stream-persist.ts`):**
1. When the request includes `chapter.id` and we have a resolved `userId`, the upstream Anthropic/Gateway response is wrapped in `teeAndPersistChapterStream(...)` instead of being piped raw to the client.
2. The tee parses the OpenAI-shaped SSE deltas, accumulates `fullText`, and every ~2s writes `chapters.draft_config._stream = { in_progress, started_at, last_seen_at, full_text, model }`. Heartbeat is the `last_seen_at` field.
3. The upstream call uses a **detached `AbortController`** (independent of `req.signal`). When the client tab closes, the `ReadableStream`'s `cancel()` callback continues consuming the upstream in the background, persisting deltas, until completion.
4. **Stop button** is the only way to end early. The client patches `chapters.draft_config._stream.stop_requested = true`. The persist loop reads this on every flush; when set, it aborts the upstream controller. `markComplete("stopped")` writes the final state.
5. On finish (success/stop/error), `markComplete(status)` writes `in_progress=false`, `completion_status`, and only updates `chapters.content` when `fullText.length > existingContent.length` (defends against late writes overwriting a client polish/replace).

**Client side (`src/pages/Writer.tsx`):**
- After `loadProject`, an effect scans every chapter for `draft_config._stream.in_progress === true` with `last_seen_at` < 60s old. If found, it switches to that chapter, hydrates `streamingContent` from `_stream.full_text`, and starts `startTailingChapter(chapterId)`.
- `startTailingChapter` polls `chapters.draft_config._stream` every 1.5s. Each tick refreshes `streamingContent`. Exit conditions: server marked complete, heartbeat dead >90s, or content stuck >60s with stale heartbeat.
- On finalisation, the tailer commits `content` to project state, sets `status: "completed"` if `completion_status === "done"`, and toasts the outcome.
- `handleStopGeneration` writes `_stream.stop_requested = true` then aborts the local fetch so the UI shows immediate feedback while the server cleanly stops the upstream call.

**Schema:** No new columns. The streaming state lives inside the existing `chapters.draft_config` JSONB under the reserved key `_stream`. This keeps the resume mechanism schema-free and isolated from user-facing draft config fields.
