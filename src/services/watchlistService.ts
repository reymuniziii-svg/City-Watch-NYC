import { callEdgeFunction, isSupabaseConfigured } from './supabaseClient';

export interface WatchlistItem {
  id: string;
  user_id: string;
  item_type: 'bill' | 'member' | 'keyword' | 'hearing_keyword';
  item_value: string;
  item_label: string | null;
  created_at: string;
}

export async function getWatchlist(token: string): Promise<WatchlistItem[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    return await callEdgeFunction<WatchlistItem[]>('watchlist', { method: 'GET', token });
  } catch (err) {
    console.error('Error fetching watchlist:', err);
    return [];
  }
}

export async function addToWatchlist(
  token: string,
  item: Omit<WatchlistItem, 'id' | 'user_id' | 'created_at'>
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await callEdgeFunction('watchlist', { method: 'POST', token, body: item });
}

export async function removeFromWatchlist(token: string, itemId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const res = await fetch(`${supabaseUrl}/functions/v1/watchlist?id=${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? 'Failed to remove item');
  }
}

export async function isWatched(
  token: string,
  itemType: string,
  itemValue: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const items = await getWatchlist(token);
    return items.some(i => i.item_type === itemType && i.item_value === itemValue);
  } catch {
    return false;
  }
}
