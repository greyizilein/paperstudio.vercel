
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS ai_model text DEFAULT 'gemini-2.5-flash';

-- Add preferred_model to profiles for user settings
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_model text DEFAULT 'gemini-2.5-flash';

-- Create a view-like function to count completed projects per user
CREATE OR REPLACE FUNCTION public.count_completed_projects(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.projects
  WHERE user_id = _user_id
    AND status = 'completed'
$$;
