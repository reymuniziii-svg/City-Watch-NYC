import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Phone, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { getKitBySlug, trackInteraction } from '../services/actionKitService';
import type { ActionKit } from '../services/actionKitService';
import { fetchBills } from '../services/nycDataService';
import type { Bill } from '../types';

const NYC_COUNCIL_SWITCHBOARD = '212-788-7100';

function getStatusColor(status: string): string {
  const s = status.toLowerCase();
  if (s.includes('enacted') || s.includes('adopted')) return 'bg-green-100 text-green-800';
  if (s.includes('committee') || s.includes('introduced')) return 'bg-blue-100 text-blue-800';
  if (s.includes('hearing') || s.includes('laid over')) return 'bg-amber-100 text-amber-800';
  return 'bg-slate-100 text-slate-700';
}

function getSupportTemplate(billNumber: string, billTitle: string): { subject: string; body: string } {
  return {
    subject: `Support ${billNumber}: ${billTitle}`,
    body: `Dear Council Member,

I am writing to urge you to support ${billNumber} — "${billTitle}".

As a constituent, I believe this legislation is important for our community and I ask you to vote in favor of it.

Thank you for your service to our district.

Sincerely,
[Your Name]
[Your Address]`,
  };
}

function getCallScript(billNumber: string, billTitle: string): string {
  return `Hi, my name is [Your Name] and I'm calling to urge support for ${billNumber} — "${billTitle}". As a constituent, I believe this legislation is important for our community. Thank you for your time.`;
}

export default function ActionKitMicrosite() {
  const { slug } = useParams<{ slug: string }>();
  const [kit, setKit] = useState<ActionKit | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const viewTracked = useRef(false);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      const [kitData, allBills] = await Promise.all([
        getKitBySlug(slug!),
        fetchBills(),
      ]);

      if (cancelled) return;

      if (!kitData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setKit(kitData);

      const filterIds = new Set(kitData.bill_filter_ids);
      const matched = allBills.filter(
        (b) => filterIds.has(b.id) || filterIds.has(b.number) || (b.introNumber && filterIds.has(b.introNumber))
      );
      setBills(matched);
      setLoading(false);

      if (!viewTracked.current) {
        viewTracked.current = true;
        trackInteraction(kitData.id, 'view', document.referrer || undefined);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [slug]);

  const accentColor = (kit?.custom_branding?.primaryColor as string) || '#000000';
  const logoUrl = kit?.custom_branding?.logoUrl as string | undefined;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (notFound || !kit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-black uppercase tracking-tight text-black mb-2">
            Action Kit Not Found
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            This action kit may have been removed or is no longer published.
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-black text-white font-bold uppercase tracking-widest text-sm hover:bg-slate-800 transition-colors"
          >
            Go to Council Watch NYC
          </Link>
        </motion.div>
      </div>
    );
  }

  function handleEmailClick(bill: Bill) {
    const template = getSupportTemplate(bill.number, bill.title);
    const mailto = `mailto:?subject=${encodeURIComponent(template.subject)}&body=${encodeURIComponent(template.body)}`;
    window.open(mailto, '_blank');
    trackInteraction(kit!.id, 'email_click');
  }

  function handleCallClick() {
    trackInteraction(kit!.id, 'call_click');
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b-2 px-6 py-6"
        style={{ borderBottomColor: accentColor }}
      >
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          {logoUrl && (
            <img
              src={logoUrl}
              alt=""
              className="h-10 w-auto object-contain"
            />
          )}
          <div>
            <h1
              className="text-2xl font-black uppercase tracking-tight"
              style={{ color: accentColor }}
            >
              {kit.name}
            </h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">
              Action Kit
            </p>
          </div>
        </div>
      </motion.header>

      {/* Bill Cards */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        {bills.length === 0 ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-slate-500 text-center py-12"
          >
            No bills are currently associated with this action kit.
          </motion.p>
        ) : (
          <div className="space-y-6">
            {bills.map((bill, index) => (
              <motion.article
                key={bill.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className="border border-slate-200 bg-white"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        {bill.number}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${getStatusColor(bill.status)}`}
                      >
                        {bill.status}
                      </span>
                    </div>
                  </div>

                  <h2 className="text-base font-bold text-black leading-snug mb-2">
                    {bill.title}
                  </h2>

                  {bill.summary && (
                    <p className="text-sm text-slate-600 leading-relaxed mb-5">
                      {bill.summary}
                    </p>
                  )}

                  {/* CTA Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    {(kit.cta_type === 'email' || kit.cta_type === 'both') && (
                      <button
                        onClick={() => handleEmailClick(bill)}
                        className="flex items-center justify-center gap-2 px-5 py-3 font-bold text-sm uppercase tracking-widest text-white transition-colors"
                        style={{ backgroundColor: accentColor }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                      >
                        <Mail className="w-4 h-4" />
                        Email Your Rep
                      </button>
                    )}

                    {(kit.cta_type === 'call' || kit.cta_type === 'both') && (
                      <a
                        href={`tel:${NYC_COUNCIL_SWITCHBOARD}`}
                        onClick={handleCallClick}
                        className="flex items-center justify-center gap-2 px-5 py-3 border-2 font-bold text-sm uppercase tracking-widest transition-colors"
                        style={{
                          borderColor: accentColor,
                          color: accentColor,
                        }}
                      >
                        <Phone className="w-4 h-4" />
                        Call {NYC_COUNCIL_SWITCHBOARD}
                      </a>
                    )}
                  </div>

                  {/* Call Script */}
                  {(kit.cta_type === 'call' || kit.cta_type === 'both') && (
                    <div className="mt-4 p-4 bg-slate-50 border border-slate-200">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                        Call Script
                      </p>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {getCallScript(bill.number, bill.title)}
                      </p>
                    </div>
                  )}
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 mt-8">
        <div className="max-w-3xl mx-auto px-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <span>Powered by</span>
          <Link
            to="/"
            className="inline-flex items-center gap-1 font-bold text-black hover:text-slate-600 transition-colors uppercase tracking-widest"
          >
            Council Watch NYC
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
