import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ExternalLink } from 'lucide-react';

export type Classification = 'Opportunity' | 'Threat' | 'Conflict' | 'Neutral';

interface ImpactResultCardProps {
  billId: string;
  introNumber: string;
  title: string;
  classification: Classification;
  reasoning: string;
  confidence: number;
}

const BADGE_COLORS: Record<Classification, string> = {
  Opportunity: 'bg-green-100 text-green-800 border-green-200',
  Threat: 'bg-red-100 text-red-800 border-red-200',
  Conflict: 'bg-amber-100 text-amber-800 border-amber-200',
  Neutral: 'bg-slate-100 text-slate-600 border-slate-200',
};

const BAR_COLORS: Record<Classification, string> = {
  Opportunity: 'bg-green-500',
  Threat: 'bg-red-500',
  Conflict: 'bg-amber-500',
  Neutral: 'bg-slate-400',
};

export default function ImpactResultCard({
  introNumber,
  title,
  classification,
  reasoning,
  confidence,
}: ImpactResultCardProps) {
  const clampedConfidence = Math.min(100, Math.max(0, confidence));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border-editorial p-5 space-y-3"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Link
            to={`/bills?q=${encodeURIComponent(introNumber)}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-black hover:text-slate-600 transition-colors group"
          >
            <span className="uppercase tracking-widest">{introNumber}</span>
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <p className="text-sm text-slate-700 mt-1 line-clamp-2">{title}</p>
        </div>
        <span className={`shrink-0 px-3 py-1 text-xs font-bold uppercase tracking-widest border ${BADGE_COLORS[classification]}`}>
          {classification}
        </span>
      </div>

      {/* Reasoning */}
      <p className="text-sm text-slate-600 leading-relaxed">{reasoning}</p>

      {/* Confidence bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Confidence</span>
          <span className="text-xs font-bold text-slate-700">{clampedConfidence}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 w-full">
          <div
            className={`h-full transition-all duration-500 ${BAR_COLORS[classification]}`}
            style={{ width: `${clampedConfidence}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
}
