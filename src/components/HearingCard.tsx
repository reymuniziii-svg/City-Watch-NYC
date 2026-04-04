import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Sparkles, Loader2, ExternalLink, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Hearing } from '../types';
import { summarizeHearing } from '../services/geminiService';

const OUTCOME_LABELS: Record<string, string> = {
  action: 'Vote / Action',
  oversight: 'Oversight',
  testimony: 'Testimony',
  mixed: 'Mixed',
  unknown: 'Hearing',
};

const OUTCOME_COLORS: Record<string, string> = {
  action: 'bg-green-100 text-green-800',
  oversight: 'bg-blue-100 text-blue-800',
  testimony: 'bg-amber-100 text-amber-800',
  mixed: 'bg-purple-100 text-purple-800',
  unknown: 'bg-slate-100 text-slate-700',
};

export default function HearingCard({ hearing }: { hearing: Hearing }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [summary, setSummary] = useState<Hearing['summary'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isPast = hearing.isPast;
  const enrichment = hearing.enrichment;

  const handleSummarize = async () => {
    if (isPast) return;

    if (summary) {
      setIsExpanded(!isExpanded);
      return;
    }

    setIsLoading(true);
    try {
      const billsContext = hearing.bills.length > 0 ? hearing.bills.join(', ') : hearing.committee;
      const result = await summarizeHearing(hearing.title, billsContext, hearing.date);
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

  const handleTogglePastExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="bg-white border-editorial hover:bg-slate-50 transition-colors overflow-hidden">
      <div className="p-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 px-3 py-1 border-editorial text-black text-xs font-bold uppercase tracking-widest">
            <Calendar className="w-3 h-3" />
            <span>{hearing.date}</span>
          </div>
          <div className="flex items-center gap-2">
            {isPast && enrichment && (
              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${OUTCOME_COLORS[enrichment.outcomeType] ?? OUTCOME_COLORS.unknown}`}>
                {OUTCOME_LABELS[enrichment.outcomeType] ?? 'Hearing'}
              </span>
            )}
            <div className="px-3 py-1 bg-black text-white text-xs font-bold uppercase tracking-widest">
              {hearing.time}
            </div>
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
            {hearing.bills?.length > 0 ? `${hearing.bills.length} Bills on Agenda` : 'Oversight Hearing'}
          </div>

          {isPast ? (
            <button
              onClick={handleTogglePastExpand}
              className="flex items-center gap-2 px-5 py-2.5 border-editorial bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
            >
              <FileText className="w-4 h-4" />
              {enrichment ? (isExpanded ? 'Hide Summary' : 'View Summary') : 'No Transcript'}
            </button>
          ) : (
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
              {summary ? (isExpanded ? 'Hide Preview' : 'Show Preview') : 'Preview Hearing'}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-slate-50 border-t-editorial p-8"
          >
            {isPast ? (
              enrichment ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">What happened</h4>
                    <p className="text-black leading-relaxed text-sm">{enrichment.overview}</p>
                  </div>

                  {enrichment.takeaways.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Key Takeaways</h4>
                      <ul className="list-disc list-inside text-black text-sm space-y-2">
                        {enrichment.takeaways.map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {enrichment.quotes.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Key Quotes</h4>
                      <div className="space-y-4">
                        {enrichment.quotes.map((q, i) => (
                          <div key={i} className="border-l-2 border-black pl-4">
                            <blockquote className="text-slate-700 italic text-sm mb-1">"{q.quote}"</blockquote>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">— {q.speaker}</span>
                              <a
                                href={q.chapterUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-black hover:text-slate-600 uppercase tracking-widest underline"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Source
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {enrichment.cityMeetingsUrl && (
                    <div className="pt-2">
                      <a
                        href={enrichment.cityMeetingsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-bold text-black hover:text-slate-600 uppercase tracking-widest underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Full transcript on CityMeetings.nyc
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm font-medium">No transcript available for this hearing.</p>
                  <p className="text-slate-400 text-xs mt-1">A CityMeetings.nyc record could not be matched to this event.</p>
                </div>
              )
            ) : summary ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">What this hearing is about</h4>
                    <p className="text-black leading-relaxed text-sm">{summary.whatIsAbout}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">What to expect</h4>
                    <p className="text-black leading-relaxed text-sm">{summary.whatToExpect}</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Key things to watch</h4>
                    <ul className="list-disc list-inside text-black text-sm space-y-2">
                      {summary.takeaways?.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                  </div>
                  {summary.billsConsidered && summary.billsConsidered.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Bills being considered</h4>
                      <ul className="list-disc list-inside text-black text-sm space-y-2">
                        {summary.billsConsidered.map((b, i) => <li key={i}>{b}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
