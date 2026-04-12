-- Teams and team membership
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their team"
  ON teams FOR SELECT
  USING (
    owner_id = auth.uid()::text
    OR id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY "Owner has full access to team"
  ON teams FOR ALL
  USING (owner_id = auth.uid()::text);

CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(team_id, user_id)
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view fellow members"
  ON team_members FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()::text
    )
    OR team_id IN (
      SELECT id FROM teams WHERE owner_id = auth.uid()::text
    )
  );

CREATE POLICY "Owner has full access to team members"
  ON team_members FOR ALL
  USING (
    team_id IN (
      SELECT id FROM teams WHERE owner_id = auth.uid()::text
    )
  );
