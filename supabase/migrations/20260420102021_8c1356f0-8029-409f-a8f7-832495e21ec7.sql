ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS include_hypotheses boolean NOT NULL DEFAULT false;