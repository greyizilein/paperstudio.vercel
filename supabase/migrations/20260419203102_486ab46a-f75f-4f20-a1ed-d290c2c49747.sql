ALTER TABLE public.czar_conversations
ADD COLUMN IF NOT EXISTS renamed boolean NOT NULL DEFAULT false;

UPDATE public.czar_conversations
SET renamed = true, last_user_message = NULL
WHERE last_user_message = '__renamed__';