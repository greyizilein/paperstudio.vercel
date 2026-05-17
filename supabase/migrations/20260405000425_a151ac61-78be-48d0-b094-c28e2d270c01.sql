
-- Add email column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

-- Backfill existing profiles with email from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id AND p.email IS NULL;

-- Update trigger to store email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url, referral_code, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'PS-' || upper(left(replace(NEW.id::text, '-', ''), 6)),
    NEW.email
  );
  INSERT INTO public.subscriptions (user_id, tier, word_limit, words_used, status)
  VALUES (NEW.id, 'free', 3000, 0, 'active');
  RETURN NEW;
END;
$$;
