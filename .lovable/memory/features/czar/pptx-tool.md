---
name: CZAR generate_pptx tool
description: Claude-only CZAR tool that builds a .pptx via pptxgenjs (Deno npm), uploads to czar-uploads, streams a signed download link inline.
type: feature
---

`generate_pptx` is registered in `supabase/functions/czar-chat/index.ts` TOOL_DEFINITIONS and executed in `executeTool`. Builder lives in `supabase/functions/_shared/pptx-builder.ts` (uses `npm:pptxgenjs@3.12.0`).

- Available to Claude Sonnet 4.6 + Opus 4.6 only (CZAR's tool loop is Claude-only by design — GPT-5.2/Qwen have no agentic loop).
- Slide types: title, section, bullets, two_column, image, stat, quote, table.
- 10 palettes ported from Grey LLC universal pptx skill (academic_navy default).
- Output: base64 → uploaded to `czar-uploads/{user_id}/generated/{ts}-{name}.pptx`, 7-day signed URL streamed inline as a markdown download link.
- ToolCtx extended with `userId` + `svc` (service-role client) so the executor can upload + sign.
- Word/tier gates UNCHANGED — admin bypass intact.
- Agent system prompt tells Claude to fire generate_pptx for any slide/deck/presentation request.
