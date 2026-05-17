
-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  tier text NOT NULL DEFAULT 'free',
  word_limit integer NOT NULL DEFAULT 3000,
  words_used integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own subscription"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
ON public.subscriptions FOR UPDATE
USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RPC: get_user_subscription
CREATE OR REPLACE FUNCTION public.get_user_subscription(_user_id uuid)
RETURNS TABLE(tier text, word_limit integer, words_used integer, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.tier, s.word_limit, s.words_used, s.status
  FROM public.subscriptions s
  WHERE s.user_id = _user_id
  LIMIT 1;
$$;

-- RPC: increment_words_used
CREATE OR REPLACE FUNCTION public.increment_words_used(_user_id uuid, _amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_total integer;
  _limit integer;
BEGIN
  UPDATE public.subscriptions
  SET words_used = words_used + _amount
  WHERE user_id = _user_id
  RETURNING words_used, word_limit INTO _new_total, _limit;

  IF _new_total >= _limit THEN
    UPDATE public.subscriptions
    SET status = 'expired'
    WHERE user_id = _user_id;
  END IF;
END;
$$;

-- Update handle_new_user to also create a subscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.subscriptions (user_id, tier, word_limit, words_used, status)
  VALUES (NEW.id, 'free', 3000, 0, 'active');
  RETURN NEW;
END;
$$;

-- Backfill subscriptions for existing users who don't have one
INSERT INTO public.subscriptions (user_id, tier, word_limit, words_used, status)
SELECT p.user_id, 'free', 3000, 0, 'active'
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.user_id = p.user_id);
