import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
import type { ConflictAlert } from '../lib/types';
import { INDUSTRY_COLORS } from './shared/IndustryBadge';

function getDeltaColor(days: number): string {
  const abs = Math.abs(days);
  if (abs < 7) return 'bg-red-100 text-red-800';
  if (abs < 14) return 'bg-orange-100 text-orange-800';
  if (abs < 30) return 'bg-yellow-100 text-yellow-800';
  return 'bg-slate-100 text-slate-600';
}

function fmt$(value: number): string {
  return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

interface ConflictAlertCardProps {
  alert: ConflictAlert;
  index: number;
}

export default function ConflictAlertCard({ alert, index }: ConflictAlertCardProps) {
  const industryCls = INDUSTRY_COLORS[alert.donorIndustry] ?? 'bg-gray-100 text-gray-600';
  const deltaCls = getDeltaColor(alert.daysDelta);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.8) }}
      className="border-editorial bg-white p-5 space-y-3"
    >
      {/* Member + delta badge row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Council Member</p>
          <Link
            to={`/members/${alert.memberSlug}`}
            className="font-semibold text-black text-sm hover:underline"
          >
            {alert.memberName}
          </Link>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest shrink-0 ${deltaCls}`}>
          <AlertTriangle className="w-3 h-3" />
          {Math.abs(alert.daysDelta)}d
        </span>
      </div>

      {/* Donor + industry */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Donor</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-700 font-medium">{alert.donorName}</span>
          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${industryCls}`}>
            {alert.donorIndustry}
          </span>
        </div>
      </div>

      {/* Donation amount */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Donation</p>
        <span className="font-editorial font-bold text-lg text-black">{fmt$(alert.donationAmount)}</span>
        <span className="text-xs text-slate-400 ml-2">{alert.donationDate}</span>
      </div>

      {/* Bill info */}
      <div className="border-t border-slate-100 pt-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Related Bill</p>
        <p className="text-sm text-slate-700">
          <span className="font-bold text-slate-500">{alert.billIntroNumber}</span>
          {' --- '}
          {alert.billTitle}
        </p>
        <p className="text-xs text-slate-400 mt-1">Introduced {alert.billIntroDate}</p>
      </div>
    </motion.div>
  );
}
