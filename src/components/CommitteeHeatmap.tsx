import { useState, useEffect } from 'react';
import { fetchCommitteeHeatmap } from '../services/nycDataService';
import type { CommitteeHeatmapEntry, CommitteeIndustryCell } from '../lib/types';

const TARGET_INDUSTRIES = ['Real Estate', 'Finance', 'Labor', 'Healthcare', 'Education'];

function formatAmount(value: number): string {
  if (value >= 1_000_000) return '$' + (value / 1_000_000).toFixed(1) + 'M';
  if (value >= 1_000) return '$' + Math.round(value / 1_000) + 'k';
  return '$' + Math.round(value).toLocaleString();
}

function cellOpacity(amount: number, max: number): number {
  if (max === 0) return 0;
  return Math.max(0.05, amount / max);
}

export default function CommitteeHeatmap() {
  const [data, setData] = useState<CommitteeHeatmapEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetchCommitteeHeatmap().then((entries) => {
      setData(entries);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <section className="border-editorial bg-white p-8">
        <p className="text-sm text-slate-500">Loading committee heatmap...</p>
      </section>
    );
  }

  if (data.length === 0) return null;

  // Find the global max for opacity scaling
  let globalMax = 0;
  for (const row of data) {
    for (const cell of row.industries) {
      if (cell.totalAmount > globalMax) globalMax = cell.totalAmount;
    }
  }

  function getCell(entry: CommitteeHeatmapEntry, industry: string): CommitteeIndustryCell | null {
    return entry.industries.find((c) => c.industry === industry) ?? null;
  }

  function toggleExpand(key: string) {
    setExpanded((prev) => (prev === key ? null : key));
  }

  return (
    <section className="border-editorial bg-white p-8">
      <div className="mb-6">
        <h3 className="font-editorial text-2xl font-bold text-black">
          Committee Industry Heat Map
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Total industry funding flowing to members of each committee. Click a cell to see top members.
        </p>
      </div>

      {/* Desktop grid */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left pb-3 pr-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Committee
                </span>
              </th>
              {TARGET_INDUSTRIES.map((ind) => (
                <th key={ind} className="pb-3 px-2 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {ind}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((entry) => {
              const rowCells = TARGET_INDUSTRIES.map((ind) => {
                const cell = getCell(entry, ind);
                const key = `${entry.committee}::${ind}`;
                const isExpanded = expanded === key;
                return { ind, cell, key, isExpanded };
              });

              return (
                <tr key={entry.committee} className="border-t border-slate-100">
                  <td className="py-3 pr-4 align-top">
                    <span className="font-medium text-black text-sm">{entry.committee}</span>
                    <span className="block text-xs text-slate-400 mt-0.5">
                      {entry.memberCount} members · {formatAmount(entry.totalFunding)} total
                    </span>
                  </td>
                  {rowCells.map(({ ind, cell, key, isExpanded }) => (
                    <td key={ind} className="py-3 px-2 align-top">
                      {cell && cell.totalAmount > 0 ? (
                        <div>
                          <button
                            onClick={() => toggleExpand(key)}
                            className="w-full rounded px-3 py-2 text-center transition-colors hover:ring-1 hover:ring-slate-300"
                            style={{
                              backgroundColor: `rgba(15, 23, 42, ${cellOpacity(cell.totalAmount, globalMax)})`,
                              color: cellOpacity(cell.totalAmount, globalMax) > 0.45 ? '#fff' : '#0f172a',
                            }}
                          >
                            <span className="font-bold text-sm">{formatAmount(cell.totalAmount)}</span>
                            <span
                              className="block text-[10px] mt-0.5"
                              style={{
                                opacity: cellOpacity(cell.totalAmount, globalMax) > 0.45 ? 0.7 : 0.5,
                              }}
                            >
                              {cell.donorCount} donors
                            </span>
                          </button>
                          {isExpanded && cell.topMembers.length > 0 && (
                            <div className="mt-2 border border-slate-200 bg-slate-50 p-2 rounded text-xs space-y-1">
                              {cell.topMembers.map((m) => (
                                <div key={m.slug} className="flex items-center justify-between gap-2">
                                  <span className="text-slate-700 truncate">{m.name}</span>
                                  <span className="font-bold text-black shrink-0">
                                    {formatAmount(m.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="px-3 py-2 text-center text-slate-300 text-xs">--</div>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-4">
        {data.map((entry) => (
          <div key={entry.committee} className="border border-slate-200 p-4 space-y-3">
            <div>
              <p className="font-medium text-black text-sm">{entry.committee}</p>
              <p className="text-xs text-slate-400">
                {entry.memberCount} members · {formatAmount(entry.totalFunding)} total
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TARGET_INDUSTRIES.map((ind) => {
                const cell = getCell(entry, ind);
                const key = `${entry.committee}::${ind}`;
                const isExpanded = expanded === key;

                if (!cell || cell.totalAmount === 0) {
                  return (
                    <div key={ind} className="text-center py-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        {ind}
                      </p>
                      <p className="text-xs text-slate-300">--</p>
                    </div>
                  );
                }

                return (
                  <div key={ind}>
                    <button
                      onClick={() => toggleExpand(key)}
                      className="w-full rounded px-2 py-2 text-center transition-colors"
                      style={{
                        backgroundColor: `rgba(15, 23, 42, ${cellOpacity(cell.totalAmount, globalMax)})`,
                        color: cellOpacity(cell.totalAmount, globalMax) > 0.45 ? '#fff' : '#0f172a',
                      }}
                    >
                      <span className="block text-[10px] font-bold uppercase tracking-widest mb-0.5"
                        style={{ opacity: cellOpacity(cell.totalAmount, globalMax) > 0.45 ? 0.7 : 0.5 }}
                      >
                        {ind}
                      </span>
                      <span className="font-bold text-sm">{formatAmount(cell.totalAmount)}</span>
                    </button>
                    {isExpanded && cell.topMembers.length > 0 && (
                      <div className="mt-1 border border-slate-200 bg-slate-50 p-2 rounded text-xs space-y-1">
                        {cell.topMembers.map((m) => (
                          <div key={m.slug} className="flex items-center justify-between gap-2">
                            <span className="text-slate-700 truncate">{m.name}</span>
                            <span className="font-bold text-black shrink-0">
                              {formatAmount(m.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
