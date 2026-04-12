import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Megaphone,
  Plus,
  Loader2,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  BarChart3,
  Archive,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSession } from '@clerk/clerk-react';
import { useProUser } from '../hooks/useProUser';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { getUserKits, updateKit, deleteKit } from '../services/actionKitService';
import type { ActionKit } from '../services/actionKitService';
import ProGate from './ProGate';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  published: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-amber-50 text-amber-700',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ActionKitPage() {
  const { isAuthenticated, isLoading: authLoading } = useProUser();
  const { session } = useSession();
  const [kits, setKits] = useState<ActionKit[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !session || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    session
      .getToken()
      .then((token) => (token ? getUserKits(token) : []))
      .then(setKits)
      .catch(() => setKits([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated, session]);

  const handleDelete = async (kitId: string) => {
    if (!session || !confirm('Delete this action kit and all its submissions?')) return;
    setDeletingId(kitId);
    try {
      const token = await session.getToken();
      if (!token) return;
      await deleteKit(token, kitId);
      setKits((prev) => prev.filter((k) => k.id !== kitId));
    } catch {
      // deletion failed
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (kit: ActionKit) => {
    if (!session) return;
    setTogglingId(kit.id);
    const newStatus = kit.status === 'published' ? 'draft' : 'published';
    try {
      const token = await session.getToken();
      if (!token) return;
      const updated = await updateKit(token, { id: kit.id, status: newStatus });
      setKits((prev) => prev.map((k) => (k.id === kit.id ? updated : k)));
    } catch {
      // toggle failed
    } finally {
      setTogglingId(null);
    }
  };

  const handleArchive = async (kit: ActionKit) => {
    if (!session) return;
    setTogglingId(kit.id);
    try {
      const token = await session.getToken();
      if (!token) return;
      const updated = await updateKit(token, { id: kit.id, status: 'archived' });
      setKits((prev) => prev.map((k) => (k.id === kit.id ? updated : k)));
    } catch {
      // archive failed
    } finally {
      setTogglingId(null);
    }
  };

  if (!isSupabaseConfigured()) {
    return (
      <div className="text-center py-20 border-editorial bg-white">
        <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-4" />
        <h2 className="font-editorial text-3xl font-bold text-black mb-4">Action Kits</h2>
        <p className="text-slate-600">
          Action Kits require a connected backend. Please configure Supabase to enable this
          feature.
        </p>
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
        <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-4" />
        <h2 className="font-editorial text-3xl font-bold text-black mb-4">Sign In Required</h2>
        <p className="text-slate-600 mb-6">
          Sign in to create and manage whitelabel action kits for your organization.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <Megaphone className="w-6 h-6 text-black" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Enterprise Feature
          </span>
        </div>
        <h1 className="font-editorial text-5xl md:text-7xl font-black text-black tracking-tighter leading-none mb-4">
          Action Kits
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
          Create embeddable, whitelabel action pages that let supporters contact their council
          members about the bills you care about. Track engagement and measure impact.
        </p>
      </motion.div>

      <ProGate feature="Action Kits" flag="canCreateActionKits">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-black animate-spin" />
            <p className="text-slate-500 font-medium">Loading your action kits...</p>
          </div>
        ) : kits.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 bg-white border-editorial"
          >
            <Megaphone className="w-12 h-12 text-slate-200 mx-auto mb-6" />
            <h3 className="font-editorial text-2xl font-bold text-black mb-3">
              No action kits yet
            </h3>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              Action kits let you create branded, embeddable pages where supporters can contact
              their council members about specific bills. Create your first kit to get started.
            </p>
            <Link
              to="/action-kits/new"
              className="inline-flex items-center gap-2 px-8 py-3 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Your First Kit
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Top bar with create button */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {kits.length} Kit{kits.length !== 1 ? 's' : ''}
              </span>
              <Link
                to="/action-kits/new"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-black text-white font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New Kit
              </Link>
            </div>

            {/* Kit cards */}
            <AnimatePresence>
              {kits.map((kit, i) => (
                <motion.div
                  key={kit.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-white border-editorial p-6 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-editorial text-xl font-bold text-black truncate">
                          {kit.title}
                        </h3>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${STATUS_STYLES[kit.status] ?? STATUS_STYLES.draft}`}
                        >
                          {kit.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        {kit.bill_numbers.length > 0 && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {kit.bill_numbers.length} bill
                            {kit.bill_numbers.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        {kit.org_name && (
                          <span className="truncate max-w-[200px]">{kit.org_name}</span>
                        )}
                        <span>Created {formatDate(kit.created_at)}</span>
                      </div>

                      {kit.description && (
                        <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                          {kit.description}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Link
                        to={`/action-kits/${kit.id}/edit`}
                        className="p-2 text-slate-400 hover:text-black transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Link>

                      <button
                        onClick={() => handleToggleStatus(kit)}
                        disabled={togglingId === kit.id}
                        className="p-2 text-slate-400 hover:text-black transition-colors disabled:opacity-50"
                        title={kit.status === 'published' ? 'Unpublish' : 'Publish'}
                      >
                        {togglingId === kit.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : kit.status === 'published' ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>

                      {kit.status !== 'archived' && (
                        <button
                          onClick={() => handleArchive(kit)}
                          disabled={togglingId === kit.id}
                          className="p-2 text-slate-400 hover:text-amber-600 transition-colors disabled:opacity-50"
                          title="Archive"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}

                      <Link
                        to={`/action-kits/${kit.id}/analytics`}
                        className="p-2 text-slate-400 hover:text-black transition-colors"
                        title="View Analytics"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </Link>

                      {kit.status === 'published' && (
                        <Link
                          to={`/embed/${kit.slug}`}
                          target="_blank"
                          className="p-2 text-slate-400 hover:text-black transition-colors"
                          title="View Embed Page"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      )}

                      <button
                        onClick={() => handleDelete(kit.id)}
                        disabled={deletingId === kit.id}
                        className="p-2 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === kit.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </ProGate>
    </div>
  );
}
