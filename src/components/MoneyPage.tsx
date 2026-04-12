import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DollarSign, TrendingUp, Users, ChevronUp, ChevronDown, ChevronsUpDown, Filter, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { FinanceIndexRow } from '../types';
import { fetchFinanceIndex } from '../services/nycDataService';
import BulkExportPanel from './BulkExportPanel';

function fmt$(value: number | null, digits = 0): string {
  if (value === null) return '—';
  return '$' + value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function fmtPct(value: number | null): string {
  if (value === null) return '—';
  return Math.round(value * 100) + '%';
}

type SortKey = keyof Pick<
  FinanceIndexRow,
  'districtNumber' | 'totalRaised' | 'publicFundsShare' | 'smallDollarShare' | 'topTenDonorShare' | 'avgContribution' | 'contributorCount'
> | 'realEstatePct';

type SortDir = 'asc' | 'desc';

interface SortState {
  key: SortKey;
  dir: SortDir;
}

function avg(rows: FinanceIndexRow[], key: keyof FinanceIndexRow): number | null {
  const vals = rows.map(r => r[key] as number | null).filter((v): v is number => v !== null);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function realEstatePct(row: FinanceIndexRow): number | null {
  const re = row.topIndustries.find(i => i.label.toLowerCase().includes('real estate'));
  if (!re || !row.totalRaised) return null;
  return re.amount / row.totalRaised;
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
        <span className={`text-[10px] font-bold uppercase tracking-widest ${active ? 'text-black' : 'text-slate-500 group-hover:text-black'} transition-colors`}>
          {label}
        </span>
        <span className="text-slate-300 group-hover:text-slate-500 transition-colors">
          {active ? (
            sort.dir === 'asc' ? <ChevronUp className="w-3 h-3 text-black" /> : <ChevronDown className="w-3 h-3 text-black" />
          ) : (
            <ChevronsUpDown className="w-3 h-3" />
          )}
        </span>
      </div>
    </th>
  );
}

const PARTY_COLORS: Record<string, string> = {
  Democrat: 'bg-blue-100 text-blue-800',
  Republican: 'bg-red-100 text-red-800',
  Conservative: 'bg-red-50 text-red-700',
  'Working Families': 'bg-green-100 text-green-800',
  Independent: 'bg-slate-100 text-slate-700',
};

function partyBadge(party: string) {
  const cls = PARTY_COLORS[party] ?? 'bg-slate-100 text-slate-700';
  const abbrev = party === 'Democrat' ? 'D' : party === 'Republican' ? 'R' : party === 'Working Families' ? 'WF' : party[0] ?? '?';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-none ${cls}`}>
      {abbrev}
    </span>
  );
}

const BOROUGHS = ['All Boroughs', 'Manhattan', 'Bronx', 'Brooklyn', 'Queens', 'Staten Island'];
const PARTIES = ['All Parties', 'Democrat', 'Republican', 'Working Families', 'Independent'];

export default function MoneyPage() {
  const [rows, setRows] = useState<FinanceIndexRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sort, setSort] = useState<SortState>({ key: 'totalRaised', dir: 'desc' });
  const [borough, setBorough] = useState('All Boroughs');
  const [party, setParty] = useState('All Parties');
  const [realEstateOnly, setRealEstateOnly] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFinanceIndex().then(data => {
      setRows(data);
      setIsLoading(false);
    });
  }, []);

  function handleSort(col: SortKey) {
    setSort(prev =>
      prev.key === col
        ? { key: col, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
        : { key: col, dir: 'desc' },
    );
  }

  const filtered = useMemo(() => {
    let result = rows;
    if (borough !== 'All Boroughs') result = result.filter(r => r.borough === borough);
    if (party !== 'All Parties') result = result.filter(r => r.party === party);
    if (realEstateOnly) result = result.filter(r => r.hasRealEstateFlag);
    return result;
  }, [rows, borough, party, realEstateOnly]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: number | null;
      let bv: number | null;
      if (sort.key === 'realEstatePct') {
        av = realEstatePct(a);
        bv = realEstatePct(b);
      } else {
        av = a[sort.key] as number | null;
        bv = b[sort.key] as number | null;
      }
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return sort.dir === 'asc' ? av - bv : bv - av;
    });
  }, [filtered, sort]);

  const avgTotalRaised = avg(filtered, 'totalRaised');
  const avgSmallDollar = avg(filtered, 'smallDollarShare');
  const avgPublicFunds = avg(filtered, 'publicFundsShare');

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
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Campaign Finance</p>
        <h1 className="font-editorial text-5xl md:text-6xl font-black text-black tracking-tighter mb-3">
          Money in the Council
        </h1>
        <p className="text-slate-600 text-lg max-w-2xl">
          Compare how every NYC Council member funds their campaigns — who gives, how much, and where it comes from. Data from the NYC Campaign Finance Board.
        </p>
        <div className="mt-3">
          <BulkExportPanel
            data={sorted as unknown as Record<string, unknown>[]}
            filename="council-watch-finance"
            columns={[
              { key: 'fullName', label: 'Member' },
              { key: 'districtNumber', label: 'District' },
              { key: 'party', label: 'Party' },
              { key: 'borough', label: 'Borough' },
              { key: 'totalRaised', label: 'Total Raised' },
              { key: 'publicFundsShare', label: 'Public Funds %' },
              { key: 'smallDollarShare', label: 'Small Dollar %' },
              { key: 'contributorCount', label: 'Contributors' },
            ]}
          />
        </div>
      </div>

      {/* Council-wide summary strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-editorial bg-black gap-[1px]">
        {[
          { label: 'Avg. Total Raised', value: fmt$(avgTotalRaised), icon: DollarSign },
          { label: 'Avg. Small-Dollar Share', value: fmtPct(avgSmallDollar), icon: Users },
          { label: 'Avg. Public Funds Share', value: fmtPct(avgPublicFunds), icon: TrendingUp },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6">
            <div className="flex items-center gap-2 mb-3">
              <stat.icon className="w-4 h-4 text-slate-400" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
            </div>
            <p className="font-editorial text-3xl font-bold text-black">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-slate-400 shrink-0" />

        <div className="flex flex-wrap gap-2">
          {BOROUGHS.map(b => (
            <button
              key={b}
              onClick={() => setBorough(b)}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors ${
                borough === b ? 'bg-black text-white border-black' : 'bg-white text-slate-600 border-slate-200 hover:border-black hover:text-black'
              }`}
            >
              {b === 'All Boroughs' ? 'All Boroughs' : b}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-slate-200 hidden md:block" />

        <div className="flex flex-wrap gap-2">
          {PARTIES.map(p => (
            <button
              key={p}
              onClick={() => setParty(p)}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors ${
                party === p ? 'bg-black text-white border-black' : 'bg-white text-slate-600 border-slate-200 hover:border-black hover:text-black'
              }`}
            >
              {p === 'All Parties' ? 'All' : p === 'Working Families' ? 'WFP' : p}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-slate-200 hidden md:block" />

        <button
          onClick={() => setRealEstateOnly(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-widest border transition-colors ${
            realEstateOnly ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-600 border-slate-200 hover:border-amber-400 hover:text-amber-700'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          Real Estate Flag
        </button>
      </div>

      {/* Mobile card view */}
      <div className="sm:hidden space-y-4">
        {sorted.length === 0 && (
          <div className="bg-white border-editorial p-8 text-center text-slate-500">
            No members match the current filters.
          </div>
        )}
        {sorted.map((row) => {
          const rePct = realEstatePct(row);
          return (
            <Link
              key={row.slug}
              to={`/members/${row.slug}`}
              className={`block bg-white border-editorial p-4 space-y-3 transition-colors ${
                row.hasRealEstateFlag ? 'bg-amber-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-black text-sm">{row.fullName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {partyBadge(row.party)}
                    <span className="text-xs text-slate-400">District {row.districtNumber}</span>
                  </div>
                </div>
                <span className="font-editorial font-bold text-lg text-black">{fmt$(row.totalRaised)}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="text-slate-500">Small-Dollar</div>
                <div className="text-right font-medium text-slate-700">{fmtPct(row.smallDollarShare)}</div>
                <div className="text-slate-500">Public Funds</div>
                <div className="text-right font-medium text-slate-700">{fmtPct(row.publicFundsShare)}</div>
                <div className="text-slate-500">Top-10 Conc.</div>
                <div className="text-right font-medium text-slate-700">{fmtPct(row.topTenDonorShare)}</div>
                {rePct !== null && (
                  <>
                    <div className="text-slate-500">Real Estate</div>
                    <div className="text-right font-medium text-slate-700">{Math.round(rePct * 100)}%</div>
                  </>
                )}
              </div>
              {(row.hasRealEstateFlag || (row.topTenDonorShare ?? 0) >= 0.4) && (
                <div className="flex flex-wrap gap-1">
                  {row.hasRealEstateFlag && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-bold uppercase tracking-widest">
                      <AlertCircle className="w-3 h-3" />
                      RE
                    </span>
                  )}
                  {(row.topTenDonorShare ?? 0) >= 0.4 && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold uppercase tracking-widest">
                      Concentrated
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Table (desktop) */}
      <div className="hidden sm:block bg-white border-editorial overflow-x-auto">
        <table className="w-full min-w-[960px]">
          <thead className="border-b-editorial bg-slate-50">
            <tr>
              <SortHeader label="District" col="districtNumber" sort={sort} onSort={handleSort} />
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Member</th>
              <SortHeader label="Total Raised" col="totalRaised" sort={sort} onSort={handleSort} tooltip="Private contributions only, excluding public matching funds" />
              <SortHeader label="Public Funds %" col="publicFundsShare" sort={sort} onSort={handleSort} tooltip="Public matching funds as share of total campaign resources" />
              <SortHeader label="Small-Dollar %" col="smallDollarShare" sort={sort} onSort={handleSort} tooltip="Contributions under $250 as share of private funds" />
              <SortHeader label="Top-10 Conc." col="topTenDonorShare" sort={sort} onSort={handleSort} tooltip="Share of private funds from the top 10 donors — higher = more concentrated" />
              <SortHeader label="Real Estate %" col="realEstatePct" sort={sort} onSort={handleSort} tooltip="Real estate industry contributions as share of private fundraising" />
              <SortHeader label="Donors" col="contributorCount" sort={sort} onSort={handleSort} tooltip="Number of unique contributors" />
              <SortHeader label="Avg. Gift" col="avgContribution" sort={sort} onSort={handleSort} tooltip="Average contribution per donor" />
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Flags</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                  No members match the current filters.
                </td>
              </tr>
            )}
            {sorted.map((row, i) => {
              const rePct = realEstatePct(row);
              const rowBg = row.hasRealEstateFlag
                ? 'bg-amber-50 hover:bg-amber-100'
                : 'hover:bg-slate-50';
              return (
                <motion.tr
                  key={row.slug}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.015 }}
                  onClick={() => navigate(`/members/${row.slug}`)}
                  className={`border-b border-slate-100 transition-colors cursor-pointer group ${rowBg}`}
                >
                  <td className="px-4 py-3">
                    <span className="font-editorial font-bold text-lg text-black">{row.districtNumber}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/members/${row.slug}`}
                      onClick={e => e.stopPropagation()}
                      className="block"
                    >
                      <p className="font-semibold text-black text-sm leading-tight group-hover:underline">{row.fullName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {partyBadge(row.party)}
                        <span className="text-xs text-slate-400">{row.borough}</span>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-editorial font-bold text-sm text-black">{fmt$(row.totalRaised)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <PctBar value={row.publicFundsShare} color="bg-teal-500" />
                  </td>
                  <td className="px-4 py-3">
                    <PctBar value={row.smallDollarShare} color="bg-violet-500" />
                  </td>
                  <td className="px-4 py-3">
                    <PctBar
                      value={row.topTenDonorShare}
                      color={
                        (row.topTenDonorShare ?? 0) >= 0.4
                          ? 'bg-rose-500'
                          : (row.topTenDonorShare ?? 0) >= 0.25
                          ? 'bg-amber-400'
                          : 'bg-slate-400'
                      }
                    />
                  </td>
                  <td className="px-4 py-3">
                    <PctBar
                      value={rePct}
                      color={row.hasRealEstateFlag ? 'bg-amber-500' : 'bg-slate-300'}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 font-medium">
                    {row.contributorCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 font-medium">
                    {fmt$(row.avgContribution)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {row.hasRealEstateFlag && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-bold uppercase tracking-widest">
                          <AlertCircle className="w-3 h-3" />
                          RE
                        </span>
                      )}
                      {(row.topTenDonorShare ?? 0) >= 0.4 && (
                        <span className="inline-flex items-center px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold uppercase tracking-widest">
                          Concentrated
                        </span>
                      )}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend / methodology note */}
      <div className="p-8 bg-slate-50 border-editorial text-sm text-slate-600 space-y-2 max-w-3xl">
        <p className="font-bold text-black uppercase tracking-widest text-xs mb-3">How to read this table</p>
        <p><strong className="text-black">Total Raised</strong> — Private contributions only, per the NYC CFB filing. Public matching funds add significantly to most campaigns but are listed separately.</p>
        <p><strong className="text-black">Public Funds %</strong> — The NYC matching funds program amplifies small donations. A high percentage signals a grassroots fundraising base.</p>
        <p><strong className="text-black">Small-Dollar %</strong> — Donations under $250 as a share of private fundraising. Higher values indicate broader community support.</p>
        <p><strong className="text-black">Top-10 Concentration</strong> — The share of private money controlled by the top 10 donors. Values above 40% are flagged as concentrated.</p>
        <p><strong className="text-black">Real Estate %</strong> — Real estate industry contributions as a share of private fundraising. Rows highlighted in amber exceed 10%, the common threshold for potential land-use conflicts of interest.</p>
        <p className="text-xs text-slate-400 pt-2">Source: NYC Campaign Finance Board public data export. 2025 election cycle. Click any row to view the member's full finance profile.</p>
      </div>
    </div>
  );
}

function PctBar({ value, color }: { value: number | null; color: string }) {
  if (value === null) return <span className="text-sm text-slate-400">—</span>;
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-sm text-slate-700 font-medium tabular-nums">{pct}%</span>
    </div>
  );
}
