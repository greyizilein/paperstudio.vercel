---
name: CZAR file ingestion pipeline
description: How CZAR reads uploaded files (images, PDF, DOCX, PPTX, XLSX, audio, code/text). Storage bucket, limits, edge function flow.
type: feature
---
CZAR accepts up to 15 files per message, 20 MB per file, via the private Supabase Storage bucket `czar-uploads`. RLS scopes each user to their own folder (`{user_id}/...`).

Pipeline:
1. Composer uploads each file to `czar-uploads/{user_id}/{uuid}-{name}` and shows a chip with status (uploading/ready/error). Drag-and-drop is supported on the whole composer.
2. On send, the client calls the `czar-ingest-files` edge function with the storage paths.
3. `czar-ingest-files` downloads each file, routes by MIME/extension:
   - Images / PDF: Gemini 2.5 Flash vision (extracts OCR + description).
   - DOCX / PPTX / XLSX: unzipped via fflate; XML stripped to plain text; XLSX uses sharedStrings.
   - Audio (mp3/wav/m4a/etc): Gemini 2.5 Flash transcription.
   - Plain text / CSV / JSON / source code: raw UTF-8 decode.
   - Anything else: best-effort decode + binary notice.
4. Each file's extracted text is truncated to 10,000 words with a `[…truncated]` marker.
5. The orchestrator gets a compact summary; the writer (`czar-write`) receives the full extracted text inline in the user payload and reads it directly.

Limits surfaced in UI: "15 files · 20MB each". Honest cap (Supabase Edge Function payload + Storage tier limits prevent the spec'd 1 GB).
