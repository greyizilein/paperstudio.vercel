CREATE OR REPLACE FUNCTION public.increment_words_used(_user_id uuid, _amount integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _new_total integer;
  _limit integer;
  _email text;
BEGIN
  -- Check if this is the test user — skip incrementing entirely
  SELECT email INTO _email FROM auth.users WHERE id = _user_id;
  IF _email = 'grey.izilein@gmail.com' THEN
    RETURN;
  END IF;

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
$function$