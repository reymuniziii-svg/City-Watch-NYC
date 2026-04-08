CREATE TABLE IF NOT EXISTS watchlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('bill', 'member', 'keyword')),
  item_value text NOT NULL,
  item_label text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, item_type, item_value)
);

ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own watchlist"
  ON watchlist_items
  FOR ALL
  USING (auth.uid()::text = user_id);
