ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS cleaned_data_profile jsonb,
  ADD COLUMN IF NOT EXISTS supervisor_revisions jsonb DEFAULT '[]'::jsonb;