-- ============================================================
-- CZAR core: parallel product surface, zero impact on PaperStudio
-- ============================================================

-- 1. czar_subscriptions
CREATE TABLE public.czar_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  tier TEXT NOT NULL DEFAULT 'none',
  word_limit INTEGER NOT NULL DEFAULT 0,
  words_used INTEGER NOT NULL DEFAULT 0,
  bonus_words INTEGER NOT NULL DEFAULT 1000,
  bonus_used INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.czar_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own czar subscription" ON public.czar_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own czar subscription" ON public.czar_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admin can view all czar subscriptions" ON public.czar_subscriptions
  FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'email') = 'grey.izilein@gmail.com');

CREATE TRIGGER czar_subscriptions_updated_at
  BEFORE UPDATE ON public.czar_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. czar_conversations
CREATE TABLE public.czar_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New chat',
  pinned BOOLEAN NOT NULL DEFAULT false,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_czar_conversations_user ON public.czar_conversations(user_id, updated_at DESC);

ALTER TABLE public.czar_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own conversations" ON public.czar_conversations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER czar_conversations_updated_at
  BEFORE UPDATE ON public.czar_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. czar_messages
CREATE TABLE public.czar_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.czar_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  model_used TEXT,
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_czar_messages_conv ON public.czar_messages(conversation_id, created_at);

ALTER TABLE public.czar_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own messages" ON public.czar_messages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.czar_messages;
ALTER TABLE public.czar_messages REPLICA IDENTITY FULL;

-- 4. czar_artifacts
CREATE TABLE public.czar_artifacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.czar_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  file_path TEXT,
  data_uri TEXT,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_czar_artifacts_message ON public.czar_artifacts(message_id);

ALTER TABLE public.czar_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own artifacts" ON public.czar_artifacts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. increment_czar_words_used
CREATE OR REPLACE FUNCTION public.increment_czar_words_used(_user_id UUID, _amount INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email TEXT;
  _bonus_remaining INTEGER;
  _from_bonus INTEGER;
  _from_paid INTEGER;
  _new_used INTEGER;
  _limit INTEGER;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = _user_id;
  IF _email = 'grey.izilein@gmail.com' THEN
    RETURN;
  END IF;

  SELECT GREATEST(bonus_words - bonus_used, 0) INTO _bonus_remaining
  FROM public.czar_subscriptions WHERE user_id = _user_id;

  IF _bonus_remaining IS NULL THEN
    RETURN;
  END IF;

  _from_bonus := LEAST(_bonus_remaining, _amount);
  _from_paid := _amount - _from_bonus;

  UPDATE public.czar_subscriptions
  SET bonus_used = bonus_used + _from_bonus,
      words_used = words_used + _from_paid
  WHERE user_id = _user_id
  RETURNING words_used, word_limit INTO _new_used, _limit;

  IF _limit > 0 AND _new_used >= _limit THEN
    UPDATE public.czar_subscriptions SET status = 'expired' WHERE user_id = _user_id;
  END IF;
END;
$$;

-- 6. Update signup trigger to also seed czar_subscriptions
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
  INSERT INTO public.czar_subscriptions (user_id, tier, word_limit, words_used, bonus_words, status)
  VALUES (NEW.id, 'none', 0, 0, 1000, 'active');
  RETURN NEW;
END;
$$;

-- 7. Backfill czar_subscriptions for all existing users
INSERT INTO public.czar_subscriptions (user_id, tier, word_limit, words_used, bonus_words, status)
SELECT id, 'none', 0, 0, 1000, 'active' FROM auth.users
ON CONFLICT (user_id) DO NOTHING;