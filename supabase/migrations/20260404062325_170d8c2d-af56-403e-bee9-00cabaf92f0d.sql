
-- 1. Add columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS account_number text,
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS alt_email text,
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb DEFAULT '{"generation_complete":true,"referral_used":true,"payment_received":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS settings_json jsonb DEFAULT '{}'::jsonb;

-- 2. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- 3. Create app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage app settings"
  ON public.app_settings FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'grey.izilein@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'grey.izilein@gmail.com');

CREATE POLICY "Anyone can read app settings"
  ON public.app_settings FOR SELECT
  USING (true);

-- Insert default settings
INSERT INTO public.app_settings (key, value) VALUES
  ('referral_popup_frequency', '"daily"'),
  ('maintenance_mode', 'false'),
  ('announcement_banner', '""'),
  ('default_ai_model', '"gemini-2.5-flash"')
ON CONFLICT (key) DO NOTHING;

-- 4. Update handle_new_user trigger to auto-generate referral code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'PS-' || upper(left(replace(NEW.id::text, '-', ''), 6))
  );
  INSERT INTO public.subscriptions (user_id, tier, word_limit, words_used, status)
  VALUES (NEW.id, 'free', 3000, 0, 'active');
  RETURN NEW;
END;
$$;

-- 5. Admin SELECT policies for profiles, subscriptions, projects
CREATE POLICY "Admin can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'grey.izilein@gmail.com');

CREATE POLICY "Admin can view all subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'grey.izilein@gmail.com');

CREATE POLICY "Admin can view all projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'grey.izilein@gmail.com');

-- 6. Generate referral codes for existing users who don't have one
UPDATE public.profiles
SET referral_code = 'PS-' || upper(left(replace(user_id::text, '-', ''), 6))
WHERE referral_code IS NULL;

-- 7. Allow users to read referral_codes table (to validate codes on signup)
CREATE POLICY "Anyone can read active referral codes"
  ON public.referral_codes FOR SELECT
  USING (active = true);
