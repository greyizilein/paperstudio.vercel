-- ============================================================
-- PaperStudio Admin Features Migration
-- complaints, promo_codes, refunds, admin_emails
-- ============================================================

-- ── Complaints / Support Tickets ────────────────────────────
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  user_email TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open / in-progress / resolved
  admin_notes TEXT,
  admin_reply TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own complaints"
  ON complaints FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own complaints"
  ON complaints FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin has full access to complaints"
  ON complaints
  USING (auth.email() = 'grey.izilein@gmail.com');

-- ── Promotional / Discount Codes ────────────────────────────
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'flat_usd')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  applies_to_tier TEXT, -- NULL = applies to all tiers
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage promo codes"
  ON promo_codes
  USING (auth.email() = 'grey.izilein@gmail.com');

CREATE POLICY "Anyone can read active promo codes"
  ON promo_codes FOR SELECT
  USING (active = true);

-- ── Refunds Log ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  user_email TEXT,
  amount_usd NUMERIC,
  previous_tier TEXT,
  new_tier TEXT,
  reason TEXT,
  paystack_reference TEXT,
  processed_by TEXT DEFAULT 'grey.izilein@gmail.com',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin has full access to refunds"
  ON refunds
  USING (auth.email() = 'grey.izilein@gmail.com');

-- ── Admin Sent Emails Log ────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT,
  to_tier TEXT, -- NULL if sent to individual; tier name if sent to tier group
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_by TEXT DEFAULT 'grey.izilein@gmail.com',
  sent_count INTEGER DEFAULT 1,
  sent_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin has full access to admin_emails"
  ON admin_emails
  USING (auth.email() = 'grey.izilein@gmail.com');

-- ── Update referral_uses to add paid_at timestamp ───────────
ALTER TABLE referral_uses ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- ── Index for complaint lookup by user ───────────────────────
CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_admin_emails_sent_at ON admin_emails(sent_at DESC);
