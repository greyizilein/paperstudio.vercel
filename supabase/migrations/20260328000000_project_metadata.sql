-- Project metadata table for preliminary pages (title page, declaration, etc.)
CREATE TABLE IF NOT EXISTS project_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  -- Title page details
  student_name text,
  student_id text,
  supervisor_name text,
  co_supervisor_name text,
  institution text,
  faculty text,
  department text,
  module_code text,
  module_name text,
  submission_date text,
  academic_year text,
  company text,
  -- Font selection for export
  document_font text DEFAULT 'Calibri',
  document_font_size integer DEFAULT 12,
  -- Preliminary page content
  declaration text,
  acknowledgements text,
  dedication text,
  abbreviations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE project_metadata ENABLE ROW LEVEL SECURITY;

-- Users can only access their own project metadata
CREATE POLICY "Users can manage their own project metadata"
  ON project_metadata
  FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_project_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_metadata_updated_at
  BEFORE UPDATE ON project_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_project_metadata_updated_at();
