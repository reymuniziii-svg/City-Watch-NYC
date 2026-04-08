CREATE TABLE IF NOT EXISTS alert_preferences (
  user_id text PRIMARY KEY,
  frequency text NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly')),
  enabled boolean DEFAULT true,
  last_sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own alert prefs"
  ON alert_preferences
  FOR ALL
  USING (auth.uid()::text = user_id);
