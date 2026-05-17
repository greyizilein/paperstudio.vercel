
-- Referral codes table
CREATE TABLE public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  owner_email text NOT NULL,
  reward_description text DEFAULT '',
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage referral codes"
  ON public.referral_codes FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'grey.izilein@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'grey.izilein@gmail.com');

-- Referral uses table
CREATE TABLE public.referral_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id uuid NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  referred_user_id uuid,
  referred_email text,
  payment_reference text,
  payment_tier text,
  payment_amount numeric,
  status text NOT NULL DEFAULT 'registered',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view referral uses"
  ON public.referral_uses FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'grey.izilein@gmail.com');

CREATE POLICY "Service can insert referral uses"
  ON public.referral_uses FOR INSERT
  WITH CHECK (true);
