import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Send } from 'lucide-react';
import { useProUser } from '../hooks/useProUser';
import { logCommunication, getCommunicationLogs } from '../services/stafferService';
import { getUserTeamId } from '../services/teamService';
import type { CommunicationLog } from '../lib/types';

interface CommunicationLogModalProps {
  stafferId: string;
  stafferName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function CommunicationLogModal({
  stafferId,
  stafferName,
  isOpen,
  onClose,
}: CommunicationLogModalProps) {
  const { user } = useProUser();

  const [contactType, setContactType] = useState<'email' | 'call' | 'meeting' | 'other'>('email');
  const [contactDate, setContactDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [teamId, setTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !user) return;

    let cancelled = false;

    (async () => {
      const tid = await getUserTeamId(user.id);
      if (cancelled) return;
      setTeamId(tid);

      if (tid) {
        setLoadingLogs(true);
        const data = await getCommunicationLogs(stafferId, tid);
        if (!cancelled) setLogs(data);
        setLoadingLogs(false);
      } else {
        setLoadingLogs(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isOpen, user?.id, stafferId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !teamId || !summary.trim()) return;

    setSubmitting(true);
    try {
      const newLog = await logCommunication({
        staffer_id: stafferId,
        team_id: teamId,
        user_id: user.id,
        contact_type: contactType,
        summary: summary.trim(),
        contact_date: contactDate,
      });
      setLogs((prev) => [newLog, ...prev]);
      setSummary('');
      setContactType('email');
      setContactDate(new Date().toISOString().slice(0, 10));
    } catch (err) {
      console.error('Error logging communication:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const contactTypeLabels: Record<string, string> = {
    email: 'Email',
    call: 'Call',
    meeting: 'Meeting',
    other: 'Other',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="bg-white border-editorial w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="font-editorial text-2xl font-bold text-black">Log Contact</h2>
                <p className="text-sm text-slate-500 mt-0.5">{stafferName}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-black transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 border-b border-slate-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
                    Contact Type
                  </label>
                  <select
                    value={contactType}
                    onChange={(e) => setContactType(e.target.value as typeof contactType)}
                    className="w-full px-3 py-2.5 border-editorial text-sm text-black bg-white focus:outline-none focus:ring-1 focus:ring-black"
                  >
                    <option value="email">Email</option>
                    <option value="call">Call</option>
                    <option value="meeting">Meeting</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={contactDate}
                    onChange={(e) => setContactDate(e.target.value)}
                    className="w-full px-3 py-2.5 border-editorial text-sm text-black bg-white focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
                  Summary
                </label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={3}
                  placeholder="Brief summary of the contact..."
                  className="w-full px-3 py-2.5 border-editorial text-sm text-black bg-white placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-black resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !summary.trim() || !teamId}
                className="w-full flex items-center justify-center gap-2 py-3 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {submitting ? 'Logging...' : 'Log Contact'}
              </button>
            </form>

            {/* Existing logs */}
            <div className="p-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">
                Previous Contacts
              </p>

              {loadingLogs ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-black" />
                </div>
              ) : logs.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No contacts logged yet</p>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {logs.map((log) => (
                    <div key={log.id} className="p-3 bg-slate-50 border border-slate-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="px-2 py-0.5 bg-black text-white text-[10px] font-bold uppercase tracking-widest">
                          {contactTypeLabels[log.contact_type] ?? log.contact_type}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(log.contact_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 mt-2">{log.summary}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
