import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Megaphone, Loader2, Send, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { getPublishedKitById, submitAction } from '../services/actionKitService';
import type { ActionKit } from '../services/actionKitService';

interface BillIndexEntry {
  billId: string;
  introNumber: string;
  title: string;
  summary: string;
  leadSponsorSlug: string;
  statusBucket: string;
  committee: string;
}

export default function ActionKitEmbed() {
  const { kitId } = useParams<{ kitId: string }>();

  const [kit, setKit] = useState<ActionKit | null>(null);
  const [bills, setBills] = useState<BillIndexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [zip, setZip] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const pageViewRecorded = useRef(false);

  // Load kit and bills
  useEffect(() => {
    if (!kitId) {
      setError('No action kit ID provided');
      setLoading(false);
      return;
    }

    Promise.all([
      getPublishedKitById(kitId),
      fetch('/data/bills-index.json')
        .then((r) => r.json())
        .catch(() => []),
    ])
      .then(([kitData, billsData]) => {
        if (!kitData) {
          setError('Action kit not found or not published');
          return;
        }
        setKit(kitData);
        setBills(billsData as BillIndexEntry[]);
      })
      .catch(() => setError('Failed to load action kit'))
      .finally(() => setLoading(false));
  }, [kitId]);

  // Record page view on mount
  useEffect(() => {
    if (!kit || pageViewRecorded.current) return;
    pageViewRecorded.current = true;
    submitAction({
      kitId: kit.id,
      actionType: 'page_view',
    }).catch(() => {
      // silently fail for page view tracking
    });
  }, [kit]);

  const kitBills = kit
    ? bills.filter((b) => kit.bill_numbers.includes(b.introNumber))
    : [];

  const buildMailtoLink = () => {
    const subject = encodeURIComponent(
      kit?.title ? `Regarding: ${kit.title}` : 'Message from a Constituent'
    );

    const billContext = kitBills
      .map((b) => `- ${b.introNumber}: ${b.title}`)
      .join('\n');

    const bodyParts: string[] = [];
    bodyParts.push('Dear Council Member,');
    bodyParts.push('');
    if (kit?.call_to_action) {
      bodyParts.push(kit.call_to_action);
      bodyParts.push('');
    }
    if (billContext) {
      bodyParts.push('This message is regarding the following legislation:');
      bodyParts.push(billContext);
      bodyParts.push('');
    }
    bodyParts.push(`As a resident of ZIP code ${zip || '[your zip]'}, I urge you to take action on this matter.`);
    bodyParts.push('');
    bodyParts.push('Sincerely,');
    bodyParts.push(name || '[Your Name]');

    const body = encodeURIComponent(bodyParts.join('\n'));
    return `mailto:?subject=${subject}&body=${body}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kit) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      // Record the submission
      await submitAction({
        kitId: kit.id,
        supporterName: name || undefined,
        supporterEmail: email || undefined,
        supporterZip: zip || undefined,
        actionType: 'email_sent',
      });

      // Open mailto link
      const mailto = buildMailtoLink();
      window.open(mailto, '_blank');

      setSubmitted(true);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('wait')) {
        setSubmitError('Please wait a few minutes before submitting again.');
      } else {
        setSubmitError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-black animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500">Loading action kit...</p>
        </div>
      </div>
    );
  }

  if (error || !kit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md px-6">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-4" />
          <h2 className="font-editorial text-2xl font-bold text-black mb-2">
            Kit Not Available
          </h2>
          <p className="text-sm text-slate-600">{error ?? 'This action kit could not be found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Kit Header */}
          <div>
            {kit.org_name && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                {kit.org_name}
              </p>
            )}
            <h1 className="font-editorial text-3xl md:text-4xl font-black text-black tracking-tighter leading-tight mb-3">
              {kit.title}
            </h1>
            {kit.description && (
              <p className="text-slate-600 leading-relaxed">{kit.description}</p>
            )}
          </div>

          {/* Bill Summaries */}
          {kitBills.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Related Legislation
              </p>
              {kitBills.map((bill) => (
                <div
                  key={bill.introNumber}
                  className="border-editorial p-4 bg-slate-50"
                >
                  <div className="flex items-start gap-3">
                    <span className="px-2 py-0.5 border-editorial text-[10px] font-bold uppercase tracking-widest bg-white shrink-0">
                      {bill.introNumber}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-black leading-snug">
                        {bill.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                        <span>{bill.statusBucket}</span>
                        {bill.committee && <span>{bill.committee}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Call to Action */}
          {kit.call_to_action && (
            <div className="border-l-4 border-black pl-4 py-2">
              <p className="text-sm font-medium text-black leading-relaxed">
                {kit.call_to_action}
              </p>
            </div>
          )}

          {/* Submission Form */}
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12 border-editorial bg-emerald-50"
            >
              <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto mb-4" />
              <h3 className="font-editorial text-xl font-bold text-black mb-2">
                Thank You!
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Your email client should have opened with a pre-filled message.
                If it did not, you can try again.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-black transition-colors underline"
              >
                Send Another Message
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Take Action
              </p>

              <div>
                <label
                  htmlFor="supporter-name"
                  className="block text-xs font-medium text-slate-600 mb-1"
                >
                  Your Name
                </label>
                <input
                  id="supporter-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-4 py-3 border-editorial text-sm focus:outline-none focus:ring-2 focus:ring-black placeholder:text-slate-400"
                />
              </div>

              <div>
                <label
                  htmlFor="supporter-email"
                  className="block text-xs font-medium text-slate-600 mb-1"
                >
                  Email Address
                </label>
                <input
                  id="supporter-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-3 border-editorial text-sm focus:outline-none focus:ring-2 focus:ring-black placeholder:text-slate-400"
                />
              </div>

              <div>
                <label
                  htmlFor="supporter-zip"
                  className="block text-xs font-medium text-slate-600 mb-1"
                >
                  ZIP Code
                </label>
                <input
                  id="supporter-zip"
                  type="text"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="10001"
                  pattern="[0-9]{5}"
                  maxLength={5}
                  className="w-full px-4 py-3 border-editorial text-sm focus:outline-none focus:ring-2 focus:ring-black placeholder:text-slate-400"
                />
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !email}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                Email Your Council Member
              </button>
            </form>
          )}

          {/* Footer */}
          <div className="pt-6 border-t border-slate-200">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <Megaphone className="w-3 h-3" />
              <span>Powered by City Watch NYC</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
