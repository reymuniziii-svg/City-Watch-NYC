import React, { useState } from 'react';
import { Mail, Share2, MessageCircle, Twitter, Check, Loader2, MapPin, Copy, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMyCM } from '../hooks/useMyCM';

interface CivicActionCenterProps {
  billNumber: string;
  billTitle: string;
  billStatus: string;
}

function getBillUrl(billNumber: string): string {
  const url = new URL(window.location.href);
  url.pathname = '/bills';
  url.search = '';
  url.searchParams.set('q', billNumber);
  return url.toString();
}

function getSupportTemplate(billNumber: string, billTitle: string, cmName: string): { subject: string; body: string } {
  return {
    subject: `Support ${billNumber}: ${billTitle}`,
    body: `Dear Council Member ${cmName},

I am writing to urge you to support ${billNumber} — "${billTitle}".

As a constituent, I believe this legislation is important for our community and I ask you to vote in favor of it.

Thank you for your service to our district.

Sincerely,
[Your Name]
[Your Address]`,
  };
}

function getOpposeTemplate(billNumber: string, billTitle: string, cmName: string): { subject: string; body: string } {
  return {
    subject: `Oppose ${billNumber}: ${billTitle}`,
    body: `Dear Council Member ${cmName},

I am writing to urge you to oppose ${billNumber} — "${billTitle}".

As a constituent, I have serious concerns about this legislation and ask that you vote against it.

Thank you for considering my views.

Sincerely,
[Your Name]
[Your Address]`,
  };
}

export default function CivicActionCenter({ billNumber, billTitle, billStatus }: CivicActionCenterProps) {
  const [activeTab, setActiveTab] = useState<'contact' | 'share'>('contact');
  const [stance, setStance] = useState<'support' | 'oppose'>('support');
  const [addressInput, setAddressInput] = useState('');
  const [clipboardCopied, setClipboardCopied] = useState(false);
  const { cmInfo, isResolving, resolveError, inlineResolve, clearCM } = useMyCM();

  const billUrl = getBillUrl(billNumber);
  const cmName = cmInfo?.fullName ?? 'your council member';
  const template = stance === 'support'
    ? getSupportTemplate(billNumber, billTitle, cmName)
    : getOpposeTemplate(billNumber, billTitle, cmName);

  const handleResolveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addressInput.trim().length < 3) return;
    await inlineResolve(addressInput.trim());
  };

  const handleSendEmail = () => {
    if (!cmInfo?.email) return;
    const mailto = `mailto:${cmInfo.email}?subject=${encodeURIComponent(template.subject)}&body=${encodeURIComponent(template.body)}`;
    window.open(mailto, '_blank');
  };

  const shareText = `NYC Council Bill ${billNumber}: ${billTitle} — Status: ${billStatus}. Learn more:`;

  const handleWhatsApp = () => {
    const text = `${shareText} ${billUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleTwitter = () => {
    const text = `${shareText}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(billUrl)}`, '_blank');
  };

  const handleInstagramCopy = async () => {
    const card = `NYC Council Bill ${billNumber}\n${billTitle}\n\nStatus: ${billStatus}\n\nLearn more at: ${billUrl}`;
    try {
      await navigator.clipboard.writeText(card);
      setClipboardCopied(true);
      setTimeout(() => setClipboardCopied(false), 2500);
    } catch {
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: `NYC Bill ${billNumber}`,
        text: `${shareText}`,
        url: billUrl,
      });
    } catch {
    }
  };

  const hasWebShare = typeof navigator !== 'undefined' && 'share' in navigator;

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-0">
        <button
          onClick={() => setActiveTab('contact')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors -mb-px ${
            activeTab === 'contact'
              ? 'border-black text-black'
              : 'border-transparent text-slate-500 hover:text-black'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          Contact
        </button>
        <button
          onClick={() => setActiveTab('share')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors -mb-px ${
            activeTab === 'share'
              ? 'border-black text-black'
              : 'border-transparent text-slate-500 hover:text-black'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          Share
        </button>
      </div>

      {activeTab === 'contact' && (
        <div className="mt-6">
          {!cmInfo ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-slate-400" />
                <p className="text-sm text-slate-600">
                  Enter your NYC address to find your council member and send them an email about this bill.
                </p>
              </div>
              <form onSubmit={handleResolveAddress} className="flex gap-2">
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="e.g. 123 Main St, Brooklyn, NY"
                  className="flex-1 px-4 py-2.5 border-editorial text-sm focus:ring-1 focus:ring-black focus:outline-none"
                  disabled={isResolving}
                />
                <button
                  type="submit"
                  disabled={isResolving || addressInput.trim().length < 3}
                  className="px-5 py-2.5 bg-black text-white font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isResolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {isResolving ? 'Finding...' : 'Find'}
                </button>
              </form>
              {resolveError && (
                <p className="mt-2 text-xs text-red-600">{resolveError}</p>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-5 p-4 bg-white border border-slate-200">
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Your Council Member · District {cmInfo.district}</p>
                    <p className="text-sm font-bold text-black">{cmInfo.fullName}</p>
                    <p className="text-xs text-slate-500">{cmInfo.email}</p>
                  </div>
                </div>
                <button
                  onClick={clearCM}
                  className="text-xs text-slate-400 hover:text-black underline underline-offset-2 transition-colors"
                >
                  Edit address
                </button>
              </div>

              <div className="flex gap-2 mb-5">
                <button
                  onClick={() => setStance('support')}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest border transition-colors ${
                    stance === 'support'
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'bg-white border-slate-300 text-slate-600 hover:border-green-600 hover:text-green-700'
                  }`}
                >
                  Support
                </button>
                <button
                  onClick={() => setStance('oppose')}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest border transition-colors ${
                    stance === 'oppose'
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'bg-white border-slate-300 text-slate-600 hover:border-red-600 hover:text-red-700'
                  }`}
                >
                  Oppose
                </button>
              </div>

              <div className="bg-white border border-slate-200 p-4 mb-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Email Preview</p>
                <p className="text-xs font-bold text-slate-700 mb-1">Subject: {template.subject}</p>
                <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">{template.body}</pre>
              </div>

              {cmInfo.email ? (
                <button
                  onClick={handleSendEmail}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-black text-white font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Send Email
                </button>
              ) : (
                <p className="text-xs text-slate-500 text-center">No email available for this council member.</p>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'share' && (
        <div className="mt-6 space-y-3 relative">
          <AnimatePresence>
            {clipboardCopied && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-10 flex items-center gap-2 px-4 py-2.5 bg-black text-white text-xs font-bold uppercase tracking-widest whitespace-nowrap shadow-lg"
                role="status"
                aria-live="polite"
              >
                <Check className="w-3.5 h-3.5 text-green-400" />
                Copied to clipboard!
              </motion.div>
            )}
          </AnimatePresence>

          {hasWebShare && (
            <button
              onClick={handleNativeShare}
              className="w-full flex items-center gap-3 px-5 py-3.5 border-editorial bg-black text-white font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          )}

          <button
            onClick={handleWhatsApp}
            className="w-full flex items-center gap-3 px-5 py-3.5 border border-slate-200 bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-green-600" />
            Share on WhatsApp
          </button>

          <button
            onClick={handleTwitter}
            className="w-full flex items-center gap-3 px-5 py-3.5 border border-slate-200 bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors"
          >
            <Twitter className="w-4 h-4" />
            Share on X / Twitter
          </button>

          <button
            onClick={handleInstagramCopy}
            className="w-full flex items-center gap-3 px-5 py-3.5 border border-slate-200 bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors"
          >
            <Copy className="w-4 h-4 text-pink-600" />
            Copy for Instagram
          </button>

          <p className="text-[10px] text-slate-400 text-center pt-1">
            Instagram doesn't support direct web sharing — paste the copied text in your caption.
          </p>
        </div>
      )}
    </div>
  );
}
