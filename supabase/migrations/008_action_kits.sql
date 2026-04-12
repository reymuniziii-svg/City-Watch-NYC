CREATE TABLE IF NOT EXISTS action_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  bill_numbers text[] DEFAULT '{}',
  target_members text[] DEFAULT '{}',
  call_to_action text,
  org_name text,
  org_logo_url text,
  custom_css jsonb DEFAULT '{}',
  branding jsonb DEFAULT '{}',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE action_kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own kits" ON action_kits FOR ALL USING (auth.uid()::text = user_id);
-- Public read for published kits (needed for embed pages)
CREATE POLICY "Public read published kits" ON action_kits FOR SELECT USING (status = 'published');

CREATE TABLE IF NOT EXISTS action_kit_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_kit_id uuid REFERENCES action_kits(id),
  supporter_name text,
  supporter_email text,
  supporter_zip text,
  district_number integer,
  target_member_slug text,
  action_type text CHECK (action_type IN ('email_sent', 'call_made', 'page_view')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE action_kit_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Kit owners see submissions" ON action_kit_submissions FOR SELECT
  USING (EXISTS (SELECT 1 FROM action_kits WHERE action_kits.id = action_kit_submissions.action_kit_id AND action_kits.user_id = auth.uid()::text));
CREATE POLICY "Public insert submissions" ON action_kit_submissions FOR INSERT WITH CHECK (true);
