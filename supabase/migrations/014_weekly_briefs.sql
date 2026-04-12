-- Weekly brief preferences
CREATE TABLE IF NOT EXISTS brief_preferences (
  user_id text PRIMARY KEY,
  enabled boolean DEFAULT false,
  day_of_week integer DEFAULT 1 CHECK (day_of_week BETWEEN 0 AND 6),
  include_watchlist boolean DEFAULT true,
  include_conflicts boolean DEFAULT true,
  include_workhorse boolean DEFAULT false,
  branding_org_name text,
  branding_logo_url text,
  last_generated_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE brief_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own brief preferences"
  ON brief_preferences FOR ALL
  USING (auth.uid()::text = user_id);
