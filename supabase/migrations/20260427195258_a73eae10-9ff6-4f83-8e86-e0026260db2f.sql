CREATE TABLE IF NOT EXISTS public.czar_file_cache (
  storage_path text PRIMARY KEY,
  user_id uuid NOT NULL,
  filename text NOT NULL DEFAULT '',
  mime text NOT NULL DEFAULT 'application/octet-stream',
  original_size integer NOT NULL DEFAULT 0,
  extracted_text text NOT NULL DEFAULT '',
  word_count integer NOT NULL DEFAULT 0,
  was_summarized boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.czar_file_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own file cache"
ON public.czar_file_cache
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_czar_file_cache_user ON public.czar_file_cache(user_id);