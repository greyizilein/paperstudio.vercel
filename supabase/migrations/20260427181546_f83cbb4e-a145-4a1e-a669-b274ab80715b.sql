DO $$
DECLARE
  _uid uuid;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE email = 'grey.izilein@gmail.com' LIMIT 1;
  IF _uid IS NULL THEN
    RAISE NOTICE 'Admin user not found';
    RETURN;
  END IF;

  UPDATE public.czar_subscriptions
  SET tier='phd', word_limit=999999, words_used=0,
      bonus_words=999999, bonus_used=0, status='active', expires_at=NULL
  WHERE user_id = _uid;

  UPDATE public.subscriptions
  SET tier='phd', word_limit=999999, words_used=0, status='active'
  WHERE user_id = _uid;
END $$;