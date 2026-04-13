-- Weekly brief preferences
CREATE TABLE IF NOT EXISTS brief_preferences (
  user_id text PRIMARY KEY,
  enabled boolean DEFAULT false,
  day_of_week int DEFAULT 1,
  include_watchlist boolean DEFAULT true,
  include_conflicts boolean DEFAULT true,
  include_workhorse boolean DEFAULT true,
  branding_org_name text,
  branding_logo_url text,
  last_generated_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE brief_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own preferences" ON brief_preferences FOR ALL USING (auth.uid()::text = user_id);
