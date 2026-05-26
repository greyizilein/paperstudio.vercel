-- czar_state: stores per-user per-mode checkpoint for lossless context switching.
-- The CZAR backend serialises a compressed checkpoint when the user switches modes,
-- so the next session in that mode can resume exactly where it left off.

CREATE TABLE IF NOT EXISTS public.czar_state (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "activeDomain" TEXT NOT NULL,
  checkpoint    JSONB,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, "activeDomain")
);

CREATE INDEX IF NOT EXISTS czar_state_user_idx ON public.czar_state (user_id);

ALTER TABLE public.czar_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "czar_state_select" ON public.czar_state
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "czar_state_insert" ON public.czar_state
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "czar_state_update" ON public.czar_state
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "czar_state_delete" ON public.czar_state
  FOR DELETE USING (auth.uid() = user_id);

-- Service role bypass so edge functions (using service role key) can read/write freely
CREATE POLICY "czar_state_service_role" ON public.czar_state
  USING (true) WITH CHECK (true);

GRANT ALL ON public.czar_state TO service_role;
