-- Public bucket for AI-generated figures/images embedded inline in documents.
-- These are referenced by public URL (not base64) so they render in the app,
-- persist cleanly in czar_messages.content, and survive download/export.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('czar-figures', 'czar-figures', true, 26214400, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 26214400;

-- Anyone can read (public bucket — required for <img src> to load without auth)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND policyname = 'Public read czar figures'
  ) THEN
    CREATE POLICY "Public read czar figures"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'czar-figures');
  END IF;
END $$;

-- Writes happen via the service role inside the edge function, which bypasses
-- RLS, so no INSERT policy is required for the generation pipeline.
