-- CZAR Cognitive Architecture — State persistence tables.
-- Adds: czar_project_state (checkpoint + domain + style per project)
-- Adds: active_domain, style_overlay, checkpoint_data, user_preferences to czar_conversations.

-- ---------------------------------------------------------------------------
-- czar_project_state
-- Stores the cognitive state (domain, style, checkpoint) per project-user pair.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.czar_project_state (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id       TEXT NOT NULL,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  active_domain    TEXT NOT NULL DEFAULT 'academic'
                   CHECK (active_domain IN ('academic','fiction','professional','journalistic','personal','poetry','chat')),
  style_overlay    TEXT NOT NULL DEFAULT 'harvard',
  checkpoint_data  JSONB,
  user_preferences JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS czar_project_state_user_idx  ON public.czar_project_state (user_id);
CREATE INDEX IF NOT EXISTS czar_project_state_proj_idx  ON public.czar_project_state (project_id);

-- RLS
ALTER TABLE public.czar_project_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "czar_project_state_select" ON public.czar_project_state
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "czar_project_state_insert" ON public.czar_project_state
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "czar_project_state_update" ON public.czar_project_state
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "czar_project_state_delete" ON public.czar_project_state
  FOR DELETE USING (auth.uid() = user_id);

-- Service role bypass (edge functions use service role)
CREATE POLICY "czar_project_state_service" ON public.czar_project_state
  USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Add domain/style/checkpoint columns to czar_conversations (if not present)
-- ---------------------------------------------------------------------------

ALTER TABLE public.czar_conversations
  ADD COLUMN IF NOT EXISTS active_domain    TEXT DEFAULT 'chat',
  ADD COLUMN IF NOT EXISTS style_overlay    TEXT DEFAULT 'direct_expert',
  ADD COLUMN IF NOT EXISTS checkpoint_data  JSONB;

-- ---------------------------------------------------------------------------
-- Add domain column to czar_messages (for per-message domain tracking)
-- ---------------------------------------------------------------------------

ALTER TABLE public.czar_messages
  ADD COLUMN IF NOT EXISTS domain TEXT,
  ADD COLUMN IF NOT EXISTS style  TEXT;

-- ---------------------------------------------------------------------------
-- Helper: update czar_project_state.updated_at automatically
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_czar_project_state_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS czar_project_state_updated_at ON public.czar_project_state;
CREATE TRIGGER czar_project_state_updated_at
  BEFORE UPDATE ON public.czar_project_state
  FOR EACH ROW EXECUTE FUNCTION public.set_czar_project_state_updated_at();

-- ---------------------------------------------------------------------------
-- Checkpoint index for efficient lookup of latest checkpoint per project
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS czar_project_state_updated_idx
  ON public.czar_project_state (user_id, updated_at DESC);

-- ---------------------------------------------------------------------------
-- Grant service role access (used by edge functions)
-- ---------------------------------------------------------------------------

GRANT ALL ON public.czar_project_state TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;
