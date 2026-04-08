import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useSession } from '@clerk/clerk-react';
import { useProUser } from '../hooks/useProUser';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { addToWatchlist, removeFromWatchlist, getWatchlist } from '../services/watchlistService';

interface WatchButtonProps {
  itemType: 'bill' | 'member';
  itemValue: string;
  itemLabel: string;
}

export default function WatchButton({ itemType, itemValue, itemLabel }: WatchButtonProps) {
  const { isAuthenticated, user } = useProUser();
  const { session } = useSession();
  const [watched, setWatched] = useState(false);
  const [watchId, setWatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !isSupabaseConfigured() || !session) return;
    session.getToken().then(token => {
      if (!token) return;
      getWatchlist(token).then(items => {
        const match = items.find(i => i.item_type === itemType && i.item_value === itemValue);
        setWatched(!!match);
        if (match) setWatchId(match.id);
      });
    });
  }, [user?.id, itemType, itemValue, session]);

  if (!isSupabaseConfigured()) return null;

  const handleToggle = async () => {
    if (!isAuthenticated || !user || !session) return;

    setLoading(true);
    try {
      const token = await session.getToken();
      if (!token) return;

      if (watched && watchId) {
        setWatched(false);
        await removeFromWatchlist(token, watchId);
        setWatchId(null);
      } else {
        setWatched(true);
        await addToWatchlist(token, { item_type: itemType, item_value: itemValue, item_label: itemLabel });
        const items = await getWatchlist(token);
        const match = items.find(i => i.item_type === itemType && i.item_value === itemValue);
        if (match) setWatchId(match.id);
      }
    } catch {
      setWatched(!watched);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2.5 text-slate-500 hover:text-black active:scale-95 transition-all font-bold text-xs uppercase tracking-widest disabled:opacity-50"
      title={watched ? 'Remove from Watchlist' : 'Add to Watchlist'}
    >
      {watched ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );
}
