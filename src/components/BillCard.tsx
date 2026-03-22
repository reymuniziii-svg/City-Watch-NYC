import React, { useState } from 'react';
import { FileText, ArrowRight, Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Bill } from '../types';
import { summarizeBill } from '../services/geminiService';

export default function BillCard({ bill }: { bill: Bill }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [summary, setSummary] = useState<Bill['plainEnglishSummary'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSummarize = async () => {
    if (summary) {
      setIsExpanded(!isExpanded);
      return;
    }

    setIsLoading(true);
    try {
      const result = await summarizeBill(bill.title, bill.summary);
      if (result) {
        setSummary(result);
        setIsExpanded(true);
      }
    } catch (error) {
      console.error('Summarization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-md transition-all overflow-hidden">
      <div className="p-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 px-3 py-1 rounded-full bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider">
            <FileText className="w-3 h-3" />
            <span>{bill.number}</span>
          </div>
          <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider">
            {bill.status}
          </div>
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-4 leading-snug">
          {bill.title}
        </h3>
        
        <p className="text-slate-500 text-sm leading-relaxed mb-8 line-clamp-3">
          {bill.summary}
        </p>

        <div className="flex items-center justify-between pt-6 border-t border-slate-50">
          <div className="flex -space-x-2">
            {bill.sponsors?.slice(0, 3).map((sponsor, i) => (
              <div 
                key={i} 
                className="w-8 h-8 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-emerald-700"
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
          
          <button 
            onClick={handleSummarize}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {summary ? (isExpanded ? 'Hide Summary' : 'Show Summary') : 'Translate to Plain English'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && summary && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-emerald-50/50 border-t border-emerald-100 p-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-2">What it would do</h4>
                  <p className="text-slate-700 leading-relaxed text-sm">{summary.whatItDoes}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-2">Who it affects</h4>
                  <p className="text-slate-700 leading-relaxed text-sm">{summary.whoItAffects}</p>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-2">Why it matters</h4>
                  <p className="text-slate-700 leading-relaxed text-sm">{summary.whyItMatters}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-2">What happens next</h4>
                  <p className="text-slate-700 leading-relaxed text-sm">{summary.whatHappensNext}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
