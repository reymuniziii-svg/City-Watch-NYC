import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface WatchlistItem {
  id: string;
  user_id: string;
  item_type: 'bill' | 'member' | 'keyword';
  item_value: string;
  item_label: string | null;
  created_at: string;
}

export async function getWatchlist(userId: string): Promise<WatchlistItem[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase!
    .from('watchlist_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching watchlist:', error);
    return [];
  }
  return data as WatchlistItem[];
}

export async function addToWatchlist(
  userId: string,
  item: Omit<WatchlistItem, 'id' | 'user_id' | 'created_at'>
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase!
    .from('watchlist_items')
    .insert({ user_id: userId, ...item });

  if (error) {
    console.error('Error adding to watchlist:', error);
    throw error;
  }
}

export async function removeFromWatchlist(userId: string, itemId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase!
    .from('watchlist_items')
    .delete()
    .eq('id', itemId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error removing from watchlist:', error);
    throw error;
  }
}

export async function isWatched(
  userId: string,
  itemType: string,
  itemValue: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const { data, error } = await supabase!
    .from('watchlist_items')
    .select('id')
    .eq('user_id', userId)
    .eq('item_type', itemType)
    .eq('item_value', itemValue)
    .maybeSingle();

  if (error) {
    console.error('Error checking watchlist:', error);
    return false;
  }
  return data !== null;
}
