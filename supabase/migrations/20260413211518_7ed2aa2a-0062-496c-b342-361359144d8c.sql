ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS voice_profile text DEFAULT 'formal';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS language_level integer DEFAULT 4;