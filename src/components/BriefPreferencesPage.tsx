import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Newspaper, Loader2, Save, Zap } from 'lucide-react';
import { useProUser } from '../hooks/useProUser';
import { getBriefPreferences, saveBriefPreferences, generateBriefNow } from '../services/briefService';
import ProGate from './ProGate';
import type { BriefPreferences } from '../lib/types';

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function BriefPreferencesPage() {
  const { user } = useProUser();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday
  const [includeWatchlist, setIncludeWatchlist] = useState(true);
  const [includeConflicts, setIncludeConflicts] = useState(true);
  const [includeWorkhorse, setIncludeWorkhorse] = useState(true);
  const [orgName, setOrgName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    (async () => {
      const prefs = await getBriefPreferences(user.id);
      if (prefs) {
        setEnabled(prefs.enabled);
        setDayOfWeek(prefs.day_of_week);
        setIncludeWatchlist(prefs.include_watchlist);
        setIncludeConflicts(prefs.include_conflicts);
        setIncludeWorkhorse(prefs.include_workhorse);
        setOrgName(prefs.branding_org_name ?? '');
        setLogoUrl(prefs.branding_logo_url ?? '');
        setLastGenerated(prefs.last_generated_at);
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setSaved(false);
    try {
      const prefs: BriefPreferences = {
        user_id: user.id,
        enabled,
        day_of_week: dayOfWeek,
        include_watchlist: includeWatchlist,
        include_conflicts: includeConflicts,
        include_workhorse: includeWorkhorse,
        branding_org_name: orgName.trim() || null,
        branding_logo_url: logoUrl.trim() || null,
        last_generated_at: lastGenerated,
        created_at: new Date().toISOString(),
      };
      await saveBriefPreferences(prefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Error saving brief preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateNow = async () => {
    if (!user) return;

    setGenerating(true);
    try {
      const url = await generateBriefNow(user.id);
      setLastGenerated(new Date().toISOString());
      window.open(url, '_blank');
    } catch (err) {
      console.error('Error generating brief:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Newspaper className="w-6 h-6 text-black" />
        <h1 className="font-editorial text-4xl font-bold text-black">Monday Morning Brief</h1>
      </div>
      <p className="text-slate-600 text-sm mb-8">
        A weekly intelligence digest covering your watchlist, conflict alerts, and legislative
        effectiveness -- delivered on your schedule.
      </p>

      <ProGate feature="Monday Morning Brief" flag="canUseMondayBrief">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-black" />
          </div>
        ) : (
          <div className="space-y-6 max-w-2xl">
            {/* Master toggle */}
            <div className="bg-white border-editorial p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-black">Enable Weekly Brief</p>
                  <p className="text-xs text-slate-500">Receive an automated digest on your chosen day</p>
                </div>
                <button
                  onClick={() => setEnabled(!enabled)}
                  className={`relative w-12 h-6 border-editorial rounded-none flex items-center transition-colors ${
                    enabled ? 'bg-black' : 'bg-white'
                  }`}
                  aria-label="Toggle brief"
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 transition-transform duration-200 ${
                      enabled ? 'translate-x-[26px] bg-white' : 'translate-x-0.5 bg-black'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Delivery day */}
            <div className="bg-white border-editorial p-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                Delivery Day
              </p>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className="w-full px-3 py-2.5 border-editorial text-sm text-black bg-white focus:outline-none focus:ring-1 focus:ring-black"
              >
                {DAY_LABELS.map((label, idx) => (
                  <option key={idx} value={idx}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Content sections */}
            <div className="bg-white border-editorial p-6 space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                Sections
              </p>

              {[
                { label: 'Watchlist Updates', value: includeWatchlist, setter: setIncludeWatchlist },
                { label: 'Conflict Alerts', value: includeConflicts, setter: setIncludeConflicts },
                { label: 'Work Horse Index', value: includeWorkhorse, setter: setIncludeWorkhorse },
              ].map(({ label, value, setter }) => (
                <label key={label} className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-black font-bold">{label}</span>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setter(e.target.checked)}
                    className="w-5 h-5 accent-black cursor-pointer"
                  />
                </label>
              ))}
            </div>

            {/* Branding */}
            <div className="bg-white border-editorial p-6 space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                Branding
              </p>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Your Organization"
                  className="w-full px-3 py-2.5 border-editorial text-sm text-black bg-white placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1.5">
                  Logo URL
                </label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-3 py-2.5 border-editorial text-sm text-black bg-white placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
            </div>

            {/* Last generated */}
            {lastGenerated && (
              <p className="text-xs text-slate-500">
                Last generated:{' '}
                {new Date(lastGenerated).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Preferences'}
              </button>
              <button
                onClick={handleGenerateNow}
                disabled={generating}
                className="flex items-center gap-2 px-6 py-3 border-editorial bg-white text-black font-bold uppercase tracking-widest text-sm hover:bg-black hover:text-white transition-colors disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {generating ? 'Generating...' : 'Generate Now'}
              </button>
            </div>
          </div>
        )}
      </ProGate>
    </motion.div>
  );
}
