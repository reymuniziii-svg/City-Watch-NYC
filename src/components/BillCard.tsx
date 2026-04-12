import React, { useState } from 'react';
import { FileText, Sparkles, Loader2, Share2, Check, Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Bill } from '../types';
import { summarizeBill } from '../services/geminiService';
import CivicActionCenter from './CivicActionCenter';
import SourceContext from './SourceContext';
import WatchButton from './WatchButton';

type OpenPanel = 'none' | 'summary' | 'action';

export default function BillCard({ bill }: { bill: Bill }) {
  const [openPanel, setOpenPanel] = useState<OpenPanel>('none');
  const [summary, setSummary] = useState<Bill['plainEnglishSummary'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      const url = new URL(window.location.href);
      url.pathname = '/bills';
      url.searchParams.set('q', bill.number);
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleSummarize = async () => {
    if (summary) {
      setOpenPanel(prev => prev === 'summary' ? 'none' : 'summary');
      return;
    }

    setOpenPanel('summary');
    setIsLoading(true);
    try {
      const result = await summarizeBill(bill.title, bill.summary);
      if (result) {
        setSummary(result);
        setOpenPanel(prev => prev === 'summary' ? 'summary' : prev);
      } else {
        setOpenPanel(prev => prev === 'summary' ? 'none' : prev);
      }
    } catch (error) {
      console.error('Summarization error:', error);
      setOpenPanel(prev => prev === 'summary' ? 'none' : prev);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAction = () => {
    setOpenPanel(prev => prev === 'action' ? 'none' : 'action');
  };

  const isActionOpen = openPanel === 'action';
  const isSummaryOpen = openPanel === 'summary' && summary != null;

  return (
    <div className="bg-white border-editorial hover:bg-slate-50 transition-colors overflow-hidden">
      <div className="p-4 md:p-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 px-3 py-1 border-editorial text-black text-xs font-bold uppercase tracking-widest">
            <FileText className="w-3 h-3" />
            <span>{bill.number}</span>
          </div>
          <div className="px-3 py-1 bg-black text-white text-xs font-bold uppercase tracking-widest">
            {bill.status}
          </div>
        </div>

        <h3 className="font-editorial text-2xl font-bold text-black mb-4 leading-snug">
          {bill.title}
        </h3>
        
        <p className="text-slate-600 text-sm leading-relaxed mb-8 line-clamp-3">
          {bill.summary}
        </p>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between pt-6 border-t-editorial gap-3">
          <div className="flex -space-x-2">
            {bill.sponsors?.slice(0, 3).map((sponsor, i) => (
              <div 
                key={i} 
                className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-black"
                title={sponsor}
              >
                {sponsor ? sponsor.split(' ').map(n => n[0]).join('').substring(0, 2) : '?'}
              </div>
            ))}
            {bill.sponsors?.length > 3 && (
              <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                +{bill.sponsors.length - 3}
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <WatchButton itemType="bill" itemValue={bill.number} itemLabel={bill.title} />
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2.5 text-slate-500 hover:text-black active:scale-95 transition-all font-bold text-xs uppercase tracking-widest"
              title="Share Bill"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button
              onClick={handleToggleAction}
              className={`flex items-center gap-2 px-5 py-2.5 border-editorial font-bold text-xs uppercase tracking-widest active:scale-95 transition-all ${
                isActionOpen
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-black hover:text-white'
              }`}
            >
              <Megaphone className="w-4 h-4" />
              Take Action
            </button>
            <button 
              onClick={handleSummarize}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 border-editorial bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-black hover:text-white active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {summary ? (isSummaryOpen ? 'Hide Summary' : 'Show Summary') : 'Translate to Plain English'}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isActionOpen && (
          <motion.div
            key="action"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden bg-slate-50 border-t-editorial"
          >
            <CivicActionCenter
              billNumber={bill.number}
              billTitle={bill.title}
              billStatus={bill.status}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSummaryOpen && (
          <motion.div
            key="summary"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden bg-slate-50 border-t-editorial"
          >
            <div className="p-4 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">What it would do</h4>
                    <p className="text-black leading-relaxed text-sm">{summary.whatItDoes}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Who it affects</h4>
                    <p className="text-black leading-relaxed text-sm">{summary.whoItAffects}</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Why it matters</h4>
                    <p className="text-black leading-relaxed text-sm">{summary.whyItMatters}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">What happens next</h4>
                    <p className="text-black leading-relaxed text-sm">{summary.whatHappensNext}</p>
                  </div>
                </div>
              </div>

              <SourceContext context={summary?.sourceContext} />

              <div className="mt-8 pt-8 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-6">
                  <h4 className="font-editorial text-xl font-bold text-black">Lobbying Insights</h4>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-widest rounded-sm">Beta</span>
                </div>
                
                <div className="bg-white p-6 border border-slate-200">
                  <p className="text-sm text-slate-600 mb-4">
                    Real-time lobbying data integration is currently being mapped from the NYC City Clerk's database. Once connected, this section will display:
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                      <span className="text-sm text-slate-700"><strong>Top Organizations:</strong> Which groups are spending the most money to influence this specific bill.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0"></div>
                      <span className="text-sm text-slate-700"><strong>For vs. Against:</strong> A breakdown of which industries support the bill and which are fighting it.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0"></div>
                      <span className="text-sm text-slate-700"><strong>Lobbying Firms:</strong> The specific lobbying firms hired to advocate on this legislation.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
