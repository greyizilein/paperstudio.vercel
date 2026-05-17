
CREATE TABLE IF NOT EXISTS public.admin_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  to_tier text,
  subject text NOT NULL,
  body text NOT NULL,
  sent_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin reads admin_emails" ON public.admin_emails FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'email') = 'grey.izilein@gmail.com');
