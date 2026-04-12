CREATE TABLE IF NOT EXISTS keyword_pings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  keyword text NOT NULL,
  hearing_id text NOT NULL,
  hearing_title text,
  matched_quote text,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);
ALTER TABLE keyword_pings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own pings" ON keyword_pings FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "System inserts pings" ON keyword_pings FOR INSERT WITH CHECK (true);
