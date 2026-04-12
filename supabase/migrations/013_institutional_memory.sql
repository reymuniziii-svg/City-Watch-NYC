-- Institutional memory: member notes and document vault
CREATE TABLE IF NOT EXISTS member_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  member_slug text NOT NULL,
  user_id text NOT NULL,
  content text NOT NULL,
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE member_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their team notes"
  ON member_notes FOR SELECT
  USING (
    user_id = auth.uid()::text
    OR team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()::text
    )
    OR team_id IN (
      SELECT id FROM teams WHERE owner_id = auth.uid()::text
    )
  );

CREATE POLICY "Team members can create notes"
  ON member_notes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()::text
    AND (
      team_id IS NULL
      OR team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()::text
      )
      OR team_id IN (
        SELECT id FROM teams WHERE owner_id = auth.uid()::text
      )
    )
  );

CREATE POLICY "Users can update their own notes"
  ON member_notes FOR UPDATE
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own notes"
  ON member_notes FOR DELETE
  USING (user_id = auth.uid()::text);

CREATE TABLE IF NOT EXISTS document_vault (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('bill', 'member', 'hearing')),
  entity_id text NOT NULL,
  filename text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes integer,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE document_vault ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their team documents"
  ON document_vault FOR SELECT
  USING (
    user_id = auth.uid()::text
    OR team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()::text
    )
    OR team_id IN (
      SELECT id FROM teams WHERE owner_id = auth.uid()::text
    )
  );

CREATE POLICY "Team members can upload documents"
  ON document_vault FOR INSERT
  WITH CHECK (
    user_id = auth.uid()::text
    AND (
      team_id IS NULL
      OR team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()::text
      )
      OR team_id IN (
        SELECT id FROM teams WHERE owner_id = auth.uid()::text
      )
    )
  );

CREATE POLICY "Users can delete their own documents"
  ON document_vault FOR DELETE
  USING (user_id = auth.uid()::text);
