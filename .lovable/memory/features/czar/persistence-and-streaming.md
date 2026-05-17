---
name: CZAR persistence and streaming model
description: How CZAR persists messages incrementally, handles aborted streams, and prevents the 'chat vanishes' bug.
type: feature
---
CZAR persists assistant messages **incrementally** rather than only at stream end. Pattern:
1. When a writer turn starts, an empty assistant row is inserted into `czar_messages` immediately and the row id is held in memory.
2. As deltas stream in, the in-memory `full` accumulator is updated and the DB row is flushed every 2 seconds (or on stream end / abort) via UPDATE.
3. `streamCzar` returns the partial `full` string on `AbortError` (does not throw) so callers can finalize the row.
4. Switching conversations or starting a new chat aborts the in-flight stream and waits ~150ms before unmounting so the final flush completes.
5. `czar_conversations.updated_at` is bumped after every send (success, error, or abort) to keep sidebar ordering correct.
6. `refreshConversations` runs after every send, not just on mount, so newly created chats appear immediately.

Rename and soft-delete (archived=true) are available in the sidebar via a hover-revealed ⋯ menu, with a 5-second toast Undo for deletes.

Settings persist in `localStorage` keyed by user id (`czar:settings:{uid}`).
