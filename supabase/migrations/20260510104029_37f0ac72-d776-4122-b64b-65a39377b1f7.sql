
-- Recreate trigger on auth.users -> handle_new_user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for any auth.users missing one
INSERT INTO public.profiles (user_id, display_name, avatar_url, referral_code, email)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
       u.raw_user_meta_data->>'avatar_url',
       'PS-' || upper(left(replace(u.id::text, '-', ''), 6)),
       u.email
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

-- Backfill subscriptions
INSERT INTO public.subscriptions (user_id, tier, word_limit, words_used, status)
SELECT u.id, 'free', 3000, 0, 'active'
FROM auth.users u
LEFT JOIN public.subscriptions s ON s.user_id = u.id
WHERE s.user_id IS NULL;

-- Backfill czar_subscriptions
INSERT INTO public.czar_subscriptions (user_id, tier, word_limit, words_used, bonus_words, status)
SELECT u.id, 'none', 0, 0, 1000, 'active'
FROM auth.users u
LEFT JOIN public.czar_subscriptions cs ON cs.user_id = u.id
WHERE cs.user_id IS NULL;

-- Backfill referral_codes (one per profile)
INSERT INTO public.referral_codes (code, owner_email, owner_id, active, uses_count)
SELECT p.referral_code, p.email, p.user_id, true, 0
FROM public.profiles p
LEFT JOIN public.referral_codes rc ON rc.code = p.referral_code
WHERE p.referral_code IS NOT NULL AND rc.code IS NULL;

-- Ensure referral_codes.owner_id is filled
UPDATE public.referral_codes rc
SET owner_id = p.user_id
FROM public.profiles p
WHERE rc.owner_id IS NULL AND p.referral_code = rc.code;

-- Backfill referral wallets
INSERT INTO public.referral_wallets (user_id)
SELECT user_id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- Update handle_new_user to also insert into referral_codes for the new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _ref_code text;
BEGIN
  _ref_code := 'PS-' || upper(left(replace(NEW.id::text, '-', ''), 6));

  INSERT INTO public.profiles (user_id, display_name, avatar_url, referral_code, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    _ref_code,
    NEW.email
  );

  INSERT INTO public.subscriptions (user_id, tier, word_limit, words_used, status)
  VALUES (NEW.id, 'free', 3000, 0, 'active');

  INSERT INTO public.czar_subscriptions (user_id, tier, word_limit, words_used, bonus_words, status)
  VALUES (NEW.id, 'none', 0, 0, 1000, 'active');

  INSERT INTO public.referral_codes (code, owner_email, owner_id, active, uses_count)
  VALUES (_ref_code, NEW.email, NEW.id, true, 0)
  ON CONFLICT (code) DO NOTHING;

  RETURN NEW;
END;
$$;
