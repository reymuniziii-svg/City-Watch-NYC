import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Loader2, Trophy, Users, TrendingUp, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import ProGate from './ProGate';

/* ── types ────────────────────────────────────────────────── */

interface WorkHorseIndexEntry {
  slug: string;
  fullName: string;
  districtNumber: number;
  party: string;
  successRate: number;
  committeePullRate: number;
  bipartisanReachRate: number;
  velocityScore: number;
  compositeScore: number;
  rank: number;
  billBreakdown: {
    introduced: number;
    passedCommittee: number;
    enacted: number;
    bipartisanBills: number;
  };
}

/* ── helpers ──────────────────────────────────────────────── */

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url}`);
  return response.json();
}

/* ── sort ──────────────────────────────────────────────────── */

type SortKey =
  | 'rank'
  | 'fullName'
  | 'districtNumber'
  | 'compositeScore'
  | 'successRate'
  | 'committeePullRate'
  | 'bipartisanReachRate'
  | 'velocityScore';

type SortDir = 'asc' | 'desc';

interface SortState {
  key: SortKey;
  dir: SortDir;
}

interface SortHeaderProps {
  label: string;
  col: SortKey;
  sort: SortState;
  onSort: (col: SortKey) => void;
  tooltip?: string;
}

function SortHeader({ label, col, sort, onSort, tooltip }: SortHeaderProps) {
  const active = sort.key === col;
  return (
    <th
      className="px-4 py-3 text-left cursor-pointer select-none group"
      onClick={() => onSort(col)}
      title={tooltip}
    >
      <div className="flex items-center gap-1">
        <span
          className={`text-[10px] font-bold uppercase tracking-widest ${
            active ? 'text-black' : 'text-slate-500 group-hover:text-black'
          } transition-colors`}
        >
          {label}
        </span>
        <span className="text-slate-300 group-hover:text-slate-500 transition-colors">
          {active ? (
            sort.dir === 'asc' ? (
              <ChevronUp className="w-3 h-3 text-black" />
            ) : (
              <ChevronDown className="w-3 h-3 text-black" />
            )
          ) : (
            <ChevronsUpDown className="w-3 h-3" />
          )}
        </span>
      </div>
    </th>
  );
}

/* ── main component ──────────────────────────────────────── */

export default function WorkHorseRankingTable() {
  const [data, setData] = useState<WorkHorseIndexEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sort, setSort] = useState<SortState>({ key: 'rank', dir: 'asc' });

  useEffect(() => {
    fetchJson<WorkHorseIndexEntry[]>('/data/workhorse-index.json').then((entries) => {
      setData(entries);
      setIsLoading(false);
    });
  }, []);

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      switch (sort.key) {
        case 'rank':
          av = a.rank;
          bv = b.rank;
          break;
        case 'fullName':
          av = a.fullName.toLowerCase();
          bv = b.fullName.toLowerCase();
          break;
        case 'districtNumber':
          av = a.districtNumber;
          bv = b.districtNumber;
          break;
        case 'compositeScore':
          av = a.compositeScore;
          bv = b.compositeScore;
          break;
        case 'successRate':
          av = a.successRate;
          bv = b.successRate;
          break;
        case 'committeePullRate':
          av = a.committeePullRate;
          bv = b.committeePullRate;
          break;
        case 'bipartisanReachRate':
          av = a.bipartisanReachRate;
          bv = b.bipartisanReachRate;
          break;
        case 'velocityScore':
          av = a.velocityScore;
          bv = b.velocityScore;
          break;
        default:
          av = 0;
          bv = 0;
      }
      if (typeof av === 'string' && typeof bv === 'string') {
        return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sort.dir === 'asc'
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });
  }, [data, sort]);

  function handleSort(col: SortKey) {
    setSort((prev) =>
      prev.key === col
        ? { key: col, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
        : { key: col, dir: 'desc' }
    );
  }

  /* summary stats */
  const avgComposite = useMemo(() => {
    if (data.length === 0) return 0;
    return Math.round(data.reduce((sum, d) => sum + d.compositeScore, 0) / data.length);
  }, [data]);

  const topMember = useMemo(() => {
    if (data.length === 0) return '---';
    const top = data.reduce((best, d) => (d.compositeScore > best.compositeScore ? d : best), data[0]);
    return top.fullName;
  }, [data]);

  const avgSuccess = useMemo(() => {
    if (data.length === 0) return '0%';
    const avg = data.reduce((sum, d) => sum + d.successRate, 0) / data.length;
    return formatPercent(avg);
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="border-b-editorial pb-8">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
          Legislative Effectiveness
        </p>
        <h1 className="font-editorial text-5xl md:text-6xl font-black text-black tracking-tighter mb-3">
          Work Horse Rankings
        </h1>
        <p className="text-slate-600 text-lg max-w-2xl">
          Council-wide ranking of legislative effectiveness. Composite scores weight success rate,
          committee traction, bipartisan coalition-building, and co-sponsor velocity.
        </p>
      </div>

      {/* Summary stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-editorial bg-black gap-[1px]">
        {[
          { label: 'Council Members', value: data.length.toString(), icon: Users },
          { label: 'Top Performer', value: topMember, icon: Trophy },
          { label: 'Avg Composite', value: String(avgComposite), icon: TrendingUp },
          { label: 'Avg Success Rate', value: avgSuccess, icon: TrendingUp },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6">
            <div className="flex items-center gap-2 mb-3">
              <stat.icon className="w-4 h-4 text-slate-400" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {stat.label}
              </p>
            </div>
            <p className="font-editorial text-3xl font-bold text-black truncate">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <ProGate feature="Work Horse Rankings" flag="canViewWorkHorse">
        <div className="bg-white border-editorial overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead className="border-b-editorial bg-slate-50">
              <tr>
                <SortHeader label="Rank" col="rank" sort={sort} onSort={handleSort} />
                <SortHeader label="Member" col="fullName" sort={sort} onSort={handleSort} />
                <SortHeader label="District" col="districtNumber" sort={sort} onSort={handleSort} />
                <SortHeader
                  label="Composite"
                  col="compositeScore"
                  sort={sort}
                  onSort={handleSort}
                  tooltip="Overall effectiveness score"
                />
                <SortHeader
                  label="Success Rate"
                  col="successRate"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Committee Pull"
                  col="committeePullRate"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Bipartisan"
                  col="bipartisanReachRate"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Velocity"
                  col="velocityScore"
                  sort={sort}
                  onSort={handleSort}
                />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    No ranking data available.
                  </td>
                </tr>
              )}
              {sorted.map((row, i) => (
                <motion.tr
                  key={row.slug}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.01, 0.5) }}
                  className="border-b border-slate-100 transition-colors hover:bg-slate-50 group"
                >
                  <td className="px-4 py-3">
                    <span className="font-editorial font-bold text-lg text-black">
                      {row.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/members/${row.slug}`} className="block">
                      <p className="font-semibold text-black text-sm leading-tight group-hover:underline">
                        {row.fullName}
                      </p>
                      <span className="text-xs text-slate-400">{row.party}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-editorial font-bold text-lg text-black">
                      {row.districtNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-editorial font-bold text-sm text-black">
                      {Math.round(row.compositeScore)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {formatPercent(row.successRate)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {formatPercent(row.committeePullRate)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {formatPercent(row.bipartisanReachRate)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {Math.round(row.velocityScore)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </ProGate>
    </div>
  );
}
