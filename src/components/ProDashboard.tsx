import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Loader2,
  FileText,
  Users,
  Hash,
  Bell,
  BellOff,
  Crosshair,
  Eye,
  Download,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useProUser } from '../hooks/useProUser';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { getWatchlist, type WatchlistItem } from '../services/watchlistService';
import { getAlertPreferences, type AlertPreferences } from '../services/alertService';
import ProGate from './ProGate';
import SubscriptionStatus from './SubscriptionStatus';

/* -- types ------------------------------------------------ */

interface ImpactReportRow {
  id: string;
  platform_id: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  created_at: string;
  policy_platforms: { filename: string }[] | { filename: string } | null;
}

/* -- status badge ----------------------------------------- */

function ReportStatusBadge({ status }: { status: ImpactReportRow['status'] }) {
  const cfg: Record<string, { bg: string; text: string; Icon: typeof CheckCircle2 }> = {
    complete: { bg: 'bg-green-100', text: 'text-green-700', Icon: CheckCircle2 },
    processing: { bg: 'bg-amber-100', text: 'text-amber-700', Icon: Clock },
    pending: { bg: 'bg-slate-100', text: 'text-slate-600', Icon: Clock },
    error: { bg: 'bg-red-100', text: 'text-red-700', Icon: XCircle },
  };
  const c = cfg[status] ?? cfg.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${c.bg} ${c.text}`}>
      <c.Icon className="w-3 h-3" />
      {status}
    </span>
  );
}

/* -- helpers ---------------------------------------------- */

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function typeIcon(type: WatchlistItem['item_type']) {
  switch (type) {
    case 'bill':
      return <FileText className="w-3.5 h-3.5" />;
    case 'member':
      return <Users className="w-3.5 h-3.5" />;
    case 'keyword':
      return <Hash className="w-3.5 h-3.5" />;
  }
}

function typeLabel(type: WatchlistItem['item_type']) {
  switch (type) {
    case 'bill':
      return 'Bill';
    case 'member':
      return 'Member';
    case 'keyword':
      return 'Keyword';
  }
}

/* -- component -------------------------------------------- */

export default function ProDashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, user, isLoading: authLoading } = useProUser();

  const [reports, setReports] = useState<ImpactReportRow[]>([]);
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [alertPrefs, setAlertPrefs] = useState<AlertPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchAll = async () => {
      const [reportsResult, watchlist, alerts] = await Promise.all([
        supabase!
          .from('impact_reports')
          .select('id, platform_id, status, created_at, policy_platforms(filename)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        getWatchlist(user.id),
        getAlertPreferences(user.id),
      ]);

      setReports((reportsResult.data as ImpactReportRow[] | null) ?? []);
      setWatchlistItems(watchlist);
      setAlertPrefs(alerts);
      setLoading(false);
    };

    fetchAll().catch(() => setLoading(false));
  }, [user?.id]);

  /* -- PDF download ---------------------------------------- */

  const handleDownloadPdf = async (reportId: string) => {
    if (!isSupabaseConfigured()) return;
    setDownloadingId(reportId);
    try {
      const { data, error } = await supabase!.functions.invoke('generate-impact-pdf', {
        body: { reportId },
      });
      if (error) throw error;
      if (data instanceof Blob) {
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `impact-report-${reportId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  /* -- derived values ------------------------------------- */

  const bills = watchlistItems.filter((i) => i.item_type === 'bill');
  const members = watchlistItems.filter((i) => i.item_type === 'member');
  const keywords = watchlistItems.filter((i) => i.item_type === 'keyword');
  const recentItems = watchlistItems.slice(0, 3);

  /* -- guard states --------------------------------------- */

  if (!isSupabaseConfigured()) {
    return (
      <div className="text-center py-20 border-editorial bg-white">
        <LayoutDashboard className="w-10 h-10 text-slate-300 mx-auto mb-4" />
        <h2 className="font-editorial text-3xl font-bold text-black mb-4">Pro Dashboard</h2>
        <p className="text-slate-600">
          Dashboard requires a connected backend. Please configure Supabase to enable this feature.
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
        <LayoutDashboard className="w-10 h-10 text-slate-300 mx-auto mb-4" />
        <h2 className="font-editorial text-3xl font-bold text-black mb-4">Sign In Required</h2>
        <p className="text-slate-600 mb-6">
          Sign in to access your Pro dashboard and view your activity.
        </p>
      </div>
    );
  }

  /* -- render --------------------------------------------- */

  return (
    <div className="space-y-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <LayoutDashboard className="w-6 h-6 text-black" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Pro Feature
          </span>
        </div>
        <h1 className="font-editorial text-5xl md:text-7xl font-black text-black tracking-tighter leading-none mb-4">
          Your Pro Dashboard
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
          A single view of your impact reports, watchlist, and alert settings.
        </p>
      </motion.div>

      <ProGate feature="Pro Dashboard">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-black animate-spin" />
            <p className="text-slate-500 font-medium">Loading your dashboard...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="flex flex-wrap gap-3"
            >
              <button
                onClick={() => navigate('/impact')}
                className="flex items-center gap-2 px-6 py-3 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Analysis
              </button>
              <button
                onClick={() => navigate('/watchlist')}
                className="flex items-center gap-2 px-6 py-3 border-editorial text-black font-bold uppercase tracking-widest text-sm hover:bg-slate-50 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Manage Watchlist
              </button>
              <button
                onClick={() => navigate('/watchlist')}
                className="flex items-center gap-2 px-6 py-3 border-editorial text-black font-bold uppercase tracking-widest text-sm hover:bg-slate-50 transition-colors"
              >
                <Bell className="w-4 h-4" />
                Update Alerts
              </button>
            </motion.div>

            {/* Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Recent Impact Reports */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white border-editorial p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <Crosshair className="w-5 h-5 text-black" />
                  <h2 className="font-editorial text-xl font-bold text-black">
                    Recent Impact Reports
                  </h2>
                </div>

                {reports.length === 0 ? (
                  <div className="text-center py-8">
                    <Crosshair className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 mb-4">No reports yet</p>
                    <Link
                      to="/impact"
                      className="inline-block px-6 py-2 bg-black text-white font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-colors"
                    >
                      Run Your First Analysis
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reports.map((report) => (
                      <div
                        key={report.id}
                        className="flex items-center justify-between gap-3 p-3 border-editorial hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <Link
                            to="/impact"
                            className="text-sm font-medium text-black hover:text-slate-600 transition-colors truncate block"
                          >
                            {(Array.isArray(report.policy_platforms)
                              ? report.policy_platforms[0]?.filename
                              : report.policy_platforms?.filename) ?? 'Platform file'}
                          </Link>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {formatDate(report.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <ReportStatusBadge status={report.status} />
                          {report.status === 'complete' && (
                            <button
                              onClick={() => handleDownloadPdf(report.id)}
                              disabled={downloadingId === report.id}
                              className="p-1.5 text-slate-400 hover:text-black transition-colors disabled:opacity-50"
                              title="Download PDF"
                            >
                              {downloadingId === report.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <Link
                      to="/impact"
                      className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-black transition-colors pt-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      New Analysis
                    </Link>
                  </div>
                )}
              </motion.div>

              {/* Card 2: Watchlist Summary */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white border-editorial p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <Eye className="w-5 h-5 text-black" />
                  <h2 className="font-editorial text-xl font-bold text-black">
                    Watchlist Summary
                  </h2>
                </div>

                {/* Counts */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-3 border-editorial">
                    <FileText className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                    <p className="font-editorial text-2xl font-bold text-black">{bills.length}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Bills
                    </p>
                  </div>
                  <div className="text-center p-3 border-editorial">
                    <Users className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                    <p className="font-editorial text-2xl font-bold text-black">{members.length}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Members
                    </p>
                  </div>
                  <div className="text-center p-3 border-editorial">
                    <Hash className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                    <p className="font-editorial text-2xl font-bold text-black">
                      {keywords.length}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Keywords
                    </p>
                  </div>
                </div>

                {/* Recent items */}
                {recentItems.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                      Recently Added
                    </p>
                    {recentItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-2 hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-slate-400">{typeIcon(item.item_type)}</span>
                        <span className="text-sm text-slate-700 truncate flex-1">
                          {item.item_label ?? item.item_value}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {typeLabel(item.item_type)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 mb-4">No items watched yet.</p>
                )}

                <Link
                  to="/watchlist"
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-black transition-colors pt-2"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Manage Watchlist
                </Link>
              </motion.div>

              {/* Card 3: Alert Status */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white border-editorial p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <Bell className="w-5 h-5 text-black" />
                  <h2 className="font-editorial text-xl font-bold text-black">Alert Status</h2>
                </div>

                {alertPrefs ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Status</span>
                      {alertPrefs.enabled ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-widest">
                          <Bell className="w-3 h-3" />
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                          <BellOff className="w-3 h-3" />
                          Disabled
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Frequency</span>
                      <span className="text-sm font-medium text-black capitalize">
                        {alertPrefs.frequency}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Last Sent</span>
                      <span className="text-sm font-medium text-black">
                        {alertPrefs.last_sent_at
                          ? formatDate(alertPrefs.last_sent_at)
                          : 'Never'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <BellOff className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 mb-1">No alert preferences configured</p>
                    <p className="text-xs text-slate-400">
                      Set up alerts to stay informed about your watchlist.
                    </p>
                  </div>
                )}

                <Link
                  to="/watchlist"
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-black transition-colors pt-4 mt-4 border-t border-slate-100"
                >
                  <Bell className="w-3.5 h-3.5" />
                  Update Alerts
                </Link>
              </motion.div>

              {/* Card 4: Subscription */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <SubscriptionStatus />
              </motion.div>
            </div>
          </div>
        )}
      </ProGate>
    </div>
  );
}
