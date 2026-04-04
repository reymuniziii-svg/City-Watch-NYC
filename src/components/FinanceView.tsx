import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { DollarSign, TrendingUp, Users, Landmark, MapPin, AlertCircle } from 'lucide-react';
import { CampaignFinance } from '../types';

const COLORS = ['#F27D26', '#14B8A6', '#8B5CF6', '#F43F5E', '#EAB308', '#3B82F6', '#10B981', '#F97316'];

function formatCurrency(value: number | null) {
  return value === null ? 'Data unavailable' : '$' + Math.round(value).toLocaleString();
}

function formatPercent(value: number | null) {
  return value === null ? 'Data unavailable' : Math.round(value * 100) + '%';
}

export default function FinanceView({ data }: { data: CampaignFinance | null }) {
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

  const donorPatterns = data.topIndustries.map((industry) => ({
    category: industry.label,
    amount: industry.amount,
  }));
  
  const topDonors = data.topDonors.slice(0, 10);
  
  const averageContribution = data.contributorCount > 0 && data.totalRaised !== null
    ? data.totalRaised / data.contributorCount
    : null;

  // Calculate Geography Data
  const insideCityAmount = data.totalRaised !== null && data.outsideCityAmount !== null 
    ? data.totalRaised - data.outsideCityAmount 
    : 0;
  
  const geographyData = [
    { name: 'Inside NYC', amount: insideCityAmount },
    { name: 'Outside NYC', amount: data.outsideCityAmount || 0 }
  ];

  // Calculate Donation Size Data
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

  return (
    <div className="space-y-8">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Raised', value: formatCurrency(data.totalRaised), icon: DollarSign },
          { label: 'Public Funds', value: formatCurrency(data.publicFunds), icon: Landmark },
          { label: 'Small-Dollar Share', value: formatPercent(data.smallDollarShare), icon: Users },
          { label: 'Avg. Contribution', value: formatCurrency(averageContribution), icon: TrendingUp },
        ].map((stat, i) => (
          <div key={i} className="p-6 bg-white border-editorial hover:shadow-md transition-shadow">
            <div className="w-10 h-10 border-editorial flex items-center justify-center mb-6 bg-slate-50">
              <stat.icon className="text-black w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{stat.label}</p>
            <p className="font-editorial text-3xl font-bold text-black">{stat.value}</p>
          </div>
        ))}
      </div>

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
                  <Cell fill="#14B8A6" /> {/* Teal for Inside */}
                  <Cell fill="#F43F5E" /> {/* Rose for Outside */}
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
                  <Cell fill="#8B5CF6" /> {/* Purple for Small */}
                  <Cell fill="#EAB308" /> {/* Yellow for Large */}
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

      {/* Row 2: Industries & Top Donors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-8 bg-white border-editorial">
          <h3 className="font-editorial text-2xl font-bold text-black mb-8">Top Industries</h3>
          <div className="h-80">
            {donorPatterns.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={donorPatterns} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" tickFormatter={(val) => `$${val/1000}k`} stroke="#64748B" fontSize={12} />
                  <YAxis dataKey="category" type="category" width={140} tick={{ fontSize: 11, fill: '#334155' }} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{fill: '#F1F5F9'}}
                  />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                    {donorPatterns.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
        </div>

        <div className="p-8 bg-white border-editorial">
          <h3 className="font-editorial text-2xl font-bold text-black mb-8">Top Donors / PACs</h3>
          <div className="h-80">
            {topDonors.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDonors} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" tickFormatter={(val) => `$${val/1000}k`} stroke="#64748B" fontSize={12} />
                  <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11, fill: '#334155' }} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{fill: '#F1F5F9'}}
                  />
                  <Bar dataKey="amount" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-center text-slate-500">
                No top donor rows are available in the current public export.
              </div>
            )}
          </div>
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
