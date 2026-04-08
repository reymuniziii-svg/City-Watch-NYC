import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Crosshair, Loader2, Download, Clock, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { useProUser } from '../hooks/useProUser';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { uploadPlatform } from '../services/platformService';
import ProGate from './ProGate';
import PolicyUploader from './PolicyUploader';
import ImpactResultCard from './ImpactResultCard';
import type { Classification } from './ImpactResultCard';

/* ── types ──────────────────────────────────────────────── */

interface BillResult {
  billId: string;
  introNumber: string;
  title: string;
  classification: Classification;
  reasoning: string;
  confidence: number;
}

interface ImpactReport {
  id: string;
  platform_id: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  bills_analyzed: number;
  results: BillResult[] | null;
  created_at: string;
  platform_filename?: string;
}

/* ── classification order ───────────────────────────────── */

const CLASS_ORDER: Classification[] = ['Opportunity', 'Threat', 'Conflict', 'Neutral'];

const CLASS_SECTION_STYLES: Record<Classification, { icon: string; label: string }> = {
  Opportunity: { icon: 'text-green-600', label: 'Opportunities' },
  Threat: { icon: 'text-red-600', label: 'Threats' },
  Conflict: { icon: 'text-amber-600', label: 'Conflicts' },
  Neutral: { icon: 'text-slate-500', label: 'Neutral' },
};

/* ── status badge helper ────────────────────────────────── */

function StatusBadge({ status }: { status: ImpactReport['status'] }) {
  const styles: Record<string, string> = {
    pending: 'bg-slate-100 text-slate-600',
    processing: 'bg-amber-100 text-amber-700',
    complete: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${styles[status] ?? styles.pending}`}>
      {status}
    </span>
  );
}

/* ── component ──────────────────────────────────────────── */

export default function ImpactAnalysisPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useProUser();

  // upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [platformId, setPlatformId] = useState<string | null>(null);

  // analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [results, setResults] = useState<BillResult[]>([]);
  const [billsAnalyzed, setBillsAnalyzed] = useState(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // pdf state
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // history state
  const [history, setHistory] = useState<ImpactReport[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [viewingReport, setViewingReport] = useState<ImpactReport | null>(null);

  /* ── fetch history ──────────────────────────────────── */

  const fetchHistory = useCallback(async () => {
    if (!user || !isSupabaseConfigured() || !supabase) return;
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('impact_reports')
        .select('id, platform_id, status, bills_analyzed, results, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // fetch platform filenames
      const reports = (data ?? []) as ImpactReport[];
      const platformIds = [...new Set(reports.map(r => r.platform_id))];
      if (platformIds.length > 0) {
        const { data: platforms } = await supabase
          .from('policy_platforms')
          .select('id, filename')
          .in('id', platformIds);

        const filenameMap = new Map((platforms ?? []).map((p: { id: string; filename: string }) => [p.id, p.filename]));
        for (const report of reports) {
          report.platform_filename = filenameMap.get(report.platform_id) ?? 'Unknown file';
        }
      }
      setHistory(reports);
    } catch {
      // silently fail for history
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  /* ── upload handler ─────────────────────────────────── */

  const handleUpload = async (file: File) => {
    if (!user) return;
    setIsUploading(true);
    setAnalysisError(null);
    try {
      const result = await uploadPlatform(user.id, file);
      setPlatformId(result.id);
      setUploadedFile(result.filename);
      // reset any previous results
      setResults([]);
      setReportId(null);
      setBillsAnalyzed(0);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  /* ── analyze handler ────────────────────────────────── */

  const handleAnalyze = async () => {
    if (!platformId || !isSupabaseConfigured() || !supabase) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setResults([]);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-impact', {
        body: { platformId },
      });
      if (error) throw error;
      const { reportId: rid, billsAnalyzed: count } = data as { reportId: string; billsAnalyzed: number };
      setReportId(rid);
      setBillsAnalyzed(count);

      // fetch the full results
      const { data: report, error: fetchError } = await supabase
        .from('impact_reports')
        .select('results')
        .eq('id', rid)
        .single();

      if (fetchError) throw fetchError;
      setResults((report?.results as BillResult[]) ?? []);
      // refresh history
      fetchHistory();
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  /* ── download pdf handler ───────────────────────────── */

  const handleDownloadPdf = async (targetReportId: string) => {
    if (!isSupabaseConfigured() || !supabase) return;
    setIsGeneratingPdf(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-impact-pdf', {
        body: { reportId: targetReportId },
      });
      if (error) throw error;
      const { url } = data as { url: string };
      window.open(url, '_blank');
    } catch {
      setAnalysisError('PDF generation failed. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  /* ── view historical report ─────────────────────────── */

  const handleViewReport = (report: ImpactReport) => {
    if (report.results) {
      setViewingReport(report);
      setResults(report.results);
      setReportId(report.id);
      setBillsAnalyzed(report.bills_analyzed);
      setUploadedFile(report.platform_filename ?? null);
      setPlatformId(report.platform_id);
    }
  };

  /* ── grouped results ────────────────────────────────── */

  const grouped = CLASS_ORDER.reduce<Record<Classification, BillResult[]>>((acc, cls) => {
    acc[cls] = results.filter(r => r.classification === cls);
    return acc;
  }, { Opportunity: [], Threat: [], Conflict: [], Neutral: [] });

  /* ── backend not configured ─────────────────────────── */

  if (!isSupabaseConfigured()) {
    return (
      <div className="text-center py-20 border-editorial bg-white">
        <Crosshair className="w-10 h-10 text-slate-300 mx-auto mb-4" />
        <h2 className="font-editorial text-3xl font-bold text-black mb-4">Impact Analysis</h2>
        <p className="text-slate-600">Impact Analysis requires a connected backend. Please configure Supabase to enable this feature.</p>
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
        <Crosshair className="w-10 h-10 text-slate-300 mx-auto mb-4" />
        <h2 className="font-editorial text-3xl font-bold text-black mb-4">Sign In Required</h2>
        <p className="text-slate-600 mb-6">Sign in to access Impact Analysis and see how legislation affects your policy platform.</p>
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
          <Crosshair className="w-6 h-6 text-black" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Pro Feature</span>
        </div>
        <h1 className="font-editorial text-5xl md:text-7xl font-black text-black tracking-tighter leading-none mb-4">
          Impact Analysis
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
          Upload your policy platform and discover which pending bills align with, threaten, or conflict with your priorities.
        </p>
      </motion.div>

      <ProGate flag="canUseImpactAnalysis" feature="Impact Analysis">
        <div className="space-y-10">
          {/* Upload Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div className="flex items-center gap-3 border-b-editorial pb-4 mb-6">
              <FileText className="w-5 h-5 text-black" />
              <h2 className="font-editorial text-3xl font-bold text-black">Policy Platform</h2>
            </div>
            <PolicyUploader
              onUpload={handleUpload}
              isUploading={isUploading}
              uploadedFile={uploadedFile}
            />

            {/* Analyze button */}
            {platformId && !isAnalyzing && results.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <button
                  onClick={handleAnalyze}
                  className="px-8 py-3 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition-colors"
                >
                  Analyze Against Pending Legislation
                </button>
              </motion.div>
            )}

            {/* Error */}
            {analysisError && (
              <div className="flex items-center gap-2 mt-4 text-red-600">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <p className="text-sm">{analysisError}</p>
              </div>
            )}
          </motion.div>

          {/* Analyzing loading state */}
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 gap-4"
            >
              <div className="relative">
                <Crosshair className="w-12 h-12 text-black animate-pulse" />
              </div>
              <p className="text-sm font-bold text-black uppercase tracking-widest">Analyzing legislation...</p>
              <p className="text-xs text-slate-500">Cross-referencing your platform against pending bills</p>
            </motion.div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-8"
            >
              {/* Summary row */}
              <div className="flex items-center justify-between border-b-editorial pb-4">
                <div>
                  <h2 className="font-editorial text-3xl font-bold text-black">Results</h2>
                  <p className="text-sm text-slate-500 mt-1">{billsAnalyzed} bills analyzed</p>
                </div>
                {reportId && (
                  <button
                    onClick={() => handleDownloadPdf(reportId)}
                    disabled={isGeneratingPdf}
                    className="flex items-center gap-2 px-6 py-3 border-editorial text-black font-bold uppercase tracking-widest text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    {isGeneratingPdf ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Download PDF
                  </button>
                )}
              </div>

              {/* Grouped by classification */}
              {CLASS_ORDER.map(cls => {
                const items = grouped[cls];
                if (items.length === 0) return null;
                const section = CLASS_SECTION_STYLES[cls];
                return (
                  <div key={cls}>
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`w-2 h-2 rounded-full ${cls === 'Opportunity' ? 'bg-green-500' : cls === 'Threat' ? 'bg-red-500' : cls === 'Conflict' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-700">
                        {section.label}
                      </h3>
                      <span className="text-xs text-slate-400">{items.length}</span>
                    </div>
                    <div className="space-y-3">
                      {items.map((bill, i) => (
                        <motion.div
                          key={bill.billId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                        >
                          <ImpactResultCard {...bill} />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* History Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center gap-3 border-b-editorial pb-4 mb-6">
              <Clock className="w-5 h-5 text-black" />
              <h2 className="font-editorial text-3xl font-bold text-black">Past Analyses</h2>
            </div>

            {historyLoading ? (
              <div className="flex items-center justify-center py-10 gap-3">
                <Loader2 className="w-5 h-5 text-black animate-spin" />
                <p className="text-sm text-slate-500">Loading history...</p>
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">No past analyses yet. Upload a policy platform above to get started.</p>
            ) : (
              <div className="space-y-3">
                {history.map(report => (
                  <div
                    key={report.id}
                    className={`flex items-center justify-between bg-white border-editorial p-5 hover:bg-slate-50 transition-colors cursor-pointer group ${
                      viewingReport?.id === report.id ? 'ring-2 ring-black' : ''
                    }`}
                    onClick={() => handleViewReport(report)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleViewReport(report); }}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex items-center justify-center w-8 h-8 bg-slate-100 shrink-0">
                        {report.status === 'complete' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : report.status === 'error' ? (
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        ) : (
                          <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-black truncate">
                          {report.platform_filename ?? 'Policy Platform'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {new Date(report.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                          {report.bills_analyzed > 0 && ` \u2014 ${report.bills_analyzed} bills`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={report.status} />
                      {report.status === 'complete' && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleDownloadPdf(report.id);
                          }}
                          disabled={isGeneratingPdf}
                          className="p-2 text-slate-400 hover:text-black transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </ProGate>
    </div>
  );
}
