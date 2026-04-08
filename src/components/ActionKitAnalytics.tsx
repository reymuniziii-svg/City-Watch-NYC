import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Eye, Mail, Phone, TrendingUp, Users, Download, Loader2, Globe, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import ProGate from './ProGate';

/* ── types ───────────────────────────────────────────────── */

interface Interaction {
  id: string;
  kit_id: string;
  interaction_type: 'view' | 'email_click' | 'call_click' | 'share';
  visitor_ip_hash: string | null;
  referrer: string | null;
  created_at: string;
}

type DateRange = '7d' | '30d' | 'all';

interface ActionKitAnalyticsProps {
  kitId: string;
}

/* ── helpers ─────────────────────────────────────────────── */

function getDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function extractDomain(referrer: string | null): string {
  if (!referrer) return 'Direct / Unknown';
  try {
    return new URL(referrer).hostname.replace(/^www\./, '');
  } catch {
    return referrer;
  }
}

function downloadCsv(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row =>
    Object.values(row)
      .map(v => {
        const s = String(v ?? '');
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      })
      .join(',')
  );
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── stat card ───────────────────────────────────────────── */

function StatCard({ label, value, icon: Icon, delay = 0 }: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white border-editorial p-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-slate-400" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {label}
        </span>
      </div>
      <p className="text-3xl font-editorial font-bold text-black">{value}</p>
    </motion.div>
  );
}

/* ── main component ──────────────────────────────────────── */

function ActionKitAnalyticsInner({ kitId }: ActionKitAnalyticsProps) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRange>('30d');

  /* ── fetch ── */
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    setLoading(true);

    let query = supabase!
      .from('action_kit_interactions')
      .select('*')
      .eq('kit_id', kitId)
      .order('created_at', { ascending: true });

    if (range === '7d') {
      query = query.gte('created_at', getDaysAgo(7));
    } else if (range === '30d') {
      query = query.gte('created_at', getDaysAgo(30));
    }

    query.then(({ data, error }) => {
      if (error) {
        console.error('Failed to load analytics:', error);
        setInteractions([]);
      } else {
        setInteractions((data as Interaction[]) ?? []);
      }
      setLoading(false);
    });
  }, [kitId, range]);

  /* ── computed stats ── */
  const stats = useMemo(() => {
    const views = interactions.filter(i => i.interaction_type === 'view').length;
    const emailClicks = interactions.filter(i => i.interaction_type === 'email_click').length;
    const callClicks = interactions.filter(i => i.interaction_type === 'call_click').length;
    const conversionRate = views > 0
      ? Math.round(((emailClicks + callClicks) / views) * 100)
      : 0;
    const uniqueVisitors = new Set(
      interactions.filter(i => i.visitor_ip_hash).map(i => i.visitor_ip_hash)
    ).size;
    return { views, emailClicks, callClicks, conversionRate, uniqueVisitors };
  }, [interactions]);

  /* ── chart data: group views by day ── */
  const chartData = useMemo(() => {
    const viewsByDay = new Map<string, number>();
    interactions
      .filter(i => i.interaction_type === 'view')
      .forEach(i => {
        const day = i.created_at.slice(0, 10);
        viewsByDay.set(day, (viewsByDay.get(day) ?? 0) + 1);
      });
    return Array.from(viewsByDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date: formatDate(date), views: count }));
  }, [interactions]);

  /* ── top referrers ── */
  const topReferrers = useMemo(() => {
    const counts = new Map<string, number>();
    interactions.forEach(i => {
      const domain = extractDomain(i.referrer);
      counts.set(domain, (counts.get(domain) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([domain, count]) => ({ domain, count }));
  }, [interactions]);

  /* ── supabase not configured ── */
  if (!isSupabaseConfigured()) {
    return (
      <div className="p-12 bg-white border-editorial text-center">
        <BarChart3 className="w-8 h-8 text-slate-300 mx-auto mb-4" />
        <p className="text-sm text-slate-500">
          Analytics require a Supabase connection. Configure your environment to enable tracking.
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

  /* ── empty state ── */
  if (interactions.length === 0) {
    return (
      <div className="space-y-6">
        {/* date range toggle - still shown */}
        <DateRangeToggle range={range} setRange={setRange} />
        <div className="p-12 bg-white border-editorial text-center">
          <Eye className="w-8 h-8 text-slate-300 mx-auto mb-4" />
          <p className="font-editorial text-lg font-bold text-black mb-2">No interactions yet</p>
          <p className="text-sm text-slate-500">
            Share your Action Kit link to start collecting analytics data.
          </p>
        </div>
      </div>
    );
  }

  /* ── main dashboard ── */
  return (
    <div className="space-y-8">
      {/* date range */}
      <DateRangeToggle range={range} setRange={setRange} />

      {/* stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Views" value={stats.views} icon={Eye} delay={0} />
        <StatCard label="Email Clicks" value={stats.emailClicks} icon={Mail} delay={0.05} />
        <StatCard label="Call Clicks" value={stats.callClicks} icon={Phone} delay={0.1} />
        <StatCard label="Conversion Rate" value={`${stats.conversionRate}%`} icon={TrendingUp} delay={0.15} />
      </div>

      {/* unique visitors */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white border-editorial p-6 flex items-center gap-4"
      >
        <Users className="w-5 h-5 text-slate-400" />
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Unique Visitors
          </span>
          <p className="text-2xl font-editorial font-bold text-black">{stats.uniqueVisitors}</p>
        </div>
      </motion.div>

      {/* views over time chart */}
      {chartData.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white border-editorial p-6"
        >
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">
            Page Views Over Time
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="views" stroke="#000" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* top referrers */}
      {topReferrers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white border-editorial"
        >
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5" />
              Top Referrers
            </h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Source
                </th>
                <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Visits
                </th>
              </tr>
            </thead>
            <tbody>
              {topReferrers.map((r, i) => (
                <tr key={r.domain} className={i < topReferrers.length - 1 ? 'border-b border-slate-100' : ''}>
                  <td className="px-6 py-3 text-sm text-black">{r.domain}</td>
                  <td className="px-6 py-3 text-sm text-black text-right font-bold">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* export CSV */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <button
          onClick={() => downloadCsv(
            interactions.map(i => ({
              id: i.id,
              interaction_type: i.interaction_type,
              referrer: i.referrer ?? '',
              visitor_ip_hash: i.visitor_ip_hash ?? '',
              created_at: i.created_at,
            })),
            `action-kit-${kitId}-analytics.csv`
          )}
          className="flex items-center gap-2 px-6 py-3 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </motion.div>
    </div>
  );
}

/* ── date range toggle ───────────────────────────────────── */

function DateRangeToggle({ range, setRange }: { range: DateRange; setRange: (r: DateRange) => void }) {
  const options: { value: DateRange; label: string }[] = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: 'all', label: 'All Time' },
  ];

  return (
    <div className="flex gap-0">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => setRange(opt.value)}
          className={`px-5 py-2.5 text-xs font-bold uppercase tracking-widest border transition-colors ${
            range === opt.value
              ? 'bg-black text-white border-black'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          } ${opt.value === '7d' ? '' : '-ml-px'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ── exported wrapper with ProGate ───────────────────────── */

export default function ActionKitAnalytics({ kitId }: ActionKitAnalyticsProps) {
  return (
    <ProGate flag="canCreateActionKits" feature="Action Kit Analytics">
      <ActionKitAnalyticsInner kitId={kitId} />
    </ProGate>
  );
}
