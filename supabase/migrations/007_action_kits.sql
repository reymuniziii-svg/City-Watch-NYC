-- Action Kits: whitelabel advocacy pages for enterprise users
CREATE TABLE IF NOT EXISTS action_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  bill_filter_ids text[] NOT NULL DEFAULT '{}',
  custom_branding jsonb DEFAULT '{}',
  cta_type text NOT NULL DEFAULT 'both' CHECK (cta_type IN ('email', 'call', 'both')),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE action_kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own kits" ON action_kits FOR ALL USING (auth.uid()::text = user_id);

-- Action Kit Interactions: anonymous tracking for kit engagement
CREATE TABLE IF NOT EXISTS action_kit_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL REFERENCES action_kits(id) ON DELETE CASCADE,
  interaction_type text NOT NULL CHECK (interaction_type IN ('view', 'email_click', 'call_click', 'share')),
  visitor_ip_hash text,
  referrer text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE action_kit_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert interactions" ON action_kit_interactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Kit owners can view interactions" ON action_kit_interactions FOR SELECT
  USING (kit_id IN (SELECT id FROM action_kits WHERE user_id = auth.uid()::text));
