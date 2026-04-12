import { useState, useEffect, useMemo } from 'react';
import { fetchWorkHorseIndex } from '../services/nycDataService';
import type { WorkHorseEntry } from '../lib/types';

function formatPercent(v: number) {
  return `${Math.round(v * 100)}%`;
}

function MetricBar({ label, valueA, valueB }: { label: string; valueA: number; valueB: number }) {
  const max = Math.max(valueA, valueB, 0.01);
  return (
    <div className="mb-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
        {label}
      </p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div
            className="h-5 bg-black transition-all"
            style={{ width: `${(valueA / max) * 100}%`, minWidth: '2px' }}
          />
          <span className="text-sm font-bold">{formatPercent(valueA)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-5 bg-slate-400 transition-all"
            style={{ width: `${(valueB / max) * 100}%`, minWidth: '2px' }}
          />
          <span className="text-sm font-bold text-slate-600">{formatPercent(valueB)}</span>
        </div>
      </div>
    </div>
  );
}

export default function WorkHorseBenchmark() {
  const [data, setData] = useState<WorkHorseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [slugA, setSlugA] = useState('');
  const [slugB, setSlugB] = useState('');

  useEffect(() => {
    fetchWorkHorseIndex().then((d) => {
      setData(d);
      if (d.length >= 2) {
        setSlugA(d[0].slug);
        setSlugB(d[1].slug);
      }
      setLoading(false);
    });
  }, []);

  const memberA = useMemo(() => data.find((d) => d.slug === slugA) ?? null, [data, slugA]);
  const memberB = useMemo(() => data.find((d) => d.slug === slugB) ?? null, [data, slugB]);

  if (loading) {
    return (
      <div className="border-editorial bg-white p-8">
        <p className="text-sm text-slate-500">Loading benchmark data...</p>
      </div>
    );
  }

  return (
    <section className="border-editorial bg-white p-8">
      <div className="mb-8">
        <h2 className="font-editorial text-3xl font-bold text-black">Head-to-Head Benchmark</h2>
        <p className="mt-2 text-sm text-slate-500 uppercase tracking-widest font-bold">
          Compare any two Council Members side-by-side.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
            Member A
          </label>
          <select
            value={slugA}
            onChange={(e) => setSlugA(e.target.value)}
            className="w-full border-editorial bg-white px-3 py-2 text-sm font-medium"
          >
            {data.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.fullName} (D-{m.districtNumber})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-500">
            Member B
          </label>
          <select
            value={slugB}
            onChange={(e) => setSlugB(e.target.value)}
            className="w-full border-editorial bg-white px-3 py-2 text-sm font-medium"
          >
            {data.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.fullName} (D-{m.districtNumber})
              </option>
            ))}
          </select>
        </div>
      </div>

      {memberA && memberB && (
        <>
          {/* Score comparison header */}
          <div className="mb-8 grid grid-cols-2 gap-4">
            <div className="border-editorial p-6 text-center">
              <p className="text-sm font-bold text-slate-500">{memberA.fullName}</p>
              <p className="font-editorial text-5xl font-bold text-black mt-2">
                {memberA.compositeScore}
              </p>
              <p className="text-xs text-slate-400 mt-1">Rank #{memberA.rank}</p>
            </div>
            <div className="border-editorial p-6 text-center">
              <p className="text-sm font-bold text-slate-500">{memberB.fullName}</p>
              <p className="font-editorial text-5xl font-bold text-slate-600 mt-2">
                {memberB.compositeScore}
              </p>
              <p className="text-xs text-slate-400 mt-1">Rank #{memberB.rank}</p>
            </div>
          </div>

          {/* Metric-by-metric comparison */}
          <div className="space-y-2">
            <MetricBar
              label="Success Rate"
              valueA={memberA.successRate}
              valueB={memberB.successRate}
            />
            <MetricBar
              label="Committee Pull"
              valueA={memberA.committeePullRate}
              valueB={memberB.committeePullRate}
            />
            <MetricBar
              label="Bipartisan Reach"
              valueA={memberA.bipartisanReachRate}
              valueB={memberB.bipartisanReachRate}
            />
            <MetricBar
              label="Velocity Score"
              valueA={memberA.velocityScore}
              valueB={memberB.velocityScore}
            />
          </div>

          {/* Bill breakdown */}
          <div className="mt-8 grid grid-cols-2 gap-4">
            {[memberA, memberB].map((m, idx) => (
              <div key={m.slug} className="border-editorial p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                  {idx === 0 ? 'Member A' : 'Member B'} — Bill Breakdown
                </p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Introduced</span>
                    <span className="font-bold">{m.billBreakdown.introduced}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Passed Committee</span>
                    <span className="font-bold">{m.billBreakdown.passedCommittee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Enacted</span>
                    <span className="font-bold">{m.billBreakdown.enacted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Bipartisan</span>
                    <span className="font-bold">{m.billBreakdown.bipartisanBills}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
