-- Migration: rubric_criteria on czar_conversations + project tables

-- ── Rubric criteria (per-conversation marking brief) ─────────────────────────

ALTER TABLE czar_conversations
  ADD COLUMN IF NOT EXISTS rubric_criteria JSONB;

-- ── Project layer (group conversations into a coherent project) ───────────────

CREATE TABLE IF NOT EXISTS czar_projects (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID REFERENCES auth.users NOT NULL,
  title          TEXT NOT NULL DEFAULT 'Untitled Project',
  description    TEXT,
  research_area  TEXT,
  citation_style TEXT DEFAULT 'harvard',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE czar_projects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'czar_projects' AND policyname = 'Users manage own projects'
  ) THEN
    CREATE POLICY "Users manage own projects"
      ON czar_projects FOR ALL
      USING  (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Link conversations to projects and store AI-generated summaries
CREATE TABLE IF NOT EXISTS czar_project_documents (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id      UUID REFERENCES czar_projects ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES czar_conversations ON DELETE CASCADE NOT NULL,
  document_type   TEXT DEFAULT 'chapter',
  summary         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, conversation_id)
);

ALTER TABLE czar_project_documents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'czar_project_documents' AND policyname = 'Users manage own project documents'
  ) THEN
    CREATE POLICY "Users manage own project documents"
      ON czar_project_documents FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM czar_projects
          WHERE id = project_id AND user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM czar_projects
          WHERE id = project_id AND user_id = auth.uid()
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS czar_project_documents_project_idx
  ON czar_project_documents (project_id);

-- project_id FK on czar_conversations (optional — NULL = standalone)
ALTER TABLE czar_conversations
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES czar_projects ON DELETE SET NULL;
