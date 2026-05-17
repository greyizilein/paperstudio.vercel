
-- 1. Wallets
CREATE TABLE public.referral_wallets (
  user_id uuid PRIMARY KEY,
  balance_usd numeric NOT NULL DEFAULT 0,
  pending_usd numeric NOT NULL DEFAULT 0,
  lifetime_earned_usd numeric NOT NULL DEFAULT 0,
  total_referrals integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own wallet" ON public.referral_wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin views all wallets" ON public.referral_wallets FOR SELECT TO authenticated USING ((auth.jwt() ->> 'email') = 'grey.izilein@gmail.com');

-- 2. Earnings
CREATE TABLE public.referral_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referee_id uuid NOT NULL,
  payment_reference text,
  payment_amount_usd numeric NOT NULL DEFAULT 0,
  commission_usd numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'credited',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payment_reference)
);
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own earnings" ON public.referral_earnings FOR SELECT USING (auth.uid() = referrer_id);
CREATE POLICY "Admin views all earnings" ON public.referral_earnings FOR SELECT TO authenticated USING ((auth.jwt() ->> 'email') = 'grey.izilein@gmail.com');

-- 3. Payouts
CREATE TABLE public.referral_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_usd numeric NOT NULL,
  amount_ngn numeric NOT NULL,
  exchange_rate numeric,
  bank_name text,
  account_number text,
  account_name text,
  status text NOT NULL DEFAULT 'pending',
  paystack_recipient_code text,
  paystack_transfer_code text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.referral_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own payouts" ON public.referral_payouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin views all payouts" ON public.referral_payouts FOR SELECT TO authenticated USING ((auth.jwt() ->> 'email') = 'grey.izilein@gmail.com');

-- 4. owner_id on referral_codes
ALTER TABLE public.referral_codes ADD COLUMN IF NOT EXISTS owner_id uuid;
UPDATE public.referral_codes rc
SET owner_id = p.user_id
FROM public.profiles p
WHERE rc.owner_id IS NULL AND p.referral_code = rc.code;

-- 5. Backfill wallets for every existing profile
INSERT INTO public.referral_wallets (user_id)
SELECT user_id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- 6. Trigger to create wallet on new profile
CREATE OR REPLACE FUNCTION public.create_referral_wallet()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.referral_wallets (user_id) VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_create_referral_wallet ON public.profiles;
CREATE TRIGGER trg_create_referral_wallet AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.create_referral_wallet();

-- 7. credit_referral_commission RPC
CREATE OR REPLACE FUNCTION public.credit_referral_commission(
  _referee_id uuid,
  _amount_usd numeric,
  _payment_ref text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _ref_use record;
  _code record;
  _commission numeric;
  _referrer_email text;
  _referee_email text;
  _referee_name text;
BEGIN
  -- Already credited?
  IF EXISTS (SELECT 1 FROM public.referral_earnings WHERE payment_reference = _payment_ref) THEN
    RETURN jsonb_build_object('credited', false, 'reason', 'already_credited');
  END IF;

  SELECT * INTO _ref_use FROM public.referral_uses WHERE referred_user_id = _referee_id ORDER BY created_at ASC LIMIT 1;
  IF _ref_use IS NULL THEN
    RETURN jsonb_build_object('credited', false, 'reason', 'no_referral');
  END IF;

  SELECT * INTO _code FROM public.referral_codes WHERE id = _ref_use.referral_code_id;
  IF _code.owner_id IS NULL OR _code.owner_id = _referee_id THEN
    RETURN jsonb_build_object('credited', false, 'reason', 'self_or_orphan');
  END IF;

  SELECT email INTO _referrer_email FROM auth.users WHERE id = _code.owner_id;
  IF _referrer_email = 'grey.izilein@gmail.com' THEN
    RETURN jsonb_build_object('credited', false, 'reason', 'admin_owner');
  END IF;

  _commission := round((_amount_usd * 0.10)::numeric, 2);

  INSERT INTO public.referral_earnings (referrer_id, referee_id, payment_reference, payment_amount_usd, commission_usd, status)
  VALUES (_code.owner_id, _referee_id, _payment_ref, _amount_usd, _commission, 'credited');

  UPDATE public.referral_wallets
  SET balance_usd = balance_usd + _commission,
      lifetime_earned_usd = lifetime_earned_usd + _commission,
      updated_at = now()
  WHERE user_id = _code.owner_id;

  UPDATE public.referral_uses SET status = 'paid' WHERE id = _ref_use.id;

  SELECT email, raw_user_meta_data->>'full_name' INTO _referee_email, _referee_name
  FROM auth.users WHERE id = _referee_id;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    _code.owner_id,
    'You earned $' || _commission::text || '!',
    'You earned $' || _commission::text || ' from ' || COALESCE(_referee_name, _referee_email, 'a friend') || ' joining PaperStudio.',
    'success'
  );

  RETURN jsonb_build_object(
    'credited', true,
    'commission_usd', _commission,
    'referrer_id', _code.owner_id,
    'referrer_email', _referrer_email,
    'referee_email', _referee_email,
    'referee_name', _referee_name
  );
END; $$;

-- 8. deduct_wallet_for_payout
CREATE OR REPLACE FUNCTION public.deduct_wallet_for_payout(_user_id uuid, _amount numeric)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bal numeric;
BEGIN
  SELECT balance_usd INTO _bal FROM public.referral_wallets WHERE user_id = _user_id FOR UPDATE;
  IF _bal IS NULL OR _bal < _amount THEN RETURN false; END IF;
  UPDATE public.referral_wallets SET balance_usd = balance_usd - _amount, updated_at = now() WHERE user_id = _user_id;
  RETURN true;
END; $$;

-- 9. refund_wallet_after_failed_payout
CREATE OR REPLACE FUNCTION public.refund_wallet_after_failed_payout(_user_id uuid, _amount numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.referral_wallets SET balance_usd = balance_usd + _amount, updated_at = now() WHERE user_id = _user_id;
END; $$;
