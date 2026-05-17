
ALTER TABLE public.document_corrections
  ADD COLUMN IF NOT EXISTS parsed_blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS corrected_blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'processing';

-- Make sure realtime continues to work for the preview panel.
ALTER TABLE public.document_corrections REPLICA IDENTITY FULL;
