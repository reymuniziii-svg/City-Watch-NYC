import { useState, useEffect } from 'react';
import { Mail, MessageSquare, Hash, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useSession } from '@clerk/clerk-react';
import { useProUser } from '../hooks/useProUser';
import { callEdgeFunction, isSupabaseConfigured } from '../services/supabaseClient';
import ProGate from './ProGate';

interface ChannelPreferences {
  channels: string[];
  phone_number: string | null;
  slack_webhook_url: string | null;
}

export default function AlertChannels() {
  const { user } = useProUser();
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<string[]>(['email']);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [savingSms, setSavingSms] = useState(false);
  const [savedSms, setSavedSms] = useState(false);
  const [savingSlack, setSavingSlack] = useState(false);
  const [savedSlack, setSavedSlack] = useState(false);
  const [testingSlack, setTestingSlack] = useState(false);
  const [slackTestResult, setSlackTestResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    if (!user || !session || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    session.getToken().then(token => {
      if (!token) { setLoading(false); return; }
      callEdgeFunction<ChannelPreferences | null>('alert-preferences', { method: 'GET', token })
        .then(prefs => {
          if (prefs) {
            setChannels(prefs.channels ?? ['email']);
            setPhoneNumber(prefs.phone_number ?? '');
            setSlackWebhookUrl(prefs.slack_webhook_url ?? '');
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    });
  }, [user?.id, session]);

  const toggleChannel = (channel: string) => {
    setChannels(prev =>
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const formatPhoneNumber = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 10) {
      setPhoneNumber(formatPhoneNumber(digits));
    }
  };

  const handleSaveSms = async () => {
    if (!user || !session) return;
    setSavingSms(true);
    setSavedSms(false);
    try {
      const token = await session.getToken();
      if (!token) throw new Error('No session token');
      const rawPhone = phoneNumber.replace(/\D/g, '');
      const formattedPhone = rawPhone.length === 10 ? `+1${rawPhone}` : phoneNumber;
      await callEdgeFunction('alert-preferences', {
        method: 'POST',
        token,
        body: {
          channels: channels.includes('sms') ? channels : [...channels, 'sms'],
          phone_number: formattedPhone,
        },
      });
      if (!channels.includes('sms')) {
        setChannels(prev => [...prev, 'sms']);
      }
      setSavedSms(true);
      setTimeout(() => setSavedSms(false), 2000);
    } catch {
      // handle error
    } finally {
      setSavingSms(false);
    }
  };

  const handleSaveSlack = async () => {
    if (!user || !session) return;
    setSavingSlack(true);
    setSavedSlack(false);
    try {
      const token = await session.getToken();
      if (!token) throw new Error('No session token');
      await callEdgeFunction('alert-preferences', {
        method: 'POST',
        token,
        body: {
          channels: channels.includes('slack') ? channels : [...channels, 'slack'],
          slack_webhook_url: slackWebhookUrl,
        },
      });
      if (!channels.includes('slack')) {
        setChannels(prev => [...prev, 'slack']);
      }
      setSavedSlack(true);
      setTimeout(() => setSavedSlack(false), 2000);
    } catch {
      // handle error
    } finally {
      setSavingSlack(false);
    }
  };

  const handleTestSlack = async () => {
    if (!slackWebhookUrl || !session) return;
    setTestingSlack(true);
    setSlackTestResult(null);
    try {
      const token = await session.getToken();
      if (!token) throw new Error('No session token');
      await callEdgeFunction('send-slack', {
        method: 'POST',
        token,
        body: {
          webhookUrl: slackWebhookUrl,
          text: 'Council Watch NYC — Test notification. Your Slack integration is working!',
        },
      });
      setSlackTestResult('success');
      setTimeout(() => setSlackTestResult(null), 3000);
    } catch {
      setSlackTestResult('error');
      setTimeout(() => setSlackTestResult(null), 3000);
    } finally {
      setTestingSlack(false);
    }
  };

  const ChannelToggle = ({ channel, label, enabled }: { channel: string; label: string; enabled: boolean }) => (
    <button
      onClick={() => toggleChannel(channel)}
      className={`relative w-12 h-6 border-editorial rounded-none flex items-center transition-colors ${enabled ? 'bg-black' : 'bg-white'}`}
      aria-label={`Toggle ${label}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 transition-transform duration-200 ${enabled ? 'translate-x-[26px] bg-white' : 'translate-x-0.5 bg-black'}`} />
    </button>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      <div className="flex items-center justify-between border-b-editorial pb-4 mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-black" />
          <h2 className="font-editorial text-3xl font-bold text-black">Alert Channels</h2>
        </div>
      </div>

      <ProGate feature="Alert Channels" flag="canReceiveAlerts">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-black" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Email Channel */}
            <div className="bg-white border-editorial p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-black" />
                  <div>
                    <p className="font-bold text-sm text-black">Email</p>
                    <p className="text-xs text-slate-500">Receive digest emails for watched items</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${channels.includes('email') ? 'text-green-700' : 'text-slate-400'}`}>
                    {channels.includes('email') ? 'Active' : 'Off'}
                  </span>
                  <ChannelToggle channel="email" label="Email" enabled={channels.includes('email')} />
                </div>
              </div>
            </div>

            {/* SMS Channel */}
            <div className="bg-white border-editorial p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-black" />
                  <div>
                    <p className="font-bold text-sm text-black">SMS</p>
                    <p className="text-xs text-slate-500">Get text message alerts for urgent updates</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${channels.includes('sms') ? 'text-green-700' : 'text-slate-400'}`}>
                    {channels.includes('sms') ? 'Active' : 'Off'}
                  </span>
                  <ChannelToggle channel="sms" label="SMS" enabled={channels.includes('sms')} />
                </div>
              </div>

              {channels.includes('sms') && (
                <div className="space-y-3 pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Phone Number</p>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={e => handlePhoneChange(e.target.value)}
                    placeholder="(212) 555-0123"
                    className="w-full px-4 py-3 border-editorial text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <button
                    onClick={handleSaveSms}
                    disabled={savingSms || phoneNumber.replace(/\D/g, '').length < 10}
                    className="w-full py-3 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    {savingSms ? 'Saving...' : savedSms ? 'Saved!' : 'Save SMS Settings'}
                  </button>
                </div>
              )}
            </div>

            {/* Slack Channel */}
            <div className="bg-white border-editorial p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Hash className="w-5 h-5 text-black" />
                  <div>
                    <p className="font-bold text-sm text-black">Slack</p>
                    <p className="text-xs text-slate-500">Send notifications to a Slack channel</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${channels.includes('slack') ? 'text-green-700' : 'text-slate-400'}`}>
                    {channels.includes('slack') ? 'Active' : 'Off'}
                  </span>
                  <ChannelToggle channel="slack" label="Slack" enabled={channels.includes('slack')} />
                </div>
              </div>

              {channels.includes('slack') && (
                <div className="space-y-3 pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Webhook URL</p>
                  <input
                    type="url"
                    value={slackWebhookUrl}
                    onChange={e => setSlackWebhookUrl(e.target.value)}
                    placeholder="https://hooks.slack.com/services/T.../B.../..."
                    className="w-full px-4 py-3 border-editorial text-sm focus:outline-none focus:ring-2 focus:ring-black font-mono text-xs"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleTestSlack}
                      disabled={testingSlack || !slackWebhookUrl}
                      className="flex-1 py-3 border-editorial bg-white text-black font-bold uppercase tracking-widest text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      {testingSlack ? 'Testing...' : 'Test'}
                    </button>
                    <button
                      onClick={handleSaveSlack}
                      disabled={savingSlack || !slackWebhookUrl}
                      className="flex-1 py-3 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                      {savingSlack ? 'Saving...' : savedSlack ? 'Saved!' : 'Save'}
                    </button>
                  </div>
                  {slackTestResult === 'success' && (
                    <div className="flex items-center gap-2 text-green-700 text-xs">
                      <CheckCircle className="w-4 h-4" />
                      <span>Test message sent successfully</span>
                    </div>
                  )}
                  {slackTestResult === 'error' && (
                    <div className="flex items-center gap-2 text-red-700 text-xs">
                      <AlertCircle className="w-4 h-4" />
                      <span>Failed to send test message. Check your webhook URL.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </ProGate>
    </motion.div>
  );
}
