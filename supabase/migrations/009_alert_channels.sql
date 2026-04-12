ALTER TABLE alert_preferences
  ADD COLUMN IF NOT EXISTS channels text[] DEFAULT '{email}',
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS slack_webhook_url text;
