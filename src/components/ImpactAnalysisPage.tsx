import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Target, Upload, FileText, Loader2, Trash2, Play, Download,
  ChevronDown, ChevronUp, CheckCircle, AlertTriangle, XCircle, Minus,
} from 'lucide-react';
import { useSession } from '@clerk/clerk-react';
import { useProUser } from '../hooks/useProUser';
import { isSupabaseConfigured } from '../services/supabaseClient';
import {
  uploadPlatform,
  getUserPlatforms,
  deletePlatform,
  type PolicyPlatform,
} from '../services/platformService';
import {
  runAnalysis,
  getReports,
  generatePDF,
  type ImpactReport,
  type BillClassification,
} from '../services/impactService';
import ProGate from './ProGate';

/* ── helpers ────────────────────────────────────────────── */

function statusBadge(status: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    uploaded: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Ready' },
    processing: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Processing' },
    analyzed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Analyzed' },
    error: { bg: 'bg-red-100', text: 'text-red-700', label: 'Error' },
    pending: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Pending' },
    complete: { bg: 'bg-green-100', text: 'text-green-700', label: 'Complete' },
  };
  const s = map[status] ?? { bg: 'bg-slate-100', text: 'text-slate-600', label: status };
  return (
    <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

function classificationIcon(c: string) {
  switch (c) {
    case 'Opportunity': return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'Threat': return <XCircle className="w-4 h-4 text-red-600" />;
    case 'Conflict': return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    default: return <Minus className="w-4 h-4 text-slate-400" />;
  }
}

function classificationColor(c: string) {
  switch (c) {
    case 'Opportunity': return 'border-l-green-500';
    case 'Threat': return 'border-l-red-500';
    case 'Conflict': return 'border-l-amber-500';
    default: return 'border-l-slate-300';
  }
}

/* ── main component ─────────────────────────────────────── */

export default function ImpactAnalysisPage() {
  const { isAuthenticated, isLoading: authLoading } = useProUser();
  const { session } = useSession();

  const [platforms, setPlatforms] = useState<PolicyPlatform[]>([]);
  const [reports, setReports] = useState<ImpactReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ImpactReport | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !session || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    session.getToken().then(async (token) => {
      if (!token) return;
      const [p, r] = await Promise.all([getUserPlatforms(token), getReports(token)]);
      setPlatforms(p);
      setReports(r);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [isAuthenticated, session]);

  const handleUpload = async (file: File) => {
    if (!session) return;
    setUploading(true);
    try {
      const token = await session.getToken();
      if (!token) return;
      await uploadPlatform(token, file);
      const refreshed = await getUserPlatforms(token);
      setPlatforms(refreshed);
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!session) return;
    setDeletingId(id);
    try {
      const token = await session.getToken();
      if (!token) return;
      await deletePlatform(token, id);
      setPlatforms((prev) => prev.filter((p) => p.id !== id));
    } catch {
    } finally {
      setDeletingId(null);
    }
  };

  const handleAnalyze = async (platformId: string) => {
    if (!session) return;
    setAnalyzing(platformId);
    try {
      const token = await session.getToken();
      if (!token) return;
      await runAnalysis(token, platformId);
      // Refresh both platforms and reports
      const [p, r] = await Promise.all([getUserPlatforms(token), getReports(token)]);
      setPlatforms(p);
      setReports(r);
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setAnalyzing(null);
    }
  };

  const handleExportPDF = async (reportId: string) => {
    if (!session) return;
    setExporting(reportId);
    try {
      const token = await session.getToken();
      if (!token) return;
      const { url } = await generatePDF(token, reportId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setExporting(null);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.pdf') || file.name.endsWith('.txt'))) {
      handleUpload(file);
    }
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  };

  /* Derived data */
  const completedReports = reports.filter((r) => r.status === 'complete' && r.report_json);

  if (!isSupabaseConfigured()) {
    return (
      <div className="text-center py-20 border-editorial bg-white">
        <Target className="w-10 h-10 text-slate-300 mx-auto mb-4" />
        <h2 className="font-editorial text-3xl font-bold text-black mb-4">Impact Analysis</h2>
        <p className="text-slate-600">This feature requires a connected backend. Please configure Supabase.</p>
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
        <Target className="w-10 h-10 text-slate-300 mx-auto mb-4" />
        <h2 className="font-editorial text-3xl font-bold text-black mb-4">Sign In Required</h2>
        <p className="text-slate-600 mb-6">Sign in to access Impact Analysis and compare bills against your policy platform.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <Target className="w-6 h-6 text-black" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Pro Feature</span>
        </div>
        <h1 className="font-editorial text-5xl md:text-7xl font-black text-black tracking-tighter leading-none mb-4">
          Impact Analysis
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
          Upload your organization's policy platform and let AI analyze every active bill for opportunities, threats, and conflicts with your agenda.
        </p>
      </motion.div>

      <ProGate feature="Impact Analysis" flag="canUseImpactAnalysis">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-black animate-spin" />
            <p className="text-slate-500 font-medium">Loading your platforms...</p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Upload Section */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <div className="flex items-center gap-3 border-b-editorial pb-4 mb-6">
                <Upload className="w-5 h-5 text-black" />
                <h2 className="font-editorial text-3xl font-bold text-black">Policy Platforms</h2>
              </div>

              {/* Dropzone */}
              <label
                className={`flex flex-col items-center justify-center py-12 border-2 border-dashed transition-colors cursor-pointer ${
                  dragOver ? 'border-black bg-slate-50' : 'border-slate-300 hover:border-black hover:bg-slate-50'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                {uploading ? (
                  <Loader2 className="w-8 h-8 text-black animate-spin mb-3" />
                ) : (
                  <Upload className="w-8 h-8 text-slate-400 mb-3" />
                )}
                <p className="text-sm font-bold text-slate-700 mb-1">
                  {uploading ? 'Uploading...' : 'Drop a PDF or TXT file here'}
                </p>
                <p className="text-xs text-slate-400">
                  Your organization's mission statement, legislative agenda, or policy platform. Max 10MB.
                </p>
                <input
                  type="file"
                  accept=".pdf,.txt"
                  onChange={onFileInput}
                  className="hidden"
                  disabled={uploading}
                />
              </label>

              {/* Platform List */}
              {platforms.length > 0 && (
                <div className="mt-6 space-y-3">
                  {platforms.map((platform) => (
                    <motion.div
                      key={platform.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between bg-white border-editorial p-5 group"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-black truncate">{platform.filename}</p>
                          <p className="text-xs text-slate-400">
                            {(platform.file_size / 1024).toFixed(1)} KB &middot; {new Date(platform.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {statusBadge(platform.status)}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {(platform.status === 'uploaded' || platform.status === 'analyzed') && (
                          <button
                            onClick={() => handleAnalyze(platform.id)}
                            disabled={analyzing === platform.id}
                            className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors disabled:opacity-50"
                          >
                            {analyzing === platform.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Play className="w-3.5 h-3.5" />
                            )}
                            {platform.status === 'analyzed' ? 'Re-analyze' : 'Analyze'}
                          </button>
                        )}
                        {platform.status === 'processing' && (
                          <span className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-amber-700">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Processing
                          </span>
                        )}
                        <button
                          onClick={() => handleDelete(platform.id)}
                          disabled={deletingId === platform.id}
                          className="p-2 text-slate-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                          title="Delete platform"
                        >
                          {deletingId === platform.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Reports Section */}
            {completedReports.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="flex items-center gap-3 border-b-editorial pb-4 mb-6">
                  <Target className="w-5 h-5 text-black" />
                  <h2 className="font-editorial text-3xl font-bold text-black">Analysis Reports</h2>
                </div>

                <div className="space-y-3">
                  {completedReports.map((report) => {
                    const results = report.report_json?.results ?? [];
                    const opps = results.filter((r) => r.classification === 'Opportunity').length;
                    const threats = results.filter((r) => r.classification === 'Threat').length;
                    const conflicts = results.filter((r) => r.classification === 'Conflict').length;
                    const isSelected = selectedReport?.id === report.id;

                    return (
                      <div key={report.id} className="border-editorial bg-white">
                        <button
                          onClick={() => setSelectedReport(isSelected ? null : report)}
                          className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            {statusBadge(report.status)}
                            <span className="text-sm text-slate-700">
                              {new Date(report.created_at).toLocaleDateString('en-US', {
                                year: 'numeric', month: 'long', day: 'numeric',
                              })}
                            </span>
                            <span className="text-xs text-slate-400">{results.length} bills analyzed</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 text-xs font-bold">
                              <span className="text-green-600">{opps} Opportunities</span>
                              <span className="text-red-600">{threats} Threats</span>
                              <span className="text-amber-600">{conflicts} Conflicts</span>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleExportPDF(report.id); }}
                              disabled={exporting === report.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 border-editorial text-xs font-bold uppercase tracking-widest text-black hover:bg-slate-50 transition-colors disabled:opacity-50"
                            >
                              {exporting === report.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Download className="w-3 h-3" />
                              )}
                              PDF
                            </button>
                            {isSelected ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </div>
                        </button>

                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <ReportViewer results={results} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Methodology */}
            <div className="p-8 bg-slate-50 border-editorial text-sm text-slate-600 space-y-2 max-w-3xl">
              <p className="font-bold text-black uppercase tracking-widest text-xs mb-3">How it works</p>
              <p><strong className="text-black">Upload</strong> --- Provide your organization's policy platform as a PDF or text file describing your legislative priorities.</p>
              <p><strong className="text-black">Analyze</strong> --- AI compares every active City Council bill against your platform, classifying each as an Opportunity, Threat, Conflict, or Neutral.</p>
              <p><strong className="text-black">Export</strong> --- Download a formatted PDF report to brief your team or board.</p>
              <p className="text-xs text-slate-400 pt-2">Analysis powered by Google Gemini. Results are AI-generated and should be reviewed for accuracy.</p>
            </div>
          </div>
        )}
      </ProGate>
    </div>
  );
}

/* ── Report Viewer ──────────────────────────────────────── */

function ReportViewer({ results }: { results: BillClassification[] }) {
  const [activeTab, setActiveTab] = useState<'Opportunity' | 'Threat' | 'Conflict' | 'Neutral'>('Opportunity');

  const groups = {
    Opportunity: results.filter((r) => r.classification === 'Opportunity').sort((a, b) => b.confidence - a.confidence),
    Threat: results.filter((r) => r.classification === 'Threat').sort((a, b) => b.confidence - a.confidence),
    Conflict: results.filter((r) => r.classification === 'Conflict').sort((a, b) => b.confidence - a.confidence),
    Neutral: results.filter((r) => r.classification === 'Neutral').sort((a, b) => b.confidence - a.confidence),
  };

  const tabs: { key: typeof activeTab; label: string; color: string; count: number }[] = [
    { key: 'Opportunity', label: 'Opportunities', color: 'text-green-600', count: groups.Opportunity.length },
    { key: 'Threat', label: 'Threats', color: 'text-red-600', count: groups.Threat.length },
    { key: 'Conflict', label: 'Conflicts', color: 'text-amber-600', count: groups.Conflict.length },
    { key: 'Neutral', label: 'Neutral', color: 'text-slate-500', count: groups.Neutral.length },
  ];

  return (
    <div className="border-t border-slate-100">
      {/* Tabs */}
      <div className="flex border-b border-slate-100">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
              activeTab === tab.key ? `${tab.color} border-b-2 border-current bg-slate-50` : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="max-h-[500px] overflow-y-auto">
        {groups[activeTab].length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No bills in this category.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {groups[activeTab].map((bill) => (
              <div key={bill.billId} className={`p-5 border-l-4 ${classificationColor(bill.classification)}`}>
                <div className="flex items-start gap-3">
                  {classificationIcon(bill.classification)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-black">{bill.introNumber}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {Math.round(bill.confidence * 100)}% confidence
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 mb-2">{bill.title}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{bill.reasoning}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
