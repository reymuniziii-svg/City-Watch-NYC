CREATE TABLE IF NOT EXISTS impact_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  platform_id uuid REFERENCES policy_platforms(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'error')),
  report_json jsonb,
  error_message text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE impact_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own reports" ON impact_reports FOR ALL USING (auth.uid()::text = user_id);
