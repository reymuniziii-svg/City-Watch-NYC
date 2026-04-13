-- Staffers directory and communication logs
CREATE TABLE IF NOT EXISTS staffers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_number int,
  member_slug text,
  full_name text NOT NULL,
  title text,
  email text,
  phone text,
  policy_areas text[],
  verified boolean DEFAULT false,
  submitted_by text,
  verified_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE staffers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Verified staffers are readable" ON staffers FOR SELECT
  USING (verified = true OR auth.uid()::text = submitted_by);
CREATE POLICY "Submitters manage own staffers" ON staffers FOR INSERT
  WITH CHECK (auth.uid()::text = submitted_by);
CREATE POLICY "Submitters update own staffers" ON staffers FOR UPDATE
  USING (auth.uid()::text = submitted_by);
CREATE POLICY "Submitters delete own staffers" ON staffers FOR DELETE
  USING (auth.uid()::text = submitted_by);

CREATE TABLE IF NOT EXISTS staffer_communication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staffer_id uuid NOT NULL REFERENCES staffers(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  contact_type text NOT NULL CHECK (contact_type IN ('email', 'call', 'meeting', 'other')),
  summary text,
  contact_date timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE staffer_communication_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members see team logs" ON staffer_communication_logs FOR SELECT
  USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text));
CREATE POLICY "Users manage own logs" ON staffer_communication_logs FOR INSERT
  WITH CHECK (auth.uid()::text = user_id
    AND team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text));
CREATE POLICY "Users update own logs" ON staffer_communication_logs FOR UPDATE
  USING (auth.uid()::text = user_id);
CREATE POLICY "Users delete own logs" ON staffer_communication_logs FOR DELETE
  USING (auth.uid()::text = user_id);
