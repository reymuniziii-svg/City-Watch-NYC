-- Staffers directory and communication logs
CREATE TABLE IF NOT EXISTS staffers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_number integer NOT NULL,
  member_slug text,
  full_name text NOT NULL,
  title text,
  email text,
  phone text,
  policy_areas text[] DEFAULT '{}',
  verified boolean DEFAULT false,
  submitted_by text,
  verified_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE staffers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read verified staffers"
  ON staffers FOR SELECT
  USING (verified = true);

CREATE POLICY "Enterprise users can insert staffers"
  ON staffers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()::text AND tier = 'enterprise'
    )
  );

CREATE POLICY "Enterprise users can update staffers"
  ON staffers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()::text AND tier = 'enterprise'
    )
  );

CREATE TABLE IF NOT EXISTS staffer_communication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staffer_id uuid NOT NULL REFERENCES staffers(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  contact_type text NOT NULL CHECK (contact_type IN ('email', 'call', 'meeting', 'other')),
  summary text,
  contact_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE staffer_communication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their team communication logs"
  ON staffer_communication_logs FOR SELECT
  USING (
    user_id = auth.uid()::text
    OR team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()::text
    )
    OR team_id IN (
      SELECT id FROM teams WHERE owner_id = auth.uid()::text
    )
  );

CREATE POLICY "Team members can insert communication logs"
  ON staffer_communication_logs FOR INSERT
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
