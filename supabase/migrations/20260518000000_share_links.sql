
-- Share links: let project owners generate a public read-only URL for their dissertation
CREATE TABLE public.share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz,
  settings_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- Anyone can read a share link (token acts as the access control)
CREATE POLICY "Public read share_links" ON public.share_links
  FOR SELECT USING (true);

-- Only the creator can insert/update/delete their share links
CREATE POLICY "Owner manages share_links" ON public.share_links
  FOR ALL USING (auth.uid() = created_by);

-- Supervisor comments: anonymous visitors can leave paragraph-level comments
CREATE TABLE public.supervisor_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_link_id uuid NOT NULL REFERENCES public.share_links(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  paragraph_index int NOT NULL,
  comment text NOT NULL,
  author_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.supervisor_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments (share token is the gate)
CREATE POLICY "Public read supervisor_comments" ON public.supervisor_comments
  FOR SELECT USING (true);

-- Anyone can insert comments on a valid (non-expired) share link
CREATE POLICY "Anyone can insert supervisor_comments" ON public.supervisor_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.share_links
      WHERE share_links.id = share_link_id
        AND (share_links.expires_at IS NULL OR share_links.expires_at > now())
    )
  );

-- Project owner can delete comments on their projects
CREATE POLICY "Owner can delete supervisor_comments" ON public.supervisor_comments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.share_links sl
      JOIN public.projects p ON p.id = sl.project_id
      WHERE sl.id = share_link_id AND p.user_id = auth.uid()
    )
  );

-- Allow reading project via any active share link (no auth needed)
CREATE POLICY "Read project via share link" ON public.projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.share_links
      WHERE share_links.project_id = projects.id
        AND (share_links.expires_at IS NULL OR share_links.expires_at > now())
    )
  );

-- Allow reading chapters via any active share link (no auth needed)
CREATE POLICY "Read chapters via share link" ON public.chapters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.share_links
      WHERE share_links.project_id = chapters.project_id
        AND (share_links.expires_at IS NULL OR share_links.expires_at > now())
    )
  );
