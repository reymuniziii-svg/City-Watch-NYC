import { useState, useEffect, useMemo } from 'react';
import { Loader2, X } from 'lucide-react';
import { motion } from 'motion/react';
import ProGate from './ProGate';
import type { CommitteeHeatmapEntry } from '../lib/types';

/* ── constants ────────────────────────────────────────────── */

const INDUSTRY_COLORS: Record<string, string> = {
  'Real Estate': 'bg-amber-500',
  'Finance': 'bg-blue-500',
  'Legal': 'bg-purple-500',
  'Labor': 'bg-green-500',
  'Healthcare': 'bg-rose-500',
  'Education': 'bg-teal-500',
  'Nonprofit / Advocacy': 'bg-indigo-500',
  'Government / Public Sector': 'bg-slate-500',
  'Small Business / Retail': 'bg-orange-500',
  'Other / Mixed': 'bg-gray-400',
};

const INDUSTRY_BADGE_COLORS: Record<string, string> = {
  'Real Estate': 'bg-amber-100 text-amber-800',
  'Finance': 'bg-blue-100 text-blue-800',
  'Legal': 'bg-purple-100 text-purple-800',
  'Labor': 'bg-green-100 text-green-800',
  'Healthcare': 'bg-rose-100 text-rose-800',
  'Education': 'bg-teal-100 text-teal-800',
  'Nonprofit / Advocacy': 'bg-indigo-100 text-indigo-800',
  'Government / Public Sector': 'bg-slate-200 text-slate-700',
  'Small Business / Retail': 'bg-orange-100 text-orange-800',
  'Other / Mixed': 'bg-gray-100 text-gray-600',
};

function fmt$(value: number): string {
  return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0, minimumFractionDigits: 0 });
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url}`);
  return response.json();
}

/* ── main component ──────────────────────────────────────── */

interface ExpandedCell {
  committee: string;
  industry: string;
}

export default function CommitteeHeatmap() {
  const [data, setData] = useState<CommitteeHeatmapEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<ExpandedCell | null>(null);

  useEffect(() => {
    fetchJson<CommitteeHeatmapEntry[]>('/data/committee-industry-heatmap.json').then(
      (entries) => {
        setData(entries);
        setIsLoading(false);
      }
    );
  }, []);

  // Derive unique industries across all entries
  const industries = useMemo(() => {
    const set = new Set<string>();
    for (const entry of data) {
      for (const ind of entry.industries) {
        set.add(ind.industry);
      }
    }
    return Array.from(set).sort();
  }, [data]);

  // Max amount for opacity scaling
  const maxAmount = useMemo(() => {
    let max = 0;
    for (const entry of data) {
      for (const ind of entry.industries) {
        if (ind.totalAmount > max) max = ind.totalAmount;
      }
    }
    return max || 1;
  }, [data]);

  // Lookup map for quick cell access
  const cellMap = useMemo(() => {
    const map = new Map<string, CommitteeHeatmapEntry['industries'][number]>();
    for (const entry of data) {
      for (const ind of entry.industries) {
        map.set(`${entry.committee}::${ind.industry}`, ind);
      }
    }
    return map;
  }, [data]);

  function handleCellClick(committee: string, industry: string) {
    const cell = cellMap.get(`${committee}::${industry}`);
    if (!cell || cell.totalAmount === 0) return;
    setExpanded((prev) =>
      prev?.committee === committee && prev?.industry === industry ? null : { committee, industry }
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <ProGate feature="Committee Heatmap" flag="canViewCommitteeHeatmap">
      <section className="space-y-8">
        <div>
          <h2 className="font-editorial text-3xl font-bold text-black">
            Committee-Industry Heatmap
          </h2>
          <p className="mt-2 text-sm text-slate-500 uppercase tracking-widest font-bold">
            Funding intensity by committee and industry
          </p>
        </div>

        <div className="bg-white border-editorial overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr>
                <th className="px-3 py-3 text-left sticky left-0 bg-white z-10">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Committee
                  </span>
                </th>
                {industries.map((ind) => (
                  <th key={ind} className="px-2 py-3 text-center">
                    <span
                      className="text-[9px] font-bold uppercase tracking-widest text-slate-500 writing-vertical"
                      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                    >
                      {ind}
                    </span>
                  </th>
                ))}
                <th className="px-3 py-3 text-right">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Total
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((entry) => (
                <tr key={entry.committee} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-xs font-medium text-slate-700 sticky left-0 bg-white z-10 max-w-[200px] truncate">
                    {entry.committee}
                  </td>
                  {industries.map((ind) => {
                    const cell = cellMap.get(`${entry.committee}::${ind}`);
                    const amount = cell?.totalAmount ?? 0;
                    const opacity = Math.min(amount / maxAmount, 1);
                    const bgClass = INDUSTRY_COLORS[ind] ?? 'bg-gray-400';
                    const isExpanded =
                      expanded?.committee === entry.committee && expanded?.industry === ind;

                    return (
                      <td key={ind} className="px-1 py-1 text-center">
                        <button
                          onClick={() => handleCellClick(entry.committee, ind)}
                          className={`w-full h-8 transition-all ${
                            amount > 0 ? 'cursor-pointer hover:ring-2 hover:ring-black' : ''
                          } ${isExpanded ? 'ring-2 ring-black' : ''}`}
                          title={amount > 0 ? `${ind}: ${fmt$(amount)}` : 'No data'}
                        >
                          {amount > 0 && (
                            <div
                              className={`w-full h-full ${bgClass}`}
                              style={{ opacity: Math.max(opacity, 0.1) }}
                            />
                          )}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right">
                    <span className="text-xs font-bold text-slate-700 tabular-nums">
                      {fmt$(entry.totalFunding)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Expanded cell detail */}
        {expanded && (() => {
          const cell = cellMap.get(`${expanded.committee}::${expanded.industry}`);
          if (!cell) return null;
          const badgeClass = INDUSTRY_BADGE_COLORS[expanded.industry] ?? 'bg-gray-100 text-gray-600';
          return (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border-editorial p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                    {expanded.committee}
                  </p>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-none ${badgeClass}`}
                  >
                    {expanded.industry}
                  </span>
                </div>
                <button
                  onClick={() => setExpanded(null)}
                  className="p-1 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Total Amount
                  </p>
                  <p className="font-editorial text-2xl font-bold text-black">
                    {fmt$(cell.totalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Donors
                  </p>
                  <p className="font-editorial text-2xl font-bold text-black">{cell.donorCount}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Members
                  </p>
                  <p className="font-editorial text-2xl font-bold text-black">
                    {cell.memberCount}
                  </p>
                </div>
              </div>
              {cell.topMembers.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                    Top Recipients
                  </p>
                  <div className="space-y-1">
                    {cell.topMembers.map((m) => (
                      <div key={m.slug} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">{m.name}</span>
                        <span className="font-bold text-black tabular-nums">{fmt$(m.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })()}
      </section>
    </ProGate>
  );
}
