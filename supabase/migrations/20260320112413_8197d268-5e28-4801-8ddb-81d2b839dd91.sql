
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS revision_count integer NOT NULL DEFAULT 0;
