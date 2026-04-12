import React from 'react';
import { motion } from 'motion/react';
import { Thermometer, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';

export interface HearingSentimentData {
  overall: 'supportive' | 'hostile' | 'mixed' | 'neutral';
  score: number;
  speakerStances: {
    speaker: string;
    stance: 'supportive' | 'critical' | 'neutral' | 'mixed';
    quote: string;
  }[];
}

const OVERALL_COLORS: Record<string, string> = {
  supportive: 'bg-green-100 text-green-800',
  hostile: 'bg-red-100 text-red-800',
  mixed: 'bg-amber-100 text-amber-800',
  neutral: 'bg-slate-100 text-slate-700',
};

const OVERALL_LABELS: Record<string, string> = {
  supportive: 'Supportive',
  hostile: 'Hostile',
  mixed: 'Mixed',
  neutral: 'Neutral',
};

const STANCE_COLORS: Record<string, string> = {
  supportive: 'bg-green-50 text-green-700 border-green-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
  neutral: 'bg-slate-50 text-slate-600 border-slate-200',
  mixed: 'bg-amber-50 text-amber-700 border-amber-200',
};

function SentimentIcon({ overall }: { overall: string }) {
  if (overall === 'supportive') return <ThumbsUp className="w-3 h-3" />;
  if (overall === 'hostile') return <ThumbsDown className="w-3 h-3" />;
  return <Minus className="w-3 h-3" />;
}

interface HearingSentimentProps {
  sentiment: HearingSentimentData | null;
}

export default function HearingSentiment({ sentiment }: HearingSentimentProps) {
  if (!sentiment) return null;

  // Convert score from [-1, 1] to percentage [0, 100] for marker position
  const markerPosition = ((sentiment.score + 1) / 2) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-3">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Sentiment
        </h4>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${OVERALL_COLORS[sentiment.overall] ?? OVERALL_COLORS.neutral}`}
        >
          <SentimentIcon overall={sentiment.overall} />
          {OVERALL_LABELS[sentiment.overall] ?? 'Neutral'}
        </span>
      </div>

      {/* Temperature bar */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Thermometer className="w-3 h-3 text-slate-400 shrink-0" />
          <div className="relative flex-1 h-2 rounded-full bg-gradient-to-r from-red-300 via-slate-200 to-green-300">
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-black border-2 border-white shadow"
              style={{ left: `${markerPosition}%` }}
            />
          </div>
        </div>
        <div className="flex justify-between text-[9px] text-slate-400 uppercase tracking-widest pl-5">
          <span>Hostile</span>
          <span>Neutral</span>
          <span>Supportive</span>
        </div>
      </div>

      {/* Speaker stance chips */}
      {sentiment.speakerStances.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {sentiment.speakerStances.map((s, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1 px-2 py-0.5 border rounded text-[10px] font-bold tracking-wide ${STANCE_COLORS[s.stance] ?? STANCE_COLORS.neutral}`}
              title={s.quote}
            >
              {s.speaker}
              <span className="opacity-60">({s.stance})</span>
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
