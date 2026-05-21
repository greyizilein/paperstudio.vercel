-- site_content: admin-editable content blocks for marketing pages
CREATE TABLE IF NOT EXISTS public.site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL,
  section text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(page, section)
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage site content"
  ON public.site_content FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'grey.izilein@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'grey.izilein@gmail.com');

CREATE POLICY "Anyone can read site content"
  ON public.site_content FOR SELECT
  USING (true);

-- Seed default content blocks so admin sees them immediately
INSERT INTO public.site_content (page, section, content) VALUES
  ('landing', 'hero_subtitle', '{"text":"Chapter-by-chapter structure, real citations, narrative flow — exports a submission-ready .docx your supervisor will respect."}'),
  ('landing', 'cta_headline', '{"text":"Your thesis is waiting."}'),
  ('landing', 'cta_subtext', '{"text":"Write Chapter 1 today — for free. No subscription, no card required. Just your idea and a deadline you can finally meet."}'),
  ('landing', 'cta_button', '{"text":"Start Chapter 1 — free"}'),
  ('pricing', 'intro_text', '{"text":"No subscriptions. One project per payment. Revisions based per project tier."}'),
  ('help', 'faq_items', '{"items":[]}'),
  ('global', 'announcement_banner', '{"text":"","active":false}')
ON CONFLICT (page, section) DO NOTHING;
