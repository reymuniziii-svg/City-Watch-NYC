CREATE TABLE IF NOT EXISTS subscriptions (
  user_id text PRIMARY KEY,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text NOT NULL CHECK (plan IN ('advocate', 'enterprise')),
  status text NOT NULL DEFAULT 'active',
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscription" ON subscriptions FOR SELECT USING (auth.uid()::text = user_id);
