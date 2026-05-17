
-- New table to store extracted text from every uploaded file, per conversation.
-- This is what fixes "CZAR forgot the brief after one turn" — file context now persists.
CREATE TABLE IF NOT EXISTS public.czar_conversation_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.czar_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL DEFAULT 'application/octet-stream',
  storage_path TEXT,
  original_size INTEGER NOT NULL DEFAULT 0,
  extracted_text TEXT NOT NULL DEFAULT '',
  summary TEXT,
  word_count INTEGER NOT NULL DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'other',
  was_summarized BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_czar_conversation_files_conv ON public.czar_conversation_files(conversation_id);
CREATE INDEX IF NOT EXISTS idx_czar_conversation_files_user ON public.czar_conversation_files(user_id);

ALTER TABLE public.czar_conversation_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own conversation files"
  ON public.czar_conversation_files
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
