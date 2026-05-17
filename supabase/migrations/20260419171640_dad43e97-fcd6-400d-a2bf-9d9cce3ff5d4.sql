CREATE TABLE public.chapter_figures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id uuid NOT NULL,
  user_id uuid NOT NULL,
  figure_id text NOT NULL,
  figure_number text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  source_line text NOT NULL DEFAULT '',
  image_data_uri text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chapter_id, figure_id)
);

CREATE INDEX idx_chapter_figures_chapter_id ON public.chapter_figures(chapter_id);

ALTER TABLE public.chapter_figures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own figures"
  ON public.chapter_figures FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own figures"
  ON public.chapter_figures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own figures"
  ON public.chapter_figures FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own figures"
  ON public.chapter_figures FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_chapter_figures_updated_at
  BEFORE UPDATE ON public.chapter_figures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();