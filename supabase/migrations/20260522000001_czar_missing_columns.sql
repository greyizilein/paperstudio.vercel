-- Add columns used by the new CZAR edge function and UI that were missing
-- from the original czar_conversations and czar_messages tables.

ALTER TABLE public.czar_conversations
  ADD COLUMN IF NOT EXISTS mode text,
  ADD COLUMN IF NOT EXISTS last_message text;

ALTER TABLE public.czar_messages
  ADD COLUMN IF NOT EXISTS mode text;
