import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Eye, Loader2, Trash2, FileText, Users, Hash } from 'lucide-react';
import { useProUser } from '../hooks/useProUser';
import { getWatchlist, removeFromWatchlist } from '../services/watchlistService';
import type { WatchlistItem } from '../services/watchlistService';
import ProGate from './ProGate';
import AlertPreferences from './AlertPreferences';

/* ── helpers ──────────────────────────────────────────────── */

const TYPE_META: Record<string, { icon: typeof FileText; label: string }> = {
  bill:    { icon: FileText, label: 'Bill' },
  member:  { icon: Users,    label: 'Member' },
  keyword: { icon: Hash,     label: 'Keyword' },
};

/* ── main component ──────────────────────────────────────── */

export default function WatchlistPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useProUser();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    getWatchlist(user.id)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleRemove = async (itemId: string) => {
    if (!user) return;
    setRemovingId(itemId);
    try {
      await removeFromWatchlist(user.id, itemId);
      setItems(prev => prev.filter(i => i.id !== itemId));
    } catch {
      // removal failed silently
    } finally {
      setRemovingId(null);
    }
  };

  /* ── loading / not authenticated ───────────────────────── */

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="border-b-editorial pb-8">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Personal Tracking</p>
        <h1 className="font-editorial text-5xl md:text-6xl font-black text-black tracking-tighter mb-3">
          My Watchlist
        </h1>
        <p className="text-slate-600 text-lg max-w-2xl">
          Track the bills, members, and keywords that matter to you. Get notified when something changes.
        </p>
      </div>

      {/* Watchlist items */}
      <ProGate feature="Watchlists">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-black" />
          </div>
        ) : !isAuthenticated ? (
          <div className="bg-white border-editorial p-12 text-center">
            <Eye className="w-8 h-8 text-slate-300 mx-auto mb-4" />
            <p className="font-bold text-black mb-1">Sign in to use Watchlists</p>
            <p className="text-sm text-slate-500">Create an account to track bills, members, and keywords.</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white border-editorial p-12 text-center">
            <Eye className="w-8 h-8 text-slate-300 mx-auto mb-4" />
            <p className="font-bold text-black mb-1">Your watchlist is empty</p>
            <p className="text-sm text-slate-500">Browse bills and members to start tracking items you care about.</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-white border-editorial divide-y divide-slate-100">
              {items.map((item, i) => {
                const meta = TYPE_META[item.item_type] ?? TYPE_META.keyword;
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.03, 0.5) }}
                    className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <Icon className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="font-bold text-sm text-black">{item.item_label ?? item.item_value}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{meta.label}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(item.id)}
                      disabled={removingId === item.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600 disabled:opacity-50"
                      aria-label={`Remove ${item.item_label ?? item.item_value} from watchlist`}
                    >
                      {removingId === item.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </ProGate>

      {/* Alert Preferences --- shown for authenticated users */}
      {isAuthenticated && <AlertPreferences />}
    </div>
  );
}
