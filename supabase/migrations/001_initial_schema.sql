CREATE TABLE IF NOT EXISTS profiles (
  id text PRIMARY KEY,
  email text,
  display_name text,
  tier text DEFAULT 'free' CHECK (tier IN ('free', 'advocate', 'enterprise')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid()::text = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid()::text = id);
