import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Eye, FileText, Users, Hash, Trash2, Plus, Loader2, MessageSquareText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSession } from '@clerk/clerk-react';
import { useProUser } from '../hooks/useProUser';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { getWatchlist, addToWatchlist, removeFromWatchlist, WatchlistItem } from '../services/watchlistService';
import ProGate from './ProGate';
import AlertPreferences from './AlertPreferences';
import AlertChannels from './AlertChannels';

export default function WatchlistPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useProUser();
  const { session } = useSession();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [keywordInput, setKeywordInput] = useState('');
  const [addingKeyword, setAddingKeyword] = useState(false);
  const [hearingKeywordInput, setHearingKeywordInput] = useState('');
  const [addingHearingKeyword, setAddingHearingKeyword] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isSupabaseConfigured() || !session) {
      setLoading(false);
      return;
    }
    setLoading(true);
    session.getToken()
      .then(token => token ? getWatchlist(token) : [])
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [user?.id, session]);

  const bills = items.filter(i => i.item_type === 'bill');
  const members = items.filter(i => i.item_type === 'member');
  const keywords = items.filter(i => i.item_type === 'keyword');
  const hearingKeywords = items.filter(i => i.item_type === 'hearing_keyword');

  const handleRemove = async (itemId: string) => {
    if (!session) return;
    setRemovingId(itemId);
    try {
      const token = await session.getToken();
      if (!token) return;
      await removeFromWatchlist(token, itemId);
      setItems(prev => prev.filter(i => i.id !== itemId));
    } catch {
      // failed to remove
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddKeyword = async () => {
    if (!session || !keywordInput.trim()) return;
    setAddingKeyword(true);
    try {
      const token = await session.getToken();
      if (!token) return;
      await addToWatchlist(token, {
        item_type: 'keyword',
        item_value: keywordInput.trim().toLowerCase(),
        item_label: keywordInput.trim(),
      });
      const refreshed = await getWatchlist(token);
      setItems(refreshed);
      setKeywordInput('');
    } catch {
      // failed to add
    } finally {
      setAddingKeyword(false);
    }
  };

  const handleAddHearingKeyword = async () => {
    if (!user || !hearingKeywordInput.trim()) return;
    setAddingHearingKeyword(true);
    try {
      await addToWatchlist(user.id, {
        item_type: 'hearing_keyword',
        item_value: hearingKeywordInput.trim().toLowerCase(),
        item_label: hearingKeywordInput.trim(),
      });
      const refreshed = await getWatchlist(user.id);
      setItems(refreshed);
      setHearingKeywordInput('');
    } catch {
      // failed to add
    } finally {
      setAddingHearingKeyword(false);
    }
  };

  const typeIcon = (type: WatchlistItem['item_type']) => {
    switch (type) {
      case 'bill': return <FileText className="w-3.5 h-3.5" />;
      case 'member': return <Users className="w-3.5 h-3.5" />;
      case 'keyword': return <Hash className="w-3.5 h-3.5" />;
      case 'hearing_keyword': return <MessageSquareText className="w-3.5 h-3.5" />;
    }
  };

  const itemLink = (item: WatchlistItem) => {
    switch (item.item_type) {
      case 'bill': return `/bills?q=${encodeURIComponent(item.item_value)}`;
      case 'member': return `/members/${item.item_value}`;
      case 'keyword': return `/bills?q=${encodeURIComponent(item.item_value)}`;
      case 'hearing_keyword': return `/hearing-search?q=${encodeURIComponent(item.item_value)}`;
    }
  };

  if (!isSupabaseConfigured()) {
    return (
      <div className="text-center py-20 border-editorial bg-white">
        <Eye className="w-10 h-10 text-slate-300 mx-auto mb-4" />
        <h2 className="font-editorial text-3xl font-bold text-black mb-4">Watchlists</h2>
        <p className="text-slate-600">Watchlists require a connected backend. Please configure Supabase to enable this feature.</p>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-black animate-spin" />
        <p className="text-slate-500 font-medium">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center py-20 border-editorial bg-white">
        <Eye className="w-10 h-10 text-slate-300 mx-auto mb-4" />
        <h2 className="font-editorial text-3xl font-bold text-black mb-4">Sign In Required</h2>
        <p className="text-slate-600 mb-6">Sign in to access your watchlist and track bills, members, and keywords.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <Eye className="w-6 h-6 text-black" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Pro Feature</span>
        </div>
        <h1 className="font-editorial text-5xl md:text-7xl font-black text-black tracking-tighter leading-none mb-4">
          Your Watchlist
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
          Track bills, council members, and keywords that matter to you. Get notified when things change.
        </p>
      </motion.div>

      <ProGate feature="Watchlists">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-black animate-spin" />
            <p className="text-slate-500 font-medium">Loading your watchlist...</p>
          </div>
        ) : items.length === 0 && !loading ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 bg-white border-editorial"
          >
            <Eye className="w-12 h-12 text-slate-200 mx-auto mb-6" />
            <h3 className="font-editorial text-2xl font-bold text-black mb-3">Nothing watched yet</h3>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              Start watching bills and members by clicking the eye icon on any bill card or member profile. You can also add keyword alerts below.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                to="/bills"
                className="px-8 py-3 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition-colors"
              >
                Browse Bills
              </Link>
              <Link
                to="/members"
                className="px-8 py-3 border-editorial text-black font-bold uppercase tracking-widest text-sm hover:bg-slate-50 transition-colors"
              >
                Browse Members
              </Link>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-10">
            {/* Bills Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <div className="flex items-center justify-between border-b-editorial pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-black" />
                  <h2 className="font-editorial text-3xl font-bold text-black">Bills</h2>
                </div>
                <span className="text-sm font-bold uppercase tracking-widest text-slate-500">
                  {bills.length} Watched
                </span>
              </div>
              {bills.length > 0 ? (
                <div className="space-y-3">
                  <AnimatePresence>
                    {bills.map((item, i) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center justify-between bg-white border-editorial p-5 hover:bg-slate-50 transition-colors group"
                      >
                        <Link to={itemLink(item)} className="flex items-center gap-4 flex-1 min-w-0">
                          <span className="px-3 py-1 border-editorial text-black text-xs font-bold uppercase tracking-widest shrink-0 flex items-center gap-2">
                            {typeIcon(item.item_type)}
                            {item.item_value}
                          </span>
                          <span className="text-sm text-slate-700 truncate">{item.item_label}</span>
                        </Link>
                        <button
                          onClick={() => handleRemove(item.id)}
                          disabled={removingId === item.id}
                          className="ml-4 p-2 text-slate-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                          title="Remove from watchlist"
                        >
                          {removingId === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-4">No bills watched yet. Click the eye icon on any bill to start tracking it.</p>
              )}
            </motion.div>

            {/* Members Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center justify-between border-b-editorial pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-black" />
                  <h2 className="font-editorial text-3xl font-bold text-black">Members</h2>
                </div>
                <span className="text-sm font-bold uppercase tracking-widest text-slate-500">
                  {members.length} Watched
                </span>
              </div>
              {members.length > 0 ? (
                <div className="space-y-3">
                  <AnimatePresence>
                    {members.map((item, i) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center justify-between bg-white border-editorial p-5 hover:bg-slate-50 transition-colors group"
                      >
                        <Link to={itemLink(item)} className="flex items-center gap-4 flex-1 min-w-0">
                          <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-widest shrink-0 flex items-center gap-2">
                            {typeIcon(item.item_type)}
                            Member
                          </span>
                          <span className="text-sm text-slate-700 truncate font-medium">{item.item_label}</span>
                        </Link>
                        <button
                          onClick={() => handleRemove(item.id)}
                          disabled={removingId === item.id}
                          className="ml-4 p-2 text-slate-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                          title="Remove from watchlist"
                        >
                          {removingId === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-4">No members watched yet. Visit a member profile and click the eye icon to track them.</p>
              )}
            </motion.div>

            {/* Keywords Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="flex items-center justify-between border-b-editorial pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <Hash className="w-5 h-5 text-black" />
                  <h2 className="font-editorial text-3xl font-bold text-black">Keywords</h2>
                </div>
                <span className="text-sm font-bold uppercase tracking-widest text-slate-500">
                  {keywords.length} Tracked
                </span>
              </div>

              {/* Add Keyword Form */}
              <div className="flex gap-3 mb-6">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={e => setKeywordInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddKeyword(); }}
                  placeholder="e.g. housing, climate, transit..."
                  className="flex-1 px-4 py-3 border-editorial text-sm focus:outline-none focus:ring-2 focus:ring-black placeholder:text-slate-400"
                />
                <button
                  onClick={handleAddKeyword}
                  disabled={addingKeyword || !keywordInput.trim()}
                  className="flex items-center gap-2 px-6 py-3 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:hover:bg-black"
                >
                  {addingKeyword ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add
                </button>
              </div>

              {keywords.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  <AnimatePresence>
                    {keywords.map(item => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex items-center gap-2 bg-white border-editorial px-4 py-2.5 group"
                      >
                        <Link
                          to={itemLink(item)}
                          className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-black hover:text-slate-600 transition-colors"
                        >
                          <Hash className="w-3.5 h-3.5" />
                          {item.item_label ?? item.item_value}
                        </Link>
                        <button
                          onClick={() => handleRemove(item.id)}
                          disabled={removingId === item.id}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                          title="Remove keyword"
                        >
                          {removingId === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-4">Add keywords to get alerted when new bills or hearings match your interests.</p>
              )}
            </motion.div>

            {/* Hearing Keywords Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between border-b-editorial pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <MessageSquareText className="w-5 h-5 text-black" />
                  <h2 className="font-editorial text-3xl font-bold text-black">Hearing Keywords</h2>
                </div>
                <span className="text-sm font-bold uppercase tracking-widest text-slate-500">
                  {hearingKeywords.length} Tracked
                </span>
              </div>

              <p className="text-sm text-slate-500 mb-4">Get notified when this term appears in hearing transcripts</p>

              {/* Add Hearing Keyword Form */}
              <div className="flex gap-3 mb-6">
                <input
                  type="text"
                  value={hearingKeywordInput}
                  onChange={e => setHearingKeywordInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddHearingKeyword(); }}
                  placeholder="e.g. rezoning, budget, NYPD..."
                  className="flex-1 px-4 py-3 border-editorial text-sm focus:outline-none focus:ring-2 focus:ring-black placeholder:text-slate-400"
                />
                <button
                  onClick={handleAddHearingKeyword}
                  disabled={addingHearingKeyword || !hearingKeywordInput.trim()}
                  className="flex items-center gap-2 px-6 py-3 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:hover:bg-black"
                >
                  {addingHearingKeyword ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add
                </button>
              </div>

              {hearingKeywords.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  <AnimatePresence>
                    {hearingKeywords.map(item => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex items-center gap-2 bg-white border-editorial px-4 py-2.5 group"
                      >
                        <Link
                          to={itemLink(item)}
                          className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-black hover:text-slate-600 transition-colors"
                        >
                          <MessageSquareText className="w-3.5 h-3.5" />
                          {item.item_label ?? item.item_value}
                        </Link>
                        <button
                          onClick={() => handleRemove(item.id)}
                          disabled={removingId === item.id}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                          title="Remove hearing keyword"
                        >
                          {removingId === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-4">Add hearing keywords to get alerted when specific terms appear in council hearing transcripts.</p>
              )}
            </motion.div>
          </div>
        )}
      </ProGate>

      {/* Alert Preferences — shown for authenticated users */}
      {isAuthenticated && <AlertPreferences />}
      {isAuthenticated && <AlertChannels />}
    </div>
  );
}
