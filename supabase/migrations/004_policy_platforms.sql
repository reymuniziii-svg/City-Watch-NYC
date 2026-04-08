CREATE TABLE IF NOT EXISTS policy_platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  filename text NOT NULL,
  storage_path text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('pdf', 'txt')),
  file_size integer NOT NULL,
  status text DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'analyzed', 'error')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE policy_platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own platforms"
  ON policy_platforms
  FOR ALL
  USING (auth.uid()::text = user_id);
