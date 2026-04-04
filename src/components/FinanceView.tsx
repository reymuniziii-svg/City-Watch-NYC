import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { DollarSign, TrendingUp, Users, Landmark, MapPin, AlertCircle, ChevronDown, ChevronUp, ChevronsUpDown, Building2, Star, ArrowRightLeft } from 'lucide-react';
import { CampaignFinance } from '../types';

const COLORS = ['#F27D26', '#14B8A6', '#8B5CF6', '#F43F5E', '#EAB308', '#3B82F6', '#10B981', '#F97316'];

function formatCurrency(value: number | null) {
  return value === null ? '—' : '$' + Math.round(value).toLocaleString();
}

function formatPercent(value: number | null) {
  return value === null ? '—' : Math.round(value * 100) + '%';
}

function gradeColor(grade: string | null): string {
  if (!grade) return 'bg-slate-100 text-slate-700';
  if (grade.startsWith('A')) return 'bg-green-100 text-green-800 border-green-300';
  if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800 border-blue-300';
  if (grade.startsWith('C')) return 'bg-amber-100 text-amber-800 border-amber-300';
  if (grade.startsWith('D')) return 'bg-orange-100 text-orange-800 border-orange-300';
  return 'bg-red-100 text-red-800 border-red-300';
}

function gradeBarColor(grade: string | null): string {
  if (!grade) return '#94A3B8';
  if (grade.startsWith('A')) return '#22C55E';
  if (grade.startsWith('B')) return '#3B82F6';
  if (grade.startsWith('C')) return '#F59E0B';
  if (grade.startsWith('D')) return '#F97316';
  return '#EF4444';
}

const DONOR_TYPE_LABELS: Record<string, string> = {
  IND: 'Individual',
  PCOMP: 'Political PAC',
  PCOMC: 'Candidate Cmte',
  CORP: 'Corporation',
  PART: 'Partnership',
  LLTD: 'LLC',
  OADV: 'Other',
};

function decodeDonorType(code: string): string {
  return DONOR_TYPE_LABELS[code?.trim().toUpperCase()] ?? code ?? 'Unknown';
}

type DonorSortKey = 'amount' | 'name' | 'donorType';

export default function FinanceView({ data }: { data: CampaignFinance | null }) {
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [donorSort, setDonorSort] = useState<{ key: DonorSortKey; dir: 'asc' | 'desc' }>({ key: 'amount', dir: 'desc' });
  const [showAllDonors, setShowAllDonors] = useState(false);

  if (!data) {
    return (
      <div className="p-12 bg-white border-editorial text-center">
        <p className="text-black font-bold mb-2">Campaign finance data is not available for this member yet.</p>
        <p className="text-slate-600">
          We only show NYC Campaign Finance Board data when we can confidently match the current member to a public filing profile.
        </p>
      </div>
    );
  }

  const averageContribution = data.contributorCount > 0 && data.totalRaised !== null
    ? data.totalRaised / data.contributorCount
    : null;

  const insideCityAmount = data.totalRaised !== null && data.outsideCityAmount !== null
    ? data.totalRaised - data.outsideCityAmount
    : 0;

  const geographyData = [
    { name: 'Inside NYC', amount: insideCityAmount },
    { name: 'Outside NYC', amount: data.outsideCityAmount || 0 }
  ];

  const largeDollarAmount = data.totalRaised !== null && data.smallDollarAmount !== null
    ? data.totalRaised - data.smallDollarAmount
    : 0;

  const donationSizeData = [
    { name: 'Small-Dollar (<$250)', amount: data.smallDollarAmount || 0 },
    { name: 'Large-Dollar (>$250)', amount: largeDollarAmount }
  ];

  const hasRealEstateInfluence = data.topIndustries.some(ind =>
    ind.label.toLowerCase().includes('real estate') && ind.amount > (data.totalRaised || 0) * 0.1
  );

  const donorPatterns = data.topIndustries.map((industry) => ({
    category: industry.label,
    amount: industry.amount,
    count: industry.contributorCount,
  }));

  const sortedDonors = [...data.topDonors].sort((a, b) => {
    if (donorSort.key === 'amount') {
      return donorSort.dir === 'desc' ? b.amount - a.amount : a.amount - b.amount;
    }
    const av = (a[donorSort.key] ?? '').toString().toLowerCase();
    const bv = (b[donorSort.key] ?? '').toString().toLowerCase();
    return donorSort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const visibleDonors = showAllDonors ? sortedDonors : sortedDonors.slice(0, 5);

  function toggleDonorSort(key: DonorSortKey) {
    setDonorSort(prev =>
      prev.key === key
        ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
        : { key, dir: key === 'amount' ? 'desc' : 'asc' }
    );
  }

  const industryDonors = selectedIndustry && data.donorsByIndustry
    ? (data.donorsByIndustry[selectedIndustry] ?? [])
    : [];

  const scoreColor = gradeBarColor(data.grassrootsGrade);

  return (
    <div className="space-y-8">
      {/* Grassroots Grade Banner */}
      {data.grassrootsScore !== null && data.grassrootsGrade !== null && (
        <div className={`border p-6 flex flex-col md:flex-row md:items-center gap-6 ${gradeColor(data.grassrootsGrade)}`}>
          <div className="flex items-center gap-4 shrink-0">
            <Star className="w-5 h-5" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5">Grassroots Grade</p>
              <p className="font-editorial text-5xl font-black leading-none">{data.grassrootsGrade}</p>
            </div>
            <div className="ml-4">
              <div className="w-24 h-2 bg-black/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${data.grassrootsScore}%`, backgroundColor: scoreColor }}
                />
              </div>
              <p className="text-xs mt-1 font-bold">{data.grassrootsScore}/100</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed opacity-80 max-w-xl">
            This score combines small-dollar fundraising share (40%), donor concentration (30%), organizational vs. individual donors (15%), and local vs. out-of-city sources (15%). Higher scores reflect broader grassroots support.
          </p>
        </div>
      )}

      {/* Warning Badges */}
      {hasRealEstateInfluence && (
        <div className="bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-amber-900 uppercase tracking-widest mb-1">Doing Business Warning</h4>
            <p className="text-sm text-amber-800">
              This member receives over 10% of their funding from the Real Estate industry. This may indicate potential conflicts of interest on zoning and land use bills.
            </p>
          </div>
        </div>
      )}

      {/* Top Stats — Row 1: Original 4 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Raised', value: formatCurrency(data.totalRaised), icon: DollarSign, hint: 'Private contributions only' },
          { label: 'Public Funds', value: formatCurrency(data.publicFunds), icon: Landmark, hint: 'NYC matching funds received' },
          { label: 'Small-Dollar Share', value: formatPercent(data.smallDollarShare), icon: Users, hint: 'Donations under $250' },
          { label: 'Avg. Contribution', value: formatCurrency(averageContribution), icon: TrendingUp, hint: 'Per unique donor' },
        ].map((stat, i) => (
          <div key={i} className="p-6 bg-white border-editorial hover:shadow-md transition-shadow">
            <div className="w-10 h-10 border-editorial flex items-center justify-center mb-6 bg-slate-50">
              <stat.icon className="text-black w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{stat.label}</p>
            <p className="font-editorial text-3xl font-bold text-black">{stat.value}</p>
            <p className="text-xs text-slate-400 mt-2">{stat.hint}</p>
          </div>
        ))}
      </div>

      {/* Top Stats — Row 2: Three new cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            label: 'Org. Donors %',
            value: formatPercent(data.organizationalDonorShare),
            icon: Building2,
            hint: 'PACs, unions, and committees vs. individuals',
          },
          {
            label: 'Top-10 Concentration',
            value: formatPercent(data.topTenDonorShare),
            icon: TrendingUp,
            hint: 'Share of private funds from the top 10 donors',
          },
          {
            label: 'Max-Out Donors',
            value: data.maxContributionDonorCount !== null ? data.maxContributionDonorCount.toLocaleString() : '—',
            icon: Star,
            hint: `${formatCurrency(data.maxContributionAmount)} contributed at the legal maximum`,
          },
        ].map((stat, i) => (
          <div key={i} className="p-6 bg-white border-editorial hover:shadow-md transition-shadow">
            <div className="w-10 h-10 border-editorial flex items-center justify-center mb-6 bg-slate-50">
              <stat.icon className="text-black w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{stat.label}</p>
            <p className="font-editorial text-3xl font-bold text-black">{stat.value}</p>
            <p className="text-xs text-slate-400 mt-2">{stat.hint}</p>
          </div>
        ))}
      </div>

      {/* Matching Funds Leverage Callout */}
      {data.publicFunds !== null && data.smallDollarAmount !== null && data.publicFunds > 0 && (
        <div className="bg-teal-50 border border-teal-200 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <ArrowRightLeft className="w-6 h-6 text-teal-600 shrink-0" />
          <div className="flex-1">
            <p className="text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-2">NYC Matching Funds Leverage</p>
            <div className="flex flex-wrap items-center gap-3 text-teal-900">
              <span className="font-editorial text-2xl font-bold">{formatCurrency(data.smallDollarAmount)}</span>
              <span className="text-teal-600 font-bold">raised from small donors</span>
              <span className="text-teal-400 font-bold">→</span>
              <span className="font-editorial text-2xl font-bold">{formatCurrency(data.publicFunds)}</span>
              <span className="text-teal-600 font-bold">in public matching funds</span>
            </div>
            <p className="text-xs text-teal-600 mt-2">
              NYC's 8-to-1 matching program multiplies every eligible small donation — making grassroots fundraising worth far more than its face value.
            </p>
          </div>
        </div>
      )}

      {/* Row 1: Geography & Donation Size */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-8 bg-white border-editorial">
          <div className="flex items-center gap-2 mb-8">
            <MapPin className="w-5 h-5 text-slate-400" />
            <h3 className="font-editorial text-2xl font-bold text-black">Geographic Breakdown</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={geographyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="amount"
                  nameKey="name"
                >
                  <Cell fill="#14B8A6" />
                  <Cell fill="#F43F5E" />
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-500 text-center mt-4">
            {formatPercent(1 - (data.outsideCityShare || 0))} of funds come from within NYC.
          </p>
        </div>

        <div className="p-8 bg-white border-editorial">
          <div className="flex items-center gap-2 mb-8">
            <Users className="w-5 h-5 text-slate-400" />
            <h3 className="font-editorial text-2xl font-bold text-black">Grassroots vs. Big Money</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donationSizeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="amount"
                  nameKey="name"
                >
                  <Cell fill="#8B5CF6" />
                  <Cell fill="#EAB308" />
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-500 text-center mt-4">
            {formatPercent(data.smallDollarShare)} of private funds come from small-dollar donors.
          </p>
        </div>
      </div>

      {/* Industries (with drill-down) & Donor Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Industries with drill-down */}
        <div className="p-8 bg-white border-editorial">
          <h3 className="font-editorial text-2xl font-bold text-black mb-2">Top Industries</h3>
          <p className="text-xs text-slate-400 mb-6">Click a bar to see donors in that category.</p>
          <div className="h-72">
            {donorPatterns.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={donorPatterns}
                  layout="vertical"
                  margin={{ left: 20 }}
                  onClick={(payload: unknown) => {
                    const p = payload as { activePayload?: { payload?: { category?: string } }[] } | null;
                    const label = p?.activePayload?.[0]?.payload?.category;
                    if (label) setSelectedIndustry(prev => (prev === label ? null : label));
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" tickFormatter={(val) => `$${val / 1000}k`} stroke="#64748B" fontSize={12} />
                  <YAxis dataKey="category" type="category" width={140} tick={{ fontSize: 11, fill: '#334155' }} />
                  <Tooltip
                    formatter={(value: number, _name, props) => [
                      formatCurrency(value),
                      `${props.payload?.count ?? 0} donors`,
                    ]}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#F1F5F9' }}
                  />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                    {donorPatterns.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={selectedIndustry === entry.category ? '#000' : COLORS[index % COLORS.length]}
                        opacity={selectedIndustry && selectedIndustry !== entry.category ? 0.4 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-center text-slate-500">
                No industry breakdown is available for this member's current finance profile.
              </div>
            )}
          </div>

          {/* Industry Drill-Down */}
          {selectedIndustry && (
            <div className="mt-6 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-black uppercase tracking-widest">{selectedIndustry} Donors</p>
                <button
                  onClick={() => setSelectedIndustry(null)}
                  className="text-xs text-slate-400 hover:text-black transition-colors"
                >
                  Clear ×
                </button>
              </div>
              {industryDonors.length === 0 ? (
                <p className="text-sm text-slate-500">No donor detail available for this category.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {industryDonors.map((donor, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50">
                      <div className="min-w-0 flex-1 pr-4">
                        <p className="font-medium text-black truncate">{donor.name}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {[donor.occupation, donor.employer].filter(Boolean).join(' · ') || decodeDonorType(donor.donorType)}
                        </p>
                      </div>
                      <span className="font-bold text-black shrink-0">{formatCurrency(donor.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Interactive Donor Table */}
        <div className="p-8 bg-white border-editorial">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-editorial text-2xl font-bold text-black">Top Donors</h3>
            <p className="text-xs text-slate-400">{data.topDonors.length} shown</p>
          </div>

          {data.topDonors.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-center text-slate-500">
              No top donor rows are available in the current public export.
            </div>
          ) : (
            <div>
              {/* Table Header */}
              <div className="border-b border-slate-200 pb-2 mb-2">
                <div className="grid grid-cols-[1fr_80px_80px] gap-2">
                  <button
                    className="text-left flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-black transition-colors"
                    onClick={() => toggleDonorSort('name')}
                  >
                    Donor
                    {donorSort.key === 'name'
                      ? (donorSort.dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
                      : <ChevronsUpDown className="w-3 h-3 text-slate-300" />}
                  </button>
                  <button
                    className="text-left flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-black transition-colors"
                    onClick={() => toggleDonorSort('donorType')}
                  >
                    Type
                    {donorSort.key === 'donorType'
                      ? (donorSort.dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
                      : <ChevronsUpDown className="w-3 h-3 text-slate-300" />}
                  </button>
                  <button
                    className="text-right flex items-center justify-end gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-black transition-colors"
                    onClick={() => toggleDonorSort('amount')}
                  >
                    Amount
                    {donorSort.key === 'amount'
                      ? (donorSort.dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
                      : <ChevronsUpDown className="w-3 h-3 text-slate-300" />}
                  </button>
                </div>
              </div>

              {/* Table Rows */}
              <div className="space-y-0">
                {visibleDonors.map((donor, i) => (
                  <div key={i} className="grid grid-cols-[1fr_80px_80px] gap-2 py-2.5 border-b border-slate-50 hover:bg-slate-50 transition-colors -mx-2 px-2">
                    <div className="min-w-0">
                      <p className="font-medium text-black text-sm truncate">{donor.name}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {[donor.occupation, donor.employer].filter(Boolean).join(' · ')}
                        {donor.city ? ` · ${donor.city}${donor.state ? ', ' + donor.state : ''}` : ''}
                      </p>
                    </div>
                    <div className="self-center">
                      <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 font-mono">
                        {decodeDonorType(donor.donorType)}
                      </span>
                    </div>
                    <div className="self-center text-right">
                      <span className="font-editorial font-bold text-sm text-black">{formatCurrency(donor.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Show more toggle */}
              {data.topDonors.length > 5 && (
                <button
                  onClick={() => setShowAllDonors(v => !v)}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-black border border-slate-200 hover:border-black transition-colors"
                >
                  {showAllDonors ? (
                    <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
                  ) : (
                    <><ChevronDown className="w-3.5 h-3.5" /> Show all {data.topDonors.length} donors</>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Explanatory Notes */}
      <div className="p-12 bg-black text-white border-editorial relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="font-editorial text-3xl font-bold mb-6">Understanding the Data</h3>
          <div className="space-y-4">
            {data.explanatoryNotes.map((note, idx) => (
              <p key={idx} className="text-slate-300 leading-relaxed max-w-3xl text-lg">
                • {note}
              </p>
            ))}
            {data.explanatoryNotes.length === 0 && (
              <p className="text-slate-300 leading-relaxed max-w-2xl text-lg">
                NYC's campaign finance system is designed to amplify the voices of everyday New Yorkers through public matching funds and grassroots fundraising.
              </p>
            )}
          </div>
          <div className="mt-10 flex flex-wrap gap-4">
            {data.grassrootsGrade && (
              <div className="px-5 py-2 border border-white/20 text-xs font-bold uppercase tracking-widest">
                Grassroots Grade: {data.grassrootsGrade}
              </div>
            )}
            <div className="px-5 py-2 border border-white/20 text-xs font-bold uppercase tracking-widest">
              Grassroots Support: {formatPercent(data.smallDollarShare)}
            </div>
            <div className="px-5 py-2 border border-white/20 text-xs font-bold uppercase tracking-widest">
              Cycle: {data.cycle}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
