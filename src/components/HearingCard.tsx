import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Hearing } from '../types';
import { summarizeHearing } from '../services/geminiService';

export default function HearingCard({ hearing }: { hearing: Hearing }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [summary, setSummary] = useState<Hearing['summary'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSummarize = async () => {
    if (summary) {
      setIsExpanded(!isExpanded);
      return;
    }

    setIsLoading(true);
    try {
      const result = await summarizeHearing(hearing.title, hearing.committee);
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
    <div className="bg-white border-editorial hover:bg-slate-50 transition-colors overflow-hidden">
      <div className="p-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 px-3 py-1 border-editorial text-black text-xs font-bold uppercase tracking-widest">
            <Calendar className="w-3 h-3" />
            <span>{hearing.date}</span>
          </div>
          <div className="px-3 py-1 bg-black text-white text-xs font-bold uppercase tracking-widest">
            {hearing.time}
          </div>
        </div>

        <h3 className="font-editorial text-2xl font-bold text-black mb-4 leading-snug">
          {hearing.title}
        </h3>
        
        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-2 text-slate-600 text-sm">
            <MapPin className="w-4 h-4" />
            <span>{hearing.location}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 text-sm">
            <Clock className="w-4 h-4" />
            <span>Committee on {hearing.committee}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-6 border-t-editorial">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            {hearing.bills?.length > 0 ? `${hearing.bills.length} Bills Discussed` : 'Oversight Hearing'}
          </div>
          
          <button 
            onClick={handleSummarize}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 border-editorial bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {summary ? (isExpanded ? 'Hide Summary' : 'Show Summary') : 'Explain Hearing'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && summary && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-slate-50 border-t-editorial p-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">What happened</h4>
                  <p className="text-black leading-relaxed text-sm">{summary.whatHappened}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Action Type</h4>
                  <p className="text-black leading-relaxed text-sm">{summary.actionType}</p>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Main Takeaways</h4>
                  <ul className="list-disc list-inside text-black text-sm space-y-2">
                    {summary.takeaways.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Key Quotes</h4>
                  <div className="space-y-3">
                    {summary.keyQuotes.map((q, i) => (
                      <blockquote key={i} className="text-slate-600 italic text-sm border-l-2 border-black pl-3">
                        "{q}"
                      </blockquote>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
