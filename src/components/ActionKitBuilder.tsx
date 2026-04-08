import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Loader2, Plus, FileText, ExternalLink, Trash2, BarChart3 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { useProUser } from '../hooks/useProUser';
import ProGate from './ProGate';
import ActionKitAnalytics from './ActionKitAnalytics';

/* ── types ───────────────────────────────────────────────── */

interface ActionKit {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  description?: string;
  created_at: string;
}

/* ── main component ──────────────────────────────────────── */

function ActionKitBuilderInner() {
  const { user } = useProUser();
  const [kits, setKits] = useState<ActionKit[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedKit, setExpandedKit] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  /* ── fetch kits ── */
  useEffect(() => {
    if (!isSupabaseConfigured() || !user) {
      setLoading(false);
      return;
    }

    supabase!
      .from('action_kits')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to load action kits:', error);
        } else {
          setKits((data as ActionKit[]) ?? []);
        }
        setLoading(false);
      });
  }, [user]);

  /* ── create kit ── */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured() || !user || !name.trim()) return;

    setCreating(true);
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const { data, error } = await supabase!
      .from('action_kits')
      .insert({ user_id: user.id, name: name.trim(), slug })
      .select()
      .single();

    if (error) {
      console.error('Failed to create kit:', error);
    } else if (data) {
      setKits(prev => [data as ActionKit, ...prev]);
      setName('');
    }
    setCreating(false);
  };

  /* ── delete kit ── */
  const handleDelete = async (id: string) => {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase!.from('action_kits').delete().eq('id', id);
    if (!error) {
      setKits(prev => prev.filter(k => k.id !== id));
      if (expandedKit === id) setExpandedKit(null);
    }
  };

  /* ── supabase not configured ── */
  if (!isSupabaseConfigured()) {
    return (
      <div className="p-12 bg-white border-editorial text-center">
        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-4" />
        <p className="text-sm text-slate-500">
          Action Kits require a Supabase connection. Configure your environment to get started.
        </p>
      </div>
    );
  }

  /* ── loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* create new kit */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-editorial p-6"
      >
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">
          Create Action Kit
        </h3>
        <form onSubmit={handleCreate} className="flex gap-3">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Kit name (e.g. Save Our Parks)"
            className="flex-1 px-4 py-2.5 border-editorial text-sm focus:ring-1 focus:ring-black focus:outline-none"
          />
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Create
          </button>
        </form>
      </motion.div>

      {/* kit list */}
      {kits.length === 0 ? (
        <div className="p-12 bg-white border-editorial text-center">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-4" />
          <p className="font-editorial text-lg font-bold text-black mb-2">No Action Kits yet</p>
          <p className="text-sm text-slate-500">
            Create your first Action Kit to start organizing civic campaigns.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {kits.map((kit, i) => (
            <motion.div
              key={kit.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white border-editorial"
            >
              {/* kit header */}
              <div className="p-6 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-editorial text-lg font-bold text-black truncate">
                    {kit.name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    /{kit.slug} &middot; Created {new Date(kit.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <button
                    onClick={() => setExpandedKit(expandedKit === kit.id ? null : kit.id)}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-colors ${
                      expandedKit === kit.id
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Analytics
                  </button>
                  <a
                    href={`/kit/${kit.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-2 text-xs font-bold uppercase tracking-widest border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => handleDelete(kit.id)}
                    className="flex items-center px-3 py-2 text-xs border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* analytics panel */}
              {expandedKit === kit.id && (
                <div className="border-t border-slate-200 p-6 bg-slate-50">
                  <ActionKitAnalytics kitId={kit.id} />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── exported wrapper with ProGate ───────────────────────── */

export default function ActionKitBuilder() {
  return (
    <ProGate flag="canCreateActionKits" feature="Action Kits">
      <ActionKitBuilderInner />
    </ProGate>
  );
}
