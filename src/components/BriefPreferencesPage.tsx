import { useState, useEffect, useCallback } from 'react';
import { Newspaper, Download } from 'lucide-react';
import { useSession } from '@clerk/clerk-react';
import { getBriefPreferences, updateBriefPreferences, generateBriefNow } from '../services/briefService';
import ProGate from './ProGate';
import type { BriefPreferences } from '../lib/types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function BriefPreferencesPage() {
  const { session } = useSession();
  const [prefs, setPrefs] = useState<BriefPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    if (!session) return;
    session.getToken().then((token) => {
      if (!token) return;
      getBriefPreferences(token)
        .then((p) =>
          setPrefs(
            p ?? {
              enabled: false,
              dayOfWeek: 1,
              includeWatchlist: true,
              includeConflicts: true,
              includeWorkHorse: false,
              brandingOrgName: null,
              brandingLogoUrl: null,
              lastGeneratedAt: null,
            },
          ),
        )
        .finally(() => setLoading(false));
    });
  }, [session]);

  const handleSave = useCallback(async () => {
    if (!session || !prefs) return;
    const token = await session.getToken();
    if (!token) return;
    setSaving(true);
    await updateBriefPreferences(token, prefs);
    setSaving(false);
    setSavedMsg('Preferences saved.');
    setTimeout(() => setSavedMsg(''), 3000);
  }, [session, prefs]);

  const handleGenerate = useCallback(async () => {
    if (!session) return;
    const token = await session.getToken();
    if (!token) return;
    setGenerating(true);
    try {
      const { url } = await generateBriefNow(token);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Brief generation failed', err);
    } finally {
      setGenerating(false);
    }
  }, [session]);

  return (
    <ProGate flag="canUseMondayBrief" feature="Monday Morning Brief">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="font-editorial text-4xl font-bold text-black">Monday Morning Brief</h1>
          <p className="mt-2 text-lg text-slate-600">
            A single-page branded report summarizing your watchlist activity from the previous week.
          </p>
        </div>

        {loading ? (
          <div className="border-editorial bg-white p-12 text-center">
            <p className="text-sm text-slate-500">Loading preferences...</p>
          </div>
        ) : prefs ? (
          <div className="space-y-6">
            {/* Enable toggle */}
            <div className="border-editorial bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-editorial text-xl font-bold text-black">Auto-Generate Weekly</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Receive an automated PDF brief each week.
                  </p>
                </div>
                <button
                  onClick={() => setPrefs({ ...prefs, enabled: !prefs.enabled })}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    prefs.enabled ? 'bg-black' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                      prefs.enabled ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Day of week */}
            <div className="border-editorial bg-white p-6">
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                Delivery Day
              </label>
              <select
                value={prefs.dayOfWeek}
                onChange={(e) => setPrefs({ ...prefs, dayOfWeek: Number(e.target.value) })}
                className="border-editorial bg-white px-3 py-2 text-sm w-full"
              >
                {DAYS.map((day, idx) => (
                  <option key={day} value={idx}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            {/* Sections */}
            <div className="border-editorial bg-white p-6 space-y-4">
              <h3 className="font-editorial text-xl font-bold text-black">Include Sections</h3>
              {[
                { key: 'includeWatchlist' as const, label: 'Watchlist Activity', desc: 'Bills and members you are tracking' },
                { key: 'includeConflicts' as const, label: 'Conflict Alerts', desc: 'New donor-to-action conflicts' },
                { key: 'includeWorkHorse' as const, label: 'Work Horse Rankings', desc: 'Top movers and shakers this week' },
              ].map((section) => (
                <div key={section.key} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium text-black text-sm">{section.label}</p>
                    <p className="text-xs text-slate-500">{section.desc}</p>
                  </div>
                  <button
                    onClick={() => setPrefs({ ...prefs, [section.key]: !prefs[section.key] })}
                    className={`relative h-5 w-9 rounded-full transition-colors ${
                      prefs[section.key] ? 'bg-black' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                        prefs[section.key] ? 'translate-x-4' : ''
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>

            {/* Branding */}
            <div className="border-editorial bg-white p-6 space-y-4">
              <h3 className="font-editorial text-xl font-bold text-black">Branding</h3>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={prefs.brandingOrgName ?? ''}
                  onChange={(e) => setPrefs({ ...prefs, brandingOrgName: e.target.value || null })}
                  placeholder="Your Firm Name"
                  className="w-full border-editorial px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-black px-6 py-3 text-sm font-bold uppercase tracking-widest text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Preferences'}
                </button>
                {savedMsg && (
                  <span className="text-sm text-emerald-600 font-medium self-center">{savedMsg}</span>
                )}
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center gap-2 border-editorial px-6 py-3 text-sm font-bold uppercase tracking-widest text-black hover:bg-slate-50 disabled:opacity-50"
              >
                {generating ? (
                  <Newspaper className="h-4 w-4 animate-pulse" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {generating ? 'Generating...' : 'Generate Now'}
              </button>
            </div>

            {prefs.lastGeneratedAt && (
              <p className="text-xs text-slate-400">
                Last generated:{' '}
                {new Date(prefs.lastGeneratedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </ProGate>
  );
}
