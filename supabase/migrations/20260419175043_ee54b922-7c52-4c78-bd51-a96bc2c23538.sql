-- Create private bucket for CZAR uploads with 25MB per-file cap
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('czar-uploads', 'czar-uploads', false, 26214400, NULL)
ON CONFLICT (id) DO UPDATE SET file_size_limit = 26214400, public = false;

-- RLS: each user only their own folder (userId/...)
CREATE POLICY "Users upload to own czar folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'czar-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users read own czar uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'czar-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users delete own czar uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'czar-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Optional: store last user message snippet for nicer titling later
ALTER TABLE public.czar_conversations
  ADD COLUMN IF NOT EXISTS last_user_message text;