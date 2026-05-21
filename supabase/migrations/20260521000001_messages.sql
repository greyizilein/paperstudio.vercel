CREATE TABLE IF NOT EXISTS public.messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_admin  boolean     NOT NULL DEFAULT false,
  content     text        NOT NULL,
  read        boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can read and insert their own messages (but cannot set from_admin = true)
CREATE POLICY "Users manage own messages"
  ON public.messages FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND from_admin = false);

-- Admin (grey.izilein@gmail.com) can read and insert all messages
CREATE POLICY "Admin full access"
  ON public.messages FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'email') = 'grey.izilein@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'grey.izilein@gmail.com');

-- Service role bypass for edge functions
CREATE POLICY "Service role full access"
  ON public.messages FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Enable realtime for live messaging
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
