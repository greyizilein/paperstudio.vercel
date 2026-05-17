-- Image generation job queue (replaces the in-line ZIP-mode that was hitting the 150s edge-function timeout)
CREATE TABLE public.image_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  project_id uuid,
  figures jsonb NOT NULL DEFAULT '[]'::jsonb,
  project_title text NOT NULL DEFAULT '',
  colour_scheme text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','completed','failed','cancelled')),
  total int NOT NULL DEFAULT 0,
  completed int NOT NULL DEFAULT 0,
  result_zip_b64 text,
  result_filename text,
  error text,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.image_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own image jobs"
  ON public.image_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own image jobs"
  ON public.image_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own image jobs"
  ON public.image_jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service can update all image jobs"
  ON public.image_jobs FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_image_jobs_user_status ON public.image_jobs(user_id, status, created_at DESC);

CREATE TRIGGER update_image_jobs_updated_at
  BEFORE UPDATE ON public.image_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-figure attempt log — for diagnostics across sessions
CREATE TABLE public.image_generation_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid REFERENCES public.image_jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  request_id text,
  figure_id text,
  figure_title text,
  model text,
  status text NOT NULL CHECK (status IN ('success','failure','timeout','rate_limited')),
  duration_ms int,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.image_generation_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own attempts"
  ON public.image_generation_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert attempts"
  ON public.image_generation_attempts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin can view all attempts"
  ON public.image_generation_attempts FOR SELECT
  USING ((auth.jwt() ->> 'email'::text) = 'grey.izilein@gmail.com'::text);

CREATE INDEX idx_image_attempts_user ON public.image_generation_attempts(user_id, created_at DESC);
CREATE INDEX idx_image_attempts_job ON public.image_generation_attempts(job_id);