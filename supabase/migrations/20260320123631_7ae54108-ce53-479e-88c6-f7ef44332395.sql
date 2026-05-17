
-- AI usage logging table
CREATE TABLE public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tier text NOT NULL DEFAULT 'free',
  action text NOT NULL,
  model text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  estimated_cost_usd numeric(10,6) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for dashboard queries
CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at DESC);
CREATE INDEX idx_ai_usage_logs_user_id ON public.ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_logs_action ON public.ai_usage_logs(action);

-- Enable RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only SELECT (by email)
CREATE POLICY "Admin can view all usage logs"
  ON public.ai_usage_logs FOR SELECT
  USING (
    auth.jwt() ->> 'email' = 'grey.izilein@gmail.com'
  );

-- Edge functions insert via service role key (bypasses RLS), 
-- but also allow authenticated insert for safety
CREATE POLICY "Service can insert usage logs"
  ON public.ai_usage_logs FOR INSERT
  WITH CHECK (true);
