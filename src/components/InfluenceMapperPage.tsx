import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Network, DollarSign, Users, Loader2, Filter, ChevronUp, ChevronDown, ChevronsUpDown, FileText, Search, AlertTriangle, Megaphone } from 'lucide-react';
import { fetchInfluenceMap, fetchConflictAlerts, fetchLobbyingIndex } from '../services/nycDataService';
import type { InfluenceMapEntry, ConflictAlert, LobbyingIndexEntry } from '../lib/types';
import ConflictAlertCard from './ConflictAlertCard';
import ProGate from './ProGate';
import IndustryBadge, { INDUSTRY_COLORS } from './shared/IndustryBadge';
import BulkExportPanel from './BulkExportPanel';

/* ── helpers ──────────────────────────────────────────────── */

function fmt$(value: number, digits = 0): string {
  return '$' + value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function districtToBorough(district: number): string {
  if (district >= 1 && district <= 7) return 'Manhattan';
  if (district === 8) return 'Bronx';
  if (district >= 9 && district <= 10) return 'Manhattan';
  if (district >= 11 && district <= 18) return 'Bronx';
  if (district >= 19 && district <= 32) return 'Queens';
  if (district >= 33 && district <= 48) return 'Brooklyn';
  if (district >= 49 && district <= 51) return 'Staten Island';
  return 'NYC';
}

/* ── constants ────────────────────────────────────────────── */

const BOROUGHS = ['All Boroughs', 'Manhattan', 'Bronx', 'Brooklyn', 'Queens', 'Staten Island'];

/* ── sort types ───────────────────────────────────────────── */

type SortKey = 'districtNumber' | 'memberName' | 'donorName' | 'donorIndustry' | 'totalAmount' | 'relatedBillsCount';
type SortDir = 'asc' | 'desc';

interface SortState {
  key: SortKey;
  dir: SortDir;
}

/* ── SortHeader ───────────────────────────────────────────── */

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

/* ── main component ───────────────────────────────────────── */

export default function InfluenceMapperPage() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<InfluenceMapEntry[]>([]);
  const [conflictAlerts, setConflictAlerts] = useState<ConflictAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sort, setSort] = useState<SortState>({ key: 'totalAmount', dir: 'desc' });
  const [industry, setIndustry] = useState('All Industries');
  const [borough, setBorough] = useState('All Boroughs');
  const [memberSearch, setMemberSearch] = useState(searchParams.get('search') ?? '');
  const [lobbyingIndex, setLobbyingIndex] = useState<LobbyingIndexEntry[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    Promise.all([fetchInfluenceMap(), fetchConflictAlerts(), fetchLobbyingIndex().catch(() => [])]).then(
      ([entries, alerts, lobbyingEntries]) => {
        setData(entries);
        setConflictAlerts(
          [...alerts].sort((a, b) => Math.abs(a.daysDelta) - Math.abs(b.daysDelta)),
        );
        setLobbyingIndex(lobbyingEntries);
        setIsLoading(false);
      },
    );
  }, []);

  /* derive unique industries from data */
  const industries = useMemo(() => {
    const set = new Set(data.map(e => e.donorIndustry));
    return ['All Industries', ...Array.from(set).sort()];
  }, [data]);

  /* filter */
  const filtered = useMemo(() => {
    let result = data;
    if (industry !== 'All Industries') result = result.filter(r => r.donorIndustry === industry);
    if (borough !== 'All Boroughs') result = result.filter(r => districtToBorough(r.districtNumber) === borough);
    if (memberSearch.trim()) {
      const q = memberSearch.toLowerCase();
      result = result.filter(r =>
        r.memberName.toLowerCase().includes(q) ||
        r.donorName.toLowerCase().includes(q),
      );
    }
    return result;
  }, [data, industry, borough, memberSearch]);

  /* sort */
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      switch (sort.key) {
        case 'districtNumber': av = a.districtNumber; bv = b.districtNumber; break;
        case 'memberName': av = a.memberName.toLowerCase(); bv = b.memberName.toLowerCase(); break;
        case 'donorName': av = a.donorName.toLowerCase(); bv = b.donorName.toLowerCase(); break;
        case 'donorIndustry': av = a.donorIndustry.toLowerCase(); bv = b.donorIndustry.toLowerCase(); break;
        case 'totalAmount': av = a.totalAmount; bv = b.totalAmount; break;
        case 'relatedBillsCount': av = a.relatedBills.length; bv = b.relatedBills.length; break;
        default: av = 0; bv = 0;
      }
      if (typeof av === 'string' && typeof bv === 'string') {
        return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sort.dir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [filtered, sort]);

  function handleSort(col: SortKey) {
    setSort(prev =>
      prev.key === col
        ? { key: col, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
        : { key: col, dir: 'desc' },
    );
  }

  function toggleRow(idx: number) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  /* summary stats */
  const totalEntries = filtered.length;
  const uniqueDonors = useMemo(() => new Set(filtered.map(e => e.donorName)).size, [filtered]);
  const uniqueMembers = useMemo(() => new Set(filtered.map(e => e.memberSlug)).size, [filtered]);
  const topIndustry = useMemo(() => {
    const sums: Record<string, number> = {};
    filtered.forEach(e => { sums[e.donorIndustry] = (sums[e.donorIndustry] || 0) + e.totalAmount; });
    let best = '';
    let bestVal = 0;
    Object.entries(sums).forEach(([k, v]) => { if (v > bestVal) { best = k; bestVal = v; } });
    return best || '---';
  }, [filtered]);

  /* industry breakdown for chart-like visual */
  const industryBreakdown = useMemo(() => {
    const sums: Record<string, number> = {};
    filtered.forEach(e => { sums[e.donorIndustry] = (sums[e.donorIndustry] || 0) + e.totalAmount; });
    const sorted = Object.entries(sums).sort(([, a], [, b]) => b - a);
    const max = sorted.length > 0 ? sorted[0][1] : 1;
    return sorted.map(([label, amount]) => ({ label, amount, pct: amount / max }));
  }, [filtered]);

  /* ── loading state ──────────────────────────────────────── */

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
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Donor &amp; Industry Analysis</p>
        <h1 className="font-editorial text-5xl md:text-6xl font-black text-black tracking-tighter mb-3">
          Influence Mapper
        </h1>
        <p className="text-slate-600 text-lg max-w-2xl">
          Trace every major campaign contribution to Council members, see which industries give the most, and explore the bills those members sponsor. All data from NYC Campaign Finance Board public filings.
        </p>
        <div className="mt-3">
          <BulkExportPanel
            data={sorted.map(r => ({ ...r, relatedBillsCount: r.relatedBills.length })) as unknown as Record<string, unknown>[]}
            filename="council-watch-influence-map"
            columns={[
              { key: 'districtNumber', label: 'District' },
              { key: 'memberName', label: 'Member' },
              { key: 'donorName', label: 'Donor' },
              { key: 'donorIndustry', label: 'Industry' },
              { key: 'totalAmount', label: 'Amount' },
              { key: 'relatedBillsCount', label: 'Related Bills' },
            ]}
          />
        </div>
      </div>

      {/* Summary stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-0 border-editorial bg-black gap-[1px]">
        {[
          { label: 'Donor-Member Links', value: totalEntries.toLocaleString(), icon: Network },
          { label: 'Unique Donors', value: uniqueDonors.toLocaleString(), icon: DollarSign },
          { label: 'Council Members', value: uniqueMembers.toLocaleString(), icon: Users },
          { label: 'Top Industry', value: topIndustry, icon: FileText },
          { label: 'Lobbying Orgs', value: lobbyingIndex.length.toLocaleString(), icon: Megaphone },
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

      {/* Industry Breakdown Bars */}
      <div className="bg-white border-editorial p-6">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Industry Breakdown (Total Contributions)</p>
        <div className="space-y-2">
          {industryBreakdown.map(({ label, amount, pct }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-40 text-xs font-medium text-slate-700 truncate shrink-0">{label}</span>
              <div className="flex-1 h-4 bg-slate-100 overflow-hidden">
                <motion.div
                  className={`h-full ${INDUSTRY_COLORS[label]?.split(' ')[0] ?? 'bg-gray-200'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(pct * 100, 1)}%` }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                />
              </div>
              <span className="text-xs font-medium text-slate-600 tabular-nums w-24 text-right shrink-0">{fmt$(amount)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="w-4 h-4 text-slate-400 shrink-0" />

        {/* Borough filter */}
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

        {/* Industry dropdown */}
        <select
          value={industry}
          onChange={e => setIndustry(e.target.value)}
          className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest border border-slate-200 bg-white text-slate-600 hover:border-black hover:text-black transition-colors cursor-pointer appearance-none pr-8"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
        >
          {industries.map(ind => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </select>

        <div className="w-px h-6 bg-slate-200 hidden md:block" />

        {/* Member search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={memberSearch}
            onChange={e => setMemberSearch(e.target.value)}
            placeholder="Search member or donor..."
            className="pl-8 pr-3 py-1.5 text-xs font-bold uppercase tracking-widest border border-slate-200 bg-white text-slate-600 placeholder-slate-400 hover:border-black focus:border-black focus:outline-none transition-colors w-56"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border-editorial overflow-x-auto">
        <table className="w-full min-w-[960px]">
          <thead className="border-b-editorial bg-slate-50">
            <tr>
              <SortHeader label="District" col="districtNumber" sort={sort} onSort={handleSort} />
              <SortHeader label="Member" col="memberName" sort={sort} onSort={handleSort} />
              <SortHeader label="Donor" col="donorName" sort={sort} onSort={handleSort} />
              <SortHeader label="Industry" col="donorIndustry" sort={sort} onSort={handleSort} />
              <SortHeader label="Amount" col="totalAmount" sort={sort} onSort={handleSort} tooltip="Total contribution amount from this donor" />
              <SortHeader label="Bills" col="relatedBillsCount" sort={sort} onSort={handleSort} tooltip="Related bills sponsored by this member" />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  No records match the current filters.
                </td>
              </tr>
            )}
            {sorted.map((row, i) => {
              const isExpanded = expandedRows.has(i);
              return (
                <React.Fragment key={`${row.memberSlug}-${row.donorName}-${i}`}>
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.01, 0.5) }}
                    className="border-b border-slate-100 transition-colors hover:bg-slate-50 group"
                  >
                    <td className="px-4 py-3">
                      <span className="font-editorial font-bold text-lg text-black">{row.districtNumber}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/members/${row.memberSlug}`}
                        className="block"
                      >
                        <p className="font-semibold text-black text-sm leading-tight group-hover:underline">{row.memberName}</p>
                        <span className="text-xs text-slate-400">{districtToBorough(row.districtNumber)}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-700 font-medium">{row.donorName}</span>
                    </td>
                    <td className="px-4 py-3">
                      <IndustryBadge industry={row.donorIndustry} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-editorial font-bold text-sm text-black">{fmt$(row.totalAmount)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {row.relatedBills.length > 0 ? (
                        <button
                          onClick={() => toggleRow(i)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-black transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {row.relatedBills.length} bill{row.relatedBills.length !== 1 ? 's' : ''}
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">---</span>
                      )}
                    </td>
                  </motion.tr>
                  {isExpanded && row.relatedBills.length > 0 && (
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <td colSpan={6} className="px-4 py-3 pl-12">
                        <div className="space-y-2">
                          {row.relatedBills.map((bill) => (
                            <div key={bill.introNumber} className="flex items-start gap-3 text-xs">
                              <span className="font-bold text-slate-500 shrink-0">{bill.introNumber}</span>
                              <span className="text-slate-700">{bill.title}</span>
                              {bill.committee && (
                                <span className="text-slate-400 shrink-0">{bill.committee}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Methodology note */}
      <div className="p-8 bg-slate-50 border-editorial text-sm text-slate-600 space-y-2 max-w-3xl">
        <p className="font-bold text-black uppercase tracking-widest text-xs mb-3">How to read this table</p>
        <p><strong className="text-black">Donor-Member Links</strong> --- Each row represents a connection between a campaign donor (contributing $500+) and a Council member who received their money.</p>
        <p><strong className="text-black">Industry</strong> --- Donors are categorized by industry based on their employer and occupation data from NYC Campaign Finance Board filings.</p>
        <p><strong className="text-black">Related Bills</strong> --- Bills sponsored by the receiving Council member. These are shown for context --- a donor-bill connection does not imply direct influence.</p>
        <p className="text-xs text-slate-400 pt-2">Source: NYC Campaign Finance Board public data export. 2025 election cycle. Click any member name to view their full profile.</p>
      </div>

      {/* Conflict Alerts section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b-editorial pb-4">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h2 className="font-editorial text-3xl font-bold text-black">Conflict Alerts</h2>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {conflictAlerts.length} potential conflicts detected
          </span>
        </div>
        <ProGate feature="Conflict Alerts">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {conflictAlerts.slice(0, 20).map((alert, i) => (
              <ConflictAlertCard key={`${alert.memberSlug}-${alert.billIntroNumber}-${alert.donorName}-${i}`} alert={alert} index={i} />
            ))}
          </div>
        </ProGate>
      </div>
    </div>
  );
}
