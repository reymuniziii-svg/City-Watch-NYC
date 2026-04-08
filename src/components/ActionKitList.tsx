import { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Pencil,
  Archive,
  ExternalLink,
  Loader2,
  LayoutGrid,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProUser } from '../hooks/useProUser';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { getUserKits, updateKit, type ActionKit } from '../services/actionKitService';
import ProGate from './ProGate';
import ActionKitBuilder from './ActionKitBuilder';

function StatusBadge({ status }: { status: ActionKit['status'] }) {
  const styles: Record<ActionKit['status'], string> = {
    draft: 'bg-slate-100 text-slate-600',
    published: 'bg-green-100 text-green-700',
    archived: 'bg-red-100 text-red-600',
  };

  return (
    <span
      className={`inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export default function ActionKitList() {
  const { isAuthenticated, user, isLoading: authLoading } = useProUser();
  const [kits, setKits] = useState<ActionKit[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState<string | null>(null);

  // Builder state
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingKit, setEditingKit] = useState<ActionKit | null>(null);

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getUserKits(user.id)
      .then(setKits)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleArchive = async (kit: ActionKit) => {
    if (!user) return;
    setArchiving(kit.id);
    try {
      await updateKit(user.id, kit.id, { status: 'archived' });
      setKits((prev) =>
        prev.map((k) => (k.id === kit.id ? { ...k, status: 'archived' } : k))
      );
    } catch {
      // archiving failed silently
    } finally {
      setArchiving(null);
    }
  };

  const handleEdit = (kit: ActionKit) => {
    setEditingKit(kit);
    setShowBuilder(true);
  };

  const handleSaved = (kit: ActionKit) => {
    setKits((prev) => {
      const exists = prev.find((k) => k.id === kit.id);
      if (exists) {
        return prev.map((k) => (k.id === kit.id ? kit : k));
      }
      return [kit, ...prev];
    });
    setShowBuilder(false);
    setEditingKit(null);
  };

  const handleCancel = () => {
    setShowBuilder(false);
    setEditingKit(null);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (!isSupabaseConfigured()) {
    return (
      <div className="text-center py-20 border-editorial bg-white">
        <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-4" />
        <h2 className="font-editorial text-3xl font-bold text-black mb-4">Action Kits</h2>
        <p className="text-slate-600">
          Action Kits require a connected backend. Please configure Supabase to enable this feature.
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
          Sign in to create and manage your whitelabel action kits.
        </p>
      </div>
    );
  }

  // Show builder inline
  if (showBuilder) {
    return (
      <ActionKitBuilder
        editingKit={editingKit}
        onSaved={handleSaved}
        onCancel={handleCancel}
      />
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
          Build branded campaign pages to mobilize your community around the bills that matter.
        </p>
      </motion.div>

      <ProGate flag="canCreateActionKits" feature="Action Kits">
        {/* Create button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex justify-end mb-6"
        >
          <button
            onClick={() => {
              setEditingKit(null);
              setShowBuilder(true);
            }}
            className="flex items-center gap-2 px-8 py-3 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Action Kit
          </button>
        </motion.div>

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
            <LayoutGrid className="w-12 h-12 text-slate-200 mx-auto mb-6" />
            <h3 className="font-editorial text-2xl font-bold text-black mb-3">No action kits yet</h3>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              Create your first action kit to build a branded campaign page for your advocacy coalition.
            </p>
            <button
              onClick={() => {
                setEditingKit(null);
                setShowBuilder(true);
              }}
              className="px-8 py-3 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition-colors"
            >
              Create Your First Kit
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {kits.map((kit, i) => (
                <motion.div
                  key={kit.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-white border-editorial p-6 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 mb-1.5">
                        <h3 className="font-editorial text-xl font-bold text-black truncate">
                          {kit.name}
                        </h3>
                        <StatusBadge status={kit.status} />
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="font-mono">/kit/{kit.slug}</span>
                        <span>{formatDate(kit.created_at)}</span>
                        <span>
                          {kit.bill_filter_ids?.length ?? 0} bill
                          {(kit.bill_filter_ids?.length ?? 0) !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleEdit(kit)}
                        className="flex items-center gap-1.5 px-4 py-2 border-editorial text-xs font-bold uppercase tracking-widest text-black hover:bg-slate-100 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>

                      {kit.status !== 'archived' && (
                        <button
                          onClick={() => handleArchive(kit)}
                          disabled={archiving === kit.id}
                          className="flex items-center gap-1.5 px-4 py-2 border-editorial text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50"
                          title="Archive"
                        >
                          {archiving === kit.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Archive className="w-3.5 h-3.5" />
                          )}
                          Archive
                        </button>
                      )}

                      {kit.status === 'published' && (
                        <a
                          href={`/kit/${kit.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors"
                          title="View published kit"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View
                        </a>
                      )}
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
