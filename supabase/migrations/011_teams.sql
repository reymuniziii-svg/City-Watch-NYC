-- Teams for collaborative enterprise features
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage teams" ON teams FOR ALL USING (auth.uid()::text = owner_id);

CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(team_id, user_id)
);
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members see own team" ON team_members FOR SELECT
  USING (team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid()::text)
    OR user_id = auth.uid()::text);
CREATE POLICY "Owners manage members" ON team_members FOR ALL
  USING (team_id IN (SELECT id FROM teams WHERE owner_id = auth.uid()::text));
