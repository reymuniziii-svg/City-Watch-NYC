import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { fetchWorkHorseIndex } from '../services/nycDataService';
import type { WorkHorseEntry } from '../lib/types';

type SortKey = 'rank' | 'compositeScore' | 'successRate' | 'committeePullRate' | 'bipartisanReachRate' | 'velocityScore';

function formatPercent(v: number) {
  return `${Math.round(v * 100)}%`;
}

function scoreLabel(score: number): string {
  if (score >= 60) return 'Work Horse';
  if (score >= 30) return 'Steady';
  return 'Show Horse';
}

function scoreBadgeClass(score: number): string {
  if (score >= 60) return 'bg-emerald-100 text-emerald-800';
  if (score >= 30) return 'bg-amber-100 text-amber-800';
  return 'bg-slate-100 text-slate-700';
}

function SortHeader({
  label,
  field,
  sort,
  onSort,
}: {
  label: string;
  field: SortKey;
  sort: { key: SortKey; dir: 'asc' | 'desc' };
  onSort: (key: SortKey) => void;
}) {
  const active = sort.key === field;
  return (
    <th
      className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 cursor-pointer select-none hover:text-black"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active &&
          (sort.dir === 'asc' ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          ))}
      </span>
    </th>
  );
}

export default function WorkHorseRankingTable() {
  const [data, setData] = useState<WorkHorseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'rank',
    dir: 'asc',
  });
  const [partyFilter, setPartyFilter] = useState('');

  useEffect(() => {
    fetchWorkHorseIndex().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const handleSort = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' },
    );
  };

  const parties = useMemo(() => {
    const set = new Set(data.map((d) => d.party));
    return Array.from(set).sort();
  }, [data]);

  const sorted = useMemo(() => {
    let filtered = data;
    if (partyFilter) filtered = filtered.filter((d) => d.party === partyFilter);

    return [...filtered].sort((a, b) => {
      const aVal = a[sort.key];
      const bVal = b[sort.key];
      const diff = (aVal as number) - (bVal as number);
      return sort.dir === 'asc' ? diff : -diff;
    });
  }, [data, sort, partyFilter]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <p className="text-sm text-slate-500">Loading Work Horse index...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-8">
        <h1 className="font-editorial text-4xl font-bold text-black">Work Horse Index</h1>
        <p className="mt-2 text-lg text-slate-600">
          Distinguishing policy movers from political performers across all 51 Council Members.
        </p>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <select
          value={partyFilter}
          onChange={(e) => setPartyFilter(e.target.value)}
          className="border-editorial bg-white px-3 py-2 text-sm"
        >
          <option value="">All Parties</option>
          {parties.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <span className="text-sm text-slate-500">{sorted.length} members</span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block border-editorial overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b-editorial">
            <tr>
              <SortHeader label="Rank" field="rank" sort={sort} onSort={handleSort} />
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Member
              </th>
              <SortHeader label="Score" field="compositeScore" sort={sort} onSort={handleSort} />
              <SortHeader label="Success Rate" field="successRate" sort={sort} onSort={handleSort} />
              <SortHeader label="Committee Pull" field="committeePullRate" sort={sort} onSort={handleSort} />
              <SortHeader label="Bipartisan Reach" field="bipartisanReachRate" sort={sort} onSort={handleSort} />
              <SortHeader label="Velocity" field="velocityScore" sort={sort} onSort={handleSort} />
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Type
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => (
              <tr key={entry.slug} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-editorial text-lg font-bold">{entry.rank}</td>
                <td className="px-4 py-3">
                  <Link
                    to={`/members/${entry.slug}`}
                    className="font-medium text-black hover:underline"
                  >
                    {entry.fullName}
                  </Link>
                  <span className="ml-2 text-xs text-slate-400">
                    D-{entry.districtNumber} · {entry.party}
                  </span>
                </td>
                <td className="px-4 py-3 font-editorial text-xl font-bold">{entry.compositeScore}</td>
                <td className="px-4 py-3 text-sm">{formatPercent(entry.successRate)}</td>
                <td className="px-4 py-3 text-sm">{formatPercent(entry.committeePullRate)}</td>
                <td className="px-4 py-3 text-sm">{formatPercent(entry.bipartisanReachRate)}</td>
                <td className="px-4 py-3 text-sm">{formatPercent(entry.velocityScore)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded px-2 py-1 text-xs font-bold ${scoreBadgeClass(entry.compositeScore)}`}
                  >
                    {scoreLabel(entry.compositeScore)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-4">
        {sorted.map((entry) => (
          <div key={entry.slug} className="border-editorial bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="font-editorial text-2xl font-bold text-slate-400">
                  #{entry.rank}
                </span>
                <div>
                  <Link
                    to={`/members/${entry.slug}`}
                    className="font-medium text-black hover:underline"
                  >
                    {entry.fullName}
                  </Link>
                  <p className="text-xs text-slate-500">
                    D-{entry.districtNumber} · {entry.party}
                  </p>
                </div>
              </div>
              <span
                className={`rounded px-2 py-1 text-xs font-bold ${scoreBadgeClass(entry.compositeScore)}`}
              >
                {entry.compositeScore}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-slate-500">Success:</span>{' '}
                <span className="font-medium">{formatPercent(entry.successRate)}</span>
              </div>
              <div>
                <span className="text-slate-500">Committee:</span>{' '}
                <span className="font-medium">{formatPercent(entry.committeePullRate)}</span>
              </div>
              <div>
                <span className="text-slate-500">Bipartisan:</span>{' '}
                <span className="font-medium">{formatPercent(entry.bipartisanReachRate)}</span>
              </div>
              <div>
                <span className="text-slate-500">Velocity:</span>{' '}
                <span className="font-medium">{formatPercent(entry.velocityScore)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
