-- Add hearing_keyword as a valid item_type for watchlist_items
ALTER TABLE watchlist_items DROP CONSTRAINT IF EXISTS watchlist_items_item_type_check;
ALTER TABLE watchlist_items ADD CONSTRAINT watchlist_items_item_type_check
  CHECK (item_type IN ('bill', 'member', 'keyword', 'hearing_keyword'));
