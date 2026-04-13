import { useState, useEffect } from 'react';
import { Bell, BellOff, Mail, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useSession } from '@clerk/clerk-react';
import { useProUser } from '../hooks/useProUser';
import { getAlertPreferences, updateAlertPreferences } from '../services/alertService';
import ProGate from './ProGate';

export default function AlertPreferences() {
  const { user } = useProUser();
  const { session } = useSession();
  const [enabled, setEnabled] = useState(true);
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('weekly');
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user || !session) { setLoading(false); return; }
    session.getToken().then(token => {
      if (!token) { setLoading(false); return; }
      getAlertPreferences(token).then(prefs => {
        if (prefs) {
          setEnabled(prefs.enabled);
          setFrequency(prefs.frequency);
          setLastSent(prefs.last_sent_at);
        }
      }).finally(() => setLoading(false));
    });
  }, [user?.id, session]);

  const handleSave = async () => {
    if (!user || !session) return;
    setSaving(true);
    setSaved(false);
    try {
      const token = await session.getToken();
      if (!token) throw new Error('No session token');
      await updateAlertPreferences(token, { enabled, frequency });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // handle error
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <div className="flex items-center justify-between border-b-editorial pb-4 mb-6">
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-black" />
          <h2 className="font-editorial text-3xl font-bold text-black">Email Alerts</h2>
        </div>
      </div>

      <ProGate feature="Email Alerts" flag="canReceiveAlerts">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-black" />
          </div>
        ) : (
          <div className="bg-white border-editorial p-6 space-y-6">
            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {enabled ? <Bell className="w-5 h-5 text-black" /> : <BellOff className="w-5 h-5 text-slate-400" />}
                <div>
                  <p className="font-bold text-sm text-black">Email Digest</p>
                  <p className="text-xs text-slate-500">Get notified when watched items change</p>
                </div>
              </div>
              <button
                onClick={() => setEnabled(!enabled)}
                className={`relative w-12 h-6 border-editorial rounded-none flex items-center transition-colors ${enabled ? 'bg-black' : 'bg-white'}`}
                aria-label="Toggle email alerts"
              >
                <span className={`absolute top-0.5 w-5 h-5 transition-transform duration-200 ${enabled ? 'translate-x-[26px] bg-white' : 'translate-x-0.5 bg-black'}`} />
              </button>
            </div>

            {/* Frequency selection */}
            {enabled && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Frequency</p>
                <div className="flex gap-3">
                  {(['daily', 'weekly'] as const).map(freq => (
                    <button
                      key={freq}
                      onClick={() => setFrequency(freq)}
                      className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors border-editorial ${
                        frequency === freq ? 'bg-black text-white' : 'bg-white text-black hover:bg-slate-50'
                      }`}
                    >
                      {freq}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Last sent info */}
            {lastSent && (
              <p className="text-xs text-slate-500">
                Last digest sent: {new Date(lastSent).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Preferences'}
            </button>
          </div>
        )}
      </ProGate>
    </motion.div>
  );
}
